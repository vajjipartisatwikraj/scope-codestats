// Language options for programming questions
export const LANGUAGES = [
  {
    name: "java",
    displayName: "Java",
    version: "15.0.2",
    defaultCode:
      "public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}",
  },
  {
    name: "python",
    displayName: "Python",
    version: "3.10.0",
    defaultCode:
      'def main():\n    # Your code here\n    pass\n\nif __name__ == "__main__":\n    main()',
  },
  {
    name: "javascript",
    displayName: "JavaScript",
    version: "18.15.0",
    defaultCode: "function main() {\n    // Your code here\n}\n\nmain();",
  },
  {
    name: "c",
    displayName: "C",
    version: "10.2.0",
    defaultCode:
      "#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}",
  },
  {
    name: "cpp",
    displayName: "C++",
    version: "10.2.0",
    defaultCode:
      "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}",
  },
];

/**
 * SQL question defaults.
 *
 * SQL questions are graded by the external SQLJudge engine, which owns the
 * seed data and expected output in its own private storage. The form therefore
 * captures the schema, the reference solution and one seed per testcase, and
 * the engine generates the expected rows.
 */
export const DEFAULT_SQL_SCHEMA = `CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    salary DECIMAL(10,2) NOT NULL
);`;

export const DEFAULT_SQL_SOLUTION = `SELECT department, ROUND(AVG(salary), 2) AS avg_salary
FROM employees
GROUP BY department
ORDER BY department;`;

export const DEFAULT_SQL_SEED = `INSERT INTO employees (id, name, department, salary)
VALUES
    (1, 'Rahul', 'IT', 60000),
    (2, 'Priya', 'IT', 70000),
    (3, 'Arjun', 'HR', 50000);`;

export const DEFAULT_SQL_BOILERPLATE = `-- Write your query below.
SELECT
FROM employees;`;

/** A fresh, empty SQL testcase. Ids follow the engine's tc-NN convention. */
export const makeSqlTestcase = (index, { visible = true } = {}) => ({
  id: `tc-${String(index + 1).padStart(2, "0")}`,
  seedSql: index === 0 ? DEFAULT_SQL_SEED : "",
  visible,
});

export const getDefaultSqlMeta = () => ({
  judgeQuestionId: "",
  judgeVersion: 1,
  schemaSql: DEFAULT_SQL_SCHEMA,
  solutionSql: DEFAULT_SQL_SOLUTION,
  boilerplateSql: DEFAULT_SQL_BOILERPLATE,
  constraints: [],
  testcases: [
    makeSqlTestcase(0, { visible: true }),
    makeSqlTestcase(1, { visible: true }),
    makeSqlTestcase(2, { visible: false }),
  ],
  overwrite: false,
});

// Default form data structure
export const getDefaultFormData = (moduleId) => ({
  title: "",
  description: "",
  type: "programming",
  difficultyLevel: "medium",
  marks: 10,
  module: moduleId,
  options: [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
  languages: [
    {
      name: "java",
      version: "15.0.2",
      boilerplateCode:
        "public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}",
      solutionCode: "",
    },
  ],
  defaultLanguage: "java",
  testCases: [],
  constraints: {
    timeLimit: 1000,
    memoryLimit: 256,
  },
  hints: [],
  tags: [],
  companies: [],
  editorial: "",
  encryptionSettings: {
    allowPlainTextPaste: false,
  },
  fillInTheBlank: false, // New: Fill in the Blank mode
  scoringTiers: [], // Language-specific time-based scoring tiers
  // SQL authoring state. Only sent when type === "sql".
  sqlMeta: getDefaultSqlMeta(),
});

// Markers for Fill in the Blank feature
export const FILL_IN_BLANK_MARKERS = {
  START: "/*<<START>>*/",
  END: "/*<<END>>*/",
};
