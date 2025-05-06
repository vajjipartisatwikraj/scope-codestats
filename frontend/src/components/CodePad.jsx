import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Button, 
  CircularProgress, 
  Chip,
  IconButton,
  Tooltip,
  useTheme as useMuiTheme,
  Divider,
  alpha,
  useMediaQuery,
  Paper,
  Fade,
  Menu,
  ListItemIcon,
  ListItemText
} from '@mui/material';

// Import modern icons for a professional look
import CodeIcon from '@mui/icons-material/Code';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import TerminalIcon from '@mui/icons-material/Terminal';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import LanguageIcon from '@mui/icons-material/Language';
import DoneIcon from '@mui/icons-material/Done';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

import Editor from '@monaco-editor/react';
import { useTheme } from '../contexts/ThemeContext';
import compilerService from '../utils/compilerService';

// Programming language icons/logos using SimpleIcons CDN
const LanguageIcons = (darkMode) => ({
  c: <Box 
       component="img" 
       src={darkMode ? "https://cdn.simpleicons.org/c/white" : "https://cdn.simpleicons.org/c/A8B9CC"} 
       alt="C Logo"
       sx={{ 
         width: 24, 
         height: 24
       }} 
     />,
  cpp: <Box 
         component="img" 
         src={darkMode ? "https://cdn.simpleicons.org/cplusplus/white" : "https://cdn.simpleicons.org/cplusplus/00599C"} 
         alt="C++ Logo"
         sx={{ 
           width: 24, 
           height: 24
         }} 
       />,
  java: <Box 
          component="img" 
          src={darkMode ? "https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/file_type_java.svg" : "https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/file_type_java.svg"} 
          alt="Java Logo"
          sx={{ 
            width: 24, 
            height: 24,
            filter: darkMode ? 'brightness(10)' : 'none'
          }} 
        />,
  python: <Box 
            component="img" 
            src={darkMode ? "https://cdn.simpleicons.org/python/white" : "https://cdn.simpleicons.org/python/3776AB"} 
            alt="Python Logo"
            sx={{ 
              width: 24, 
              height: 24
            }} 
          />,
  javascript: <Box 
                component="img" 
                src={darkMode ? "https://cdn.simpleicons.org/javascript/white" : "https://cdn.simpleicons.org/javascript/F7DF1E"} 
                alt="JavaScript Logo"
                sx={{ 
                  width: 24, 
                  height: 24
                }} 
              />
});

// Supported languages with their default code examples and icons
const LANGUAGES = {
  'c': { 
    extension: 'c', 
    name: 'C',
    defaultCode: '#include <stdio.h>\n\nint main() {\n    char name[50];\n    int age;\n    \n    printf("Enter your name: ");\n    scanf("%s", name);\n    \n    printf("Enter your age: ");\n    scanf("%d", &age);\n    \n    printf("Hello, %s!\\n", name);\n    printf("You are %d years old.\\n", age);\n    \n    return 0;\n}',
    version: '10.2.0'
  },
  'cpp': { 
    extension: 'cpp', 
    name: 'C++',
    defaultCode: '#include <iostream>\n#include <string>\n\nint main() {\n    std::string name;\n    int age;\n    \n    std::cout << "Enter your name: ";\n    std::getline(std::cin, name);\n    \n    std::cout << "Enter your age: ";\n    std::cin >> age;\n    \n    std::cout << "Hello, " << name << "!" << std::endl;\n    std::cout << "You are " << age << " years old." << std::endl;\n    \n    return 0;\n}',
    version: '10.2.0'
  },
  'java': { 
    extension: 'java', 
    name: 'Java',
    defaultCode: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        \n        System.out.println("Enter an integer:");\n        int number = scanner.nextInt();\n        \n        System.out.println("You entered: " + number);\n        System.out.println("Double of your number is: " + (number * 2));\n        \n        scanner.close();\n    }\n}',
    version: '15.0.2'
  },
  'python': { 
    extension: 'py', 
    name: 'Python',
    defaultCode: '# This program demonstrates reading input in Python\n\nname = input("Enter your name: ")\nage = int(input("Enter your age: "))\n\nprint(f"Hello, {name}!")\nprint(f"In 5 years, you will be {age + 5} years old.")',
    version: '3.10.0'
  },
  'javascript': { 
    extension: 'js', 
    name: 'JavaScript',
    defaultCode: 'console.log("Hello, World!");',
    version: '18.15.0'
  }
};

const CodePad = () => {
  const { darkMode } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(LANGUAGES.python.defaultCode);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [outputStatus, setOutputStatus] = useState('idle'); // idle, success, error, warning
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [languageMenuAnchor, setLanguageMenuAnchor] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState(null);
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  
  // Get theme-aware language icons
  const languageIcons = LanguageIcons(darkMode);
  
  // Function to handle editor mounting
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Add custom error handling
    window.addEventListener('error', (e) => {
      if (e.message.includes('Canceled')) {
        // Prevent the error from propagating
        e.preventDefault();
        console.log('Handled Monaco editor cancellation');
      }
    });
  };
  
  // Update default code when language changes
  useEffect(() => {
    setCode(LANGUAGES[language].defaultCode);
    setOutput('');
    setOutputStatus('idle');
  }, [language]);

  // Reset copy status after 1.5 seconds
  useEffect(() => {
    if (copiedOutput) {
      const timer = setTimeout(() => setCopiedOutput(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [copiedOutput]);

  useEffect(() => {
    if (copiedCode) {
      const timer = setTimeout(() => setCopiedCode(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [copiedCode]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Clean up Monaco editor instance when component unmounts
      if (editorRef.current) {
        // The actual editor instance might have methods for disposal
        // though the React wrapper might handle this automatically
        editorRef.current = null;
      }
    };
  }, []);

  // Handle language menu open/close
  const handleLanguageMenuOpen = (event) => {
    setLanguageMenuAnchor(event.currentTarget);
  };

  const handleLanguageMenuClose = () => {
    setLanguageMenuAnchor(null);
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    handleLanguageMenuClose();
  };

  // Handle code execution
  const executeCode = async () => {
    setIsRunning(true);
    setOutput('Executing code...');
    setOutputStatus('idle');
    
    try {
      // Use the compiler service to execute the code
      const result = await compilerService.executeCode(
        language, 
        LANGUAGES[language].version, 
        code,
        input
      );
      
      // Set the output and status based on the response
      const outputText = result.run.output || 'No output';
      setOutput(outputText);
      
      if (result.run.code === 0) {
        setOutputStatus('success');
      } else if (result.run.stderr && !result.compile?.stderr) {
        setOutputStatus('warning'); // Runtime error
      } else if (result.compile?.stderr) {
        setOutputStatus('error'); // Compilation error
      }
    } catch (error) {
      setOutput(`Error: ${error.message || 'Failed to execute code'}`);
      setOutputStatus('error');
    } finally {
      setIsRunning(false);
    }
  };

  // Handle code copy to clipboard
  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
  };

  // Handle output copy to clipboard
  const copyOutputToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopiedOutput(true);
  };

  // Handle code download
  const downloadCode = () => {
    const element = document.createElement('a');
    const file = new Blob([code], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `main.${LANGUAGES[language].extension}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Output box background color based on status
  const getOutputBoxStyle = () => {
    switch (outputStatus) {
      case 'success':
        return { 
          bgcolor: alpha(muiTheme.palette.success.main, darkMode ? 0.08 : 0.03),
          borderLeft: `3px solid ${muiTheme.palette.success.main}`,
        };
      case 'error':
        return { 
          bgcolor: alpha(muiTheme.palette.error.main, darkMode ? 0.08 : 0.03),
          borderLeft: `3px solid ${muiTheme.palette.error.main}`,
        };
      case 'warning':
        return { 
          bgcolor: alpha(muiTheme.palette.warning.main, darkMode ? 0.08 : 0.03),
          borderLeft: `3px solid ${muiTheme.palette.warning.main}`,
        };
      default:
        return { 
          bgcolor: darkMode ? alpha(muiTheme.palette.background.default, 0.3) : alpha(muiTheme.palette.background.paper, 0.7), 
          borderLeft: '3px solid transparent'
        };
    }
  };

  // Get icon for output status
  const getOutputStatusIcon = () => {
    switch (outputStatus) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return null;
    }
  };

  // Get status label
  const getStatusLabel = () => {
    switch (outputStatus) {
      case 'success':
        return 'Execution Successful';
      case 'error':
        return 'Compilation Error';
      case 'warning':
        return 'Runtime Error';
      default:
        return '';
    }
  };

  // Map Piston language IDs to Monaco editor language IDs
  const getMonacoLanguage = (pistonLanguage) => {
    const languageMap = {
      'c': 'c',
      'cpp': 'cpp',
      'java': 'java',
      'python': 'python',
      'javascript': 'javascript'
    };
    return languageMap[pistonLanguage] || pistonLanguage;
  };

  // Get editor theme
  const getEditorTheme = () => {
    return darkMode ? 'vs-dark' : 'vs';
  };

  // Function to toggle fullscreen
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
        setIsFullScreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  // Watch for fullscreen change events (in case user exits with ESC)
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  // Handle settings menu
  const handleSettingsMenuOpen = (event) => {
    setSettingsMenuAnchor(event.currentTarget);
  };

  const handleSettingsMenuClose = () => {
    setSettingsMenuAnchor(null);
  };

  return (
    <Box 
      ref={containerRef}
      sx={{ 
      width: '100vw', 
      height: 'calc(100vh - 65px)',
      display: 'flex', 
      flexDirection: 'column',
        bgcolor: darkMode ? '#0e1117' : '#f5f7fa',
      position: 'absolute',
      top: '65px',
      left: 0,
      right: 0,
      bottom: 0,
      m: 0,
      p: 0,
      boxSizing: 'border-box',
      overflow: 'hidden',
      zIndex: 10,
      borderRadius: 0,
      border: 'none',
      boxShadow: darkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)',
      backgroundImage: darkMode ? 
          'linear-gradient(to bottom, rgba(16, 18, 24, 0.5) 0%, rgba(8, 10, 12, 0.5) 100%)' :
        'linear-gradient(to bottom, rgba(255, 255, 255, 0.5) 0%, rgba(245, 247, 250, 0.5) 100%)',
      '& .monaco-editor': {
        paddingTop: 0,
        paddingBottom: 0
      }
    }}>
      {/* Main content area - split into left (editor) and right (output/input) */}
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1,
        height: '100%',
        flexDirection: { xs: 'column', md: 'row' },
        overflow: 'hidden',
        width: '100%',
        p: 1.5,
        gap: 1.5,
        bgcolor: darkMode ? '#060709' : '#f0f2f5'
      }}>
        {/* Left side - Code Editor */}
        <Box sx={{ 
          flex: { xs: '1 1 50%', md: `1 1 ${isMobile ? '100%' : '55%'}` },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          bgcolor: darkMode ? '#0a0c10' : '#ffffff',
          borderRadius: '12px',
          boxShadow: darkMode ? 
            '0 4px 12px rgba(0, 0, 0, 0.3)' : 
            '0 4px 12px rgba(0, 0, 0, 0.04)'
        }}>
          <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
            px: 1.5,
            py: 0.75,
          borderBottom: '1px solid',
          borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            bgcolor: darkMode ? 'rgba(12, 13, 16, 0.5)' : 'rgba(248, 250, 252, 0.8)',
            minHeight: '48px',
            maxHeight: '48px',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
          backgroundImage: darkMode ? 
              'linear-gradient(to right, rgba(12, 13, 16, 0.7), rgba(8, 9, 12, 0.7))' :
              'linear-gradient(to right, rgba(248, 250, 252, 0.9), rgba(255, 255, 255, 0.9))'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: darkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}
              >
                <CodeIcon 
                  fontSize="small" 
                  sx={{ 
                    color: darkMode ? '#ffffff' : '#000000',
                    opacity: 0.9
                  }} 
                /> 
                Editor
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Language selector */}
          <Button
            onClick={handleLanguageMenuOpen}
                variant="outlined"
                size="small"
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: darkMode ? 
                    'rgba(255, 255, 255, 0.08)' : 
                    'rgba(0, 0, 0, 0.05)',
              color: darkMode ? 
                    '#ffffff' : 
                    '#000000',
              border: '1px solid',
              borderColor: darkMode ? 
                    'rgba(255, 255, 255, 0.15)' : 
                    'rgba(0, 0, 0, 0.1)',
              boxShadow: 'none',
                  px: 1.5,
              py: 0.75,
                  height: '32px',
                  borderRadius: '8px',
              fontWeight: 600,
                  fontSize: '0.75rem',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: darkMode ? 
                      'rgba(255, 255, 255, 0.12)' : 
                      'rgba(0, 0, 0, 0.08)',
                borderColor: darkMode ? 
                      'rgba(255, 255, 255, 0.25)' : 
                      'rgba(0, 0, 0, 0.15)',
                boxShadow: 'none'
              }
            }}
                startIcon={
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: -0.5 }}>
                    {languageIcons[language]}
                  </Box>
                }
                endIcon={<ArrowDropDownIcon sx={{ fontSize: '1.25rem', ml: -0.5 }} />}
          >
            {LANGUAGES[language].name}
          </Button>

          <Menu
            anchorEl={languageMenuAnchor}
            open={Boolean(languageMenuAnchor)}
            onClose={handleLanguageMenuClose}
            TransitionComponent={Fade}
            sx={{ 
              '& .MuiPaper-root': {
                boxShadow: darkMode ? 
                  '0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.5)' : 
                  '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                borderRadius: '0.75rem',
                mt: 1,
                bgcolor: darkMode ? 
                      'rgba(12, 13, 16, 0.95)' : 
                  'rgba(255, 255, 255, 0.98)',
                border: '1px solid',
                borderColor: darkMode ? 
                  'rgba(255, 255, 255, 0.05)' : 
                  'rgba(0, 0, 0, 0.05)',
                backdropFilter: 'blur(10px)',
                overflow: 'hidden'
              }
            }}
          >
            {Object.entries(LANGUAGES).map(([key, value]) => (
              <MenuItem 
                key={key} 
                onClick={() => handleLanguageChange(key)}
                selected={language === key}
                sx={{ 
                  py: 1.5,
                  px: 2.5,
                  minWidth: '200px',
                  borderLeft: language === key ? 
                        `3px solid ${darkMode ? '#ffffff' : '#000000'}` : 
                    '3px solid transparent',
                  bgcolor: language === key ? 
                        (darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)') : 
                    'transparent',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: darkMode ? 
                          'rgba(255, 255, 255, 0.08)' : 
                          'rgba(0, 0, 0, 0.05)'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: '35px' }}>
                  {languageIcons[key]}
                </ListItemIcon>
                <ListItemText 
                  primary={value.name} 
                  primaryTypographyProps={{ 
                    fontWeight: language === key ? 600 : 500,
                    fontSize: '0.9rem',
                    color: language === key ? 
                      (darkMode ? '#fff' : '#000') : 
                      (darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)')
                  }}
                />
                {language === key && (
                  <CheckCircleIcon 
                    fontSize="small" 
                    sx={{ 
                      ml: 1, 
                          color: darkMode ? '#ffffff' : '#000000'
                    }} 
                  />
                )}
              </MenuItem>
            ))}
          </Menu>

              {/* Copy button */}
              <Tooltip title={copiedCode ? "Copied!" : "Copy Code"}>
                <Button 
                  size="small" 
                  onClick={copyCodeToClipboard}
                  variant="outlined"
                  startIcon={copiedCode ? <DoneIcon /> : <ContentCopyIcon />}
                  sx={{
                    color: copiedCode ? 
                      (darkMode ? '#ffffff' : '#000000') : 
                      (darkMode ? '#ffffff' : '#000000'),
                    bgcolor: copiedCode ? 
                      (darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)') :
                      (darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    height: '32px',
                    px: 1.5,
                    py: 0.75,
                    '&:hover': {
                      bgcolor: copiedCode ? 
                        (darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)') :
                        (darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)')
                    },
                    transition: 'all 0.15s ease',
                    border: '1px solid',
                    borderColor: copiedCode ? 
                      (darkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)') :
                      (darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)')
                  }}
                >
                  {copiedCode ? "Copied" : "Copy"}
                </Button>
              </Tooltip>
              
              {/* Download button */}
              <Tooltip title="Download Code">
                <Button 
                  size="small" 
                  onClick={downloadCode}
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  sx={{
                    color: darkMode ? '#ffffff' : '#000000',
                    bgcolor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    height: '32px',
                    px: 1.5,
                    py: 0.75,
                    '&:hover': {
                      bgcolor: darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
                    },
                    transition: 'all 0.15s ease',
                    border: '1px solid',
                    borderColor: darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'
                  }}
                >
                  Download
                </Button>
              </Tooltip>
              
              {/* Fullscreen button */}
              <Tooltip title={isFullScreen ? "Exit Full Screen" : "Full Screen"}>
                <Button
                  onClick={toggleFullScreen}
                  variant="outlined"
                  size="small"
                  startIcon={isFullScreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                  sx={{
                    color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                    borderColor: darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                    bgcolor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderRadius: '8px',
                    height: '32px',
                    px: 1.5,
                    py: 0.75,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: darkMode ? '#fff' : '#000',
                      bgcolor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                      borderColor: darkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)',
                    }
                  }}
                >
                  Fullscreen
                </Button>
              </Tooltip>
            </Box>
          </Box>
          
          <Box sx={{ 
            flexGrow: 1,
            position: 'relative',
            height: 'calc(100% - 48px)',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
            overflow: 'hidden',
            '& .monaco-editor': {
              '.margin': {
                background: darkMode ? '#121212 !important' : '#f8fafc !important'
              },
              '.monaco-editor-background': {
                background: darkMode ? '#121212 !important' : '#ffffff !important'
              },
              '.monaco-editor .line-numbers': {
                color: darkMode ? '#606060 !important' : 'inherit'
              },
              '.monaco-editor .current-line': {
                background: darkMode ? '#1a1a1a !important' : 'inherit'
              }
            }
          }}>
            <Editor
              height="100%"
              language={getMonacoLanguage(language)}
              value={code}
              onChange={setCode}
              theme={darkMode ? 'vs-dark' : 'vs'}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                fontFamily: '"Consolas", "JetBrains Mono", "Fira Code", "Source Code Pro", Menlo, Monaco, "Courier New", monospace',
                fontLigatures: true,
                automaticLayout: true,
                overviewRulerBorder: false,
                renderLineHighlight: 'all',
                scrollbar: {
                  alwaysConsumeMouseWheel: false,
                  useShadows: false,
                  verticalScrollbarSize: 12,
                  horizontalScrollbarSize: 12
                },
                accessibilitySupport: 'off',
                lineNumbers: 'on',
                roundedSelection: true,
                cursorBlinking: 'phase',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                padding: { top: 8, bottom: 8 },
                bracketPairColorization: { enabled: true }
              }}
            />
          </Box>
        </Box>

        {/* Right side - Output (top) and Input (bottom) */}
        <Box sx={{ 
          flex: { xs: '1 1 50%', md: `1 1 ${isMobile ? '100%' : '45%'}` },
          display: 'flex',
          flexDirection: 'column',
          height: { xs: '50vh', md: '100%' },
          gap: 1.5,
        }}>
          {/* Output Section */}
          <Box sx={{ 
            flex: '1 1 60%', 
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            borderRadius: '12px',
            bgcolor: darkMode ? '#080a0e' : '#ffffff',
            boxShadow: darkMode ? 
              '0 4px 12px rgba(0, 0, 0, 0.3)' : 
              '0 4px 12px rgba(0, 0, 0, 0.04)'
          }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 1.5,
              py: 0.75,
              borderBottom: '1px solid',
              borderColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              bgcolor: darkMode ? 'rgba(12, 13, 16, 0.5)' : 'rgba(248, 250, 252, 0.8)',
              minHeight: '48px',
              maxHeight: '48px',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px',
              backgroundImage: darkMode ?
                'linear-gradient(to right, rgba(12, 13, 16, 0.7), rgba(8, 9, 12, 0.7))' :
                'linear-gradient(to right, rgba(248, 250, 252, 0.9), rgba(255, 255, 255, 0.9))'
            }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: darkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}
              >
                <TerminalIcon 
                  fontSize="small"
                  sx={{ 
                    color: darkMode ? '#ffffff' : '#000000',
                    opacity: 0.9
                  }}  
                /> 
                Output
              </Typography>
              
              {/* Right side content with status chip and run button */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {outputStatus !== 'idle' && (
                  <Chip 
                    icon={getOutputStatusIcon()} 
                    label={getStatusLabel()}
                    size="small"
                    sx={{ 
                      height: 22,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      borderRadius: '4px',
                      bgcolor: outputStatus === 'success' 
                        ? (darkMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(5, 150, 105, 0.1)')
                        : outputStatus === 'error'
                          ? (darkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(220, 38, 38, 0.1)')
                          : (darkMode ? 'rgba(245, 158, 11, 0.15)' : 'rgba(217, 119, 6, 0.1)'),
                      color: outputStatus === 'success'
                        ? (darkMode ? '#34d399' : '#059669')
                        : outputStatus === 'error'
                          ? (darkMode ? '#f87171' : '#dc2626')
                          : (darkMode ? '#fbbf24' : '#d97706'),
                      border: '1px solid',
                      borderColor: outputStatus === 'success'
                        ? (darkMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(5, 150, 105, 0.2)')
                        : outputStatus === 'error'
                          ? (darkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(220, 38, 38, 0.2)')
                          : (darkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(217, 119, 6, 0.2)'),
                      '& .MuiChip-icon': { 
                        fontSize: 14,
                        marginLeft: 0.5,
                        marginRight: -0.25,
                        color: 'inherit'
                      }
                    }}
                  />
                )}
                
                {/* Run Code button */}
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isRunning ? 
                    <CircularProgress size={16} color="inherit" /> : 
                    <PlayArrowRoundedIcon />
                  }
                  onClick={executeCode}
                  disabled={isRunning}
                  sx={{ 
                    height: '32px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: '8px',
                    textTransform: 'none',
                    transition: 'all 0.2s ease',
                    bgcolor: '#0088CC',
                    color: '#ffffff',
                    px: 1.5,
                    '&:hover': {
                      bgcolor: '#0077b6',
                    },
                    '&:disabled': {
                      bgcolor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                      color: darkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'
                    }
                  }}
                >
                  {isRunning ? 'Running...' : 'Run Code'}
                </Button>
              </Box>
            </Box>
            
            <Box 
              sx={{ 
                flexGrow: 1, 
                p: 1.5,
                overflow: 'auto',
                fontFamily: '"Consolas", "JetBrains Mono", "Fira Code", monospace',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                position: 'relative',
                bgcolor: darkMode ? '#121212' : '#ffffff',
                transition: 'all 0.2s ease',
                borderBottomLeftRadius: '12px',
                borderBottomRightRadius: '12px',
                ...getOutputBoxStyle(),
                '&::-webkit-scrollbar': {
                  width: '12px',
                  height: '12px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: darkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                  borderRadius: '6px',
                  border: '3px solid',
                  borderColor: darkMode ? '#0a0b0f' : '#ffffff',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                }
              }}
            >
              {output || (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                    fontStyle: 'italic',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontFamily: 'inherit',
                    height: '100%',
                    justifyContent: 'center'
                  }}
                >
                  <TerminalIcon fontSize="small" sx={{ opacity: 0.5 }} />
                  Your code output will appear here
                </Typography>
              )}
              
              {/* Output copy button */}
              {output && output !== 'Executing code...' && (
                <Tooltip title={copiedOutput ? "Copied!" : "Copy Output"}>
                  <Button 
                    size="small" 
                    onClick={copyOutputToClipboard}
                    variant="outlined"
                    startIcon={copiedOutput ? <DoneIcon /> : <ContentCopyIcon />}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      color: copiedOutput ? 
                        (darkMode ? '#ffffff' : '#000000') : 
                        (darkMode ? '#ffffff' : '#000000'),
                      bgcolor: copiedOutput ? 
                        (darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)') :
                        (darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      height: '32px',
                      px: 1.5,
                      py: 0.75,
                      borderRadius: '8px',
                      '&:hover': {
                        bgcolor: copiedOutput ? 
                          (darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)') :
                          (darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)')
                      },
                      transition: 'all 0.15s ease',
                      border: '1px solid',
                      borderColor: copiedOutput ? 
                        (darkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)') :
                        (darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)')
                    }}
                  >
                    {copiedOutput ? "Copied" : "Copy"}
                  </Button>
                </Tooltip>
              )}
            </Box>
          </Box>
          
          {/* Run Button and Input Section */}
          <Box sx={{ 
            flex: '1 1 40%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: '12px',
            bgcolor: darkMode ? '#080a0e' : '#ffffff',
            boxShadow: darkMode ? 
              '0 4px 12px rgba(0, 0, 0, 0.3)' : 
              '0 4px 12px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Input Section - No Run Button Here Anymore */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              px: 1.5,
              py: 0.75,
              borderBottom: 1,
              borderColor: darkMode ? alpha('#fff', 0.1) : alpha('#000', 0.1),
              bgcolor: darkMode ? 'rgba(12, 13, 16, 0.5)' : alpha('#f5f7f9', 0.7),
              minHeight: '48px',
              maxHeight: '48px',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px'
            }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: darkMode ? alpha(muiTheme.palette.text.primary, 0.8) : alpha('#000', 0.7),
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em'
                }}
              >
                <KeyboardIcon fontSize="small" sx={{ 
                  color: darkMode ? '#ffffff' : '#000000',
                  opacity: 0.9
                }} /> 
                Input (stdin)
              </Typography>
            </Box>
            
            <Box sx={{ 
              flexGrow: 1,
              position: 'relative',
              bgcolor: darkMode ? '#060709' : '#ffffff',
              border: 'none',
              transition: 'border-left-color 0.2s ease',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px',
              overflow: 'hidden'
            }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter input values here if your program reads from stdin..."
                style={{
                  width: '100%',
                  height: '100%',
                  resize: 'none',
                  border: 'none',
                  outline: 'none',
                  padding: '16px',
                  fontFamily: '"Consolas", "JetBrains Mono", "Fira Code", monospace',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  background: darkMode ? '#121212' : '#ffffff',
                  color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                  transition: 'all 0.2s ease'
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default CodePad; 