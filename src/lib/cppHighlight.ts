// Minimal C++ syntax highlighter shared by every code editor in the app
// (the main Problems-tab IDE and the Blitz & Duel problem workspace).

const CPP_TYPES = new Set(['int', 'float', 'double', 'bool', 'char', 'void', 'auto', 'long', 'short', 'unsigned', 'size_t', 'string', 'vector', 'unordered_map', 'map', 'set', 'stack', 'queue', 'pair', 'struct']);
const CPP_KEYWORDS = new Set(['class', 'public', 'private', 'protected', 'virtual', 'override', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'delete', 'const', 'static', 'namespace', 'using', 'template', 'typename', 'nullptr', 'true', 'false']);

export function getHighlightedCode(code: string): string {
  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 1. Extract comments first to prevent matching keywords/strings inside them
  const comments: string[] = [];
  escaped = escaped.replace(/(\/\/.*|\/\*[\s\S]*?\*\/)/g, (match) => {
    comments.push(match);
    return `__COMMENT_${comments.length - 1}__`;
  });

  // 2. Extract strings next to prevent matching keywords inside them
  const strings: string[] = [];
  escaped = escaped.replace(/(['"])([\s\S]*?)\1/g, (match) => {
    strings.push(match);
    return `__STRING_${strings.length - 1}__`;
  });

  // 3. Types + keywords in a single pass (avoids one pass's <span> markup
  // being re-matched by the next, e.g. the literal word "class" inside
  // class="syntax-type" attributes)
  escaped = escaped.replace(/\b([A-Za-z_]\w*)\b/g, (word) => {
    if (CPP_TYPES.has(word)) return `<span class="syntax-type">${word}</span>`;
    if (CPP_KEYWORDS.has(word)) return `<span class="syntax-keyword">${word}</span>`;
    return word;
  });

  // 4. Numbers
  escaped = escaped.replace(/\b(\d+)\b/g, '<span class="syntax-number">$1</span>');

  // 5. Preprocessor directives (#include, #define, ...) — safe to wrap whole
  // lines now since none of their tokens match the type/keyword sets above
  escaped = escaped.replace(/^(\s*#\w+.*)$/gm, '<span class="syntax-preproc">$1</span>');

  // 6. Restore strings wrapped in span tags
  escaped = escaped.replace(/__STRING_(\d+)__/g, (_, idx) => {
    const originalString = strings[parseInt(idx, 10)];
    return `<span class="syntax-string">${originalString}</span>`;
  });

  // 7. Restore comments wrapped in span tags
  escaped = escaped.replace(/__COMMENT_(\d+)__/g, (_, idx) => {
    const originalComment = comments[parseInt(idx, 10)];
    return `<span class="syntax-comment">${originalComment}</span>`;
  });

  return escaped;
}
