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

// Common AppBar styles
const appBarStyles = {
  background: 'rgba(26, 26, 26, 0.8)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
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
    
    const items = [
      { text: 'Dashboard', path: '/dashboard' },
      { text: 'Leaderboard', path: '/leaderboard' },
      { text: 'Courses', path: '/courses' },
      { text: 'Opportunities', path: '/opportunities' }
    ];

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
    logout();
    navigate('/login');
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

  // Render simplified navbar for auth pages or when not authenticated
  if (!token || isAuthPage) {
    return (
      <AppBar position="fixed" sx={appBarStyles}>
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            <Box sx={{ flexGrow: 1 }}>
              <Logo />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                color="inherit"
                component={RouterLink}
                to="/login"
                sx={{
                  color: location.pathname === '/login' ? '#0088cc' : 'white',
                  '&:hover': { color: '#0088cc' }
                }}
              >
                Login
              </Button>
              <Button
                component={RouterLink}
                to="/register"
                variant="outlined"
                sx={{
                  borderColor: location.pathname.includes('/register') ? '#0088cc' : 'rgba(255, 255, 255, 0.3)',
                  color: location.pathname.includes('/register') ? '#0088cc' : 'white',
                  '&:hover': {
                    borderColor: '#0088cc',
                    color: '#0088cc',
                    background: 'rgba(0, 136, 204, 0.1)'
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
    <AppBar position="fixed" sx={{ ...appBarStyles, bgcolor: theme.palette.background.paper }}>
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
              color="inherit"
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
            >
              {menuItems?.map((item) => (
                <MenuItem 
                  key={item.text} 
                  onClick={() => handleMenuClick(item.path)}
                  sx={{
                    color: 'white',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  <Typography textAlign="center">{item.text}</Typography>
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
                  transform: 'scale(1)',
                  transition: 'transform 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                }}
              >
                <Box
                  onClick={() => handleMenuClick(item.path)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    color: location.pathname === item.path ? '#0088cc' : 'white',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: '8px 16px',
                    borderRadius: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#0088cc',
                    }
                  }}
                >
                  <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                    {item.text}
                  </Typography>
                </Box>
              </Box>
            ))}
            </Box>
            
          {/* Theme toggle button */}
          <Box sx={{ mr: 2 }}>
            <Tooltip title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>
              <IconButton onClick={toggleTheme} color="inherit">
                {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Tooltip>
          </Box>

          {/* User menu */}
          <Box sx={{ flexGrow: 0, ml: 4 }}>
            <Tooltip title="Account settings">
              <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                <Avatar 
                  sx={{ 
                    width: 40,
                    height: 40,
                    bgcolor: '#0088cc',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#0088cc',
                    }
                  }}
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              sx={{
                mt: '45px',
                '& .MuiPaper-root': {
                  backgroundColor: 'rgba(26, 26, 26, 0.95)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  minWidth: 200,
                }
              }}
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
            >
              <Box sx={{ px: 2, py: 2 }}>
                <Typography sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600 }}>
                  {user?.name}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)', mt: 0.5, fontWeight: 400 }}>
                  {user?.email}
                </Typography>
              </Box>
              <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
              <MenuItem 
                onClick={() => {
                  handleMenuClick('/profile');
                  handleCloseUserMenu();
                }}
                sx={{
                  py: 1.5,
                  px: 2,
                  color: 'white',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.1)',
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
