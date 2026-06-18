import React, { useRef, useEffect, useState } from "react";
import { Box } from "@mui/material";
import Editor from "@monaco-editor/react";
import {
  encryptCode,
  decryptCode,
  isEncryptedContent,
  wrapEncryptedContent,
  unwrapEncryptedContent,
} from "../../utils/editorEncryption";

/**
 * EncryptedCodeEditor - A Monaco editor with encryption support
 * Prevents direct paste and drag-and-drop, only allows encrypted copy/paste
 */
const EncryptedCodeEditor = ({
  value = "",
  language = "javascript",
  height = "200px",
  onChange,
  theme = "vs-dark",
  options = {},
  encryptionEnabled = false,
}) => {
  const editorRef = useRef(null);
  const [editorInstance, setEditorInstance] = useState(null);

  // Handle encrypted copy
  const handleEncryptedCopy = () => {
    if (!editorInstance) return;

    const selection = editorInstance.getSelection();
    const selectedText = editorInstance.getModel().getValueInRange(selection);

    if (!selectedText) return;

    try {
      const encrypted = encryptCode(selectedText);
      if (!encrypted) return;
      
      const wrappedEncrypted = wrapEncryptedContent(encrypted);
      navigator.clipboard.writeText(wrappedEncrypted);
    } catch (error) {
      // Encryption failed silently
    }
  };

  // Handle encrypted paste
  const handleEncryptedPaste = async () => {
    if (!editorInstance) return;

    try {
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText) return;

      if (!isEncryptedContent(clipboardText)) return;

      const encryptedContent = unwrapEncryptedContent(clipboardText);
      if (!encryptedContent) return;

      const decrypted = decryptCode(encryptedContent);
      if (!decrypted) return;

      const selection = editorInstance.getSelection();

      editorInstance.executeEdits("encrypted-paste", [
        {
          range: selection,
          text: decrypted,
          forceMoveMarkers: true,
        },
      ]);

    } catch (error) {
      // Decryption failed silently
    }
  };

  // Setup editor with encryption protections
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    setEditorInstance(editor);

    if (encryptionEnabled) {
      // Override Ctrl+V to block paste
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
        handleEncryptedPaste();
      });

      // Override Ctrl+C to use encrypted copy - must prevent default
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
        const selection = editor.getSelection();
        const selectedText = editor.getModel().getValueInRange(selection);
        if (selectedText) {
          handleEncryptedCopy();
        }
      });

      // Add context menu actions
      editor.addAction({
        id: "encrypted-copy",
        label: "🔒 Copy (Encrypted)",
        contextMenuGroupId: "navigation",
        contextMenuOrder: 1,
        run: () => {
          handleEncryptedCopy();
        },
      });

      editor.addAction({
        id: "encrypted-paste",
        label: "🔓 Paste (Encrypted)",
        contextMenuGroupId: "navigation",
        contextMenuOrder: 2,
        run: () => {
          handleEncryptedPaste();
        },
      });

      // Block drag and drop events
      const domNode = editor.getDomNode();
      
      if (domNode) {
        // Block native copy event and use encrypted copy
        domNode.addEventListener('copy', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const selection = editor.getSelection();
          const selectedText = editor.getModel().getValueInRange(selection);
          if (selectedText) {
            handleEncryptedCopy();
          }
        });

        // Block native paste event
        domNode.addEventListener('paste', (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleEncryptedPaste();
        });

        // Block drop event
        domNode.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Drag and drop disabled
        });
        
        // Block dragover to prevent drop cursor
        domNode.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
        
        // Block dragenter
        domNode.addEventListener('dragenter', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      }
    }
  };

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: encryptionEnabled ? "#4CAF50" : "divider",
        borderRadius: 1,
        overflow: "hidden",
      }}
    >
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        theme={theme}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          ...options,
        }}
      />
    </Box>
  );
};

export default EncryptedCodeEditor;
