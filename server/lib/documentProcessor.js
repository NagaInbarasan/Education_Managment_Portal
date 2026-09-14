/**
 * Document Processing Pipeline for RAG.
 * 
 * Pipeline: Download → Extract text → Clean → Chunk → Embed → Store
 * Supports: PDF, DOCX, TXT
 */
import supabase from '../supabase.js';
import { generateEmbedding } from './ollamaClient.js';

/**
 * Process a document for RAG indexing.
 */
export async function indexDocument(docId) {
  // 1. Fetch document metadata
  const { data: doc, error: docErr } = await supabase
    .from('subject_documents')
    .select('id, subject_id, offering_id, title, file_name, file_type, storage_path')
    .eq('id', docId)
    .single();

  if (docErr || !doc) throw new Error('Document not found');
  if (!doc.storage_path) throw new Error('No storage path for document');

  // Mark as indexing
  await supabase.from('subject_documents').update({ index_status: 'indexing' }).eq('id', docId);

  try {
    // 2. Get the section_id from the offering
    let sectionId = null;
    if (doc.offering_id) {
      const { data: offering } = await supabase
        .from('subject_offerings')
        .select('section_id')
        .eq('id', doc.offering_id)
        .single();
      sectionId = offering?.section_id || null;
    }

    // 3. Download file from Supabase Storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from('documents')
      .download(doc.storage_path);

    if (dlErr || !fileData) throw new Error(`Download failed: ${dlErr?.message || 'No data'}`);

    // 4. Extract text based on file type
    const buffer = Buffer.from(await fileData.arrayBuffer());
    let text = '';

    const mimeType = doc.file_type || '';
    const fileName = doc.file_name || '';

    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      text = await extractPdf(buffer);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      text = await extractDocx(buffer);
    } else if (mimeType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      text = buffer.toString('utf-8');
    } else {
      await supabase.from('subject_documents').update({ index_status: 'unsupported' }).eq('id', docId);
      throw new Error(`Unsupported file type: ${mimeType || fileName}`);
    }

    if (!text || text.trim().length < 10) {
      await supabase.from('subject_documents').update({ index_status: 'empty' }).eq('id', docId);
      throw new Error('Document has no extractable text content');
    }

    // 5. Clean text
    text = cleanText(text);

    // 6. Chunk text
    const chunks = chunkText(text, { chunkSize: 800, overlap: 100 });
    console.log(`[AI Index] Document "${doc.title}": ${text.length} chars → ${chunks.length} chunks`);

    // 7. Delete old chunks for this document
    await supabase.from('document_text_chunks').delete().eq('document_id', docId);

    // 8. Embed and store chunks (in batches)
    const BATCH_SIZE = 5;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embedPromises = batch.map(c => generateEmbedding(c.text));
      const embeddings = await Promise.all(embedPromises);

      const rows = batch.map((c, j) => ({
        document_id: docId,
        subject_id: doc.subject_id,
        offering_id: doc.offering_id || null,
        section_id: sectionId,
        chunk_text: c.text,
        chunk_index: c.index,
        page_number: c.page || null,
        document_title: doc.title,
        embedding: JSON.stringify(embeddings[j]),
        metadata: JSON.stringify({ file_name: doc.file_name })
      }));

      const { error: insertErr } = await supabase.from('document_text_chunks').insert(rows);
      if (insertErr) {
        console.error(`[AI Index] Chunk insert error:`, insertErr.message);
        throw insertErr;
      }
    }

    // 9. Mark indexed
    await supabase.from('subject_documents').update({
      index_status: 'indexed',
      indexed_at: new Date().toISOString()
    }).eq('id', docId);

    console.log(`[AI Index] ✅ Document "${doc.title}" indexed: ${chunks.length} chunks`);
    return { success: true, chunks: chunks.length };
  } catch (err) {
    await supabase.from('subject_documents')
      .update({ index_status: 'failed' })
      .eq('id', docId);
    throw err;
  }
}

/**
 * Extract text from PDF using pdf-parse.
 */
async function extractPdf(buffer) {
  const pdfParse = (await import('pdf-parse')).default;
  const data = await pdfParse(buffer);
  return data.text || '';
}

/**
 * Extract text from DOCX using mammoth.
 */
async function extractDocx(buffer) {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

/**
 * Clean extracted text.
 */
function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')     // collapse excessive newlines
    .replace(/[ \t]{2,}/g, ' ')      // collapse excessive spaces
    .replace(/\u0000/g, '')          // remove null bytes
    .trim();
}

/**
 * Split text into overlapping chunks.
 * Preserves paragraph boundaries where possible.
 */
function chunkText(text, { chunkSize = 800, overlap = 100 } = {}) {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = '';
  let chunkIndex = 0;

  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 1 > chunkSize && currentChunk.length > 0) {
      chunks.push({ text: currentChunk.trim(), index: chunkIndex });
      chunkIndex++;
      // Overlap: keep the tail of the current chunk
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + '\n\n' + para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }

  // Add final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({ text: currentChunk.trim(), index: chunkIndex });
  }

  // If any chunk is still too large, split it further
  const finalChunks = [];
  for (const chunk of chunks) {
    if (chunk.text.length > chunkSize * 1.5) {
      // Force split
      let start = 0;
      let subIndex = 0;
      while (start < chunk.text.length) {
        const end = Math.min(start + chunkSize, chunk.text.length);
        finalChunks.push({
          text: chunk.text.slice(start, end).trim(),
          index: chunk.index * 100 + subIndex,
          page: null
        });
        start = end - overlap;
        subIndex++;
      }
    } else {
      finalChunks.push({ ...chunk, page: null });
    }
  }

  return finalChunks;
}
