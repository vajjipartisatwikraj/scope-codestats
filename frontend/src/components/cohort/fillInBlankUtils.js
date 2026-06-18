/**
 * Fill in the Blank Utilities for Code Editor
 * Handles parsing markers and applying read-only regions in Monaco Editor
 */

export const FILL_IN_BLANK_MARKERS = {
  START: "/*<<START>>*/",
  END: "/*<<END>>*/",
};

/**
 * Parse code to find editable regions marked with START/END comments.
 * Returns array of editable ranges with line numbers (1-indexed).
 */
export const parseFillInBlankRegions = (code) => {
  if (!code) return { editableRegions: [], markerLines: [] };

  const lines = code.split("\n");
  const editableRegions = [];
  const markerLines = [];
  let inEditableRegion = false;
  let currentRegion = null;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (trimmedLine.includes(FILL_IN_BLANK_MARKERS.START)) {
      if (trimmedLine === FILL_IN_BLANK_MARKERS.START) {
        markerLines.push(index + 1);
        if (!inEditableRegion) {
          inEditableRegion = true;
          currentRegion = {
            startLine: index + 2,
            endLine: null,
            startMarkerLine: index + 1,
          };
        }
      } else {
        if (!inEditableRegion) {
          inEditableRegion = true;
          currentRegion = {
            startLine: index + 1,
            endLine: null,
            startMarkerLine: index + 1,
          };
        }
      }
    }

    if (trimmedLine.includes(FILL_IN_BLANK_MARKERS.END)) {
      if (inEditableRegion && currentRegion) {
        if (trimmedLine === FILL_IN_BLANK_MARKERS.END) {
          markerLines.push(index + 1);
          currentRegion.endLine = index;
          currentRegion.endMarkerLine = index + 1;
        } else {
          currentRegion.endLine = index + 1;
          currentRegion.endMarkerLine = index + 1;
        }

        if (currentRegion.endLine >= currentRegion.startLine) {
          editableRegions.push(currentRegion);
        }

        inEditableRegion = false;
        currentRegion = null;
      }
    }
  });

  return { editableRegions, markerLines };
};

/**
 * Parse code and adjust line numbers for display without markers.
 * Recalculates line numbers after marker removal.
 */
export const parseForDisplayWithoutMarkers = (code) => {
  if (!code) return { editableRegions: [], displayCode: "", lineMap: {} };

  const lines = code.split("\n");
  const editableRegions = [];
  const displayLines = [];
  const lineMap = {};

  let inEditableRegion = false;
  let currentRegion = null;
  let displayLineNumber = 0;

  lines.forEach((line, index) => {
    const originalLineNumber = index + 1;
    const trimmedLine = line.trim();

    // Both markers on the same line (single-line editable region)
    if (
      trimmedLine.includes(FILL_IN_BLANK_MARKERS.START) &&
      trimmedLine.includes(FILL_IN_BLANK_MARKERS.END)
    ) {
      displayLineNumber++;
      const cleanedLine = line
        .replace(FILL_IN_BLANK_MARKERS.START, "")
        .replace(FILL_IN_BLANK_MARKERS.END, "");
      displayLines.push(cleanedLine);
      lineMap[displayLineNumber] = originalLineNumber;

      editableRegions.push({
        startLine: displayLineNumber,
        endLine: displayLineNumber,
      });
    }
    // START marker only
    else if (trimmedLine.includes(FILL_IN_BLANK_MARKERS.START)) {
      if (!inEditableRegion) {
        inEditableRegion = true;

        if (trimmedLine === FILL_IN_BLANK_MARKERS.START) {
          // Standalone marker - skip this line
          currentRegion = {
            startLine: null,
            endLine: null,
          };
        } else {
          // Inline marker without END on same line
          displayLineNumber++;
          const cleanedLine = line.replace(FILL_IN_BLANK_MARKERS.START, "");
          displayLines.push(cleanedLine);
          lineMap[displayLineNumber] = originalLineNumber;

          currentRegion = {
            startLine: displayLineNumber,
            endLine: displayLineNumber,
          };
        }
      }
    }
    // END marker only
    else if (trimmedLine.includes(FILL_IN_BLANK_MARKERS.END)) {
      if (inEditableRegion && currentRegion) {
        if (trimmedLine === FILL_IN_BLANK_MARKERS.END) {
          // Standalone marker - skip this line
        } else {
          // Inline marker - add line with marker removed
          displayLineNumber++;
          const cleanedLine = line.replace(FILL_IN_BLANK_MARKERS.END, "");
          displayLines.push(cleanedLine);
          lineMap[displayLineNumber] = originalLineNumber;
          currentRegion.endLine = displayLineNumber;
        }

        if (
          currentRegion.startLine &&
          currentRegion.endLine >= currentRegion.startLine
        ) {
          editableRegions.push(currentRegion);
        }
        inEditableRegion = false;
        currentRegion = null;
      }
    }
    // Regular line
    else {
      displayLineNumber++;
      displayLines.push(line);
      lineMap[displayLineNumber] = originalLineNumber;

      if (inEditableRegion && currentRegion) {
        if (currentRegion.startLine === null) {
          currentRegion.startLine = displayLineNumber;
        }
        currentRegion.endLine = displayLineNumber;
      }
    }
  });

  return {
    editableRegions,
    displayCode: displayLines.join("\n"),
    lineMap,
  };
};

export const isLineEditable = (lineNumber, editableRegions) => {
  return editableRegions.some(
    (region) => lineNumber >= region.startLine && lineNumber <= region.endLine
  );
};

/**
 * Apply read-only decorations to Monaco Editor.
 * Makes non-editable lines read-only and highlights editable regions.
 */
export const applyFillInBlankDecorations = (
  editor,
  monaco,
  originalCodeWithMarkers
) => {
  if (!editor || !monaco || !originalCodeWithMarkers) {
    return "";
  }

  const { editableRegions, displayCode } =
    parseForDisplayWithoutMarkers(originalCodeWithMarkers);

  if (!editableRegions || editableRegions.length === 0) {
    return displayCode;
  }

  const model = editor.getModel();
  if (!model) return displayCode;

  const totalLines = model.getLineCount();
  const decorations = [];
  const darkMode = editor._themeService?.getColorTheme?.()?.type === 2;

  for (let lineNumber = 1; lineNumber <= totalLines; lineNumber++) {
    const isEditable = isLineEditable(lineNumber, editableRegions);
    const prefix = isEditable ? "editable" : "readonly";

    decorations.push({
      range: new monaco.Range(
        lineNumber,
        1,
        lineNumber,
        model.getLineMaxColumn(lineNumber)
      ),
      options: {
        isWholeLine: true,
        className: `fill-in-blank-${prefix}-${darkMode ? "dark" : "light"}`,
        linesDecorationsClassName: `fill-in-blank-${prefix}-gutter-${darkMode ? "dark" : "light"}`,
      },
    });
  }

  editor._fillInBlankDecorations = editor.deltaDecorations([], decorations);

  return displayCode;
};

/**
 * Setup change event handler to prevent editing read-only regions.
 * Monitors content changes and restores invalid edits immediately.
 */
export const setupFillInBlankRestrictions = (
  editor,
  originalCodeWithMarkers,
  _regionsFromParsing,
  monaco
) => {
  if (!editor || !originalCodeWithMarkers) return null;

  const { editableRegions } = parseForDisplayWithoutMarkers(
    originalCodeWithMarkers
  );

  if (!editableRegions || editableRegions.length === 0) {
    return null;
  }

  const model = editor.getModel();
  let isRestoring = false;
  let lastValidContent = model.getValue();

  const isValidEdit = (startLine, endLine) => {
    for (let line = startLine; line <= endLine; line++) {
      if (!isLineEditable(line, editableRegions)) {
        return false;
      }
    }
    return true;
  };

  const changeDisposable = model.onDidChangeContent((event) => {
    if (isRestoring) return;

    let hasInvalidChange = false;

    for (const change of event.changes) {
      const { startLineNumber, endLineNumber } = change.range;
      if (!isValidEdit(startLineNumber, endLineNumber)) {
        hasInvalidChange = true;
        break;
      }
    }

    if (hasInvalidChange) {
      isRestoring = true;

      const selection = editor.getSelection();
      model.pushEditOperations(
        [],
        [
          {
            range: model.getFullModelRange(),
            text: lastValidContent,
          },
        ],
        () => null
      );

      if (selection) {
        editor.setSelection(selection);
      }

      isRestoring = false;
    } else {
      lastValidContent = model.getValue();
    }
  });

  const pasteDisposable = editor.onDidPaste((event) => {
    if (isRestoring) return;

    const { startLineNumber, endLineNumber } = event.range;

    if (!isValidEdit(startLineNumber, endLineNumber)) {
      isRestoring = true;
      model.pushEditOperations(
        [],
        [
          {
            range: model.getFullModelRange(),
            text: lastValidContent,
          },
        ],
        () => null
      );
      isRestoring = false;
    }
  });

  return () => {
    changeDisposable.dispose();
    pasteDisposable.dispose();
  };
};

/**
 * Remove marker lines from code for display.
 * Standalone markers are removed entirely; inline markers are stripped from lines.
 */
export const removeMarkerLinesForDisplay = (code) => {
  if (!code) return "";

  return code
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (
        trimmed === FILL_IN_BLANK_MARKERS.START ||
        trimmed === FILL_IN_BLANK_MARKERS.END
      ) {
        return null;
      }

      if (
        line.includes(FILL_IN_BLANK_MARKERS.START) ||
        line.includes(FILL_IN_BLANK_MARKERS.END)
      ) {
        return line
          .replace(FILL_IN_BLANK_MARKERS.START, "")
          .replace(FILL_IN_BLANK_MARKERS.END, "");
      }

      return line;
    })
    .filter((line) => line !== null)
    .join("\n");
};

export const removeMarkerLines = (code) => removeMarkerLinesForDisplay(code);

export const injectFillInBlankStyles = () => {
  const styleId = "fill-in-blank-styles";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .fill-in-blank-readonly-light {
      color: #1976d2 !important;
    }
    .fill-in-blank-readonly-gutter-light {
      background-color: rgba(25, 118, 210, 0.1) !important;
    }
    .fill-in-blank-readonly-dark {
      color: #64b5f6 !important;
    }
    .fill-in-blank-readonly-gutter-dark {
      background-color: rgba(100, 181, 246, 0.15) !important;
    }
    .fill-in-blank-editable-light {}
    .fill-in-blank-editable-gutter-light {
      background-color: rgba(76, 175, 80, 0.3) !important;
      border-left: 4px solid #4CAF50 !important;
    }
    .fill-in-blank-editable-dark {}
    .fill-in-blank-editable-gutter-dark {
      background-color: rgba(76, 175, 80, 0.3) !important;
      border-left: 4px solid #66BB6A !important;
    }
  `;

  document.head.appendChild(style);
};
