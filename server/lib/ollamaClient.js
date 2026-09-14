import supabase from '../supabase.js';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || process.env.OLLAMA_URL || 'http://localhost:11434';
const LLM_MODEL = process.env.OLLAMA_LLM_MODEL || process.env.OLLAMA_MODEL || 'qwen3:8b';
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

/**
 * Check if Ollama is reachable and required models are available.
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { status: 'error', message: 'Ollama not responding' };
    const data = await res.json();
    const models = (data.models || []).map(m => m.name);
    const hasLLM = models.some(m => m.startsWith(LLM_MODEL.split(':')[0]));
    const hasEmbed = models.some(m => m.startsWith(EMBEDDING_MODEL.split(':')[0]));
    return {
      status: hasLLM && hasEmbed ? 'ok' : 'partial',
      ollama: true,
      llm: { model: LLM_MODEL, available: hasLLM },
      embedding: { model: EMBEDDING_MODEL, available: hasEmbed }
    };
  } catch (err) {
    return { status: 'error', ollama: false, message: 'Ollama is not reachable' };
  }
}

/**
 * Generate a chat completion from Ollama. Returns the full response text.
 */
export async function generateChat(messages, { model, temperature, noThink } = {}) {
  const useModel = model || LLM_MODEL;
  // If noThink, append /no_think to suppress extended thinking for faster responses
  const systemMsg = messages.find(m => m.role === 'system');
  if (noThink && systemMsg) {
    systemMsg.content += ' /no_think';
  }

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: useModel,
      messages,
      stream: false,
      options: { temperature: temperature ?? 0.3 }
    }),
    signal: AbortSignal.timeout(120000)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Ollama error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.message?.content || '';
}

/**
 * Generate an embedding vector using nomic-embed-text.
 */
export async function generateEmbedding(text) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Embedding error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  // Ollama /api/embed returns { embeddings: [[...]] }
  if (data.embeddings && data.embeddings[0]) {
    return data.embeddings[0];
  }
  throw new Error('No embedding returned from Ollama');
}

/**
 * Search for similar document chunks within a subject scope.
 */
export async function searchDocumentChunks(queryText, subjectId, { threshold = 0.3, limit = 5 } = {}) {
  const embedding = await generateEmbedding(queryText);
  
  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: JSON.stringify(embedding),
    match_subject_id: subjectId,
    match_threshold: threshold,
    match_count: limit
  });

  if (error) throw new Error(`Vector search error: ${error.message}`);
  return data || [];
}

export { OLLAMA_BASE_URL, LLM_MODEL, EMBEDDING_MODEL };
