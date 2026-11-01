/**
 * The languages a programming question can be solved in, and the starting code of each. Declared
 * once, outside any component, so the object is the same on every render.
 *
 * `monaco` is the editor's name for the language. SQL questions are graded by the SQL engine (MySQL
 * 8.4) and have exactly one language.
 */

/** The starting query when a SQL question has no stored boilerplate */
export const DEFAULT_SQL_EDITOR_CODE = '-- Write your query below.\nSELECT\nFROM employees;';

export const LANGUAGES = {
  c: {
    name: 'C',
    extension: 'c',
    monaco: 'c',
    defaultCode: '#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}',
  },
  cpp: {
    name: 'C++',
    extension: 'cpp',
    monaco: 'cpp',
    defaultCode: '#include <iostream>\n\nint main() {\n    // Your code here\n    return 0;\n}',
  },
  java: {
    name: 'Java',
    extension: 'java',
    monaco: 'java',
    defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}',
  },
  python: {
    name: 'Python',
    extension: 'py',
    monaco: 'python',
    defaultCode: '# Your code here',
  },
  javascript: {
    name: 'JavaScript',
    extension: 'js',
    monaco: 'javascript',
    defaultCode: '// Your code here',
  },
  sql: {
    name: 'MySQL',
    extension: 'sql',
    monaco: 'sql',
    defaultCode: DEFAULT_SQL_EDITOR_CODE,
  },
};

export const languageName = (key) => LANGUAGES[key]?.name || String(key || '');
export const monacoLanguageOf = (key) => LANGUAGES[key]?.monaco || key;

/** The languages a question offers, as [{ value, label }]. An empty list means every language. */
export function languageOptions(question) {
  if (question?.type === 'sql') return [{ value: 'sql', label: languageName('sql') }];
  const offered = (question?.languages || []).map((entry) => entry.name);
  const keys = Object.keys(LANGUAGES).filter((key) => key !== 'sql' && (offered.length === 0 || offered.includes(key)));
  return keys.map((key) => ({ value: key, label: languageName(key) }));
}

/**
 * The code an editor starts with for one language: the student's latest submission in it, else the
 * question's own boilerplate, else the generic starter. A SQL question starts from the last query
 * the student submitted, else the engine's boilerplate.
 */
export function startingCode(language, question, submissions, sqlContext) {
  if (language === 'sql') {
    const previous = (submissions || []).find((entry) => entry.code);
    return previous?.code || sqlContext?.boilerplateSql || DEFAULT_SQL_EDITOR_CODE;
  }
  const submitted = (submissions || []).find((entry) => entry.language === language && entry.code);
  if (submitted) return submitted.code;
  const offered = (question?.languages || []).find((entry) => entry.name === language);
  return offered?.boilerplateCode || LANGUAGES[language]?.defaultCode || '';
}
