import React, { useState, useMemo } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
  Button,
  Menu,
  MenuItem,
  Avatar,
  Container,
  Tooltip,
  Divider,
  useTheme as useMuiTheme,
  Chip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

// Create a simple logo component to avoid repetition
const Logo = () => (
  <Typography
    variant="h4"
    noWrap
    component="a"
    href="/"
    sx={{
      fontWeight: 700,
      background: 'linear-gradient(45deg, #0088cc 30%, #00bfff 90%)',
      backgroundClip: 'text',
      textFillColor: 'transparent',
      textDecoration: 'none',
      letterSpacing: '.01rem',
    }}
  >
    Scope
  </Typography>
);

// Common AppBar styles - LinkedIn styling
const appBarStyles = {
  backdropFilter: 'none',
  boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.05)'
};

const Navbar = () => {
  const { token, user, logout } = useAuth();
  const { theme, darkMode, toggleTheme } = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorElNav, setAnchorElNav] = useState(null);
  const [anchorElUser, setAnchorElUser] = useState(null);
  
  // Check if current path is an auth page
  const isAuthPage = ['/login', '/register'].includes(location.pathname) || location.pathname.startsWith('/register');

  // Define menu items only if authenticated and not on auth pages
  const menuItems = useMemo(() => {
    if (!token || isAuthPage) return [];
    
    let items = [
      { text: 'Dashboard', path: '/dashboard' },
      { text: 'Leaderboard', path: '/leaderboard' }
    ];
    
    // Only add CodePad for non-admin users
    if (user?.userType !== 'admin') {
      items.push({ text: 'CodePad', path: '/codepad' });
    }
    
    // Add common items for all users
    items.push(
      { text: 'Courses', path: '/courses' },
      { text: 'Opportunities', path: '/opportunities' }
    );

    if (user?.userType === 'admin') {
      // Admin-specific menu items - restored admin management options
      items.push(
        { text: 'Manage Courses', path: '/admin/courses' },
        { text: 'Manage Opportunities', path: '/admin/opportunities' }
      );
    }

    return items;
  }, [token, user?.userType, isAuthPage]);

  const handleLogout = () => {
    const logoutSuccessful = logout();
    
    if (logoutSuccessful) {
      navigate('/login');
    }
    
    handleCloseUserMenu();
  };

  const handleOpenNavMenu = (event) => {
    setAnchorElNav(event.currentTarget);
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleMenuClick = (path) => {
    navigate(path);
    handleCloseNavMenu();
  };

  // Theme-aware colors
  const themeColors = {
    appBar: darkMode 
      ? 'rgba(26, 26, 26, 0.8)'
      : '#ffffff',
    text: darkMode ? '#ffffff' : '#191919',
    border: darkMode 
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.08)',
    menuHover: darkMode
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.04)',
    iconColor: darkMode ? '#ffffff' : '#00000099',
    menuBg: darkMode ? '#1e1e1e' : '#ffffff',
    activeItem: darkMode ? '#0088cc' : '#0a66c2',
  };

  // Render simplified navbar for auth pages or when not authenticated
  if (!token || isAuthPage) {
    return (
      <AppBar position="fixed" sx={{
        ...appBarStyles,
        background: themeColors.appBar,
        borderBottom: `1px solid ${themeColors.border}`,
      }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <Box sx={{ flexGrow: 1 }}>
              <Logo />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <IconButton sx={{ ml: 1 }} onClick={toggleTheme} color="inherit">
                {darkMode ? (
                  <Brightness7Icon sx={{ color: themeColors.iconColor }} />
                ) : (
                  <Brightness4Icon sx={{ color: themeColors.iconColor }} />
                )}
              </IconButton>
              <Button
                color="inherit"
                component={RouterLink}
                to="/login"
                sx={{
                  color: location.pathname === '/login' ? themeColors.activeItem : themeColors.text,
                  fontWeight: 600,
                  borderRadius: '4px',
                  padding: '6px 16px',
                  '&:hover': { 
                    color: themeColors.activeItem,
                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(10, 102, 194, 0.04)' 
                  }
                }}
              >
                Login
              </Button>
              <Button
                component={RouterLink}
                to="/register"
                variant="outlined"
                sx={{
                  borderColor: location.pathname.includes('/register') ? themeColors.activeItem : themeColors.border,
                  color: location.pathname.includes('/register') ? themeColors.activeItem : themeColors.activeItem,
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: '1px solid',
                  '&:hover': {
                    borderColor: themeColors.activeItem,
                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(10, 102, 194, 0.04)',
                    border: '1px solid'
                  }
                }}
              >
                Register
              </Button>
            </Box>
        </Toolbar>
        </Container>
      </AppBar>
    );
  }

  // Main navbar for authenticated users
  return (
    <AppBar position="fixed" sx={{ 
      background: themeColors.appBar,
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
      borderBottom: `1px solid ${themeColors.border}`,
    }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo for desktop */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, mr: 2 }}>
            <Logo />
          </Box>

          {/* Mobile menu icon */}
          <Box sx={{ flexGrow: 0, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="menu"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              sx={{ color: themeColors.iconColor }}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{
                display: { xs: 'block', md: 'none' },
              }}
              PaperProps={{
                sx: { 
                  backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
                  color: themeColors.text,
                  borderRadius: '8px',
                  boxShadow: darkMode 
                    ? '0 4px 12px rgba(0, 0, 0, 0.4)' 
                    : '0 0 0 1px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)'
                }
              }}
              container={() => document.getElementById('dialog-container') || document.body}
              disableEnforceFocus
            >
              {menuItems?.map((item) => (
                <MenuItem 
                  key={item.text} 
                  onClick={() => handleMenuClick(item.path)}
                  sx={{
                    color: themeColors.text,
                    '&:hover': {
                      background: themeColors.menuHover,
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {item.text}
                  </Box>
                </MenuItem>
              ))}
            </Menu>
          </Box>

          {/* Logo for mobile */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <Logo />
          </Box>

          {/* Desktop menu items */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 6, ml: 8 }}>
            {menuItems?.map((item) => (
              <Box
                key={item.text}
                sx={{
                  // Removed transform and transition properties
                }}
              >
                <Box
                  onClick={() => handleMenuClick(item.path)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: location.pathname === item.path ? themeColors.activeItem : themeColors.text,
                    cursor: 'pointer',
                    position: 'relative',
                    padding: '8px 16px',
                    borderRadius: 2,
                    transition: 'color 0.3s ease',
                    '&:hover': {
                      // Removed background color change
                      color: themeColors.activeItem,
                    }
                    // Removed the &:after property that created the underline
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {item.text}
                  </Box>
                </Box>
              </Box>
            ))}
            </Box>
            
          {/* User menu and theme toggle */}
          <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Toggle Theme">
              <IconButton onClick={toggleTheme} sx={{ color: themeColors.iconColor, mr: 2 }}>
                {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Tooltip>

            {/* Add User Profile Section */}
            <Tooltip title="Open Profile Menu">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar 
                  alt={user?.name || 'User'} 
                  src={user?.profilePicture || '/static/images/avatar.jpg'} 
                  sx={{ 
                    width: 40, 
                    height: 40,
                    border: `2px solid ${themeColors.border}`,
                    '&:hover': {
                      boxShadow: '0 0 5px #0088cc'
                    }
                  }} 
                />
              </IconButton>
            </Tooltip>
            
            {/* User menu */}
            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
              PaperProps={{
                sx: { 
                  backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
                  color: themeColors.text,
                  borderRadius: '8px',
                  minWidth: 180,
                  boxShadow: darkMode 
                    ? '0 4px 12px rgba(0, 0, 0, 0.4)' 
                    : '0 0 0 1px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.05)'
                }
              }}
              container={() => document.getElementById('dialog-container') || document.body}
              disableEnforceFocus
            >
              <Box sx={{ px: 2, py: 2 }}>
                <Typography sx={{ color: themeColors.text, fontWeight: 600 }}>
                  {user?.name}
                </Typography>
                <Typography variant="body2" sx={{ color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)', mt: 0.5, fontWeight: 400 }}>
                  {user?.email}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: themeColors.border }} />
              <MenuItem 
                onClick={() => {
                  handleMenuClick('/profile?setup=true');
                  handleCloseUserMenu();
                }}
                sx={{
                  py: 1.5,
                  px: 2,
                  color: themeColors.text,
                  '&:hover': {
                    background: themeColors.menuHover,
                  }
                }}
              >
                <Typography>Profile</Typography>
              </MenuItem>
              <MenuItem 
                onClick={handleLogout}
                sx={{
                  py: 1.5,
                  px: 2,
                  color: '#ff4d4d',
                  '&:hover': {
                    background: 'rgba(255, 77, 77, 0.1)',
                  }
                }}
              >
                <Typography>Logout</Typography>
              </MenuItem>
            </Menu>
            </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
