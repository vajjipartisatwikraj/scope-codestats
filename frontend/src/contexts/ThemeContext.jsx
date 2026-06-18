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
    borderRadius: 4
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
      divider: 'rgba(23, 23, 23, 0.45)',
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
            border: '1px solid rgba(23, 23, 23, 0.45)',
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
      // Ensure AppBar has translucent glass styling
      MuiAppBar: {
        styleOverrides: {
          root: {
            // Remove forced backgrounds to allow custom styling
            backgroundColor: 'transparent',
            backgroundImage: 'none',
          }
        }
      },
      // Apply Nekst font to buttons
      MuiButton: {
        styleOverrides: {
          root: {
            fontFamily: 'Nekst, sans-serif',
            textTransform: 'none',
            borderRadius: '4px',
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
        main: '#0a66c2', // LinkedIn blue
        light: '#378fe9',
        dark: '#004182',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#f3f2ef', // LinkedIn background color
        light: '#ffffff',
        dark: '#e6e6e6',
        contrastText: '#000000',
      },
      background: {
        default: '#f5f5f7', // iOS-style light gray background (like iPhone settings)
        paper: '#ffffff',   // White background for components
        card: '#ffffff',    // White for cards
      },
      text: {
        primary: '#191919',  // LinkedIn primary text
        secondary: 'rgba(0, 0, 0, 0.6)', // LinkedIn secondary text
        disabled: 'rgba(0, 0, 0, 0.38)',
      },
      divider: 'rgba(0, 0, 0, 0.08)',
    },
    components: {
      // Ensure consistent card styling
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: '#ffffff',
            backgroundImage: 'none',
            borderRadius: 8,
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.05)',
          }
        }
      },
      // Style Paper components consistently
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: '#ffffff',
            backgroundImage: 'none',
            borderRadius: 4,
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.05)',
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
      // Ensure AppBar has translucent glass styling
      MuiAppBar: {
        styleOverrides: {
          root: {
            // Remove forced backgrounds to allow custom styling
            backgroundColor: 'transparent',
            backgroundImage: 'none',
          }
        }
      },
      // Apply Nekst font to buttons
      MuiButton: {
        styleOverrides: {
          root: {
            fontFamily: 'Nekst, sans-serif',
            textTransform: 'none',
            borderRadius: '4px',
          },
          containedPrimary: {
            backgroundColor: '#0a66c2',
            '&:hover': {
              backgroundColor: '#004182',
            }
          },
          outlinedPrimary: {
            borderColor: '#0a66c2',
            color: '#0a66c2',
            '&:hover': {
              backgroundColor: 'rgba(10, 102, 194, 0.04)',
              borderColor: '#004182',
            }
          }
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
            color: '#191919',
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
    // Update body background color - iOS-style backgrounds
    document.body.style.backgroundColor = darkMode ? '#000000' : '#f5f5f7';
    document.body.style.color = darkMode ? '#ffffff' : '#191919';
    
    // Add global scrollbar styles
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      ::-webkit-scrollbar {
        width: 8px;
        background-color: ${darkMode ? '#000000' : '#f5f5f7'};
      }
      ::-webkit-scrollbar-thumb {
        background-color: ${darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'};
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background-color: ${darkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)'};
      }
      ::-webkit-scrollbar-track {
        background-color: ${darkMode ? '#000000' : '#f5f5f7'};
      }
      * {
        scrollbar-width: thin;
        scrollbar-color: ${darkMode ? 'rgba(255, 255, 255, 0.3) #000000' : 'rgba(0, 0, 0, 0.2) #f5f5f7'};
      }
    `;
    
    // Remove any previous scrollbar styles
    const previousStyle = document.querySelector('style[data-scrollbar-styles]');
    if (previousStyle) {
      previousStyle.remove();
    }
    
    // Add the new styles
    styleSheet.setAttribute('data-scrollbar-styles', '');
    document.head.appendChild(styleSheet);
    
    // Cleanup function
    return () => {
      styleSheet.remove();
    };
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ theme, darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 