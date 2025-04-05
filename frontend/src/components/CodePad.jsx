import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Button, 
  CircularProgress, 
  Divider,
  useTheme as useMuiTheme,
  Chip,
  IconButton,
  Tooltip,
  Avatar
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import FileCopyOutlinedIcon from '@mui/icons-material/FileCopyOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import BugReportIcon from '@mui/icons-material/BugReport';
import TerminalIcon from '@mui/icons-material/Terminal';
import ScienceIcon from '@mui/icons-material/Science';
import KeyboardIcon from '@mui/icons-material/Keyboard';
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
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(LANGUAGES.python.defaultCode);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [outputStatus, setOutputStatus] = useState('idle'); // idle, success, error, warning
  
  // Get theme-aware language icons
  const languageIcons = LanguageIcons(darkMode);
  
  // Update default code when language changes
  useEffect(() => {
    setCode(LANGUAGES[language].defaultCode);
    setOutput('');
    setOutputStatus('idle');
  }, [language]);

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
  };

  // Handle output copy to clipboard
  const copyOutputToClipboard = () => {
    navigator.clipboard.writeText(output);
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
          bgcolor: 'rgba(46, 125, 50, 0.1)', 
          borderColor: 'success.main',
          boxShadow: '0 0 8px rgba(46, 125, 50, 0.3)' 
        };
      case 'error':
        return { 
          bgcolor: 'rgba(211, 47, 47, 0.1)', 
          borderColor: 'error.main',
          boxShadow: '0 0 8px rgba(211, 47, 47, 0.3)' 
        };
      case 'warning':
        return { 
          bgcolor: 'rgba(237, 108, 2, 0.1)', 
          borderColor: 'warning.main',
          boxShadow: '0 0 8px rgba(237, 108, 2, 0.3)' 
        };
      default:
        return { 
          bgcolor: darkMode ? 'rgba(66, 66, 66, 0.5)' : 'rgba(240, 240, 240, 0.5)', 
          borderColor: 'divider' 
        };
    }
  };

  // Get icon for output status
  const getOutputStatusIcon = () => {
    switch (outputStatus) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
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

  return (
    <Container maxWidth="xl" sx={{ 
      mt: { xs: 2, sm: 4 }, 
      pb: { xs: 2, sm: 4 },
      px: { xs: 1, sm: 2, md: 3 }  // Smaller padding on mobile
    }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: { xs: 2, sm: 3 },  // Reduced padding on mobile
          borderRadius: 2,
          bgcolor: darkMode ? 'background.paper' : 'background.default'
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },  // Stack vertically on mobile
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          mb: { xs: 2, sm: 3 },
          gap: { xs: 2, sm: 0 }  // Add gap when stacked on mobile
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CodeIcon sx={{ fontSize: { xs: 28, sm: 32 }, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" sx={{ 
              fontWeight: 'bold',
              fontSize: { xs: '1.5rem', sm: '2rem' }  // Smaller font on mobile
            }}>
              CodePad
            </Typography>
          </Box>
          <FormControl sx={{ width: { xs: '100%', sm: 200 } }}> 
            <InputLabel id="language-select-label">Language</InputLabel>
            <Select
              labelId="language-select-label"
              id="language-select"
              value={language}
              label="Language"
              onChange={(e) => setLanguage(e.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>
                    {languageIcons[selected]}
                  </Box>
                  <Typography sx={{ fontWeight: 500 }}>
                    {LANGUAGES[selected].name}
                  </Typography>
                </Box>
              )}
            >
              {Object.entries(LANGUAGES).map(([key, value]) => (
                <MenuItem key={key} value={key} sx={{ height: 42 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>
                      {languageIcons[key]}
                    </Box>
                    <Typography sx={{ fontWeight: 500 }}>
                      {value.name}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1
          }}>
            <Typography variant="body2" color="text.secondary">
              Editor
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Download Code">
                <IconButton 
                  size="small" 
                  onClick={downloadCode}
                  color="primary"
                >
                  <FileDownloadOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Copy Code">
                <IconButton 
                  size="small" 
                  onClick={copyCodeToClipboard}
                  color="primary"
                >
                  <FileCopyOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Paper 
            variant="outlined" 
            sx={{ 
              height: { xs: '300px', sm: '400px' },  // Smaller height on mobile
              borderRadius: 1,
              overflow: 'hidden'
            }}
          >
            <Editor
              height="100%"
              language={getMonacoLanguage(language)}
              value={code}
              onChange={setCode}
              theme={darkMode ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                automaticLayout: true
              }}
            />
          </Paper>
        </Box>

        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <KeyboardIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Input (stdin)
              </Typography>
            </Box>
            <Tooltip title="Program input will be passed to stdin">
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  fontStyle: 'italic',
                  display: { xs: 'none', sm: 'block' }  // Hide this explanatory text on mobile
                }}
              >
                dinesh bhaaai
              </Typography>
            </Tooltip>
          </Box>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              minHeight: { xs: '60px', sm: '80px' },
              maxHeight: { xs: '120px', sm: '150px' },
              borderRadius: 1,
              border: '1px solid',
              borderColor: darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
              mb: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: '0 2px 8px rgba(33, 150, 243, 0.15)'
              }
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter input values here if your program reads from stdin..."
              style={{
                width: '100%',
                height: '100%',
                minHeight: '60px',
                resize: 'vertical',
                border: 'none',
                outline: 'none',
                fontFamily: 'monospace',
                fontSize: '14px',
                background: 'transparent',
                color: darkMode ? 'white' : 'black'
              }}
            />
          </Paper>
        </Box>

        <Box sx={{ 
          mb: { xs: 2, sm: 3 }, 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },  // Stack buttons vertically on mobile
          justifyContent: 'space-between',
          gap: { xs: 2, sm: 0 }  // Add gap when stacked
        }}>
          <Box sx={{ 
            display: 'flex', 
            gap: 1,
            width: { xs: '100%', sm: 'auto' }  // Full width on mobile
          }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<RocketLaunchIcon />}
              onClick={executeCode}
              disabled={isRunning}
              fullWidth={true}  // Make button full width
              sx={{ 
                position: 'relative',
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                transition: 'all 0.3s',
                '&:hover': {
                  background: 'linear-gradient(45deg, #21CBF3 30%, #2196F3 90%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 10px 2px rgba(33, 203, 243, .3)',
                },
                '&:active': {
                  transform: 'translateY(1px)',
                  boxShadow: '0 2px 3px 1px rgba(33, 203, 243, .3)',
                }
              }}
            >
              {isRunning ? 'Running...' : 'Run Code'}
              {isRunning && (
                <CircularProgress
                  size={24}
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    marginTop: '-12px',
                    marginLeft: '-12px',
                  }}
                />
              )}
            </Button>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-end', sm: 'flex-end' } }}>
            <Tooltip title="Copy Output">
              {!output || output === 'Executing code...' ? (
                <span>
                  <IconButton 
                    onClick={copyOutputToClipboard}
                    color="primary"
                    disabled={true}
                    sx={{
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'scale(1.1)',
                        backgroundColor: 'rgba(33, 150, 243, 0.08)',
                      },
                      '&:active': {
                        transform: 'scale(0.95)',
                      }
                    }}
                  >
                    <FileCopyOutlinedIcon />
                  </IconButton>
                </span>
              ) : (
                <IconButton 
                  onClick={copyOutputToClipboard}
                  color="primary"
                  sx={{
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      backgroundColor: 'rgba(33, 150, 243, 0.08)',
                    },
                    '&:active': {
                      transform: 'scale(0.95)',
                    }
                  }}
                >
                  <FileCopyOutlinedIcon />
                </IconButton>
              )}
            </Tooltip>
          </Box>
        </Box>

        <Box>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TerminalIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Output
              </Typography>
            </Box>
            {outputStatus === 'success' && (
              <Chip 
                label="Execution Successful" 
                size="small" 
                color="success" 
                icon={<Typography sx={{ fontSize: '1rem', ml: 1 }}>✅</Typography>}
                sx={{ 
                  height: 24,
                  background: 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)',
                  color: 'white',
                  fontWeight: 500,
                  fontSize: { xs: '0.7rem', sm: '0.8rem' }  // Smaller font on mobile
                }}
              />
            )}
            {outputStatus === 'error' && (
              <Chip 
                label="Compilation Error" 
                size="small" 
                color="error" 
                icon={<Typography sx={{ fontSize: '1rem', ml: 1 }}>❌</Typography>}
                sx={{ 
                  height: 24,
                  background: 'linear-gradient(45deg, #d32f2f 30%, #f44336 90%)',
                  color: 'white',
                  fontWeight: 500,
                  fontSize: { xs: '0.7rem', sm: '0.8rem' }  // Smaller font on mobile
                }}
              />
            )}
            {outputStatus === 'warning' && (
              <Chip 
                label="Runtime Error" 
                size="small" 
                color="warning" 
                icon={<Typography sx={{ fontSize: '1rem', ml: 1 }}>⚠️</Typography>}
                sx={{ 
                  height: 24,
                  background: 'linear-gradient(45deg, #ed6c02 30%, #ff9800 90%)',
                  color: 'white',
                  fontWeight: 500,
                  fontSize: { xs: '0.7rem', sm: '0.8rem' }  // Smaller font on mobile
                }}
              />
            )}
          </Box>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              minHeight: { xs: '120px', sm: '150px' },
              maxHeight: { xs: '200px', sm: '250px' },
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: { xs: '12px', sm: '14px' },  // Smaller font on mobile
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              position: 'relative',
              transition: 'all 0.3s ease',
              ...getOutputBoxStyle()
            }}
          >
            {output || 'Your code output will appear here'}
            {outputStatus !== 'idle' && (
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 12, 
                  right: 12, 
                  fontSize: { xs: '1rem', sm: '1.2rem' },  // Smaller icon on mobile
                  opacity: 0.8
                }}
              >
                {getOutputStatusIcon()}
              </Box>
            )}
          </Paper>
        </Box>
      </Paper>
    </Container>
  );
};

export default CodePad; 