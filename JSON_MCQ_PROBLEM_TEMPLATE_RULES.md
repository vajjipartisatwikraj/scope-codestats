# JSON MCQ Problem Document Template — Rules & Regulations

**Purpose:** defines the strict, field-by-field contract for authoring **`type: "mcq"`** questions as a single JSON file containing **many questions**, ready to paste or upload in the admin **Bulk Upload** tab.

Every rule here is enforced by `backend/services/bulkQuestionUploadService.js` and the `Question` model, plus the client-side check in `BulkQuestionUpload.jsx`. Anything that violates them rejects the **entire batch** — bulk upload is all-or-nothing by design, so a single bad option never leaves you with a half-loaded module.

This is the MCQ counterpart of `JSON_PROBLEM_TEMPLATE_RULES.md` (programming) and `JSON_SQL_PROBLEM_TEMPLATE_RULES.md` (SQL).

---

## 0. File shape and how it is consumed

One file holds **many** MCQs:

```json
{
  "questions": [
    { "title": "Select the Correct Option:", "type": "mcq", "...": "..." },
    { "title": "Select the Correct Option:", "type": "mcq", "...": "..." }
  ]
}
```

Three top-level shapes are accepted by the uploader:

| Shape | Example | Use |
|---|---|---|
| Object with `questions` | `{ "questions": [ … ] }` | **Recommended** — use this |
| Bare array | `[ { … }, { … } ]` | Accepted |
| Single object | `{ … }` | Accepted, one question |

**Where to upload**

1. Admin → cohort → module → **Add Question** → **Bulk Upload** tab.
2. Either **Choose JSON Files** (up to 25 files at once) or **Paste JSON** for a single source.
3. Every file and question is validated before anything is written. The preview table lists each question with its type, difficulty, marks and option count.
4. **Upload** creates them all in one atomic operation.

Hard limits, enforced on both sides:

- **25** files per batch
- **100** questions per batch in total

A file of 150 MCQs must be split. The batch limit counts questions across *all* selected files, not per file.

Mixing types in one file is allowed: `type: "mcq"` and `type: "programming"` questions can sit side by side in the same `questions` array. **`type: "sql"` is rejected** — SQL questions publish assets to S3 and must go through the SQL question form.

---

## I. Field reference

### 1. `title` — **required**
- Non-empty string.
- **Platform convention: the title must be exactly `Select the Correct Option:`** for every MCQ. The question itself lives in `description`. This keeps question lists uniform, since an MCQ title would otherwise leak the answer in the listing.

```json
"title": "Select the Correct Option:"
```

### 2. `description` — **required**
- Non-empty HTML string. This is the actual question. Full formatting rules in **Section II**.
- **Mandatory formatting rule:** whenever the question involves a **formula, equation, or any mathematical notation** — fractions, exponents, roots, summations, products, limits, integrals, matrices, inequalities, ratios, percentages, subscripted variables, set or logic symbols — it **must be properly formatted**, never written as flat ASCII.
  - Use **MathML** for anything with structure: `<math display="block">` for a standalone formula, `<math display="inline">` inside a sentence.
  - Use `<code>` for short inline symbols and identifiers, `<sup>`/`<sub>` for simple exponents and indices, and HTML entities (`&le;`, `&ge;`, `&ne;`, `&times;`, `&divide;`, `&radic;`, `&pi;`, `&infin;`, `&sum;`) for standalone operators.
  - Use `<pre><code>` for code and pseudocode so indentation survives.
  - Use a `<table>` when the question supplies tabular data the reader must consult.

  | Do not write | Write instead |
  |---|---|
  | `(a+b)/2` | `<math display="inline"><mfrac><mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow><mn>2</mn></mfrac></math>` |
  | `x^2 + y^2 = r^2` | `<math display="inline"><mrow><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo><msup><mi>y</mi><mn>2</mn></msup><mo>=</mo><msup><mi>r</mi><mn>2</mn></msup></mrow></math>` |
  | `sqrt(n)` | `<math display="inline"><msqrt><mi>n</mi></msqrt></math>` |
  | `sum from i=1 to n of i` | `<math display="block"><mrow><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>n</mi></munderover><mi>i</mi></mrow></math>` |
  | `O(n log n)` | `<code>O(n log n)</code>` |
  | `n <= 100` | `<code>n &le; 100</code>` |
  | `20%` in prose | `<code>20%</code>` |

  A question whose formula reads as unformatted plain text is considered incomplete, even though the validator will accept it — the validator only checks that the description is a non-empty string, so this rule is on the author.

### 3. `type` — **required**
- Exactly `"mcq"`. Lower-case; `"MCQ"` is **not** accepted by the bulk validator.

### 4. `difficultyLevel` — optional, defaults to `medium`
- One of `easy`, `medium`, `hard`. Note the field name is `difficultyLevel`, **not** `difficulty`.

### 5. `marks` — optional, defaults to `10`
- Must be a **positive number**. Zero and negatives are rejected.
- **Platform convention for MCQs:**

| Difficulty | Marks |
|---|---|
| `easy` | **2** |
| `medium` | **5** |
| `hard` | **10** |

### 6. `options` — **required**
- Array of **at least 2** options. **Platform convention: exactly 4.**
- Every option object needs:
  - `text` — non-empty string
  - `isCorrect` — **a real boolean**, on *every* option

Two rules that catch people out:

> **`isCorrect` must be present and boolean on every option.** Omitting it on the wrong answers fails validation with `isCorrect must be a boolean`. `"false"` (a string) and `0` also fail.

> **Option text must be plain text, with no HTML.** It is rendered verbatim, so `<code>O(n)</code>` displays those angle brackets literally. Put code formatting in the `description`, never in an option.

- At least one option must have `isCorrect: true`.
- **Platform convention: exactly one correct option.** The validator permits several, but the solving screen is single-select, so more than one correct answer is unanswerable in practice.
- All four options must be **semantically distinct**. Avoid "None of the above" unless it is genuinely the answer.

```json
"options": [
  { "text": "O(n)",       "isCorrect": false },
  { "text": "O(log n)",   "isCorrect": true  },
  { "text": "O(n log n)", "isCorrect": false },
  { "text": "O(1)",       "isCorrect": false }
]
```

### 7. `hints` — optional
- Array of 1–3 short strings. Nudge toward the reasoning without stating the answer.

### 8. `tags` — optional
- Array of sub-topic strings: `["binary-search", "complexity"]`.

### 9. `companies` — optional
- Array of company names. **Platform convention: `["Virtusa"]`** for the curated bank.

### 10. `editorial` — optional
- HTML string explaining *why* the correct option is correct, shown after answering. Same HTML conventions as the description.

### Fields that do **not** apply to MCQs

`languages`, `defaultLanguage`, `testCases`, `constraints`, `fillInTheBlank`, `encryptedEditor`, `scoringTiers`, `sqlMeta`. Including them is harmless — the mapper ignores them for MCQs — but leave them out for clarity.

---

## II. `description` — HTML rules

The description carries the whole question. It is rendered as HTML, so it can be formatted properly.

### Global rules

- **No emojis.**
- **No inline styles**, except on `<img>` and `<table>` (identical to the programming template).
- Only the pre-defined classes: `example`, `label`, `value`, `note`.
- Wrap every variable, keyword, function and identifier in `<code>`.
- Use `<strong>` for emphasis, `<em>` for italics.
- Use HTML entities for comparisons: `&lt;`, `&gt;`, `&le;`, `&ge;`.
- Use `<sup>`/`<sub>` for exponents and subscripts.
- **Never put the option letters (A/B/C/D) in the description.** Options come from the `options` array.
- If the Question is type of Paragraph answer question then give paragraph for all MCQ Type question
- If the Question is type of Fill in the blank then place ________ dashes
- If question doesnt have any options then prepare set of 4 options among which one is correct and remaining 3 are wrong


### Plain question

```json
"description": "<p>What is the time complexity of binary search on a sorted array of <code>n</code> elements?</p>"
```

### Code and pseudocode

Use `<pre><code>` so whitespace and indentation survive:

```html
<p>Consider the following Java snippet:</p>
<pre><code>int x = 5;
x += x++ + ++x;
System.out.println(x);</code></pre>
<p>What is printed?</p>
```

### Mathematical formulas — MathML (required whenever maths appears)

Any formula or mathematical notation in a description **must** be marked up. Use MathML — not images, not LaTeX, not plain ASCII. `display="block"` for a standalone formula, `display="inline"` inside a sentence.

```html
<p>Evaluate the sum
<math display="block">
  <mrow>
    <munderover><mo>∑</mo><mrow><mi>n</mi><mo>=</mo><mn>1</mn></mrow><mrow><mo>+</mo><mn>∞</mn></mrow></munderover>
    <mfrac><mn>1</mn><msup><mi>n</mi><mn>2</mn></msup></mfrac>
  </mrow>
</math>
which converges to <math display="inline"><mfrac><msup><mi>π</mi><mn>2</mn></msup><mn>6</mn></mfrac></math>.</p>
```

Common constructs: `<mfrac>` fractions, `<msup>`/`<msub>` powers and indices, `<msqrt>` roots, `<munderover>` sums and products, `<mi>` identifiers, `<mn>` numbers, `<mo>` operators.

### Tables

For data the question refers to:

```html
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 10px 0;">
    <thead>
        <tr><th>Process</th><th>Burst Time</th><th>Arrival</th></tr>
    </thead>
    <tbody>
        <tr><td>P1</td><td>5</td><td>0</td></tr>
        <tr><td>P2</td><td>3</td><td>1</td></tr>
    </tbody>
</table>
```

### Note block

Only when a genuine clarification is needed:

```html
<div class="note">
    <p><strong>Note:</strong></p>
    <ul>
        <li>Assume <strong>0-based</strong> indexing.</li>
        <li>All operations use 32-bit signed integers.</li>
    </ul>
</div>
```

---

## III. Complete multi-question example

Paste this straight into the Bulk Upload tab. It creates five MCQs and demonstrates plain text, a code snippet, MathML, a table and an editorial.

```json
{
  "questions": [
    {
      "title": "Select the Correct Option:",
      "description": "<p>What is the time complexity of binary search on a sorted array of <code>n</code> elements?</p>",
      "type": "mcq",
      "difficultyLevel": "easy",
      "marks": 2,
      "options": [
        { "text": "O(n)", "isCorrect": false },
        { "text": "O(log n)", "isCorrect": true },
        { "text": "O(n log n)", "isCorrect": false },
        { "text": "O(1)", "isCorrect": false }
      ],
      "hints": ["Each comparison discards half of the remaining range."],
      "tags": ["dsa", "searching", "complexity"],
      "companies": ["Virtusa"],
      "editorial": "<p>Binary search halves the search space on every comparison, so the number of comparisons grows with <code>log&#8322;n</code>, giving <code>O(log n)</code>.</p>"
    },
    {
      "title": "Select the Correct Option:",
      "description": "<p>Consider the following Java program:</p>\n<pre><code>public class Main {\n    public static void main(String[] args) {\n        int x = 5;\n        x += x++ + ++x;\n        System.out.println(x);\n    }\n}</code></pre>\n<p>What does it print?</p>",
      "type": "mcq",
      "difficultyLevel": "hard",
      "marks": 10,
      "options": [
        { "text": "17", "isCorrect": true },
        { "text": "16", "isCorrect": false },
        { "text": "18", "isCorrect": false },
        { "text": "15", "isCorrect": false }
      ],
      "tags": ["java", "operators"],
      "companies": ["Virtusa"],
      "editorial": "<p>Evaluation is left to right. <code>x++</code> yields 5 and leaves x as 6; <code>++x</code> makes x 7 and yields 7. The compound assignment uses the original value of x on the left, so the result is <code>5 + (5 + 7) = 17</code>.</p>"
    },
    {
      "title": "Select the Correct Option:",
      "description": "<p>A train covers a distance at a uniform speed. If the speed were increased by 10 km/h, the journey would take one hour less; if it were reduced by 10 km/h, it would take two hours more.</p>\n<p>The distance <math display=\"inline\"><mi>d</mi></math> satisfies\n<math display=\"block\">\n  <mrow>\n    <mfrac><mi>d</mi><mrow><mi>v</mi><mo>+</mo><mn>10</mn></mrow></mfrac>\n    <mo>=</mo>\n    <mfrac><mi>d</mi><mi>v</mi></mfrac>\n    <mo>&#8722;</mo>\n    <mn>1</mn>\n  </mrow>\n</math>\nWhat is the distance in kilometres?</p>",
      "type": "mcq",
      "difficultyLevel": "medium",
      "marks": 5,
      "options": [
        { "text": "600", "isCorrect": true },
        { "text": "540", "isCorrect": false },
        { "text": "660", "isCorrect": false },
        { "text": "720", "isCorrect": false }
      ],
      "hints": ["Form two equations in speed and time, then eliminate time."],
      "tags": ["quantitative-aptitude", "time-speed-distance"],
      "companies": ["Virtusa"]
    },
    {
      "title": "Select the Correct Option:",
      "description": "<p>Three processes arrive at time 0 with the burst times below and are scheduled using <strong>Shortest Job First</strong>.</p>\n<table border=\"1\" cellpadding=\"8\" cellspacing=\"0\" style=\"border-collapse: collapse; width: 100%; margin: 10px 0;\">\n    <thead>\n        <tr><th>Process</th><th>Burst Time (ms)</th></tr>\n    </thead>\n    <tbody>\n        <tr><td>P1</td><td>6</td></tr>\n        <tr><td>P2</td><td>2</td></tr>\n        <tr><td>P3</td><td>4</td></tr>\n    </tbody>\n</table>\n<p>What is the average waiting time?</p>",
      "type": "mcq",
      "difficultyLevel": "medium",
      "marks": 5,
      "options": [
        { "text": "2.67 ms", "isCorrect": true },
        { "text": "4.00 ms", "isCorrect": false },
        { "text": "3.33 ms", "isCorrect": false },
        { "text": "6.00 ms", "isCorrect": false }
      ],
      "tags": ["os", "cpu-scheduling"],
      "companies": ["Virtusa"],
      "editorial": "<p>SJF order is P2, P3, P1. Waiting times are 0, 2 and 6, so the average is <code>(0 + 2 + 6) / 3 = 2.67 ms</code>.</p>"
    },
    {
      "title": "Select the Correct Option:",
      "description": "<p>Which normal form removes <strong>transitive</strong> functional dependencies on the primary key?</p>",
      "type": "mcq",
      "difficultyLevel": "easy",
      "marks": 2,
      "options": [
        { "text": "First Normal Form", "isCorrect": false },
        { "text": "Second Normal Form", "isCorrect": false },
        { "text": "Third Normal Form", "isCorrect": true },
        { "text": "Boyce-Codd Normal Form", "isCorrect": false }
      ],
      "tags": ["dbms", "normalization"],
      "companies": ["Virtusa"],
      "editorial": "<p>3NF requires that no non-key attribute depends transitively on the primary key. 2NF only removes partial dependencies, and BCNF is a stricter form addressing every determinant.</p>"
    }
  ]
}
```

---

## IV. Minimal template to copy

The smallest valid MCQ, for building a bank quickly:

```json
{
  "questions": [
    {
      "title": "Select the Correct Option:",
      "description": "<p>QUESTION TEXT HERE</p>",
      "type": "mcq",
      "difficultyLevel": "easy",
      "marks": 2,
      "options": [
        { "text": "OPTION A", "isCorrect": false },
        { "text": "OPTION B", "isCorrect": true },
        { "text": "OPTION C", "isCorrect": false },
        { "text": "OPTION D", "isCorrect": false }
      ],
      "tags": [],
      "companies": ["Virtusa"]
    }
  ]
}
```

---

## V. Validation checklist

Structure:
- [ ] Top level is `{ "questions": [ … ] }`
- [ ] At most **100** questions in the batch, across at most **25** files
- [ ] Valid JSON — no trailing commas, all strings double-quoted, newlines written as `\n`

Every question:
- [ ] `title` is exactly `Select the Correct Option:`
- [ ] `type` is `"mcq"`, lower-case
- [ ] `description` is non-empty HTML holding the actual question
- [ ] `difficultyLevel` is `easy` / `medium` / `hard`
- [ ] `marks` matches the difficulty: 2 / 5 / 10
- [ ] Exactly **4** options
- [ ] Every option has a non-empty `text` **and** an `isCorrect` boolean
- [ ] Exactly **one** option is `true`
- [ ] Option text contains **no HTML tags**
- [ ] Options are semantically distinct, and the correct one is genuinely correct
- [ ] `companies` is `["Virtusa"]` for the curated bank

Description HTML:
- [ ] No emojis; no inline styles except on `<img>` and `<table>`
- [ ] Code and pseudocode in `<pre><code>`, identifiers in `<code>`
- [ ] **Every formula, equation and mathematical notation is properly formatted** — MathML for structured maths, `<code>` for inline symbols, `<sup>`/`<sub>` for simple powers and indices. No flat ASCII such as `(a+b)/2`, `x^2` or `sqrt(n)`
- [ ] Tabular data presented in a `<table>`, not as run-on text
- [ ] HTML entities for `<`, `>`, `≤`, `≥` and other symbols
- [ ] No option letters (A/B/C/D) inside the description

Before uploading:
- [ ] Pasted into the Bulk Upload tab and the preview shows the expected count, types and marks
- [ ] Every question answered by hand to confirm the flagged option is the right one

---

## VI. Common rejection messages

| Message | Cause |
|---|---|
| `Type must be 'mcq' or 'programming'` | `type` misspelled, capitalised, or missing |
| `MCQ questions must have at least two options` | Fewer than 2 options, or `options` is not an array |
| `Option text must be a non-empty string` | An option is missing `text`, or it is blank |
| `isCorrect must be a boolean` | `isCorrect` omitted, or given as `"true"` / `1` |
| `MCQ questions must have at least one correct option` | No option marked `true` |
| `Marks must be a positive number` | `marks` is 0, negative, or a string |
| `Difficulty must be 'easy', 'medium', or 'hard'` | `difficultyLevel` typo, or `difficulty` used instead |
| `Title must be a non-empty string` | `title` missing or blank |
| `SQL questions must be created through the SQL question form` | A `type: "sql"` question is in the batch |
| `Bulk upload supports at most 100 total questions` | Batch too large — split the file |

The error names the file, the question index and the failing field path, so fix that question and re-upload the whole batch.

---

**Version:** 1.0.0
**Last Updated:** August 24, 2026
**Maintained By:** Scope Cohorts Development Team
