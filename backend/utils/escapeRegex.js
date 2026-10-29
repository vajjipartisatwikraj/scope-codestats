/**
 * Escapes text so it can be placed inside a RegExp and matched literally.
 * Use it for anything a user typed or a URL carried:
 *   new RegExp(`^${escapeRegex(username)}@`, "i")
 */
const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = escapeRegex;
