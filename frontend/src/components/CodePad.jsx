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

import CodeIcon from '@mui/icons-material/Code';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import TerminalIcon from '@mui/icons-material/Terminal';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import DoneIcon from '@mui/icons-material/Done';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

import Editor from '@monaco-editor/react';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';

// Inline SVG language icons for consistent sizing and zero network dependency
const ICON_SIZE = 22;

const CIcon = ({ dark }) => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 128 128">
    <path fill={dark ? '#ffffff' : '#283593'} d="M117.5 33.5l.3-.2c-.6-1.1-1.5-2.1-2.4-2.6L67.1 2.9c-.8-.5-1.9-.7-3.1-.7-1.2 0-2.3.3-3.1.7l-48 27.9c-1.7 1-2.9 3.5-2.9 5.4v55.7c0 1.1.2 2.3.9 3.4l-.2.1c.5.8 1.2 1.5 1.9 1.9l48.2 27.9c.8.5 1.9.7 3.1.7 1.2 0 2.3-.3 3.1-.7l48-27.9c1.7-1 2.9-3.5 2.9-5.4V36.1c.1-.8 0-1.7-.4-2.6zM64 88.5c13.5 0 24.5-11 24.5-24.5S77.5 39.5 64 39.5 39.5 50.5 39.5 64 50.5 88.5 64 88.5z"/>
    <path fill={dark ? '#ffffff' : '#283593'} d="M64 49.5c-8 0-14.5 6.5-14.5 14.5s6.5 14.5 14.5 14.5 14.5-6.5 14.5-14.5-6.5-14.5-14.5-14.5z" opacity="0"/>
  </svg>
);

const CppIcon = ({ dark }) => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 128 128">
    <path fill={dark ? '#ffffff' : '#00599C'} d="M117.5 33.5l.3-.2c-.6-1.1-1.5-2.1-2.4-2.6L67.1 2.9c-.8-.5-1.9-.7-3.1-.7-1.2 0-2.3.3-3.1.7l-48 27.9c-1.7 1-2.9 3.5-2.9 5.4v55.7c0 1.1.2 2.3.9 3.4l-.2.1c.5.8 1.2 1.5 1.9 1.9l48.2 27.9c.8.5 1.9.7 3.1.7 1.2 0 2.3-.3 3.1-.7l48-27.9c1.7-1 2.9-3.5 2.9-5.4V36.1c.1-.8 0-1.7-.4-2.6z"/>
    <path fill={dark ? '#060709' : '#fff'} d="M64 88.5c13.5 0 24.5-11 24.5-24.5S77.5 39.5 64 39.5 39.5 50.5 39.5 64 50.5 88.5 64 88.5zm0-39c8 0 14.5 6.5 14.5 14.5S72 78.5 64 78.5 49.5 72 49.5 64 56 49.5 64 49.5z"/>
    <path fill={dark ? '#060709' : '#fff'} d="M99 61h-4v-4h-4v4h-4v4h4v4h4v-4h4zM117 61h-4v-4h-4v4h-4v4h4v4h4v-4h4z"/>
  </svg>
);

const JavaIcon = ({ dark }) => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 128 128">
    <path fill={dark ? '#ffffff' : '#0074BD'} d="M47.617 98.12s-4.767 2.774 3.397 3.71c9.892 1.13 14.947.968 25.845-1.092 0 0 2.871 1.795 6.873 3.351-24.439 10.47-55.308-.607-36.115-5.969zm-2.988-13.665s-5.348 3.959 2.823 4.805c10.567 1.091 18.91 1.18 33.354-1.6 0 0 1.993 2.025 5.132 3.131-29.542 8.64-62.446.68-41.309-6.336z"/>
    <path fill={dark ? '#ffffff' : '#EA2D2E'} d="M69.802 61.271c6.025 6.935-1.58 13.17-1.58 13.17s15.289-7.891 8.269-17.777c-6.559-9.215-11.587-13.793 15.635-29.58 0 .001-42.731 10.67-22.324 34.187z"/>
    <path fill={dark ? '#ffffff' : '#0074BD'} d="M102.123 108.229s3.529 2.91-3.888 5.159c-14.102 4.272-58.706 5.56-71.094.171-4.451-1.938 3.899-4.625 6.526-5.192 2.739-.593 4.303-.485 4.303-.485-4.953-3.487-32.013 6.85-13.743 9.815 49.821 8.076 90.817-3.637 77.896-9.468zM49.912 70.294s-22.686 5.389-8.033 7.348c6.188.828 18.518.638 30.011-.326 9.39-.789 18.813-2.474 18.813-2.474s-3.308 1.419-5.704 3.053c-23.042 6.061-67.544 3.238-54.731-2.958 10.832-5.239 19.644-4.643 19.644-4.643zm40.697 22.747c23.421-12.167 12.591-23.86 5.032-22.285-1.848.385-2.677.72-2.677.72s.688-1.079 2-1.543c14.953-5.255 26.451 15.503-4.823 23.725 0-.002.359-.327.468-.617z"/>
    <path fill={dark ? '#ffffff' : '#EA2D2E'} d="M76.491 1.587S89.459 14.563 63.59 32.513c-20.837 14.46-4.756 22.725.01 32.166-12.175-10.985-21.108-20.643-15.115-29.644C56.786 23.253 81.3 17.96 76.491 1.587z"/>
    <path fill={dark ? '#ffffff' : '#0074BD'} d="M52.214 126.021c22.476 1.437 57-.8 57.817-11.436 0 0-1.571 4.032-18.577 7.231-19.186 3.612-42.854 3.191-56.887.874 0 .001 2.875 2.381 17.647 3.331z"/>
  </svg>
);

const PythonIcon = ({ dark }) => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 128 128">
    <path fill={dark ? '#ffffff' : '#3776AB'} d="M49.33 62h29.159C86.606 62 93 55.132 93 46.981V19.183c0-7.912-6.632-13.856-14.555-15.176-5.014-.835-10.195-1.215-15.187-1.191-4.99.023-9.612.448-13.805 1.191C37.098 6.188 35 10.758 35 19.183V30h29v4H23.776c-8.484 0-15.914 5.108-18.237 14.811-2.681 11.12-2.8 18.062 0 29.674C7.473 86.746 12.321 93 20.776 93H32V79.952c0-9.645 8.342-18.152 18.33-17.952zm-1.838-39.11c-3.026 0-5.478-2.479-5.478-5.545 0-3.079 2.451-5.581 5.478-5.581 3.015 0 5.479 2.502 5.479 5.581-.001 3.066-2.464 5.545-5.479 5.545z"/>
    <path fill={dark ? '#c0c0c0' : '#FFD43B'} d="M91.682 28H93V41.048c0 9.645-8.342 18.152-18.33 17.952H45.51C37.394 59 30 65.868 30 74.019v27.798c0 7.912 6.632 13.856 14.555 15.176 9.483 1.576 18.582 1.86 29.901 0C81.953 115.413 93 109.242 93 101.817V91H64v-4h40.224c8.484 0 15.914-5.108 18.237-14.811 2.681-11.12 2.8-18.062 0-29.674C120.527 34.254 112.679 28 104.224 28h-12.542zM78.508 94.89c3.026 0 5.478 2.479 5.478 5.545 0 3.079-2.451 5.581-5.478 5.581-3.015 0-5.479-2.502-5.479-5.581 0-3.066 2.464-5.545 5.479-5.545z"/>
  </svg>
);

const JavaScriptIcon = ({ dark }) => (
  <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 128 128">
    <path fill={dark ? '#ffffff' : '#F0DB4F'} d="M2 1v125h125V1H2zm66.119 106.513c-1.845 3.749-5.367 6.212-9.448 7.401-6.271 1.44-12.269.619-16.731-2.059-2.986-1.832-5.318-4.652-6.901-7.901l9.52-5.83c.083.035 1.896 3.436 3.876 4.563 2.801 1.563 6.668 1.856 8.759.189 1.108-.74 1.751-2.297 1.605-3.571-.205-1.907-2.075-3.302-4.593-4.593-2.745-1.34-5.417-2.782-7.339-4.593-4.691-4.072-5.313-10.73-2.543-16.073 2.085-4.022 6.066-6.649 10.663-7.572 5.624-.961 10.576.525 14.555 3.571 1.403 1.199 2.633 2.726 3.571 4.593l-9.52 5.83c-.727-1.905-2.525-3.468-4.593-4.023a8.27 8.27 0 0 0-4.208.171c-1.533.479-2.513 1.988-2.513 2.926-.126 1.78 1.262 3.282 3.026 4.253l5.441 2.926c6.235 3.081 9.742 7.811 10.663 13.726.695 5.911-1.282 11.263-5.317 14.655zm29.58-2.835c-2.547 4.315-6.38 6.268-10.663 7.572L84 109.678c1.467-1.015 3.547-2.828 4.253-4.593 1.292-3.559.636-7.18-2.174-8.759-.906-.394-1.59-.556-2.543-.171-1.982.81-2.5 3.543-2.543 5.441.144 7.235-3.344 11.553-8.075 13.385-2.836.997-6.358 1.151-9.52.171-3.25-1.064-5.797-3.485-7.572-6.387l9.52-5.83c.597 1.38 2.382 3.161 3.912 3.571 2.092.577 4.39-.151 4.934-2.345.239-2.117.143-4.093-.681-5.1-1.138-.756-2.397-1.399-3.571-1.706-5.515-1.593-9.635-5.415-11.005-10.663-1.453-5.872.054-12.199 4.253-16.073 2.452-2.288 5.797-3.895 9.178-4.253 5.083-.369 9.791.937 13.044 4.253 1.598 1.579 2.742 3.561 3.571 5.83l-9.52 5.83c-1.32-2.654-3.573-4.456-6.729-4.253-2.197.277-4.014 2.089-4.253 4.253-.163 2.462 1.107 4.203 3.401 5.441 3.254 1.652 6.859 2.647 9.349 5.441 3.417 3.536 4.122 8.897 2.714 14.144z"/>
  </svg>
);

// Language icon map keyed by language ID
const getLanguageIcon = (langKey, darkMode) => {
  const iconMap = {
    c: <CIcon dark={darkMode} />,
    cpp: <CppIcon dark={darkMode} />,
    java: <JavaIcon dark={darkMode} />,
    python: <PythonIcon dark={darkMode} />,
    javascript: <JavaScriptIcon dark={darkMode} />,
  };
  return iconMap[langKey] || null;
};

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
  
  // Function to handle editor mounting
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Add custom error handling
    window.addEventListener('error', (e) => {
      if (e.message.includes('Canceled')) {
        e.preventDefault();
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
      // Use the backend API to execute the code
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await axios.post(
        `${apiUrl}/compiler/execute`,
        {
          language,
          version: LANGUAGES[language].version,
          code,
          stdin: input
        }
      );
      
      const result = response.data.result;
      
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
      width: '100%', 
      height: '100%',
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: darkMode ? '#0e1117' : '#f5f7fa',
      position: 'relative',
      m: 0,
      p: 0,
      boxSizing: 'border-box',
      overflow: 'hidden',
      zIndex: 0, // Reduced z-index
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
        bgcolor: darkMode ? '#060709' : '#f0f2f5',
        boxSizing: 'border-box'
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
                    {getLanguageIcon(language, darkMode)}
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
                  {getLanguageIcon(key, darkMode)}
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