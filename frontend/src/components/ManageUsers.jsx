import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  InputAdornment,
  CircularProgress,
  Pagination,
  FormHelperText,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  AdminPanelSettings as AdminIcon,
  School as TeacherIcon,
  Person as UserIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Group as GroupIcon,
  People,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";

const ManageUsers = () => {
  const { token, user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserType, setSelectedUserType] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    user: null,
    newUserType: "",
  });
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    adminCount: 0,
    teacherCount: 0,
    userCount: 0,
  });
  const [hasLoadedData, setHasLoadedData] = useState(false);

  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);

  const userTypes = [
    {
      value: "user",
      label: "User",
      color: "#4caf50",
      icon: React.createElement(
        "svg",
        { viewBox: "0 0 24 24" },
        React.createElement("path", {
          d: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
        })
      ),
    },
    {
      value: "teacher",
      label: "Teacher",
      color: "#ff9800",
      icon: React.createElement(
        "svg",
        { viewBox: "0 0 24 24" },
        React.createElement("path", {
          d: "M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z",
        })
      ),
    },
    {
      value: "admin",
      label: "Admin",
      color: "#f44336",
      icon: React.createElement(
        "svg",
        { viewBox: "0 0 24 24" },
        React.createElement("path", {
          d: "M17 11c.34 0 .67.04 1 .09V6.27L10.5 3L3 6.27v4.91c0 4.54 3.2 8.79 7.5 9.82.55-.13 1.08-.32 1.6-.55-.69-.98-1.1-2.17-1.1-3.45 0-3.31 2.69-6 6-6z",
        })
      ),
    },
  ];

  const departments = [
    "AERO",
    "CSC",
    "CSD",
    "CSE",
    "CSM",
    "CSIT",
    "IT",
    "ECE",
    "MECH",
    "EEE",
  ];

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/manage-users", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data.users || []);
      setFilteredUsers(data.users || []);
      setUserStats(
        data.summary || {
          totalUsers: 0,
          adminCount: 0,
          teacherCount: 0,
          userCount: 0,
        }
      );
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  // LAZY LOAD: Fetch users only on first mount
  useEffect(() => {
    if (user?.userType === "admin" && !hasLoadedData) {
      fetchUsers();
      setHasLoadedData(true);
    }
  }, [user, token, hasLoadedData]);

  useEffect(() => {
    let filtered = users;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.rollNumber.toLowerCase().includes(query) ||
          user.department.toLowerCase().includes(query)
      );
    }
    if (selectedUserType !== "all") {
      filtered = filtered.filter((user) => user.userType === selectedUserType);
    }
    if (selectedDepartment !== "all") {
      filtered = filtered.filter(
        (user) => user.department === selectedDepartment
      );
    }
    setFilteredUsers(filtered);
    setPage(1);
  }, [users, searchQuery, selectedUserType, selectedDepartment]);

  const getUserTypeInfo = (userType) => {
    return userTypes.find((type) => type.value === userType) || userTypes[0];
  };

  const handleUserTypeChange = (user, newUserType) => {
    if (newUserType === user.userType) return;
    setConfirmDialog({ open: true, user, newUserType });
  };

  const confirmUserTypeChange = async () => {
    const { user: targetUser, newUserType } = confirmDialog;
    try {
      const response = await fetch("/api/admin/change-user-type", {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: targetUser._id, newUserType }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update user type");
      }
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u._id === targetUser._id ? { ...u, userType: newUserType } : u
        )
      );
      const oldTypeInfo = getUserTypeInfo(targetUser.userType);
      const newTypeInfo = getUserTypeInfo(newUserType);
      toast.success(
        `Successfully changed ${targetUser.name}'s role from ${oldTypeInfo.label} to ${newTypeInfo.label}`
      );
      setConfirmDialog({ open: false, user: null, newUserType: "" });
    } catch (error) {
      console.error("Error updating user type:", error);
      toast.error(
        error.response?.data?.message || "Failed to update user type"
      );
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedUserType("all");
    setSelectedDepartment("all");
  };

  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  if (user?.userType !== "admin") {
    return React.createElement(
      Container,
      {
        maxWidth: false,
        sx: {
          minHeight: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      },
      React.createElement(
        Alert,
        { severity: "error", sx: { maxWidth: 400 } },
        "Access Denied. Only administrators can manage users."
      )
    );
  }

  return React.createElement(
    Box,
    {
      sx: {
        backgroundColor: theme.palette.mode === "dark" ? "#000000" : "#f5f5f7",
        minHeight: "100vh",
        pt: 3,
        pb: 8,
      },
    },
    React.createElement(
      Container,
      { maxWidth: "xl" },
      React.createElement(
        Paper,
        {
          elevation: 0,
          sx: {
            p: { xs: 2, md: 3 },
            mb: 3,
            borderRadius: 2,
            backgroundColor: "#0585E0",
            border:
              theme.palette.mode === "dark"
                ? "1px solid #232323"
                : "1px solid rgba(0,0,0,0.1)",
            color: "white",
          },
        },
        React.createElement(
          Grid,
          { container: true, spacing: 2, alignItems: "center" },
          React.createElement(
            Grid,
            { item: true, xs: 12, md: 8 },
            React.createElement(
              Typography,
              {
                variant: isMobile ? "h5" : "h4",
                fontWeight: "bold",
                gutterBottom: true,
                sx: { color: "white" },
              },
              "User Management"
            ),
            React.createElement(
              Typography,
              {
                variant: isMobile ? "body2" : "subtitle1",
                sx: { color: "white" },
              },
              "Manage user roles and permissions across the platform"
            )
          )
        )
      ),
      // Stats Cards
      React.createElement(
        Grid,
        { container: true, spacing: 3, sx: { mb: 3 } },
        [
          {
            title: "Total Users",
            value: userStats.totalUsers,
            color: "#4CAF50",
            icon: People,
          },
          {
            title: "Admins",
            value: userStats.adminCount,
            color: "#E91E63",
            icon: AdminIcon,
          },
          {
            title: "Teachers",
            value: userStats.teacherCount,
            color: "#FF9800",
            icon: TeacherIcon,
          },
          {
            title: "Students",
            value: userStats.userCount,
            color: "#2196F3",
            icon: UserIcon,
          },
        ].map((stat, index) =>
          React.createElement(
            Grid,
            { item: true, xs: 12, sm: 6, md: 3, key: index },
            React.createElement(
              Card,
              {
                sx: {
                  borderRadius: 2,
                  backgroundColor:
                    theme.palette.mode === "dark" ? "#0A0A0A" : "white",
                  border:
                    theme.palette.mode === "dark"
                      ? "1px solid #232323"
                      : "1px solid rgba(0,0,0,0.1)",
                  boxShadow: "none",
                  overflow: "hidden",
                  height: "100%",
                },
              },
              React.createElement(Box, {
                sx: { height: 5, bgcolor: stat.color },
              }),
              React.createElement(
                CardContent,
                {
                  sx: {
                    height: "calc(100% - 5px)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  },
                },
                React.createElement(
                  Box,
                  { sx: { display: "flex", alignItems: "center", mb: 2 } },
                  React.createElement(
                    Avatar,
                    {
                      sx: {
                        bgcolor: stat.color + "1A",
                        color: stat.color,
                        mr: 2,
                      },
                    },
                    React.createElement(stat.icon)
                  ),
                  React.createElement(
                    Typography,
                    {
                      color:
                        theme.palette.mode === "dark"
                          ? "#ffffff"
                          : "text.primary",
                      fontWeight: "medium",
                    },
                    stat.title
                  )
                ),
                React.createElement(
                  Box,
                  null,
                  React.createElement(
                    Typography,
                    {
                      variant: "h4",
                      fontWeight: "bold",
                      color:
                        theme.palette.mode === "dark"
                          ? "#ffffff"
                          : "text.primary",
                    },
                    stat.value
                  )
                )
              )
            )
          )
        )
      ),

      // Filters Section
      React.createElement(
        Paper,
        {
          elevation: 0,
          sx: {
            p: 3,
            mb: 3,
            borderRadius: 2,
            backgroundColor:
              theme.palette.mode === "dark" ? "#0A0A0A" : "white",
            border:
              theme.palette.mode === "dark"
                ? "1px solid #232323"
                : "1px solid rgba(0,0,0,0.1)",
          },
        },
        React.createElement(
          Grid,
          { container: true, spacing: 2, alignItems: "center" },
          React.createElement(
            Grid,
            { item: true, xs: 12, md: 4 },
            React.createElement(TextField, {
              fullWidth: true,
              variant: "outlined",
              placeholder: "Search users...",
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value),
              InputProps: {
                startAdornment: React.createElement(
                  InputAdornment,
                  { position: "start" },
                  React.createElement(SearchIcon, { color: "action" })
                ),
              },
            })
          ),
          React.createElement(
            Grid,
            { item: true, xs: 12, sm: 6, md: 3 },
            React.createElement(
              FormControl,
              { fullWidth: true },
              React.createElement(InputLabel, null, "User Type"),
              React.createElement(
                Select,
                {
                  value: selectedUserType,
                  label: "User Type",
                  onChange: (e) => setSelectedUserType(e.target.value),
                },
                React.createElement(MenuItem, { value: "all" }, "All Types"),
                userTypes.map((type) =>
                  React.createElement(
                    MenuItem,
                    { key: type.value, value: type.value },
                    type.label
                  )
                )
              )
            )
          ),
          React.createElement(
            Grid,
            { item: true, xs: 12, sm: 6, md: 3 },
            React.createElement(
              FormControl,
              { fullWidth: true },
              React.createElement(InputLabel, null, "Department"),
              React.createElement(
                Select,
                {
                  value: selectedDepartment,
                  label: "Department",
                  onChange: (e) => setSelectedDepartment(e.target.value),
                },
                React.createElement(
                  MenuItem,
                  { value: "all" },
                  "All Departments"
                ),
                departments.map((dept) =>
                  React.createElement(
                    MenuItem,
                    { key: dept, value: dept },
                    dept
                  )
                )
              )
            )
          ),
          React.createElement(
            Grid,
            { item: true, xs: 12, md: 2 },
            React.createElement(
              Button,
              {
                fullWidth: true,
                variant: "outlined",
                onClick: clearFilters,
                startIcon: React.createElement(ClearIcon),
                sx: { height: "56px" },
              },
              "Clear"
            )
          )
        )
      ),

      // Users Table
      React.createElement(
        Paper,
        {
          elevation: 0,
          sx: {
            borderRadius: 2,
            backgroundColor:
              theme.palette.mode === "dark" ? "#0A0A0A" : "white",
            border:
              theme.palette.mode === "dark"
                ? "1px solid #232323"
                : "1px solid rgba(0,0,0,0.1)",
            overflow: "hidden",
          },
        },
        loading
          ? React.createElement(
              Box,
              {
                sx: {
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  p: 8,
                },
              },
              React.createElement(CircularProgress)
            )
          : React.createElement(TableContainer),
        React.createElement(
          Table,
          { stickyHeader: true },
          React.createElement(
            TableHead,
            null,
            React.createElement(
              TableRow,
              null,
              React.createElement(
                TableCell,
                { sx: { fontWeight: "bold" } },
                "User"
              ),
              React.createElement(
                TableCell,
                { sx: { fontWeight: "bold" } },
                "Email"
              ),
              React.createElement(
                TableCell,
                { sx: { fontWeight: "bold" } },
                "Roll Number"
              ),
              React.createElement(
                TableCell,
                { sx: { fontWeight: "bold" } },
                "Department"
              ),
              React.createElement(
                TableCell,
                { sx: { fontWeight: "bold" } },
                "User Type"
              ),
              React.createElement(
                TableCell,
                { sx: { fontWeight: "bold" } },
                "Actions"
              )
            )
          ),
          React.createElement(
            TableBody,
            null,
            paginatedUsers.length === 0
              ? React.createElement(
                  TableRow,
                  null,
                  React.createElement(
                    TableCell,
                    { colSpan: 6, sx: { textAlign: "center", py: 4 } },
                    React.createElement(
                      Typography,
                      { variant: "body1", color: "text.secondary" },
                      "No users found"
                    )
                  )
                )
              : paginatedUsers.map((user) => {
                  const userTypeInfo = getUserTypeInfo(user.userType);
                  return React.createElement(
                    TableRow,
                    {
                      key: user._id,
                      sx: {
                        "&:hover": {
                          backgroundColor: theme.palette.action.hover,
                        },
                      },
                    },
                    React.createElement(
                      TableCell,
                      null,
                      React.createElement(
                        Box,
                        {
                          sx: { display: "flex", alignItems: "center", gap: 2 },
                        },
                        React.createElement(
                          Avatar,
                          {
                            sx: {
                              bgcolor: userTypeInfo.color,
                              width: 40,
                              height: 40,
                            },
                          },
                          user.name.charAt(0).toUpperCase()
                        ),
                        React.createElement(
                          Typography,
                          { variant: "body2", fontWeight: "medium" },
                          user.name
                        )
                      )
                    ),
                    React.createElement(TableCell, null, user.email),
                    React.createElement(TableCell, null, user.rollNumber),
                    React.createElement(TableCell, null, user.department),
                    React.createElement(
                      TableCell,
                      null,
                      React.createElement(Chip, {
                        label: userTypeInfo.label,
                        size: "small",
                        sx: {
                          backgroundColor: userTypeInfo.color + "20",
                          color: userTypeInfo.color,
                          fontWeight: "medium",
                        },
                      })
                    ),
                    React.createElement(
                      TableCell,
                      null,
                      React.createElement(
                        FormControl,
                        { size: "small", sx: { minWidth: 100 } },
                        React.createElement(
                          Select,
                          {
                            value: user.userType,
                            onChange: (e) =>
                              handleUserTypeChange(user, e.target.value),
                            variant: "outlined",
                          },
                          userTypes.map((type) =>
                            React.createElement(
                              MenuItem,
                              { key: type.value, value: type.value },
                              type.label
                            )
                          )
                        )
                      )
                    )
                  );
                })
          )
        ),

        // Pagination
        filteredUsers.length > rowsPerPage &&
          React.createElement(
            Box,
            {
              sx: {
                display: "flex",
                justifyContent: "center",
                p: 3,
              },
            },
            React.createElement(Pagination, {
              count: Math.ceil(filteredUsers.length / rowsPerPage),
              page: page,
              onChange: (event, value) => setPage(value),
              color: "primary",
            })
          )
      ),

      // Confirmation Dialog
      React.createElement(
        Dialog,
        {
          open: confirmDialog.open,
          onClose: () =>
            setConfirmDialog({ open: false, user: null, newUserType: "" }),
          maxWidth: "sm",
          fullWidth: true,
        },
        React.createElement(DialogTitle, null, "Confirm Role Change"),
        React.createElement(
          DialogContent,
          null,
          confirmDialog.user &&
            React.createElement(
              Typography,
              null,
              "Are you sure you want to change ",
              React.createElement("strong", null, confirmDialog.user.name),
              "'s role from ",
              React.createElement(
                "strong",
                null,
                getUserTypeInfo(confirmDialog.user.userType).label
              ),
              " to ",
              React.createElement(
                "strong",
                null,
                getUserTypeInfo(confirmDialog.newUserType).label
              ),
              "?"
            )
        ),
        React.createElement(
          DialogActions,
          null,
          React.createElement(
            Button,
            {
              onClick: () =>
                setConfirmDialog({ open: false, user: null, newUserType: "" }),
              startIcon: React.createElement(CancelIcon),
            },
            "Cancel"
          ),
          React.createElement(
            Button,
            {
              onClick: confirmUserTypeChange,
              variant: "contained",
              startIcon: React.createElement(SaveIcon),
            },
            "Confirm"
          )
        )
      )
    )
  );
};

export default ManageUsers;
