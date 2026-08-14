import React, { useRef, useState, useEffect, useCallback, useMemo, forwardRef } from "react";
import {
  Box,
  Button,
  MenuItem,
  Menu,
  Chip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import LockIcon from "@mui/icons-material/Lock";
import EditNoteIcon from "@mui/icons-material/EditNote";
import Editor from "@monaco-editor/react";
import { toast } from "react-toastify";
import {
  encryptCode,
  decryptCode,
  wrapEncryptedContent,
  unwrapEncryptedContent,
  isEncryptedContent,
} from "../../utils/editorEncryption";
import {
  applyFillInBlankDecorations,
  setupFillInBlankRestrictions,
  injectFillInBlankStyles,
  parseFillInBlankRegions,
  removeMarkerLinesForDisplay,
} from "./fillInBlankUtils";

// Storage keys for persisting editor state
const BACKUP_LANGUAGE_KEY = "last_used_language";

const CodeEditorPanel = (
  {
    code,
    language,
    darkMode,
    onChange,
    testCasesPanelHeight,
    LANGUAGES,
    onLanguageChange,
    availableLanguages = [],
    singleLanguage = false, // SQL questions expose exactly one language
    encryptedEditorEnabled = false, // NEW: Enable encryption feature
    questionId = null, // NEW: Question ID for generating unique keys
    encryptionSettings = {}, // NEW: Encryption settings from question
    fillInTheBlankEnabled = false, // NEW: Enable Fill in the Blank mode
    portalContainer = null, // Container ref for portaling menus (needed for fullscreen)
    fillHeight = false, // When true, the editor fills its parent instead of reserving testCasesPanelHeight
    collapsed = false, // When true, only the header is shown (folded)
    onToggleCollapse = null, // Callback for the fold/unfold button
  },
  ref
) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const containerRef = useRef(null);
  const [languageAnchorEl, setLanguageAnchorEl] = useState(null);
  const [currentCode, setCurrentCode] = useState(code || "");
  const [originalCodeWithMarkers, setOriginalCodeWithMarkers] = useState(""); // Store original with markers
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [decorationIds, setDecorationIds] = useState([]);
  const [markerDecorationIds, setMarkerDecorationIds] = useState([]);
  const [fillInBlankData, setFillInBlankData] = useState(null);
  const changeDisposableRef = useRef(null);
  // Counter-based typing guard. Incremented synchronously in handleCodeChange (before
  // React schedules any render) and decremented in the code-sync useEffect.
  // A boolean flag fails when two keys are pressed simultaneously: two onChange calls
  // fire, but the first effect clears the flag and the second effect sees false → calls
  // setValue() → cursor resets. A counter correctly tracks the number of pending
  // typing-originated code changes.
  const typingCountRef = useRef(0);

  // Inject Fill in the Blank styles on mount
  useEffect(() => {
    if (fillInTheBlankEnabled) {
      injectFillInBlankStyles();
    }
  }, [fillInTheBlankEnabled]);

  // Sync code from parent for genuine external changes (language switch, question load).
  // CRITICAL: Uses typingCountRef to distinguish typing from external changes.
  // handleCodeChange increments the counter synchronously BEFORE React schedules any render.
  // When this useEffect fires, if counter > 0, we know the code prop change originated
  // from typing → decrement and skip. If counter === 0, it's external → push to editor.
  // A counter (not boolean) is essential: pressing two keys simultaneously fires onChange
  // twice, potentially causing two separate effects. Each effect decrements by 1, so both
  // correctly skip setValue().
  useEffect(() => {
    // If this code change was triggered by typing in the editor, skip entirely.
    // The editor already has the correct content — calling setValue() would reset the cursor.
    if (typingCountRef.current > 0) {
      typingCountRef.current -= 1;
      return;
    }

    // External change (language switch, question load, session restore) — sync to editor
    const newCode = code || "";
    let codeToSet = newCode;
    if (fillInTheBlankEnabled && newCode.includes('/*<<START>>*/')) {
      setOriginalCodeWithMarkers(newCode);
      codeToSet = removeMarkerLinesForDisplay(newCode);
    } else {
      setOriginalCodeWithMarkers("");
    }

    setCurrentCode(codeToSet);
    if (editorRef.current) {
      editorRef.current.setValue(codeToSet);
    }
  }, [code, fillInTheBlankEnabled]);

  // When the language changes, store it in localStorage as a backup.
  // SQL is never remembered: it is not a choice the student made, and restoring
  // it on a programming question would load the wrong editor mode.
  useEffect(() => {
    if (singleLanguage || language === "sql") return;
    localStorage.setItem(BACKUP_LANGUAGE_KEY, language);
  }, [language, singleLanguage]);

  // Simplified state restoration - only restore language preference
  useEffect(() => {
    // A single-language question (SQL) must never be switched to a remembered
    // language from a previous programming question.
    if (singleLanguage) return;
    // Only restore language preference on mount
    const savedLanguage = localStorage.getItem(BACKUP_LANGUAGE_KEY);
    if (
      savedLanguage &&
      onLanguageChange &&
      savedLanguage !== language &&
      !currentCode
    ) {
      setTimeout(() => {
        onLanguageChange(savedLanguage);
      }, 100);
    }
  }, []); // Run only on mount

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Handle editor mounting
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Setup Fill in the Blank mode if enabled
    if (fillInTheBlankEnabled) {
      // Inject custom styles for read-only regions
      injectFillInBlankStyles();
      
      // Get the code with markers (from originalCodeWithMarkers or fallback to code prop)
      const codeWithMarkers = originalCodeWithMarkers || code || "";
      
      // IMPORTANT: Remove markers and set cleaned code in editor
      if (codeWithMarkers.includes('/*<<START>>*/')) {
        const cleanedCode = removeMarkerLinesForDisplay(codeWithMarkers);
        editor.setValue(cleanedCode);
      }
      
      // Parse regions from the original code with markers
      const { editableRegions } = parseFillInBlankRegions(codeWithMarkers);
      
      if (editableRegions && editableRegions.length > 0) {
        // Apply decorations using the code with markers
        applyFillInBlankDecorations(
          editor,
          monaco,
          codeWithMarkers,
          editableRegions
        );
        
        // Setup change restrictions using the code with markers (will be parsed internally)
        setupFillInBlankRestrictions(editor, codeWithMarkers, editableRegions, monaco);
      }
    }

    // Override default paste command completely
    if (encryptedEditorEnabled && !fillInTheBlankEnabled) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
        handleEncryptedPasteRequest();
      });

      // Disable Ctrl/Cmd + Shift + V (paste as plain text) on Windows, Linux and Mac.
      // This is the common bypass around the encrypted-paste protection.
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyV,
        () => {
          toast.warning("Paste is disabled");
        }
      );

      // Disable Shift + Insert (alternative paste shortcut)
      editor.addCommand(
        monaco.KeyMod.Shift | monaco.KeyCode.Insert,
        () => {
          toast.warning("Paste is disabled");
        }
      );

      // Override default copy command completely
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
        const selection = editor.getSelection();
        const selectedText = editor.getModel().getValueInRange(selection);
        if (selectedText) {
          handleEncryptedCopy(selectedText);
        }
      });

      // Context menu actions for encrypted copy/paste
      editor.addAction({
        id: "encrypted-copy",
        label: "🔒 Copy (Encrypted)",
        contextMenuGroupId: "navigation",
        contextMenuOrder: 1,
        run: (editor) => {
          const selection = editor.getSelection();
          const selectedText = editor.getModel().getValueInRange(selection);
          if (selectedText) {
            handleEncryptedCopy(selectedText);
          }
        },
      });

      editor.addAction({
        id: "encrypted-paste",
        label: "🔓 Paste (Encrypted)",
        contextMenuGroupId: "navigation",
        contextMenuOrder: 2,
        run: () => {
          handleEncryptedPasteRequest();
        },
      });

      // Block drag and drop events
      const domNode = editor.getDomNode();
      
      if (domNode) {
        // Block native paste completely — catches Ctrl+Shift+V, context-menu paste,
        // middle-click paste, and paste events dispatched by virtual/online keyboards.
        // Note: the platform's encrypted paste (Ctrl+V) uses executeEdits, not the native
        // paste event, so it keeps working while raw pastes stay blocked.
        domNode.addEventListener(
          'paste',
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            toast.warning('Paste is disabled');
          },
          true
        );

        // Block paste-related keyboard shortcuts at the capture phase so they never
        // reach the editor. Covers Ctrl/Cmd+Shift+V and Shift+Insert on any OS/keyboard.
        domNode.addEventListener(
          'keydown',
          (e) => {
            const key = (e.key || '').toLowerCase();
            const isV = key === 'v' || e.code === 'KeyV';
            const isInsert = key === 'insert' || e.code === 'Insert';

            const ctrlShiftV = (e.ctrlKey || e.metaKey) && e.shiftKey && isV;
            const shiftInsert = e.shiftKey && isInsert;

            if (ctrlShiftV || shiftInsert) {
              e.preventDefault();
              e.stopPropagation();
              toast.warning('Paste is disabled');
            }
          },
          true
        );

        // Block drop event
        domNode.addEventListener('drop', (e) => {
          e.preventDefault();
          e.stopPropagation();
          toast.warning('Drag and Paste is Disabled');
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (changeDisposableRef.current) {
        changeDisposableRef.current.dispose();
      }
    };
  }, []);

  // Handle code changes from the editor — increments typingCountRef SYNCHRONOUSLY.
  // This runs before React schedules any render, so the counter is always incremented
  // before the code-sync useEffect has a chance to fire.
  const handleCodeChange = useCallback((newCode) => {
    typingCountRef.current += 1; // Increment: one more typing-originated change pending
    setCurrentCode(newCode);
    if (onChange) {
      onChange(newCode);
    }
  }, [onChange]);

  // Reapply decorations when code changes in Fill in the Blank mode (separated from onChange to keep it stable)
  useEffect(() => {
    if (fillInTheBlankEnabled && editorRef.current && currentCode) {
      const editor = editorRef.current;
      const monaco = window.monaco;
      
      if (monaco) {
        const decorationData = applyFillInBlankDecorations(editor, monaco, currentCode, darkMode);
        
        if (decorationData.decorations) {
          const newDecorationIds = editor.deltaDecorations(decorationIds, decorationData.decorations);
          setDecorationIds(newDecorationIds);
        }
        
        if (decorationData.markerDecorations) {
          const newMarkerIds = editor.deltaDecorations(markerDecorationIds, decorationData.markerDecorations);
          setMarkerDecorationIds(newMarkerIds);
        }
      }
    }
  }, [currentCode, fillInTheBlankEnabled, darkMode]);

  // Get code without markers (for submission)
  const getCodeForSubmission = () => {
    // currentCode is already cleaned of markers in Fill in the Blank mode
    return currentCode;
  };

  // Encrypted Copy Handler - Automatically encrypts with shared platform key
  const handleEncryptedCopy = async (text) => {
    try {
      const encrypted = encryptCode(text);
      if (!encrypted) {
        console.error("Encryption failed");
        toast.error("Failed to encrypt code");
        return;
      }

      const wrappedContent = wrapEncryptedContent(encrypted);
      await navigator.clipboard.writeText(wrappedContent);
    } catch (error) {
      console.error("Copy failed:", error);
      toast.error("Failed to copy code");
    }
  };

  // Encrypted Paste Request Handler - Automatically decrypts with shared platform key
  const handleEncryptedPasteRequest = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();

      // Check if content is encrypted with our platform marker
      if (isEncryptedContent(clipboardText)) {
        const encryptedContent = unwrapEncryptedContent(clipboardText);
        if (encryptedContent) {
          const decrypted = decryptCode(encryptedContent);

          if (decrypted) {
            pasteToEditor(decrypted);
          } else {
            // Decryption failed - content from outside platform
            const warningComment =
              "/* ⚠️ Pasted content is detected from outside of the platform */\n";
            pasteToEditor(warningComment);
            toast.error("⚠️ Invalid encrypted content");
          }
        }
      } else {
        // Plain text without encryption markers - from outside platform
        const warningComment =
          "/* ⚠️ Pasted content is detected from outside of the platform */\n";
        pasteToEditor(warningComment);
      }
    } catch (error) {
      console.error("Paste failed:", error);
      toast.error("Paste failed");
    }
  };

  // Paste to Editor Helper
  const pasteToEditor = (text) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      const operation = {
        range: selection,
        text: text,
        forceMoveMarkers: true,
      };
      editor.executeEdits("paste", [operation]);
      editor.focus();
    }
  };

  // Copy code to clipboard (handles both encrypted and regular)
  const handleCopyCode = () => {
    if (encryptedEditorEnabled) {
      handleEncryptedCopy(currentCode);
    } else {
      navigator.clipboard.writeText(currentCode);
      toast.info("Code copied to clipboard");
    }
  };

  // Download code file
  const handleDownloadCode = () => {
    const fileExtension = LANGUAGES[language]?.extension || "txt";
    const fileName = `solution.${fileExtension}`;

    const element = document.createElement("a");
    const file = new Blob([currentCode], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast.info(`Downloaded as ${fileName}`);
  };

  // Toggle fullscreen for code editor
  const handleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      // Create fullscreen container
      const fsElement = document.createElement("div");
      fsElement.id = "fullscreen-editor-container";
      fsElement.style.width = "100%";
      fsElement.style.height = "100%";
      fsElement.style.backgroundColor = darkMode ? "#0A0A0A" : "#ffffff";
      fsElement.style.position = "fixed";
      fsElement.style.top = "0";
      fsElement.style.left = "0";
      fsElement.style.right = "0";
      fsElement.style.bottom = "0";
      fsElement.style.zIndex = "9999";
      fsElement.style.display = "flex";
      fsElement.style.flexDirection = "column";

      // Create toolbar
      const toolbar = document.createElement("div");
      toolbar.style.display = "flex";
      toolbar.style.justifyContent = "flex-end";
      toolbar.style.padding = "8px";
      toolbar.style.backgroundColor = darkMode ? "#0A0A0A" : "#f5f5f5";
      toolbar.style.borderBottom = `1px solid ${darkMode ? "#333" : "#ddd"}`;

      // Add exit button
      const exitButton = document.createElement("button");
      exitButton.innerHTML = "✕";
      exitButton.style.background = "transparent";
      exitButton.style.border = "none";
      exitButton.style.cursor = "pointer";
      exitButton.style.fontSize = "16px";
      exitButton.style.color = darkMode ? "#fff" : "#000";
      exitButton.style.padding = "4px 8px";
      exitButton.onclick = () => document.exitFullscreen();

      toolbar.appendChild(exitButton);
      fsElement.appendChild(toolbar);

      // Create editor container
      const editorContainer = document.createElement("div");
      editorContainer.style.flexGrow = "1";
      editorContainer.style.height = "calc(100% - 40px)";
      editorContainer.style.overflow = "hidden";
      fsElement.appendChild(editorContainer);

      // Add to body
      document.body.appendChild(fsElement);

      // Create fullscreen editor
      const fullscreenEditor = monaco.editor.create(editorContainer, {
        value: currentCode,
        language: getMonacoLanguage(language),
        theme: darkMode ? "vs-dark" : "light",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        lineNumbers: "on",
        renderLineHighlight: "all",
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 8, bottom: 8 },
        fontFamily: '"Consolas", "Source Code Pro", monospace',
        fontLigatures: true,
      });

      // Handle changes
      fullscreenEditor.onDidChangeModelContent((e) => {
        const newValue = fullscreenEditor.getValue();
        typingCountRef.current += 1; // Increment: typing-originated change
        setCurrentCode(newValue);
        if (onChange) {
          onChange(newValue);
        }
      });

      // Request fullscreen
      fsElement.requestFullscreen().catch((err) => {
        toast.error(`Error attempting to enable fullscreen: ${err.message}`);
        document.body.removeChild(fsElement);
      });

      // Handle fullscreen exit
      const handleFullscreenExit = () => {
        if (!document.fullscreenElement && document.body.contains(fsElement)) {
          const finalValue = fullscreenEditor.getValue();
          fullscreenEditor.dispose();
          document.body.removeChild(fsElement);
          setCurrentCode(finalValue);
          // Sync main editor with fullscreen changes
          if (editorRef.current) {
            editorRef.current.setValue(finalValue);
          }
          if (onChange) {
            onChange(finalValue);
          }
          document.removeEventListener(
            "fullscreenchange",
            handleFullscreenExit
          );
        }
      };

      document.addEventListener("fullscreenchange", handleFullscreenExit);
    } else {
      document.exitFullscreen();
    }
  };

  // Get Monaco editor language
  const getMonacoLanguage = (lang) => {
    const languageMap = {
      sql: "sql",
      c: "c",
      cpp: "cpp",
      java: "java",
      python: "python",
      javascript: "javascript",
    };
    return languageMap[lang] || lang;
  };

  // Language dropdown handlers
  const handleLanguageClick = (event) => {
    setLanguageAnchorEl(event.currentTarget);
  };

  const handleLanguageMenuClose = () => {
    setLanguageAnchorEl(null);
  };

  const selectLanguage = (lang) => {
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
    setLanguageAnchorEl(null);
  };

  // Get available languages
  const getAvailableLanguages = () => {
    if (!availableLanguages || availableLanguages.length === 0) {
      return Object.keys(LANGUAGES);
    }

    return Object.keys(LANGUAGES).filter((langKey) =>
      availableLanguages.some((avLang) => avLang.name === langKey)
    );
  };

  const availableLangs = getAvailableLanguages();

  // Function to handle successful submission (simplified)
  const handleSuccessfulSubmission = () => {
    localStorage.setItem(BACKUP_LANGUAGE_KEY, language);
  };

  // Memoize editor options to prevent unnecessary re-renders and cursor jumps
  const editorOptions = useMemo(() => ({
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: "on",
    renderLineHighlight: "all",
    automaticLayout: true,
    tabSize: 2,
    wordWrap: "off",
    folding: false,
    stickyScroll: { enabled: false },
    padding: { top: 8, bottom: 8 },
    fontFamily: '"Consolas", "Source Code Pro", monospace',
    fontLigatures: true,
    scrollbar: {
      useShadows: false,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },
  }), []);

  // Expose the submission handler to parent components
  React.useImperativeHandle(ref, () => ({
    handleSuccessfulSubmission,
    getCodeForSubmission, // Expose method to get code without markers
  }));

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        m: 0,
        p: 0,
        position: "relative",
        border: "1px solid",
        borderColor: darkMode
          ? "rgba(255,255,255,0.12)"
          : "rgba(0,0,0,0.12)",
        borderRadius: "12px",
        bgcolor: darkMode ? "#0A0A0A" : "#FFFFFF",
      }}
    >
      {/* Encryption Indicator */}
      {encryptedEditorEnabled && !fillInTheBlankEnabled && (
        <Box
          sx={{
            position: "absolute",
            top: 48,
            right: 8,
            zIndex: 10,
            bgcolor: "rgba(0,136,204,0.9)",
            color: "white",
            px: 1,
            py: 0.5,
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            fontSize: "0.75rem",
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(0,136,204,0.3)",
          }}
        >
          <LockIcon sx={{ fontSize: "0.9rem" }} />
          Encrypted
        </Box>
      )}

      {/* Fill in the Blank Indicator */}
      {fillInTheBlankEnabled && (
        <Box
          sx={{
            position: "absolute",
            top: 48,
            right: 8,
            zIndex: 10,
            bgcolor: "rgba(76,175,80,0.9)",
            color: "white",
            px: 1,
            py: 0.5,
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            fontSize: "0.75rem",
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(76,175,80,0.3)",
          }}
        >
          <EditNoteIcon sx={{ fontSize: "0.9rem" }} />
          Fill in the Blank
          {fillInBlankData && fillInBlankData.editableRegions && (
            <Chip 
              label={`${fillInBlankData.editableRegions.length} region(s)`}
              size="small"
              sx={{ 
                height: '18px', 
                fontSize: '0.65rem',
                bgcolor: 'rgba(255,255,255,0.3)',
                color: 'white'
              }}
            />
          )}
        </Box>
      )}

      {/* Editor Header with Action Buttons */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 1,
          borderBottom: "1px solid",
          borderColor: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          bgcolor: darkMode ? "#0A0A0A" : "#f8f9fa",
        }}
      >
        {/* Language Selector */}
        <Box>
          <Button
            variant="outlined"
            size="small"
            // A single-language question has nothing to choose, so the dropdown
            // affordance is removed rather than left as a dead control.
            endIcon={singleLanguage ? null : <KeyboardArrowDownIcon />}
            disabled={singleLanguage}
            sx={{
              height: "24px",
              borderRadius: "4px",
              color: darkMode ? "#fff" : "#000",
              borderColor: darkMode
                ? "rgba(255,255,255,0.3)"
                : "rgba(0,0,0,0.23)",
              textTransform: "none",
              px: 1.5,
              backgroundColor: darkMode
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.02)",
              "&:hover": {
                backgroundColor: darkMode
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.05)",
              },
              fontSize: "0.75rem",
              fontWeight: 500,
            }}
            onClick={singleLanguage ? undefined : handleLanguageClick}
          >
            {LANGUAGES && LANGUAGES[language]
              ? LANGUAGES[language].name
              : language.toUpperCase()}
          </Button>

          <Menu
            anchorEl={languageAnchorEl}
            open={Boolean(languageAnchorEl)}
            onClose={handleLanguageMenuClose}
            container={portalContainer}
          >
            {availableLangs.map((lang) => (
              <MenuItem
                key={lang}
                onClick={() => selectLanguage(lang)}
                selected={language === lang}
              >
                {LANGUAGES[lang].name}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            size="small"
            aria-label="Copy code"
            onClick={handleCopyCode}
            sx={{
              minWidth: "auto",
              p: 0.5,
              bgcolor: "transparent",
              color: darkMode ? "#aaa" : "#555",
              border: "none",
              "&:hover": {
                bgcolor: "transparent",
                color: darkMode ? "#fff" : "#000",
              },
            }}
          >
            <ContentCopyIcon sx={{ fontSize: "1.1rem" }} />
          </Button>

          <Button
            size="small"
            aria-label="Download code"
            onClick={handleDownloadCode}
            sx={{
              minWidth: "auto",
              p: 0.5,
              bgcolor: "transparent",
              color: darkMode ? "#aaa" : "#555",
              border: "none",
              "&:hover": {
                bgcolor: "transparent",
                color: darkMode ? "#fff" : "#000",
              },
            }}
          >
            <DownloadIcon sx={{ fontSize: "1.2rem" }} />
          </Button>

          <Button
            size="small"
            aria-label="Fullscreen"
            onClick={handleFullscreen}
            sx={{
              minWidth: "auto",
              p: 0.5,
              bgcolor: "transparent",
              color: darkMode ? "#aaa" : "#555",
              border: "none",
              "&:hover": {
                bgcolor: "transparent",
                color: darkMode ? "#fff" : "#000",
              },
            }}
          >
            {isFullscreen ? (
              <FullscreenExitIcon sx={{ fontSize: "1.2rem" }} />
            ) : (
              <FullscreenIcon sx={{ fontSize: "1.2rem" }} />
            )}
          </Button>

          {onToggleCollapse && (
            <Button
              size="small"
              aria-label={collapsed ? "Unfold editor" : "Fold editor"}
              onClick={onToggleCollapse}
              sx={{
                minWidth: "auto",
                p: 0.5,
                bgcolor: "transparent",
                color: darkMode ? "#aaa" : "#555",
                border: "none",
                "&:hover": {
                  bgcolor: "transparent",
                  color: darkMode ? "#fff" : "#000",
                },
              }}
            >
              <KeyboardArrowDownIcon
                sx={{
                  fontSize: "1.3rem",
                  transition: "transform 0.2s ease",
                  transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </Button>
          )}
        </Box>
      </Box>

      {/* Editor Container */}
      <Box
        ref={containerRef}
        sx={{
          display: collapsed ? "none" : "flex",
          flexGrow: 1,
          overflow: "hidden",
          position: "relative",
          m: 0,
          p: 0,
          height: fillHeight ? "100%" : `calc(100% - ${testCasesPanelHeight}%)`,
          "& .monaco-editor": {
            ".margin": {
              background: darkMode
                ? "#0A0A0A !important"
                : "#f8fafc !important",
            },
            ".monaco-editor-background": {
              background: darkMode
                ? "#0A0A0A !important"
                : "#ffffff !important",
            },
            ".monaco-editor .line-numbers": {
              color: darkMode ? "#606060 !important" : "inherit",
            },
          },
        }}
      >
        <Editor
          height="100%"
          width="100%"
          language={getMonacoLanguage(language)}
          defaultValue={currentCode}
          onChange={handleCodeChange}
          theme={darkMode ? "vs-dark" : "light"}
          onMount={handleEditorDidMount}
          options={editorOptions}
        />
      </Box>
    </Box>
  );
};

export default forwardRef(CodeEditorPanel);
