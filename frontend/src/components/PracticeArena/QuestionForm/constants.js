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
      "#include <iostream>\n\nint main() {\n    // Your code here\n    return 0;\n}",
  },
];

// Fill in the Blank markers
export const FILL_IN_BLANK_MARKERS = {
  START: "/*<<START>>*/",
  END: "/*<<END>>*/",
};

// Default form data structure
export const getDefaultFormData = (moduleId) => ({
  title: "",
  description: "",
  type: "programming",
  difficultyLevel: "medium",
  marks: 10,
  questionBank: "",
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
  examples: [],
  constraints: {
    timeLimit: 1000,
    memoryLimit: 256,
  },
  hints: [],
  tags: [],
  companies: [],
  editorial: "",
  encryptedEditor: false,
  encryptionSettings: {
    allowPlainTextPaste: false,
  },
});
