# HTML Description Editor Guide

## Overview
The HTML Description Editor allows you to create rich, formatted question descriptions using HTML elements. This provides better readability and presentation for your questions.

## Features

### 1. Quick Insert Buttons
Click on any of the element chips to quickly insert HTML tags:
- **Paragraph** - Basic text paragraphs
- **Bold** - Bold text formatting
- **Italic** - Italic text formatting  
- **Code** - Inline code snippets
- **Bullet List** - Unordered lists
- **Numbered List** - Ordered lists
- **Table** - Data tables
- **Image** - Images with responsive sizing
- **Line Break** - Force line breaks
- **Horizontal Rule** - Section dividers

### 2. Preview Functionality
- Click the **Preview** button to see how your HTML will render
- The preview shows exactly how it will appear in the problem view
- Supports dark/light mode theming

### 3. Predefined CSS Classes
Use these special classes for enhanced styling:

#### `.note` - Information Notes
```html
<div class="note">
<strong>Note:</strong> This is important information for students.
</div>
```

#### `.warning` - Warning Messages
```html
<div class="warning">
<strong>Warning:</strong> Be careful with edge cases!
</div>
```

#### `.highlight` - Highlighted Text
```html
<span class="highlight">Important concept</span>
```

### 4. Responsive Images
All images are automatically responsive:
```html
<img src="your-image-url" alt="Description" style="max-width: 400px;" />
```

### 5. Code Formatting
- Inline code: `<code>variable</code>`
- Code blocks: `<pre><code>function example() { ... }</code></pre>`

### 6. Tables
Tables are automatically styled with borders and hover effects:
```html
<table border="1" style="border-collapse: collapse; width: 100%;">
  <thead>
    <tr>
      <th>Header 1</th>
      <th>Header 2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data 1</td>
      <td>Data 2</td>
    </tr>
  </tbody>
</table>
```

## Best Practices

1. **Structure Content**: Use paragraphs, headings, and lists to organize information
2. **Highlight Key Points**: Use bold, code tags, and highlight class for important concepts
3. **Use Tables for Data**: Present input/output examples in tables for clarity
4. **Add Visual Breaks**: Use horizontal rules to separate sections
5. **Include Examples**: Show sample inputs/outputs in formatted tables
6. **Use Notes and Warnings**: Call attention to important information

## Example Template

```html
<p>Solve the following problem:</p>
<p>Given an array of integers, find the <strong>maximum sum</strong> of any contiguous subarray.</p>

<div class="note">
<strong>Note:</strong> This is a classic dynamic programming problem.
</div>

<p><strong>Example:</strong></p>
<table border="1" style="border-collapse: collapse; width: 100%;">
  <thead>
    <tr>
      <th>Input</th>
      <th>Output</th>
      <th>Explanation</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>[1, -3, 2, 1, -1]</code></td>
      <td><code>3</code></td>
      <td>Subarray <code>[2, 1]</code> has maximum sum</td>
    </tr>
  </tbody>
</table>

<p><strong>Constraints:</strong></p>
<ul>
  <li>Array length: 1 ≤ n ≤ 10<sup>5</sup></li>
  <li>Element values: -10<sup>4</sup> ≤ arr[i] ≤ 10<sup>4</sup></li>
</ul>

<div class="warning">
<strong>Edge Case:</strong> Handle arrays with all negative numbers!
</div>
```

## Technical Details

- The editor uses `dangerouslySetInnerHTML` for rendering
- All styles are automatically applied based on dark/light mode
- Images are constrained to container width for responsiveness
- Tables include hover effects and alternating row colors
- Code blocks have syntax highlighting background
