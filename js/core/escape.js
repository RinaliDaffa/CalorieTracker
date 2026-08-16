/* ============================================
   NutriSnap — HTML Escaping
   Pure. No DOM. Security-critical: all AI- and user-derived
   strings must pass through here before reaching innerHTML.
   ============================================ */

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/**
 * Escape a value for safe interpolation into HTML.
 * Single-pass replace, so '&' cannot be double-escaped.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
}

/**
 * Render a chat message as HTML.
 * Escaping happens FIRST, then markdown is applied to the escaped text.
 * Reversing that order would escape the tags this function generates.
 */
export function formatChatContent(content) {
  return escapeHtml(content)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
    .replace(/^- (.*)/gm, '• $1');
}
