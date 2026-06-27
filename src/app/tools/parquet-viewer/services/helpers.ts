export function downloadBlob(buffer: Uint8Array, mimeType: string, filename: string): void {
  const blob = new Blob([buffer as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text)
      .then(() => true)
      .catch((err) => {
        console.error('Clipboard copy failed:', err);
        return fallbackCopyText(text);
      });
  } else {
    return Promise.resolve(fallbackCopyText(text));
  }
}

function fallbackCopyText(text: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  // Prevent scrolling to bottom
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }
  document.body.removeChild(textArea);
  return success;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function sqlFormatter(sql: string): string {
  // A clean, simple SQL formatting helper that capitalizes keywords
  // and adds linebreaks before major clauses
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 
    'LIMIT', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 
    'JOIN', 'ON', 'HAVING', 'WITH', 'RECURSIVE', 
    'UNION', 'PIVOT', 'UNPIVOT'
  ];
  
  let formatted = sql.trim();
  
  // Uppercase keywords
  for (const kw of keywords) {
    const regex = new RegExp('\\b' + kw + '\\b', 'gi');
    formatted = formatted.replace(regex, kw);
  }
  
  // Format linebreaks before major clauses (FROM, WHERE, etc)
  const breakKeywords = ['FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'JOIN', 'WITH', 'UNION', 'PIVOT', 'UNPIVOT'];
  for (const bk of breakKeywords) {
    const regex = new RegExp('\\s+' + bk + '\\b', 'g');
    formatted = formatted.replace(regex, '\n' + bk);
  }
  
  return formatted;
}
