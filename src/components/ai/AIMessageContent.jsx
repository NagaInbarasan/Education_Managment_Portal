import React from 'react';

/**
 * Clean, lightweight renderer for AI responses.
 * Renders paragraphs, bold text, bullet lists, numbered lists, and simple markdown tables cleanly.
 */
const parseInlineFormatting = (text) => {
  if (!text) return text;

  // Split by bold (**text**)
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} style={{ fontWeight: 700, color: 'var(--text-main)' }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          style={{
            background: 'rgba(var(--primary-rgb), 0.08)',
            color: 'var(--primary)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.84em',
            fontFamily: 'monospace'
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

const AIMessageContent = ({ content }) => {
  if (!content) return null;

  // Split into lines/blocks
  const lines = content.split('\n');
  const blocks = [];
  let currentList = null;
  let currentTable = null;

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();

    // Markdown Table Row detection (e.g. | Name | Status |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }

      // Separator row like |---|---|
      if (trimmed.replace(/[\s|-|:]/g, '') === '') {
        return; // skip header separator line
      }

      const cells = trimmed
        .split('|')
        .slice(1, -1)
        .map(c => c.trim());

      if (!currentTable) {
        currentTable = { header: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      return;
    } else if (currentTable) {
      blocks.push({ type: 'table', table: currentTable });
      currentTable = null;
    }

    // Bullet point detection: •, -, *
    const isBullet = trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ');
    const isNumber = /^\d+\.\s/.test(trimmed);

    if (isBullet || isNumber) {
      const itemText = trimmed.replace(/^(•|-|\*|\d+\.)\s*/, '');
      if (!currentList) {
        currentList = { type: isNumber ? 'ol' : 'ul', items: [itemText] };
      } else {
        currentList.items.push(itemText);
      }
    } else {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }

      if (trimmed !== '') {
        blocks.push({ type: 'p', text: trimmed });
      }
    }
  });

  if (currentList) {
    blocks.push(currentList);
  }
  if (currentTable) {
    blocks.push({ type: 'table', table: currentTable });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', lineHeight: 1.6 }}>
      {blocks.map((block, bIdx) => {
        if (block.type === 'p') {
          return (
            <p key={bIdx} style={{ margin: 0, color: 'inherit' }}>
              {parseInlineFormatting(block.text)}
            </p>
          );
        }

        if (block.type === 'ul' || block.type === 'ol') {
          const ListTag = block.type;
          return (
            <ListTag
              key={bIdx}
              style={{
                margin: '4px 0 4px 20px',
                paddingLeft: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              {block.items.map((item, iIdx) => (
                <li key={iIdx} style={{ margin: 0 }}>
                  {parseInlineFormatting(item)}
                </li>
              ))}
            </ListTag>
          );
        }

        if (block.type === 'table') {
          const { header, rows } = block.table;
          return (
            <div
              key={bIdx}
              style={{
                margin: '8px 0',
                overflowX: 'auto',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                {header && (
                  <thead>
                    <tr style={{ background: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border-color)' }}>
                      {header.map((col, cIdx) => (
                        <th key={cIdx} style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {rows.map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: rIdx === rows.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} style={{ padding: '8px 12px', color: 'var(--text-subtle)' }}>
                          {parseInlineFormatting(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

export default AIMessageContent;
