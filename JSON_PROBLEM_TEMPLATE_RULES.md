# JSON Problem Document Template - Rules & Regulations

**Purpose:** This document defines the strict rules and field-by-field guidelines for generating a JSON file for programming, MCQ, and fill-in-the-blank questions. The output must match the structure and conventions of the provided example (`two_sum_problem.json`).

---

## I. Programming Type Question

### 1. `title`
- **Rules:**
  - Title should be short, clear, and easy to read
  - Make the title interesting and relevant to the question

### 2. `description`
- **Rules:**
  - Copy-paste the entire content from `HTML_DESCRIPTION_TEMPLATE_RULES.md` below:

---

# HTML Description Template - Rules & Regulations

**Purpose:** This document defines the strict rules and styling guidelines for generating HTML problem descriptions for programming questions. This template must be followed exactly to maintain consistency across all questions.

---

## Structure Overview

The HTML description must follow this exact sequence:

1. **Question Description** (Required)
2. **Image** (Optional - only if relevant public image exists)
3. **Input/Output Format** (Required)
4. **Examples** (Required - 1 to 5 examples)
5. **Constraints** (Required)
6. **Table** (Optional - only if problem requires clarification via table)
7. **Note** (Required)

---

## Section 1: Question Description (Required)

### Content Rules:
- The description must be informative and clearly explain the problem
- All variable names, function names, and data structure names MUST be wrapped in `<code>` tags
- Use proper emphasis with `<strong>` for important points and `<em>` for italic emphasis
- Break content into multiple paragraphs using `<p>` tags for readability
- The description should NOT reveal the solution approach or algorithm
- Use clear, concise language similar to LeetCode, CodeChef, and Codeforces

### Styling Rules:
Follow this example code to generate this section:
```html
<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to form a </em> <code>target</code>.</p>

<p>You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the <em>same</em> element twice.</p>

<p>You can return the answer in any order.</p>
```

### Key Points:
- Variables/fields: `<code>variableName</code>`
- Important constraints: `<strong>text</strong>`
- Emphasis/hints: `<em>text</em>`

**Version:** 1.0  
**Last Updated:** October 31, 2025  
**Maintained By:** Scope Cohorts Development Team

---

# Reference Example JSON Document

Below is a complete example JSON problem document for reference:

```json

---

## Section 2: Image (Optional)

### Content Rules:
- Only include if the problem is well-known and has publicly available illustrations
- Use publicly accessible URLs (e.g., LeetCode S3 bucket, educational resources)
- Image must help visualize the problem, not provide solution hints
- Alt text should describe the illustration purpose

### Styling Rules:
Follow this example code to generate this section:
```html
<div>
    <img src="https://s3-lc-upload.s3.amazonaws.com/uploads/2018/07/17/question_11.jpg" alt="Problem Illustration" style="max-width: 100%; height: auto; border-radius: 8px;">
</div>
```

### Key Points:
- Wrap image in `<div>` tag (no class needed)
- Use inline styles ONLY for images: `max-width: 100%; height: auto; border-radius: 8px;`
- Always include descriptive `alt` attribute
- Skip this section if no relevant public image exists

---

## Section 3: Input/Output Format (Required)

### Content Rules:
- **Input Format:** Define each input parameter with its data type and meaning
- **Output Format:** Clearly specify the expected return type and format
- Keep descriptions concise - short bullet points are sufficient
- Wrap all variable names in `<code>` tags
- Explain the meaning and structure of each input line if multi-line input
- **You may use ordered lists, unordered lists, or both together, including nested lists, for maximum clarity and readability.**
- **Nested lists are recommended for multi-step or multi-line input formats.**

### Styling Rules:
Follow this example code to generate this section:
```html
<h3>Input Format</h3>
<ol>
    <li>An integer <code>n</code> representing the number of rows in the matrix.</li>
    <li>An integer <code>m</code> representing the number of columns in the matrix.</li>
    <li><code>n</code> lines follow, each containing <code>m</code> space-separated integers representing the matrix rows.</li>
    <li>An integer <code>q</code> representing the number of queries.</li>
    <li>Each of the next <code>q</code> lines contains four integers <code>x1</code>, <code>y1</code>, <code>x2</code>, <code>y2</code> representing one query.</li>
</ol>

<h3>Output Format</h3>
<ul>
    <li>Print <code>q</code> lines, where each line contains a single integer representing the sum of the elements in the corresponding query submatrix.</li>
</ul>
```

You may also use nested lists for more complex input formats:
```html
<h3>Input Format</h3>
<ol>
    <li>An integer <code>n</code> representing the number of rows in the matrix.</li>
    <li>An integer <code>m</code> representing the number of columns in the matrix.</li>
    <li>
        <code>n</code> lines follow, each containing:
        <ul>
            <li><code>m</code> space-separated integers representing the matrix row.</li>
        </ul>
    </li>
    <li>An integer <code>q</code> representing the number of queries.</li>
    <li>
        Each of the next <code>q</code> lines contains:
        <ul>
            <li>Four integers <code>x1</code>, <code>y1</code>, <code>x2</code>, <code>y2</code> representing one query.</li>
        </ul>
    </li>
</ol>
```

### Key Points:
- Use `<h3>` for headings: "Input Format" and "Output Format"
- Use `<ul>` and `<li>` for bullet points
- Use `<ol>` and `<li>` if order matters (e.g., multi-line input sequence)
- NO inline styles
- Can optionally add `<p>` description before/after lists

---

## Section 4: Examples (Required)

### Content Rules:
- Provide **1 to 5 examples** (typically 3 examples is ideal)
- Each example MUST represent a different edge case or scenario
- Include input, output, AND explanation for every example
- Explanations should be straightforward and step-by-step
- Cover edge cases: empty inputs, minimum values, maximum values, typical cases
- Examples should NOT reveal the optimal algorithm

### Styling Rules:
Follow this example code to generate this section:
```html
<h3>Examples:</h3>

<p><strong>Example 1:</strong></p>
<div class="example">
  <div>
    <div class="label">Input</div>
    <div class="label">Output</div>
    <div class="value">nums = [2,7,11,15], target = 9</div>
    <div class="value">[0,1]</div>
  </div>
</div>
<p><strong>Explanation:</strong></p>
<p>Because nums[0] + nums[1] == 9, we return [0, 1].</p>

<br>

<p><strong>Example 2:</strong></p>
<div class="example">
  <div>
    <div class="label">Input</div>
    <div class="label">Output</div>
    <div class="value">nums = [3,2,4], target = 6</div>
    <div class="value">[1,2]</div>
  </div>
</div>
<p><strong>Explanation:</strong></p>
<p>Because nums[1] + nums[2] == 6, we return [1, 2].</p>

<br>

<p><strong>Example 3:</strong></p>
<div class="example">
  <div>
    <div class="label">Input</div>
    <div class="label">Output</div>
    <div class="value">nums = [3,3], target = 6</div>
    <div class="value">[0,1]</div>
  </div>
</div>
<p><strong>Explanation:</strong></p>
<p>Because nums[0] + nums[1] == 6, we return [0, 1].</p>
```

### Key Points:
- Main heading: `<h3>Examples:</h3>`
- Each example number: `<p><strong>Example 1:</strong></p>`
- Use `<div class="example">` wrapper (styling is pre-defined)
- Inside example div: nested `<div>` structure with `class="label"` and `class="value"`
- Explanation heading: `<p><strong>Explanation:</strong></p>`
- Explanation content: `<p>explanation text</p>`
- Separate examples with `<br>` tag
- NO inline styles (classes handle all styling)

---

## Section 5: Constraints (Required)

### Content Rules:
- Define all input constraints (min/max values, array lengths, string lengths, etc.)
- Adjust constraints based on problem difficulty:
  - **Easy:** Smaller constraints (e.g., N ≤ 1000)
  - **Medium:** Moderate constraints (e.g., N ≤ 10^4)
  - **Hard:** Large constraints (e.g., N ≤ 10^5 or 10^6)
- Include special constraints (e.g., "Only one valid answer exists")
- Use proper mathematical notation with HTML entities and `<sup>` for exponents

### Styling Rules:
Follow this example code to generate this section:
```html
<h3>Constraints:</h3>
<ul>
    <li><code>2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li>
    <li><code>-10<sup>9</sup> &lt;= nums[i] &lt;= 10<sup>9</sup></code></li>
    <li><code>-10<sup>9</sup> &lt;= target &lt;= 10<sup>9</sup></code></li>
    <li><strong>Only one valid answer exists.</strong></li>
</ul>
```

### Key Points:
- Heading: `<h3>Constraints:</h3>`
- Use `<ul>` and `<li>` for list
- Wrap constraint ranges in `<code>` tags
- Use HTML entities: `&lt;` for <, `&gt;` for >, `&le;` for ≤, `&ge;` for ≥
- Use `<sup>` for exponents: `10<sup>9</sup>`
- Special notes in `<strong>`: `<strong>Only one valid answer exists.</strong>`
- NO inline styles

---

## Section 6: Table (Optional)

### Content Rules:
- Only include if the problem requires tabular data for clarity
- Common use cases:
  - Roman numeral mappings
  - Scoring tiers (time-based points)
  - Character/value mappings
  - State transitions
- Table content must be clear and directly related to problem understanding
- Keep tables concise - avoid overly large tables

### Styling Rules:
Follow this example code to generate this section:
```html
<h3>Scoring:</h3>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 10px 0;">
    <thead>
        <tr>
            <th>Tier</th>
            <th>Runtime</th>
            <th>Points</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Tier-1</td>
            <td>600ms</td>
            <td>100 points</td>
        </tr>
        <tr>
            <td>Tier-2</td>
            <td>1000ms</td>
            <td>50 points</td>
        </tr>
        <tr>
            <td>Tier-3</td>
            <td>6000ms</td>
            <td>30 points</td>
        </tr>
    </tbody>
</table>
<br>
```

### Key Points:
- Optional heading: `<h3>` (e.g., "Scoring:", "Symbol Mappings:", "Examples:")
- Table attributes: `border="1" cellpadding="8" cellspacing="0"`
- Inline styles ONLY for tables: `border-collapse: collapse; width: 100%; margin: 10px 0;`
- Use `<thead>` with `<th>` for headers
- Use `<tbody>` with `<tr>` and `<td>` for data
- Add `<br>` after table for spacing
- Skip this section if table is not necessary for problem understanding

---

## Section 7: Note (Required)

### Content Rules:
- **MUST include the boilerplate/test case instruction:**
  - "The boilerplate code consumes `T` as the number of test cases in the input, but individual test cases do not include `T` in their input. Only write code in the designated area without modifying other parts of the boilerplate."
- Additional relevant notes about:
  - Index type (0-based or 1-based)
  - Output format requirements
  - Special constraints or assumptions
  - Edge case handling
- Keep notes concise and practical

### Styling Rules:
Follow this example code to generate this section:
```html
<div class="note">
    <p><strong>Note:</strong></p>
    <ul>
        <li>The returned indices should be <strong>0-based</strong>.</li>
        <li>You cannot use the same element twice (i.e., <code>i ≠ j</code>).</li>
        <li>There is exactly <strong>one valid solution</strong> for each test case.</li>
        <li>You can return the answer in any order.</li>
        <li>If the question fails to explain correctly then report your problem to admin.</li>
    </ul>
</div>
```

### Key Points:
- Wrapper: `<div class="note">` (styling is pre-defined)
- Heading: `<p><strong>Note:</strong></p>`
- Use `<ul>` and `<li>` for note points
- Use `<strong>` for emphasis within notes
- Use `<code>` for variable names and symbols
- NO inline styles (class "note" handles styling)

---

## Global Rules (Apply to ALL Sections)

### ✅ DO:
- Follow the exact sequence: Description → Image (optional) → Input/Output → Examples → Constraints → Table (optional) → Note
- Use `<code>` tags for all variable names, function names, data structures
- Use `<strong>` for emphasis and important points
- Use `<em>` for italic emphasis
- Use `<h3>` for section headings
- Use `<p>` for paragraphs
- Use `<ul>`/`<ol>` and `<li>` for lists
- Use HTML entities for special characters: `&lt;`, `&gt;`, `&le;`, `&ge;`
- Use `<sup>` for exponents and `<sub>` for subscripts
- Use `<br>` for spacing between examples
- Make descriptions clear, concise, and platform-neutral (like LeetCode/CodeChef/Codeforces)

### ❌ DON'T:
- NO emojis anywhere in the HTML
- NO inline styles (except for `<img>` and `<table>` tags only)
- NO solution approaches or algorithms in description
- NO custom CSS classes (use only: "example", "label", "value", "note")
- NO JavaScript or dynamic content
- NO external dependencies
- NO overly complex language or jargon
- NO inconsistent formatting

---

## Complete Template Example

```html
<p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to form a </em> <code>target</code>.</p>

<p>You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the <em>same</em> element twice.</p>

<p>You can return the answer in any order.</p>

<div>
    <img src="https://s3-lc-upload.s3.amazonaws.com/uploads/2018/07/17/question_11.jpg" alt="Problem Illustration" style="max-width: 100%; height: auto; border-radius: 8px;">
</div>

<h3>Input Format</h3>
<ol>
    <li>An integer <code>n</code> representing the number of rows in the matrix.</li>
    <li>An integer <code>m</code> representing the number of columns in the matrix.</li>
    <li><code>n</code> lines follow, each containing <code>m</code> space-separated integers representing the matrix rows.</li>
    <li>An integer <code>q</code> representing the number of queries.</li>
    <li>Each of the next <code>q</code> lines contains four integers <code>x1</code>, <code>y1</code>, <code>x2</code>, <code>y2</code> representing one query.</li>
</ol>

<h3>Output Format</h3>
<ul>
    <li>Print <code>q</code> lines, where each line contains a single integer representing the sum of the elements in the corresponding query submatrix.</li>
</ul>

<h3>Examples:</h3>

<p><strong>Example 1:</strong></p>
<div class="example">
  <div>
    <div class="label">Input</div>
    <div class="label">Output</div>
    <div class="value">nums = [2,7,11,15], target = 9</div>
    <div class="value">[0,1]</div>
  </div>
</div>
<p><strong>Explanation:</strong></p>
<p>Because nums[0] + nums[1] == 9, we return [0, 1].</p>

<br>

<p><strong>Example 2:</strong></p>
<div class="example">
  <div>
    <div class="label">Input</div>
    <div class="label">Output</div>
    <div class="value">nums = [3,2,4], target = 6</div>
    <div class="value">[1,2]</div>
  </div>
</div>
<p><strong>Explanation:</strong></p>
<p>Because nums[1] + nums[2] == 6, we return [1, 2].</p>

<br>

<p><strong>Example 3:</strong></p>
<div class="example">
  <div>
    <div class="label">Input</div>
    <div class="label">Output</div>
    <div class="value">nums = [3,3], target = 6</div>
    <div class="value">[0,1]</div>
  </div>
</div>
<p><strong>Explanation:</strong></p>
<p>Because nums[0] + nums[1] == 6, we return [0, 1].</p>

<h3>Constraints:</h3>
<ul>
    <li><code>2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li>
    <li><code>-10<sup>9</sup> &lt;= nums[i] &lt;= 10<sup>9</sup></code></li>
    <li><code>-10<sup>9</sup> &lt;= target &lt;= 10<sup>9</sup></code></li>
    <li><strong>Only one valid answer exists.</strong></li>
</ul>

<h3>Scoring:</h3>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 10px 0;">
    <thead>
        <tr>
            <th>Tier</th>
            <th>Runtime</th>
            <th>Points</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Tier-1</td>
            <td>600ms</td>
            <td>100 points</td>
        </tr>
        <tr>
            <td>Tier-2</td>
            <td>1000ms</td>
            <td>50 points</td>
        </tr>
        <tr>
            <td>Tier-3</td>
            <td>6000ms</td>
            <td>30 points</td>
        </tr>
    </tbody>
</table>
<br>

<div class="note">
    <p><strong>Note:</strong></p>
    <ul>
        <li>The returned indices should be <strong>0-based</strong>.</li>
        <li>You cannot use the same element twice (i.e., <code>i ≠ j</code>).</li>
        <li>There is exactly <strong>one valid solution</strong> for each test case.</li>
        <li>You can return the answer in any order.</li>
        <li>If the question fails to explain correctly then report your problem to admin.</li>
    </ul>
</div>
```

---

## Validation Checklist

Before finalizing any HTML description, verify:

- [ ] All sections follow the correct sequence
- [ ] All variable/function names are wrapped in `<code>` tags
- [ ] No emojis are present
- [ ] No inline styles (except `<img>` and `<table>`)
- [ ] All examples have input, output, and explanation
- [ ] Examples cover different edge cases
- [ ] Constraints are clear and appropriate for difficulty
- [ ] Note section includes boilerplate instruction
- [ ] HTML entities used for special characters (`&lt;`, `&gt;`, etc.)
- [ ] Proper heading hierarchy (`<h3>` for sections)
- [ ] No solution approaches revealed in description
- [ ] Language is clear, concise, and professional
- [ ] All required sections are present
- [ ] Optional sections (image, table) included only when necessary

---

## AI Prompt Usage

When using this document as a prompt for AI to generate HTML descriptions:

**Input to AI:**
1. Problem statement/requirements
2. This entire rules document
3. Difficulty level (Easy/Medium/Hard)
4. Any specific edge cases to cover

**Expected Output:**
- Complete HTML description following all rules
- Properly formatted with correct tags and structure
- No emojis, no inline styles (except allowed exceptions)
- All sections in correct sequence
- Examples covering edge cases
- Professional tone matching competitive programming platforms

---

**Version:** 2.0.0 
**Last Updated:** October 31, 2025  
**Maintained By:** Scope Club Development Team

### 3. `type`
- **Rules:**
  - Set to either `programming` or `MCQ` depending on the question type

### 4. `marks`
- **Rules:**
  - For programming:
    - `easy` = 30
    - `medium` = 50
    - `hard` = 100
  - For MCQ:
    - `easy` = 5
    - `medium` = 10
    - `hard` = 20

### 5. `difficulty`
- **Rules:**
  - Set to one of: `easy`, `medium`, `hard`

### 6. `questionBank`
- **Rules:**
  - Main topic or tag associated with the question (e.g., `DSA`, `Math`, `Strings`)

### 7. `tags`
- **Rules:**
  - Array of sub-tags related to the topic (e.g., `array`, `hash-table`, `searching`)

### 8. `companies`
- **Rules:**
  - Array of company names that have asked this question
  - Use only trusted sources for company lists

### 9. `hints`
- **Rules:**
  - 1-3 hints only
  - Hints should be minimal, clear, and not give away the full solution
  - Hints may suggest optimal approaches

### 10. `editorial`
- **Rules:**
  - Provide a detailed editorial/solution explanation in HTML format
  - Use headings, lists, and code tags as per the HTML template

### 11. `languages`
- **Rules:**
  - Array of language objects (preferably Java and Python, but can include C++, C, JavaScript)
    - `name`: Language name
    - `version`: Language version
    - `boilerplateCode`: Basic code template
      - Must include code to read `T` (number of test cases) and a loop to process each test case
      - For Java, class name must be `Main`
      - Import necessary packages
        - **Do NOT make boilerplate code complex.**
          - Only include imports, main function, and a simple test case loop for `T`.
          - Do NOT create new functions, methods, variables, or add any printing or complex implementations in the boilerplate.
          - Boilerplate should be minimal and straightforward, just enough to read input and set up the test case loop.
    - `solutionCode`: Full solution code
      - Must match the boilerplate structure and logic
      - All languages should follow the same logical approach
    - `scoringTiers`: Array of objects with `maxTime` and `points` for each tier
    - `minimumPoints`: Minimum points for the language
  - Example boilerplate:
    - **Java:**
      ```java
      import java.util.*;
      public class Main {
          public static void main(String[] args) {
              Scanner sc = new Scanner(System.in);
              int T = sc.nextInt();
              while (T-- > 0) {
                  // write your code here
              }
              sc.close();
          }
      }
      ```
    - **Python:**
      ```python
      T = int(input())
      for _ in range(T):
          # write your code here
          pass
      ```
    - **C++:**
      ```cpp
      #include <stdio.h>
      int main() {
          int T;
          scanf("%d", &T);
          while (T--) {
              // write your code here
          }
          return 0;
      }
      ```

### 12. `solutionCode`
- **Rules:**
  - Solution code must be correct and match the boilerplate structure
  - All languages should use the same logic
  - Solution must be suitable for the generated boilerplate

### 13. `scoringTiers`
- **Rules:**
  - Based on the number of approaches, split into 2-5 tiers
  - Example: 2 approaches = O(1), O(n); 3 approaches = O(1), O(n), O(n^2)
  - Points and time limits must not exceed the problem constraints

### 14. `testCases`
- **Rules:**
  - **Do NOT include `T` in the input for test cases** (even though boilerplate and solution code read `T`)
  - Output must be 100% accurate
  - Test cases must:
    - Cover minimal to maximal input sizes
    - Include edge cases (smallest, largest, all equal, strictly increasing/decreasing, random, patterned, worst-case, etc.)
    - Feature maximum allowed length/size and values
    - Span different distributions: random, adversarial, sorted, anti-sorted, all distinct, all same, with duplicates, etc.
    - Be unique and test distinct properties
    - Label edge cases and special scenarios above each test case block
    - For large inputs, describe methodology if generated by script
    - For complex cases, briefly state logic used for output generation
    - For small/edge cases, set `hidden: false` (visible, at most 5)
    - For large/repeated edge cases, set `hidden: true`
  - **Do NOT use quotes or commas to separate/highlight test cases; use spaces/newlines only**
  - Test case length and size must strictly follow the constraints in the description
  - Output must be mathematically and algorithmically verified
  - Add this prompt for AI:
    > You are an expert competitive programming problem setter and computational analyst.
    > Task:
    > I want to design a new programming problem and need a comprehensive set of testcases that:
    > - Cover a range from minimal to maximal input sizes as allowed by the problem constraints
    > - Include edge cases (smallest, largest, all equal elements, strictly increasing/decreasing, random, patterned, worst-case for common algorithms, etc.)
    > - Feature inputs of maximum allowed length/size and values
    > - Span different distributions: random, adversarial, sorted, anti-sorted, all distinct, all same, with duplicates, etc.
    > Requirements:
    > 1. For each test case, provide:
    >    - The **plaintext input**, following the exact input format described below (specify line breaks, spacing, etc.)
    >    - The **expected correct output** for that exact input according to the problem specifications
    > 2. Run deep mathematical and algorithmic analysis to ensure that the outputs match the true answer, with no errors, regardless of input size or composition.
    > 3. For large inputs (up to the maximum size allowed), generate inputs and outputs efficiently. If you use a script, describe your methodology.
    > 4. Ensure the correctness of outputs through:
    >    - Formal mathematical justification and/or
    >    - Reference implementations with proof of correctness
    >    - For complex cases, briefly state the logic used for output generation
    > 5. Every test case must be unique and test a distinct property or algorithmic edge, not just random.
    > 6. Label edge cases and special scenarios (e.g., “maximum size, all values equal”, “smallest input”, “max value edge case”, etc.) above each testcase block.
    > Input/Output Format:
    > [Describe the precise expected input format for your problem, including number of lines, data types, delimiters, and any special rules; you can paste your Input/Output Format section from your HTML template.]
    > Language/Math:
    > - Use proper LaTeX for formulas where relevant.
    > - For large integer ranges, state whether values should be at the allowed min/max.
    > - If floating point, specify required precision.
    > - If the expected output is nontrivial, briefly show the math or logic of the calculation.
    > Output Format:
    > - Each test case output should be **guaranteed 100% accurate**—no guesses, no partial results.
    > Make sure you understood the problem statement very very well and generate every edge testcase

### 15. `examples`
- **Rules:**
  **Version:** 1.0  
  **Last Updated:** October 31, 2025  
  **Maintained By:** Scope Cohorts Development Team

  ---

  # Reference Example JSON Document

  Below is a complete example JSON problem document for reference:

  ```json
- **Rules:**
  - Provide proper time and memory limits matching the problem

---

## II. MCQ Type Question
- **Rules:**
  - Do NOT generate test cases, constraints, etc.
  - Only generate options and specify which one is correct

---

## III. Fill in the Blank Question
- **Rules:**
  - Used to test syntactical knowledge
  - Set:
    ```json
    "encryptedEditor": true,
    "encryptionSettings": {
      "allowPlainTextPaste": true
    }
    ```
  - Define markers in code:
    - `/*<<START>>*/` and `/*<<END>>*/`
    - In boilerplate code, content inside markers should be empty
    - In solution code, content inside markers should be filled
  - Needs test cases, but only a few with small input sizes/lengths

---

Example Reference document: `two_sum_problem.json`
{
  "title": "Two Sum",
  "description": "<p>\n  Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices of the two numbers such that they add up to</em> <code>target</code>.\n</p>\n\n<p>\n  You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the <em>same</em> element twice.\n</p>\n\n<p>\n  You can return the answer in any order.\n</p>\n\n<h3>Constraints</h3>\n<ul>\n  <li><code>2 ≤ nums.length ≤ 10<sup>4</sup></code></li>\n  <li><code>-10<sup>9</sup> ≤ nums[i] ≤ 10<sup>9</sup></code></li>\n  <li><code>-10<sup>9</sup> ≤ target ≤ 10<sup>9</sup></code></li>\n  <li><strong>Only one valid answer exists.</strong></li>\n</ul>\n\n<h3>Input Format</h3>\n<ol>\n  <li>The first line contains an integer <code>T</code> — the number of test cases.</li>\n  <li>For each test case:</li>\n  <ul>\n    <li>First line: Integer <code>n</code> (size of array) and integer <code>target</code></li>\n    <li>Second line: <code>n</code> space-separated integers representing the array <code>nums</code></li>\n  </ul>\n</ol>\n\n<h3>Output Format</h3>\n<p>\n  For each test case, print two space-separated integers representing the indices (0-based) of the two numbers that add up to <code>target</code>.\n</p>\n\n<h3>Examples</h3>\n\n<p><strong>Example 1:</strong></p>\n<table border=\"1\" style=\"border-collapse: collapse; width: 100%;\">\n  <thead>\n    <tr>\n      <th>Input</th>\n      <th>Output</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>\n        n = 4, target = 9<br>\n        nums = [2, 7, 11, 15]\n      </td>\n      <td>0 1</td>\n    </tr>\n  </tbody>\n</table>\n<p><strong>Explanation:</strong> Because nums[0] + nums[1] = 2 + 7 = 9, we return indices [0, 1].</p>\n\n<p><strong>Example 2:</strong></p>\n<table border=\"1\" style=\"border-collapse: collapse; width: 100%;\">\n  <thead>\n    <tr>\n      <th>Input</th>\n      <th>Output</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>\n        n = 3, target = 6<br>\n        nums = [3, 2, 4]\n      </td>\n      <td>1 2</td>\n    </tr>\n  </tbody>\n</table>\n<p><strong>Explanation:</strong> Because nums[1] + nums[2] = 2 + 4 = 6, we return indices [1, 2].</p>\n\n<p><strong>Example 3:</strong></p>\n<table border=\"1\" style=\"border-collapse: collapse; width: 100%;\">\n  <thead>\n    <tr>\n      <th>Input</th>\n      <th>Output</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>\n        n = 2, target = 6<br>\n        nums = [3, 3]\n      </td>\n      <td>0 1</td>\n    </tr>\n  </tbody>\n</table>\n<p><strong>Explanation:</strong> Because nums[0] + nums[1] = 3 + 3 = 6, we return indices [0, 1].</p>\n\n<h3>Scoring Tiers</h3>\n<table border=\"1\" cellpadding=\"8\" cellspacing=\"0\" style=\"border-collapse: collapse; width: 100%; margin: 10px 0;\">\n  <thead>\n    <tr style=\"background-color: #f5f5f5;\">\n      <th>Tier</th>\n      <th>Max Runtime</th>\n      <th>Points Awarded</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td style=\"text-align: center;\">Tier 1</td>\n      <td style=\"text-align: center;\">≤ 500ms</td>\n      <td style=\"text-align: center;\"><strong>100 points</strong></td>\n    </tr>\n    <tr>\n      <td style=\"text-align: center;\">Tier 2</td>\n      <td style=\"text-align: center;\">≤ 1000ms</td>\n      <td style=\"text-align: center;\"><strong>70 points</strong></td>\n    </tr>\n    <tr>\n      <td style=\"text-align: center;\">Tier 3</td>\n      <td style=\"text-align: center;\">≤ 2000ms</td>\n      <td style=\"text-align: center;\"><strong>40 points</strong></td>\n    </tr>\n  </tbody>\n</table>\n\n<div class=\"note\" style=\"background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0;\">\n  <p><strong>Note:</strong></p>\n  <ul>\n    <li>The returned indices should be <strong>0-based</strong>.</li>\n    <li>You cannot use the same element twice (i.e., <code>i ≠ j</code>).</li>\n    <li>There is exactly <strong>one valid solution</strong> for each test case.</li>\n    <li>You can return the answer in any order.</li>\n  </ul>\n</div>\n\n<p><strong>Follow-up:</strong> Can you come up with an algorithm that is less than <code>O(n<sup>2</sup>)</code> time complexity?</p>",
  "type": "programming",
  "marks": 100,
  "questionBank": "DSA",
  "tags": [
    "array",
    "hash-table",
    "two-pointers",
    "searching"
  ],
  "companies": [
    "Amazon",
    "Google",
    "Microsoft",
    "Facebook",
    "Apple",
    "Adobe"
  ],
  "hints": [
    "A brute force approach involves checking every pair of numbers. Can you do better?",
    "Try using a hash map to store numbers you've already seen along with their indices.",
    "For each number, check if (target - current number) exists in the hash map.",
    "The hash map approach reduces the time complexity to O(n) with O(n) space."
  ],
  "editorial": "<h2>Solution Approach</h2>\n\n<h3>Approach 1: Brute Force (Not Recommended)</h3>\n<p>\n  The simplest approach is to use two nested loops to check every possible pair of numbers.\n</p>\n<p><strong>Time Complexity:</strong> O(n<sup>2</sup>)</p>\n<p><strong>Space Complexity:</strong> O(1)</p>\n<p>This approach will not pass the time limits for larger test cases.</p>\n\n<h3>Approach 2: Hash Map (Optimal Solution)</h3>\n<p>\n  We can solve this problem in a single pass using a hash map to store the numbers we've seen along with their indices.\n</p>\n\n<h4>Algorithm:</h4>\n<ol>\n  <li>Create an empty hash map to store numbers and their indices</li>\n  <li>Iterate through the array once:</li>\n  <ul>\n    <li>For each number, calculate the complement: <code>complement = target - current_number</code></li>\n    <li>Check if the complement exists in the hash map</li>\n    <li>If yes, we found our pair! Return the indices</li>\n    <li>If no, add the current number and its index to the hash map</li>\n  </ul>\n  <li>Continue until we find the pair</li>\n</ol>\n\n<h4>Why This Works:</h4>\n<p>\n  When we're at index <code>i</code> and looking for <code>target - nums[i]</code>, if that complement was already seen at some earlier index <code>j</code>, we have our answer: <code>[j, i]</code>.\n</p>\n\n<h4>Example Walkthrough:</h4>\n<p>Given: <code>nums = [2, 7, 11, 15]</code>, <code>target = 9</code></p>\n<table border=\"1\" style=\"border-collapse: collapse; width: 100%;\">\n  <thead>\n    <tr>\n      <th>Step</th>\n      <th>Current Number</th>\n      <th>Complement</th>\n      <th>Hash Map</th>\n      <th>Action</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>1</td>\n      <td>2 (index 0)</td>\n      <td>9 - 2 = 7</td>\n      <td>{}</td>\n      <td>7 not in map, add 2 → {2: 0}</td>\n    </tr>\n    <tr>\n      <td>2</td>\n      <td>7 (index 1)</td>\n      <td>9 - 7 = 2</td>\n      <td>{2: 0}</td>\n      <td>2 found in map! Return [0, 1]</td>\n    </tr>\n  </tbody>\n</table>\n\n<h4>Complexity Analysis:</h4>\n<ul>\n  <li><strong>Time Complexity:</strong> O(n) - We traverse the array only once</li>\n  <li><strong>Space Complexity:</strong> O(n) - In the worst case, we store all n elements in the hash map</li>\n</ul>\n\n<h3>Key Points to Remember:</h3>\n<ul>\n  <li>Hash map lookup is O(1) on average</li>\n  <li>We add elements to the map AFTER checking for the complement to avoid using the same element twice</li>\n  <li>The problem guarantees exactly one solution, so we don't need to handle the case of no solution</li>\n  <li>We can return the indices in any order</li>\n</ul>\n\n<h3>Common Mistakes to Avoid:</h3>\n<ul>\n  <li>Using the same element twice (i.e., nums[i] + nums[i])</li>\n  <li>Forgetting to store the index along with the value in the hash map</li>\n  <li>Adding the element to the map before checking for complement (can cause false positives)</li>\n</ul>",
  "encryptedEditor": false,
  "encryptionSettings": {
    "allowPlainTextPaste": false
  },
  "languages": [
    {
      "name": "java",
      "version": "15.0.2",
      "boilerplateCode": "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int T = sc.nextInt();\n        \n        while (T-- > 0) {\n            int n = sc.nextInt();\n            int target = sc.nextInt();\n            int[] nums = new int[n];\n            \n            for (int i = 0; i < n; i++) {\n                nums[i] = sc.nextInt();\n            }\n            \n            // Write your solution here\n            int[] result = twoSum(nums, target);\n            System.out.println(result[0] + \" \" + result[1]);\n        }\n        sc.close();\n    }\n    \n    public static int[] twoSum(int[] nums, int target) {\n        // Your code here\n        return new int[]{0, 0};\n    }\n}",
      "solutionCode": "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int T = sc.nextInt();\n        \n        while (T-- > 0) {\n            int n = sc.nextInt();\n            int target = sc.nextInt();\n            int[] nums = new int[n];\n            \n            for (int i = 0; i < n; i++) {\n                nums[i] = sc.nextInt();\n            }\n            \n            int[] result = twoSum(nums, target);\n            System.out.println(result[0] + \" \" + result[1]);\n        }\n        sc.close();\n    }\n    \n    public static int[] twoSum(int[] nums, int target) {\n        HashMap<Integer, Integer> map = new HashMap<>();\n        \n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            \n            if (map.containsKey(complement)) {\n                return new int[]{map.get(complement), i};\n            }\n            \n            map.put(nums[i], i);\n        }\n        \n        return new int[]{-1, -1};\n    }\n}",
      "scoringTiers": [
        {
          "maxTime": 500,
          "points": 100
        },
        {
          "maxTime": 1000,
          "points": 70
        },
        {
          "maxTime": 2000,
          "points": 40
        }
      ],
      "minimumPoints": 10
    },
    {
      "name": "python",
      "version": "3.10.0",
      "boilerplateCode": "def two_sum(nums, target):\n    # Write your solution here\n    pass\n\nif __name__ == '__main__':\n    T = int(input())\n    \n    for _ in range(T):\n        n, target = map(int, input().split())\n        nums = list(map(int, input().split()))\n        \n        result = two_sum(nums, target)\n        print(result[0], result[1])",
      "solutionCode": "def two_sum(nums, target):\n    hash_map = {}\n    \n    for i, num in enumerate(nums):\n        complement = target - num\n        \n        if complement in hash_map:\n            return [hash_map[complement], i]\n        \n        hash_map[num] = i\n    \n    return [-1, -1]\n\nif __name__ == '__main__':\n    T = int(input())\n    \n    for _ in range(T):\n        n, target = map(int, input().split())\n        nums = list(map(int, input().split()))\n        \n        result = two_sum(nums, target)\n        print(result[0], result[1])",
      "scoringTiers": [
        {
          "maxTime": 500,
          "points": 100
        },
        {
          "maxTime": 1000,
          "points": 70
        },
        {
          "maxTime": 2000,
          "points": 40
        }
      ],
      "minimumPoints": 10
    },
    {
      "name": "cpp",
      "version": "10.2.0",
      "boilerplateCode": "#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Write your solution here\n    return {0, 0};\n}\n\nint main() {\n    int T;\n    cin >> T;\n    \n    while (T--) {\n        int n, target;\n        cin >> n >> target;\n        \n        vector<int> nums(n);\n        for (int i = 0; i < n; i++) {\n            cin >> nums[i];\n        }\n        \n        vector<int> result = twoSum(nums, target);\n        cout << result[0] << \" \" << result[1] << endl;\n    }\n    \n    return 0;\n}",
      "solutionCode": "#include <iostream>\n#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    unordered_map<int, int> hashMap;\n    \n    for (int i = 0; i < nums.size(); i++) {\n        int complement = target - nums[i];\n        \n        if (hashMap.find(complement) != hashMap.end()) {\n            return {hashMap[complement], i};\n        }\n        \n        hashMap[nums[i]] = i;\n    }\n    \n    return {-1, -1};\n}\n\nint main() {\n    int T;\n    cin >> T;\n    \n    while (T--) {\n        int n, target;\n        cin >> n >> target;\n        \n        vector<int> nums(n);\n        for (int i = 0; i < n; i++) {\n            cin >> nums[i];\n        }\n        \n        vector<int> result = twoSum(nums, target);\n        cout << result[0] << \" \" << result[1] << endl;\n    }\n    \n    return 0;\n}",
      "scoringTiers": [
        {
          "maxTime": 500,
          "points": 100
        },
        {
          "maxTime": 1000,
          "points": 70
        },
        {
          "maxTime": 2000,
          "points": 40
        }
      ],
      "minimumPoints": 10
    },
    {
      "name": "javascript",
      "version": "18.15.0",
      "boilerplateCode": "function twoSum(nums, target) {\n    // Write your solution here\n    return [0, 0];\n}\n\nconst readline = require('readline');\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\nlet lines = [];\nrl.on('line', (line) => {\n    lines.push(line);\n}).on('close', () => {\n    const T = parseInt(lines[0]);\n    let lineIndex = 1;\n    \n    for (let t = 0; t < T; t++) {\n        const [n, target] = lines[lineIndex++].split(' ').map(Number);\n        const nums = lines[lineIndex++].split(' ').map(Number);\n        \n        const result = twoSum(nums, target);\n        console.log(result[0] + ' ' + result[1]);\n    }\n});",
      "solutionCode": "function twoSum(nums, target) {\n    const hashMap = new Map();\n    \n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        \n        if (hashMap.has(complement)) {\n            return [hashMap.get(complement), i];\n        }\n        \n        hashMap.set(nums[i], i);\n    }\n    \n    return [-1, -1];\n}\n\nconst readline = require('readline');\nconst rl = readline.createInterface({\n    input: process.stdin,\n    output: process.stdout\n});\n\nlet lines = [];\nrl.on('line', (line) => {\n    lines.push(line);\n}).on('close', () => {\n    const T = parseInt(lines[0]);\n    let lineIndex = 1;\n    \n    for (let t = 0; t < T; t++) {\n        const [n, target] = lines[lineIndex++].split(' ').map(Number);\n        const nums = lines[lineIndex++].split(' ').map(Number);\n        \n        const result = twoSum(nums, target);\n        console.log(result[0] + ' ' + result[1]);\n    }\n});",
      "scoringTiers": [
        {
          "maxTime": 500,
          "points": 100
        },
        {
          "maxTime": 1000,
          "points": 70
        },
        {
          "maxTime": 2000,
          "points": 40
        }
      ],
      "minimumPoints": 10
    }
  ],
  "defaultLanguage": "python",
  "testCases": [
    {
      "input": "4 9\n2 7 11 15",
      "output": "0 1",
      "hidden": false,
      "explanation": "nums[0] + nums[1] = 2 + 7 = 9, so indices are [0, 1]"
    },
    {
      "input": "3 6\n3 2 4",
      "output": "1 2",
      "hidden": false,
      "explanation": "nums[1] + nums[2] = 2 + 4 = 6, so indices are [1, 2]"
    },
    {
      "input": "2 6\n3 3",
      "output": "0 1",
      "hidden": false,
      "explanation": "nums[0] + nums[1] = 3 + 3 = 6, so indices are [0, 1]"
    },
    {
      "input": "5 10\n1 5 3 7 9",
      "output": "2 3",
      "hidden": false,
      "explanation": "nums[2] + nums[3] = 3 + 7 = 10, so indices are [2, 3]"
    },
    {
      "input": "6 15\n10 20 5 8 7 3",
      "output": "0 2",
      "hidden": true,
      "explanation": "nums[0] + nums[2] = 10 + 5 = 15, so indices are [0, 2]"
    },
    {
      "input": "4 0\n-3 2 1 3",
      "output": "0 3",
      "hidden": true,
      "explanation": "nums[0] + nums[3] = -3 + 3 = 0, so indices are [0, 3]"
    },
    {
      "input": "7 100\n50 10 30 70 40 20 80",
      "output": "2 3",
      "hidden": true,
      "explanation": "nums[2] + nums[3] = 30 + 70 = 100, so indices are [2, 3]"
    },
    {
      "input": "5 -5\n-1 -2 -3 -4 -5",
      "output": "1 2",
      "hidden": true,
      "explanation": "nums[1] + nums[2] = -2 + (-3) = -5, so indices are [1, 2]"
    },
    {
      "input": "8 20\n1 2 3 4 5 15 16 17",
      "output": "4 5",
      "hidden": true,
      "explanation": "nums[4] + nums[5] = 5 + 15 = 20, so indices are [4, 5]"
    },
    {
      "input": "3 1000000000\n500000000 500000000 1",
      "output": "0 1",
      "hidden": true,
      "explanation": "nums[0] + nums[1] = 500000000 + 500000000 = 1000000000, so indices are [0, 1]"
    }
  ],
  "examples": [],
  "constraints": {
    "timeLimit": 2000,
    "memoryLimit": 256
  }
}

## General Notes
- Use the sequence and field names exactly as shown in the example JSON
- Syntax must be valid JSON
- All fields must be present and correctly named
- Do NOT add extra fields or change the order
- Use the `two_sum_problem.json` as a template for structure and formatting
- For descriptions, always use the HTML template rules
- For test cases, strictly follow the input/output format and constraints
- For fill-in-the-blank, set the editor fields and markers as described

---

**Version:** 1.0  
**Last Updated:** October 31, 2025  
**Maintained By:** Scope Cohorts Development Team
