import React, { useState, useMemo, useEffect } from 'react';
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
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  CircularProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { apiUrl } from '../config/apiConfig';

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
  const [anchorElNotifications, setAnchorElNotifications] = useState(null);
  
  // Add notifications state
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Check if current path is an auth page
  const isAuthPage = ['/login', '/register'].includes(location.pathname) || location.pathname.startsWith('/register');

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!token || isAuthPage) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data) {
        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${apiUrl}/notifications/${notificationId}/read`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Update the local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification._id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      setUnreadCount(prevCount => Math.max(0, prevCount - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await axios.put(`${apiUrl}/notifications/read-all`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Update the local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  // Format date for notifications
  const formatNotificationDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (diffDays === 0) {
      // Today
      return `Today, ${time}`;
    } else if (diffDays === 1) {
      // Yesterday
      return `Yesterday, ${time}`;
    } else if (diffDays < 7) {
      // Within a week - show day name and time
      return `${date.toLocaleDateString(undefined, { weekday: 'short' })}, ${time}`;
    } else {
      // More than a week ago - show full date and time
      return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}, ${time}`;
    }
  };
  
  // Get notifications on component mount and when token changes
  useEffect(() => {
    if (token && !isAuthPage) {
      fetchNotifications();
      
      // Set up a refresh interval for notifications
      const interval = setInterval(fetchNotifications, 30000); // every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [token, isAuthPage, location.pathname]);
  
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
      
      // Only add Courses and Opportunities for non-admin users
      items.push(
        { text: 'Courses', path: '/courses' },
        { text: 'Opportunities', path: '/opportunities' }
      );
    }

    if (user?.userType === 'admin') {
      // Admin-specific menu items - restored admin management options
      items.push(
        { text: 'Manage Courses', path: '/admin/courses' },
        { text: 'Manage Opportunities', path: '/admin/opportunities' },
        { text: 'Manage Notifications', path: '/admin/notifications' }
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
  
  const handleOpenNotificationsMenu = (event) => {
    setAnchorElNotifications(event.currentTarget);
    // If we have unread notifications, mark them as read when opening the menu
    if (unreadCount > 0) {
      markAllAsRead();
    }
  };

  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };
  
  const handleCloseNotificationsMenu = () => {
    setAnchorElNotifications(null);
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
                      color: themeColors.activeItem,
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {item.text}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
            
          {/* User menu, notifications, and theme toggle */}
          <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center' }}>
            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton
                onClick={handleOpenNotificationsMenu}
                sx={{ 
                  color: themeColors.iconColor, 
                  mr: 2,
                  backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  '&:hover': {
                    backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                  }
                }}
              >
                <Badge 
                  color="primary" 
                  variant={unreadCount > 0 ? "dot" : "standard"}
                  sx={{ 
                    '& .MuiBadge-badge': {
                      backgroundColor: '#0088cc', 
                      color: '#fff'
                    } 
                  }}
                >
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Notifications Menu */}
            <Menu
              sx={{ mt: '45px' }}
              id="notifications-menu"
              anchorEl={anchorElNotifications}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElNotifications)}
              onClose={handleCloseNotificationsMenu}
              PaperProps={{
                sx: { 
                  backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
                  color: themeColors.text,
                  borderRadius: '12px',
                  minWidth: 400,
                  maxWidth: 480,
                  maxHeight: 'calc(100vh - 100px)',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: darkMode 
                    ? '0 4px 20px rgba(0, 0, 0, 0.5)' 
                    : '0 0 0 1px rgba(0, 0, 0, 0.08), 0 4px 20px rgba(0, 0, 0, 0.08)',
                }
              }}
              container={() => document.getElementById('dialog-container') || document.body}
              disableEnforceFocus
            >
              {/* Fixed Header */}
              <Box 
                sx={{ 
                  p: 2, 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  borderBottom: `1px solid ${themeColors.border}`,
                  backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
                  zIndex: 2,
                  flexShrink: 0
                }}
              >
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  fontSize: '1.1rem',
                  color: darkMode ? '#ffffff' : '#1a1a1a'
                }}>
                  Notifications
                </Typography>
                {notifications.length > 0 && (
                  <Button 
                    size="small" 
                    onClick={markAllAsRead}
                    disabled={unreadCount === 0}
                    sx={{ 
                      fontSize: '0.8rem',
                      opacity: unreadCount === 0 ? 0.6 : 1,
                      color: '#1976d2',
                      '&:hover': {
                        backgroundColor: darkMode ? 'rgba(25, 118, 210, 0.08)' : 'rgba(25, 118, 210, 0.04)'
                      }
                    }}
                  >
                    Mark all as read
                  </Button>
                )}
              </Box>

              {/* Scrollable Content */}
              <Box sx={{ 
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': {
                  display: 'none'
                }
              }}>
                {loading ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : notifications.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        mb: 2
                      }}
                    >
                      <img 
                        src="/codestats.png" 
                        alt="CodeStats" 
                        style={{ 
                          width: 32, 
                          height: 32,
                          objectFit: 'contain'
                        }} 
                      />
                    </Box>
                    <Typography variant="body1" color="text.secondary">
                      No notifications
                    </Typography>
                  </Box>
                ) : (
                  <List sx={{ p: 0 }}>
                    {notifications.map((notification, index) => (
                      <React.Fragment key={notification._id}>
                        <ListItem 
                          sx={{ 
                            p: 0,
                            backgroundColor: !notification.read ? 
                              (darkMode ? 'rgba(25, 118, 210, 0.08)' : 'rgba(25, 118, 210, 0.04)') : 
                              'transparent',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: darkMode ? 
                                'rgba(255, 255, 255, 0.05)' : 
                                'rgba(0, 0, 0, 0.02)'
                            }
                          }}
                          onClick={() => markAsRead(notification._id)}
                        >
                          <Box sx={{ width: '100%', p: 2, display: 'flex', gap: 2 }}>
                            {/* Icon */}
                            <Box
                              sx={{
                                width: 45,
                                height: 45,
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              <img 
                                src="/codestats.png" 
                                alt="CodeStats" 
                                style={{ 
                                  width: 32, 
                                  height: 32,
                                  objectFit: 'contain'
                                }} 
                              />
                            </Box>

                            {/* Content */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                <Typography
                                  variant="subtitle2"
                                  sx={{ 
                                    fontWeight: notification.read ? 500 : 600,
                                    color: notification.read ? 
                                      (darkMode ? 'text.secondary' : '#424242') : 
                                      (darkMode ? 'text.primary' : '#1a1a1a'),
                                    fontSize: '0.9rem'
                                  }}
                                >
                                  {notification.title}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ 
                                    fontSize: '0.75rem',
                                    ml: 2,
                                    flexShrink: 0
                                  }}
                                >
                                  {formatNotificationDate(notification.createdAt)}
                                </Typography>
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{ 
                                  color: notification.read ? 
                                    (darkMode ? 'text.secondary' : '#666666') : 
                                    (darkMode ? 'text.primary' : '#333333'),
                                  opacity: notification.read ? 0.8 : 1,
                                  lineHeight: 1.4,
                                  fontSize: '0.85rem',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {notification.message}
                              </Typography>
                            </Box>
                          </Box>
                        </ListItem>
                        {index < notifications.length - 1 && (
                          <Divider 
                            sx={{ 
                              borderColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'
                            }} 
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Box>
            </Menu>
            
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
                  src={user?.profilePicture} 
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
