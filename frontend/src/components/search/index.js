/**
 * Search: the phone/tablet search page (route /search) and the pieces it shares with the navbar
 * search pill (Navbar/SearchBox.jsx).
 *
 *   SearchPage         the page
 *   SearchResultList   the result cards
 *   useGlobalSearch    GET /api/search, debounced and cancellable
 *   SEARCH_SECTIONS    what is searched and where each result leads
 */
export { default as SearchPage } from './SearchPage';
export { default as SearchResultList } from './SearchResultList';
export { default as useGlobalSearch } from './useGlobalSearch';
export { default as SearchPill } from './SearchPill';
export { default as RotatingPlaceholder } from './RotatingPlaceholder';
export { SEARCH_SECTIONS, SEARCH_TERMS, flattenResults } from './searchSections';
