import DOMPurify from 'dompurify';

/**
 * Cleans HTML written by teachers (question descriptions, editorials, module notes) before it
 * is placed in the page with dangerouslySetInnerHTML. Scripts, inline event handlers, iframes
 * and javascript: links are removed; ordinary formatting, tables, images and code blocks stay.
 *
 * The login token is kept in localStorage, so any script that gets into the page can take the
 * session over. Every __html in the app should go through this function.
 */

// Links that open a new tab must not hand the new page a reference to this one.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function sanitizeHtml(html) {
  if (html === null || html === undefined) return '';
  return DOMPurify.sanitize(String(html), { ADD_ATTR: ['target'] });
}

export default sanitizeHtml;
