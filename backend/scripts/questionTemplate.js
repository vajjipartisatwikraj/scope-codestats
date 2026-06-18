/**
 * Template for creating questions with proper HTML-formatted descriptions
 * Use this as a reference when creating new questions
 */

const questionTemplate = {
  title: "Problem Title",
  description: `<p>Given [input description] <code>variable</code>, [what to do].</p>
    <p>[Additional constraints or requirements].</p>
    <p>[Any special notes or edge cases].</p>`,
  type: "programming",
  difficultyLevel: "easy", // easy, medium, hard
  marks: 10,
  inputFormat: "Describe the input format clearly",
  outputFormat: "Describe the expected output format",
  examples: [
    {
      input: "Sample input",
      output: "Expected output",
      explanation: "Explain the example"
    }
  ],
  constraints: {
    timeLimit: 1000, // in milliseconds
    memoryLimit: 256 // in MB
  },
  hints: [
    "Hint 1",
    "Hint 2",
    "Hint 3"
  ],
  tags: ["tag1", "tag2"],
  companies: ["Company1", "Company2"],
  languages: [
    {
      name: "java",
      version: "15.0.2",
      boilerplateCode: `// Java boilerplate code`,
      solutionCode: `// Java solution code`
    },
    {
      name: "python",
      version: "3.8.1",
      boilerplateCode: `# Python boilerplate code`,
      solutionCode: `# Python solution code`
    },
    {
      name: "cpp",
      version: "GCC 9.2.0",
      boilerplateCode: `// C++ boilerplate code`,
      solutionCode: `// C++ solution code`
    }
  ],
  defaultLanguage: "java",
  testCases: [
    {
      input: "Test input",
      output: "Expected output",
      hidden: false,
      explanation: "Test case explanation"
    },
    {
      input: "Hidden test input",
      output: "Hidden expected output",
      hidden: true,
      explanation: "Hidden test case explanation"
    }
  ]
};

// Example of a proper Two Sum-like description:
const twoSumExample = {
  title: "Two Sum",
  description: `<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to target.</p>
    <p>You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the same element twice.</p>
    <p>You can return the answer in any order.</p>`
};

// Example of a simple problem description:
const simpleExample = {
  title: "Sum of Two Numbers",
  description: `<p>Given two integers <code>A</code> and <code>B</code>, find their sum.</p>
    <p>You need to read multiple test cases and output the sum for each test case.</p>
    <p>Each test case contains two space-separated integers.</p>`
};

// HTML formatting guidelines:
const htmlFormattingGuidelines = {
  paragraph: "<p>Use <p> tags for paragraphs</p>",
  code: "<code>Use <code> tags for variables and code elements</code>",
  strong: "<strong>Use <strong> tags for important notes</strong>",
  emphasis: "<em>Use <em> tags for emphasis</em>",
  lineBreak: "<br>Use <br> for line breaks if needed",
  lists: `<ul>
    <li>Use <ul> and <li> for lists</li>
    <li>Each list item should be in <li> tags</li>
  </ul>`
};

module.exports = {
  questionTemplate,
  twoSumExample,
  simpleExample,
  htmlFormattingGuidelines
};
