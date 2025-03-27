import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme } from '@mui/material';

// Create the theme context
const ThemeContext = createContext();

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

// Common theme settings for both light and dark modes
const commonThemeSettings = {
  typography: {
    fontFamily: [
      'Nekst',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontFamily: 'Nekst, sans-serif',
      fontWeight: 700,
      textShadow: 'none',
    },
    h2: {
      fontFamily: 'Nekst, sans-serif',
      fontWeight: 700,
      textShadow: 'none',
    },
    h3: {
      fontFamily: 'Nekst, sans-serif',
      fontWeight: 600,
      textShadow: 'none',
    },
    h4: {
      fontFamily: 'Nekst, sans-serif',
      fontWeight: 600,
      textShadow: 'none',
    },
    h5: {
      fontFamily: 'Nekst, sans-serif',
      fontWeight: 500,
      textShadow: 'none',
    },
    h6: {
      fontFamily: 'Nekst, sans-serif',
      fontWeight: 500,
      textShadow: 'none',
    },
    subtitle1: {
      fontFamily: 'Nekst, sans-serif',
    },
    subtitle2: {
      fontFamily: 'Nekst, sans-serif',
    },
    body1: {
      fontFamily: 'Nekst, sans-serif',
    },
    body2: {
      fontFamily: 'Nekst, sans-serif',
    },
    button: {
      fontFamily: 'Nekst, sans-serif',
      textTransform: 'none',
    },
    caption: {
      fontFamily: 'Nekst, sans-serif',
    },
    overline: {
      fontFamily: 'Nekst, sans-serif',
    },
  },
  shape: {
    borderRadius: 8
  }
};

// Theme provider component
export const ThemeProvider = ({ children }) => {
  // Check if dark mode is stored in localStorage, default to true (dark mode)
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode !== null ? JSON.parse(savedMode) : true;
  });

  // Create light and dark themes
  const darkTheme = createTheme({
    ...commonThemeSettings,
    palette: {
      mode: 'dark',
      primary: {
        main: '#0088cc',
        light: '#33a0d4',
        dark: '#006699',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#1a1a1a',
        light: '#333333',
        dark: '#000000',
        contrastText: '#ffffff',
      },
      background: {
        default: '#000000',
        paper: '#1a1a1a',
        card: '#121212', // Darker background for cards
      },
      text: {
        primary: '#ffffff',
        secondary: 'rgba(255, 255, 255, 0.7)',
        disabled: 'rgba(255, 255, 255, 0.5)',
      },
      divider: 'rgba(255, 255, 255, 0.1)',
    },
    components: {
      // Ensure consistent card styling
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: '#121212',
            backgroundImage: 'none',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          }
        }
      },
      // Style Paper components consistently
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: '#121212',
            backgroundImage: 'none',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          }
        }
      },
      // Set consistent CardContent padding
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 16,
            '&:last-child': {
              paddingBottom: 16,
            }
          }
        }
      },
      // Ensure AppBar has different styling from cards
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#1a1a1a',
            backgroundImage: 'none',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }
        }
      },
      // Apply Nekst font to buttons
      MuiButton: {
        styleOverrides: {
          root: {
            fontFamily: 'Nekst, sans-serif',
            textTransform: 'none',
          },
        },
      },
      // Apply Nekst font to input labels
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontFamily: 'Nekst, sans-serif',
          },
        },
      },
      // Apply Nekst font to input text
      MuiInputBase: {
        styleOverrides: {
          root: {
            fontFamily: 'Nekst, sans-serif',
          },
        },
      },
      // Remove any gaussian blur from Typography components
      MuiTypography: {
        styleOverrides: {
          root: {
            textShadow: 'none',
            backgroundImage: 'none',
            filter: 'none',
            color: '#ffffff',
          },
        },
      },
    },
  });

  const lightTheme = createTheme({
    ...commonThemeSettings,
    palette: {
      mode: 'light',
      primary: {
        main: '#0088cc',
        light: '#33a0d4',
        dark: '#006699',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#f5f5f5',
        light: '#ffffff',
        dark: '#e0e0e0',
        contrastText: '#000000',
      },
      background: {
        default: '#ffffff',
        paper: '#f5f5f5',
        card: '#ffffff', // Light background for cards
      },
      text: {
        primary: '#000000',
        secondary: 'rgba(0, 0, 0, 0.7)',
        disabled: 'rgba(0, 0, 0, 0.5)',
      },
      divider: 'rgba(0, 0, 0, 0.1)',
    },
    components: {
      // Ensure consistent card styling
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: '#ffffff',
            backgroundImage: 'none',
            borderRadius: 12,
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }
        }
      },
      // Style Paper components consistently
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: '#ffffff',
            backgroundImage: 'none',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }
        }
      },
      // Set consistent CardContent padding
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 16,
            '&:last-child': {
              paddingBottom: 16,
            }
          }
        }
      },
      // Ensure AppBar has different styling from cards
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#f5f5f5',
            backgroundImage: 'none',
            borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
          }
        }
      },
      // Apply Nekst font to buttons
      MuiButton: {
        styleOverrides: {
          root: {
            fontFamily: 'Nekst, sans-serif',
            textTransform: 'none',
          },
        },
      },
      // Apply Nekst font to input labels
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontFamily: 'Nekst, sans-serif',
          },
        },
      },
      // Apply Nekst font to input text
      MuiInputBase: {
        styleOverrides: {
          root: {
            fontFamily: 'Nekst, sans-serif',
          },
        },
      },
      // Remove any gaussian blur from Typography components
      MuiTypography: {
        styleOverrides: {
          root: {
            textShadow: 'none',
            backgroundImage: 'none',
            filter: 'none',
            color: '#000000',
          },
        },
      },
    },
  });

  // Get the current theme based on dark mode state
  const theme = darkMode ? darkTheme : lightTheme;

  // Toggle between dark and light mode
  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Update localStorage when dark mode changes
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    // Update body background color
    document.body.style.backgroundColor = darkMode ? '#000000' : '#ffffff';
    document.body.style.color = darkMode ? '#ffffff' : '#000000';
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ theme, darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 