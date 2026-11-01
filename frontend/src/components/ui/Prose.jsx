import React, { useMemo } from 'react';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import './prose.css';

/**
 * Prose: teacher-written HTML (module notes, question descriptions, editorials) in the design
 * system's reading typography (design/screens.md, Read mode): a 72ch measure, headings in order,
 * code on the raised tone, tables with hairlines, images with the tile radius.
 *
 * The HTML is cleaned by sanitizeHtml before it is placed in the page (scripts, inline handlers,
 * iframes and javascript: links are removed) and is otherwise left exactly as written: code blocks
 * are never rewritten.
 *
 *   html        the markup as stored
 *   className   added to the wrapper
 */
export default function Prose({ html, className }) {
  const clean = useMemo(() => sanitizeHtml(html), [html]);
  return <div className={className ? `ui-prose ${className}` : 'ui-prose'} dangerouslySetInnerHTML={{ __html: clean }} />;
}
