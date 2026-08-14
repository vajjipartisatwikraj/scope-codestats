import { toast } from 'react-toastify';
import axios from '../../../utils/axiosConfig';
import { apiUrl } from '../../../config/apiConfig';
import {
  FILL_IN_BLANK_MARKERS,
  getDefaultFormData,
  getDefaultSqlMeta,
  DEFAULT_SQL_BOILERPLATE,
} from './constants';

// Get token for code execution requests
const getAuthToken = () => localStorage.getItem('token');

/**
 * Parse Fill in the Blank markers from code
 * Returns array of editable regions with start/end line numbers
 */
export const parseFillInBlankRegions = (code) => {
  if (!code) return [];
  
  const lines = code.split('\n');
  const regions = [];
  let inEditableRegion = false;
  let currentRegion = null;
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    if (trimmedLine === FILL_IN_BLANK_MARKERS.START) {
      if (inEditableRegion) {
        // Nested START marker found
      }
      inEditableRegion = true;
      currentRegion = {
        startLine: index + 1, // Line after START marker
        endLine: null,
        startMarkerLine: index
      };
    } else if (trimmedLine === FILL_IN_BLANK_MARKERS.END) {
      if (!inEditableRegion) {
        // END marker without START
      } else {
        currentRegion.endLine = index - 1; // Line before END marker
        currentRegion.endMarkerLine = index;
        regions.push(currentRegion);
        inEditableRegion = false;
        currentRegion = null;
      }
    }
  });
  
  if (inEditableRegion) {
    // Unclosed START marker detected
  }
  
  return regions;
};

/**
 * Extract boilerplate code (removes solution between markers)
 */
export const extractBoilerplateFromSolution = (solutionCode) => {
  if (!solutionCode) return '';
  
  const lines = solutionCode.split('\n');
  const result = [];
  let inEditableRegion = false;
  
  lines.forEach((line) => {
    const trimmedLine = line.trim();
    
    if (trimmedLine === FILL_IN_BLANK_MARKERS.START) {
      result.push(line); // Keep the START marker
      inEditableRegion = true;
    } else if (trimmedLine === FILL_IN_BLANK_MARKERS.END) {
      result.push(line); // Keep the END marker
      inEditableRegion = false;
    } else if (inEditableRegion) {
      // Replace solution code with blank lines or placeholder
      const indent = line.match(/^\s*/)[0]; // Preserve indentation
      result.push(`${indent}// Your code here`);
    } else {
      result.push(line); // Keep non-editable code
    }
  });
  
  return result.join('\n');
};

/**
 * Validate Fill in the Blank markers
 */
export const validateFillInBlankMarkers = (code) => {
  const errors = [];
  const lines = code.split('\n');
  let startCount = 0;
  let endCount = 0;
  let inRegion = false;
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    if (trimmedLine === FILL_IN_BLANK_MARKERS.START) {
      startCount++;
      if (inRegion) {
        errors.push(`Line ${index + 1}: Nested START marker detected`);
      }
      inRegion = true;
    } else if (trimmedLine === FILL_IN_BLANK_MARKERS.END) {
      endCount++;
      if (!inRegion) {
        errors.push(`Line ${index + 1}: END marker without matching START`);
      }
      inRegion = false;
    }
  });
  
  if (startCount !== endCount) {
    errors.push(`Mismatched markers: ${startCount} START, ${endCount} END`);
  }
  
  if (inRegion) {
    errors.push('Unclosed START marker at end of file');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Direct code execution API calls to backend simpleCodeExecutionService
 */
export const codeExecutionApi = {
  /**
   * Execute code with custom input (RUN mode)
   */
  runCode: async (language, source_code, input = '') => {
    try {
      const response = await axios.post(
        `${apiUrl}/courses/run-code`,
        { language, source_code, input },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error running code:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to run code');
    }
  },

  /**
   * Submit code against test cases using combined stdin (online-judge style)
   */
  submitCodeCombined: async (language, source_code, testCases, options = {}) => {
    try {
      const response = await axios.post(
        `${apiUrl}/courses/submit-code-combined`,
        { language, source_code, testCases, options },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error submitting code (combined):', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to submit code');
    }
  }
};

// Format execution time
export const formatTime = (ms) => {
  if (ms < 1) return '< 1 ms';
  if (ms < 1000) return `${ms.toFixed(2)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};

// Format memory usage
export const formatMemory = (kb) => {
  if (!kb) return 'N/A';
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

// Simple execution to validate all test cases using combined submit approach
export const simpleValidateAllTestCases = async (formData, setIsRunningTest, setTestCaseResults) => {
  if (formData.testCases.length === 0) {
    toast.error('No test cases to validate');
    return [];
  }
  
  // Get the solution code from the default language
  const defaultLang = formData.languages.find(lang => lang.name === formData.defaultLanguage);
  if (!defaultLang || !defaultLang.solutionCode) {
    toast.error('Please provide a solution code in the Languages tab before validating test cases');
    return [];
  }
  
  setIsRunningTest(true);
  setTestCaseResults([]);
  
  try {
    // Prepare test cases for combined submission
    const testCasesForSubmit = formData.testCases.map(tc => ({
      input: tc.input || '',
      output: tc.output || '',
      expectedOutput: tc.output || '' // For backward compatibility
    }));
    
    // Use the combined submit API (online-judge style)
    const result = await codeExecutionApi.submitCodeCombined(
      defaultLang.name,
      defaultLang.solutionCode,
      testCasesForSubmit,
      {
        time_limit: (formData.constraints?.timeLimit || 1000) / 1000, // Convert ms to seconds
        memory_limit: (formData.constraints?.memoryLimit || 256) * 1024 // Convert MB to KB
      }
    );
    
    if (!result.success) {
      toast.error('Test case validation failed: ' + (result.error || 'Unknown error'));
      return [];
    }
    
    // Convert the results to the format expected by the UI
    const newResults = result.results.map((testResult, index) => ({
      index: index,
      passed: testResult.status === 'passed',
      expected: testResult.expected,
      actual: testResult.got,
      error: testResult.error || '',
      executionTime: (testResult.time || 0) * 1000, // Convert to ms
      memoryUsed: testResult.memory || 0,
      testCase: formData.testCases[index]
    }));
    
    // Set the results state
    setTestCaseResults(newResults);
    
    const passedCount = newResults.filter(r => r.passed).length;
    
    if (passedCount === newResults.length) {
      toast.success('All test cases passed! This solution is valid.');
    } else {
      toast.error(`${passedCount}/${newResults.length} test cases passed. See details below.`);
    }
    
    return newResults;
  } catch (error) {
    console.error('Error validating test cases:', error);
    toast.error('Failed to validate test cases: ' + (error.message || 'Unknown error'));
    return [];
  } finally {
    setIsRunningTest(false);
  }
};

// ───────────────────────────────────────────────────────────────────────────
// JSON import
//
// One mapper shared by "Choose JSON File" and "Paste JSON" so the two paths can
// never drift apart. It accepts the field spellings used across the authoring
// templates (`difficultyLevel` or `difficulty`, `schemaSql` or `schema`,
// `seedSql` or `seed`, `visible` or `hidden`) and normalises them onto the form
// state shape defined in constants.js.
// ───────────────────────────────────────────────────────────────────────────

const DIFFICULTIES = ['easy', 'medium', 'hard'];

/** `"Medium"`, `"MEDIUM"` and `"medium"` all land on `medium`. */
const normalizeDifficulty = (value) => {
  const text = String(value ?? '').trim().toLowerCase();
  return DIFFICULTIES.includes(text) ? text : 'medium';
};

/** `"MCQ"`, `"SQL"` and `"Programming"` all land on their stored spelling. */
const normalizeQuestionType = (value) => {
  const text = String(value ?? '').trim().toLowerCase();
  return ['mcq', 'programming', 'sql'].includes(text) ? text : 'programming';
};

/** Accepts `2`, `"2"` and `"v2"`. */
const normalizeVersion = (value) => {
  const raw = typeof value === 'string' ? value.replace(/^v/i, '') : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
};

/** Constraints are authored either as an array of lines or one newline string. */
const normalizeConstraintLines = (value) => {
  if (Array.isArray(value)) {
    return value.map((line) => String(line).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split('\n').map((line) => line.trim()).filter(Boolean);
  }
  return [];
};

const firstNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return '';
};

/**
 * Maps an authored SQL question JSON onto the form's `sqlMeta` block.
 *
 * Defaults are only used for fields the JSON omits, so an imported question
 * never keeps the sample schema or seed rows that the blank form starts with.
 */
const buildSqlMetaFromJson = (questionData) => {
  const defaults = getDefaultSqlMeta();
  const source = questionData.sqlMeta && typeof questionData.sqlMeta === 'object'
    ? { ...questionData, ...questionData.sqlMeta }
    : questionData;

  const rawTestcases = Array.isArray(source.testcases)
    ? source.testcases
    : Array.isArray(source.testCases)
    ? source.testCases
    : [];

  const testcases = rawTestcases.map((tc, index) => ({
    id: firstNonEmptyString(tc?.id) || `tc-${String(index + 1).padStart(2, '0')}`,
    seedSql: firstNonEmptyString(tc?.seedSql, tc?.seed),
    // Visible unless explicitly hidden, matching the backend parser.
    visible: tc?.visible === undefined ? !tc?.hidden : Boolean(tc.visible),
    ...(tc?.expected ? { expected: tc.expected } : {}),
  }));

  // The backend falls back to a slug of the title when no id is given; mirror
  // that here so the form does not block on a field the JSON legitimately omits.
  const judgeQuestionId =
    firstNonEmptyString(source.judgeQuestionId, source.slug).trim() ||
    String(questionData.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);

  return {
    judgeQuestionId,
    judgeVersion: normalizeVersion(source.judgeVersion ?? source.version),
    schemaSql: firstNonEmptyString(source.schemaSql, source.schema),
    solutionSql: firstNonEmptyString(source.solutionSql, source.solution),
    boilerplateSql:
      firstNonEmptyString(source.boilerplateSql, source.boilerplate) ||
      DEFAULT_SQL_BOILERPLATE,
    constraints: normalizeConstraintLines(source.constraints),
    testcases: testcases.length > 0 ? testcases : defaults.testcases,
    overwrite: Boolean(source.overwrite),
  };
};

/**
 * Builds complete form state from an authored question JSON.
 *
 * Returns `{ formData, error }`. `error` is a human-readable string when the
 * JSON is missing a required field, in which case `formData` is null.
 */
export const buildFormDataFromQuestionJson = (questionData, moduleId) => {
  if (!questionData || typeof questionData !== 'object' || Array.isArray(questionData)) {
    return { formData: null, error: 'JSON must be a single question object' };
  }
  if (!questionData.title || !questionData.description || !questionData.type) {
    return {
      formData: null,
      error: 'JSON must include title, description, and type fields',
    };
  }

  const type = normalizeQuestionType(questionData.type);

  const formData = {
    ...getDefaultFormData(moduleId),
    title: questionData.title || '',
    description: questionData.description || '',
    type,
    // Form state uses `difficultyLevel`; templates sometimes say `difficulty`.
    difficultyLevel: normalizeDifficulty(
      questionData.difficultyLevel ?? questionData.difficulty
    ),
    marks: Number.isFinite(Number(questionData.marks))
      ? Number(questionData.marks)
      : 10,
    questionBank: questionData.questionBank || '',
    tags: Array.isArray(questionData.tags) ? questionData.tags : [],
    companies: Array.isArray(questionData.companies) ? questionData.companies : [],
    hints: Array.isArray(questionData.hints) ? questionData.hints : [],
    videoUrl: questionData.videoUrl || '',
    articleUrl: questionData.articleUrl || '',
    referenceUrl: questionData.referenceUrl || '',
    editorial: questionData.editorial || '',
    module: moduleId,
    fillInTheBlank: Boolean(questionData.fillInTheBlank),
    encryptedEditor: questionData.encryptedEditor ?? false,
    encryptionSettings: {
      allowPlainTextPaste:
        questionData.encryptionSettings?.allowPlainTextPaste ?? false,
    },
  };

  if (type === 'programming') {
    formData.languages = Array.isArray(questionData.languages)
      ? questionData.languages.map((lang) => ({
          name: lang.name || '',
          version: lang.version || '',
          boilerplateCode: lang.boilerplateCode || '',
          solutionCode: lang.solutionCode || '',
          scoringTiers: Array.isArray(lang.scoringTiers)
            ? lang.scoringTiers.map((tier) => ({
                maxTime: tier.maxTime ? Number(tier.maxTime) : 0,
                points: tier.points ? Number(tier.points) : 0,
              }))
            : [],
          minimumPoints:
            lang.minimumPoints !== undefined ? Number(lang.minimumPoints) : 1,
        }))
      : [];

    formData.defaultLanguage =
      questionData.defaultLanguage ||
      (formData.languages.length > 0 ? formData.languages[0].name : '');

    formData.testCases = Array.isArray(questionData.testCases)
      ? questionData.testCases.map((tc) => ({
          input: tc.input || '',
          output: tc.output || '',
          hidden: tc.hidden || false,
          explanation: tc.explanation || '',
        }))
      : [];

    formData.examples = Array.isArray(questionData.examples)
      ? questionData.examples
      : [];

    formData.constraints = {
      timeLimit: questionData.constraints?.timeLimit
        ? Number(questionData.constraints.timeLimit)
        : 1000,
      memoryLimit: questionData.constraints?.memoryLimit
        ? Number(questionData.constraints.memoryLimit)
        : 256,
    };
  } else if (type === 'mcq') {
    formData.options = Array.isArray(questionData.options)
      ? questionData.options.map((opt) => ({
          text: opt.text || '',
          isCorrect: opt.isCorrect || false,
        }))
      : [{ text: '', isCorrect: false }];
  } else if (type === 'sql') {
    // SQL constraints are a list of prose lines, not the time/memory object the
    // programming form uses, so they live on sqlMeta instead.
    formData.sqlMeta = buildSqlMetaFromJson(questionData);
  }

  return { formData, error: null };
};
