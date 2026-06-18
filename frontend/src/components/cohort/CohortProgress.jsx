import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  alpha,
  Chip,
  Avatar,
  useTheme,
  Tab,
  Tabs,
  InputBase,
  InputLabel,
  FormControl,
  Select,
  MenuItem,
  Button,
  IconButton,
  Stack,
  Tooltip,
} from "@mui/material";
import {
  EmojiEvents as TrophyIcon,
  Timeline as TimelineIcon,
  AccessTime as TimeIcon,
  Equalizer as EqualizerIcon,
  People as PeopleIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  ArrowBack,
  ArrowForward,
  Close as CloseIcon,
} from "@mui/icons-material";
import axios from "axios";
import { apiUrl } from "../../config/apiConfig";
import { useAuth } from "../../contexts/AuthContext";
import * as ExcelJS from "exceljs";

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`progress-tabpanel-${index}`}
      aria-labelledby={`progress-tab-${index}`}
      style={{
        display: value === index ? "block" : "none",
        width: "100%",
        height: "calc(100% - 48px)",
      }}
      {...other}
    >
      {value === index && <Box sx={{ py: 2, px: 0 }}>{children}</Box>}
    </div>
  );
}

const CohortProgress = ({ cohort, userProgress, isAdmin, populatedModules }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [filteredLeaderboard, setFilteredLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [hasLoadedData, setHasLoadedData] = useState(false); // Track if data has been loaded

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Export-specific states
  const [exportGraduationYears, setExportGraduationYears] = useState([]); // Array of selected years for export
  const [showExportOptions, setShowExportOptions] = useState(false); // Toggle export options modal/dropdown

  // Get unique departments, years, and sections for filter options
  const uniqueDepartments = [
    ...new Set(
      leaderboard.map((user) => user.user?.department).filter(Boolean)
    ),
  ];
  const uniqueYears = [
    ...new Set(
      leaderboard
        .map((user) => user.user?.graduatingYear || user.user?.graduationYear)
        .filter(Boolean)
    ),
  ];
  const uniqueSections = [
    ...new Set(leaderboard.map((user) => user.user?.section).filter(Boolean)),
  ];

  // Filter and sort leaderboard
  useEffect(() => {
    let filtered = leaderboard.filter((user) => {
      const matchesSearch =
        !searchTerm ||
        user.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user?.rollNumber
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        user.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user?.department
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        user.user?.section?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment =
        !departmentFilter || user.user?.department === departmentFilter;
      const matchesYear =
        !yearFilter ||
        (user.user?.graduatingYear || user.user?.graduationYear)?.toString() ===
          yearFilter;
      const matchesSection =
        !sectionFilter || user.user?.section === sectionFilter;

      return (
        matchesSearch && matchesDepartment && matchesYear && matchesSection
      );
    });

    // Always sort by total score (descending)
    filtered.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

    setFilteredLeaderboard(filtered);
    setPage(1);
  }, [leaderboard, searchTerm, departmentFilter, yearFilter, sectionFilter]);

  // Pagination
  const paginatedLeaderboard = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredLeaderboard.slice(start, start + rowsPerPage);
  }, [filteredLeaderboard, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredLeaderboard.length / rowsPerPage);

  const handleClearFilters = () => {
    setSearchTerm("");
    setDepartmentFilter("");
    setYearFilter("");
    setSectionFilter("");
    setPage(1);
  };

  // Scrollbar styles matching main leaderboard
  const scrollbarStyles = useMemo(
    () => ({
      "&::-webkit-scrollbar": { width: "10px", height: "10px" },
      "&::-webkit-scrollbar-track": {
        backgroundColor: isDarkMode
          ? "rgba(255, 255, 255, 0.05)"
          : "rgba(0, 136, 204, 0.05)",
        borderRadius: "10px",
      },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: isDarkMode
          ? "rgba(255, 255, 255, 0.2)"
          : "rgba(0, 136, 204, 0.4)",
        borderRadius: "10px",
        "&:hover": {
          backgroundColor: isDarkMode
            ? "rgba(255, 255, 255, 0.3)"
            : "rgba(0, 136, 204, 0.6)",
        },
      },
    }),
    [isDarkMode]
  );

  // Dropdown theme colors matching main leaderboard
  const dropdownThemeColors = useMemo(
    () => ({
      menuBg: isDarkMode ? "#0A0A0A" : "#ffffff",
      menuBorder: isDarkMode ? "#131313" : "rgba(0, 0, 0, 0.1)",
      menuShadow: isDarkMode
        ? "0 4px 20px rgba(0, 0, 0, 0.5)"
        : "0 4px 20px rgba(0, 0, 0, 0.1)",
      hoverBg: isDarkMode ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.04)",
      selectedBg: isDarkMode
        ? "rgba(0, 136, 204, 0.3)"
        : "rgba(0, 136, 204, 0.1)",
    }),
    [isDarkMode]
  );

  // Common MenuProps for dropdowns
  const dropdownMenuProps = useMemo(
    () => ({
      PaperProps: {
        sx: {
          bgcolor: dropdownThemeColors.menuBg,
          boxShadow: dropdownThemeColors.menuShadow,
          borderRadius: "10px",
          border: `1px solid ${dropdownThemeColors.menuBorder}`,
          maxHeight: "60vh",
          overflow: "auto",
          mt: 0.5,
          "& .MuiMenuItem-root": {
            fontSize: "0.9rem",
            py: 1,
            px: 2,
            "&:hover": { bgcolor: dropdownThemeColors.hoverBg },
            "&.Mui-selected": {
              bgcolor: dropdownThemeColors.selectedBg,
              color: "#0088cc",
              fontWeight: 500,
              "&:hover": {
                bgcolor: isDarkMode
                  ? "rgba(0, 136, 204, 0.35)"
                  : "rgba(0, 136, 204, 0.15)",
              },
            },
          },
        },
      },
      anchorOrigin: { vertical: "bottom", horizontal: "center" },
      transformOrigin: { vertical: "top", horizontal: "center" },
    }),
    [dropdownThemeColors, isDarkMode]
  );

  // Common Select sx matching main leaderboard
  const selectSx = useMemo(
    () => ({
      color: isDarkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)",
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
      },
      "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#0088cc" },
      "& .MuiSvgIcon-root": {
        color: isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.54)",
      },
    }),
    [isDarkMode]
  );

  // LAZY LOAD: Only fetch data when component first renders (not on every cohort change)
  useEffect(() => {
    if (cohort && cohort._id && !hasLoadedData) {
      fetchLeaderboard();
      if (isAdmin) {
        fetchStats();
      }
      setHasLoadedData(true);
    }
  }, [cohort, isAdmin, hasLoadedData]);

  // When isAdmin changes, reset to the first tab
  useEffect(() => {
    setActiveTab(0);
  }, [isAdmin]);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohort._id}/leaderboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setLeaderboard(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      // Create sample data for display
      const sampleLeaderboard = [
        {
          user: { name: "John Doe", avatar: "" },
          score: 450,
          rank: 1,
          questionsCompleted: 15,
          bestStreak: 5,
        },
        {
          user: { name: "Jane Smith", avatar: "" },
          score: 380,
          rank: 2,
          questionsCompleted: 12,
          bestStreak: 3,
        },
        {
          user: { name: "Alex Johnson", avatar: "" },
          score: 340,
          rank: 3,
          questionsCompleted: 11,
          bestStreak: 4,
        },
        {
          user: { name: "Sarah Williams", avatar: "" },
          score: 310,
          rank: 4,
          questionsCompleted: 10,
          bestStreak: 2,
        },
        {
          user: { name: "Michael Brown", avatar: "" },
          score: 280,
          rank: 5,
          questionsCompleted: 9,
          bestStreak: 3,
        },
      ];
      setLeaderboard(sampleLeaderboard);
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohort._id}/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Set the stats directly from the backend response
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Create sample data for display if API fails
      setStats({
        totalEnrolled: 0,
        activeUsers: 0,
        completionRate: 0,
        moduleCompletionRates: [],
      });
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Compute the questions completed count from the questionProgress array
  const getQuestionsCompletedCount = () => {
    if (!userProgress || !userProgress.questionProgress) return 0;
    return userProgress.questionProgress.filter((q) => q.solved).length;
  };

  // Generate difficulty progress data using the questionProgress array
  const calculateDifficultyProgress = () => {
    if (!userProgress || !userProgress.questionProgress || !cohort.modules)
      return {
        easy: { completed: 0, total: 0, percentage: 0 },
        medium: { completed: 0, total: 0, percentage: 0 },
        hard: { completed: 0, total: 0, percentage: 0 },
      };

    // Initialize counters
    const progress = {
      easy: { completed: 0, total: 0 },
      medium: { completed: 0, total: 0 },
      hard: { completed: 0, total: 0 },
    };

    // Get all questions from all modules (use populated modules if available)
    const allQuestions = [];
    const modulesToSearch = populatedModules?.length > 0 ? populatedModules : cohort.modules;
    modulesToSearch?.forEach((module) => {
      if (module.questions && module.questions.length > 0) {
        allQuestions.push(...module.questions);
      }
    });

    // Count questions by difficulty
    allQuestions.forEach((question) => {
      if (typeof question !== 'object' || !question) return; // Skip if not populated
      const difficulty = question.difficultyLevel?.toLowerCase() || "medium";
      if (progress[difficulty]) {
        progress[difficulty].total++;
      }
    });

    // Count completed questions by difficulty
    userProgress.questionProgress.forEach((qp) => {
      if (qp.solved) {
        // Find the question to determine its difficulty
        const qpQuestionId = typeof qp.question === 'string' ? qp.question : qp.question?.toString();
        const question = allQuestions.find((q) => {
          if (typeof q !== 'object' || !q) return false;
          const qId = q._id?.toString() || q._id;
          return qId === qpQuestionId;
        });
        if (question) {
          const difficulty =
            question.difficultyLevel?.toLowerCase() || "medium";
          if (progress[difficulty]) {
            progress[difficulty].completed++;
          }
        }
      }
    });

    // Calculate percentages
    Object.keys(progress).forEach((key) => {
      progress[key].percentage =
        progress[key].total > 0
          ? (progress[key].completed / progress[key].total) * 100
          : 0;
    });

    return progress;
  };

  const difficultyProgress = calculateDifficultyProgress();

  // ==================== EXCEL EXPORT - COMPLETE REBUILD ====================
  const handleExportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "SCOPE Platform";
      workbook.created = new Date();

      // ── Shared style helpers ──
      const COLORS = {
        primary: "FF0088CC",
        headerBg: "FF1565C0",
        white: "FFFFFFFF",
        lightBg: "FFF5F8FA",
        sectionBg: "FFE3F2FD",
        green: "FF4CAF50",
        greenLight: "FFC8E6C9",
        yellow: "FFFFEB3B",
        yellowLight: "FFFFF9C4",
        red: "FFEF5350",
        redLight: "FFFFCDD2",
        gold: "FFFFD700",
        silver: "FFE0E0E0",
        bronze: "FFCD7F32",
        gray: "FF9E9E9E",
        border: "FFD0D0D0",
      };

      const thinBorder = {
        top: { style: "thin", color: { argb: COLORS.border } },
        left: { style: "thin", color: { argb: COLORS.border } },
        bottom: { style: "thin", color: { argb: COLORS.border } },
        right: { style: "thin", color: { argb: COLORS.border } },
      };

      /** Add a styled title row spanning colCount columns */
      const addTitle = (sheet, title, colCount, color = COLORS.primary) => {
        sheet.mergeCells(1, 1, 1, colCount);
        const cell = sheet.getCell("A1");
        cell.value = title;
        cell.font = { size: 16, bold: true, color: { argb: COLORS.white } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        sheet.getRow(1).height = 32;
      };

      /** Style a header row (bold white text on coloured background) */
      const styleHeader = (sheet, rowNum, colCount, color = COLORS.headerBg) => {
        const row = sheet.getRow(rowNum);
        row.height = 24;
        for (let c = 1; c <= colCount; c++) {
          const cell = row.getCell(c);
          cell.font = { bold: true, size: 11, color: { argb: COLORS.white } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = thinBorder;
        }
      };

      /** Apply thin borders to a rectangular range of cells */
      const addBorders = (sheet, startRow, endRow, colCount) => {
        for (let r = startRow; r <= endRow; r++) {
          for (let c = 1; c <= colCount; c++) {
            sheet.getRow(r).getCell(c).border = thinBorder;
          }
        }
      };

      /** Alternating row fill */
      const altRowFill = (sheet, rowNum, colCount) => {
        const bgColor = rowNum % 2 === 0 ? COLORS.white : COLORS.lightBg;
        for (let c = 1; c <= colCount; c++) {
          sheet.getRow(rowNum).getCell(c).fill = {
            type: "pattern", pattern: "solid", fgColor: { argb: bgColor },
          };
        }
      };

      /** Color-code a percentage cell: green ≥ 70, yellow ≥ 40, red < 40 */
      const colorPctCell = (cell, pctValue) => {
        if (pctValue >= 70) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.green } };
          cell.font = { bold: true, color: { argb: COLORS.white } };
        } else if (pctValue >= 40) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.yellow } };
          cell.font = { bold: true };
        } else {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.red } };
          cell.font = { bold: true, color: { argb: COLORS.white } };
        }
      };

      // ── Pre-compute data ──
      const totalModules = cohort?.modules?.length || 0;
      
      // Filter leaderboard by selected graduation years if export years are specified
      let exportedLeaderboard = leaderboard;
      if (exportGraduationYears.length > 0) {
        exportedLeaderboard = leaderboard.filter((user) => {
          const userYear = user.user?.graduatingYear || user.user?.graduationYear;
          return exportGraduationYears.includes(userYear?.toString());
        });
      }
      
      // Calculate enrolled count based on filtered or all leaderboard data
      const enrolledCount = exportedLeaderboard.length;
      const cohortTitle = cohort?.title || cohort?.name || "Untitled Cohort";

      // Sort leaderboard by score descending for consistent ranking
      const sortedLeaderboard = [...exportedLeaderboard].sort(
        (a, b) => (b.totalScore || 0) - (a.totalScore || 0)
      );

      // ═══════════════════════════════════════════════════════════════
      // SHEET 1 ─ COHORT OVERVIEW
      // ═══════════════════════════════════════════════════════════════
      const overviewSheet = workbook.addWorksheet("Cohort Overview", {
        properties: { tabColor: { argb: COLORS.primary } },
        views: [{ showGridLines: false }],
      });

      addTitle(overviewSheet, "COHORT OVERVIEW", 2);

      const overviewDetails = [
        ["Cohort Name", cohortTitle],
        ["Description", cohort?.description || "-"],
        ["Start Date", cohort?.startDate ? new Date(cohort.startDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "-"],
        ["End Date", cohort?.endDate ? new Date(cohort.endDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "-"],
        ["Total Modules", totalModules],
        ["Total Questions", cohort?.modules?.reduce((sum, m) => sum + (m?.questions?.length || 0), 0) || 0],
        ...(exportGraduationYears.length > 0 ? [["Graduation Years (Filtered)", exportGraduationYears.sort().join(", ")]] : []),
        ["Total Eligible Students", stats?.totalEnrolled || "-"],
        ["Enrolled Students", enrolledCount],
        ["Active Students", stats?.activeUsers || 0],
        ["Completed Students", stats?.completionRate ? Math.round((stats.completionRate / 100) * enrolledCount) : 0],
        ["Overall Completion Rate", stats?.completionRate ? `${stats.completionRate}%` : "0%"],
      ];

      overviewDetails.forEach(([label, value], i) => {
        const r = i + 3;
        const labelCell = overviewSheet.getCell(`A${r}`);
        const valueCell = overviewSheet.getCell(`B${r}`);
        labelCell.value = label;
        valueCell.value = value;
        labelCell.font = { bold: true, size: 11 };
        labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.sectionBg } };
        labelCell.border = thinBorder;
        valueCell.font = { size: 11 };
        valueCell.border = thinBorder;
        valueCell.alignment = { wrapText: true };
      });

      // Export timestamp
      const tsRow = overviewDetails.length + 4;
      overviewSheet.getCell(`A${tsRow}`).value = "Exported On";
      overviewSheet.getCell(`B${tsRow}`).value = new Date().toLocaleString("en-IN", {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
      overviewSheet.getCell(`A${tsRow}`).font = { bold: true, size: 10, color: { argb: COLORS.gray } };
      overviewSheet.getCell(`B${tsRow}`).font = { size: 10, color: { argb: COLORS.gray } };

      overviewSheet.getColumn("A").width = 28;
      overviewSheet.getColumn("B").width = 55;

      // ═══════════════════════════════════════════════════════════════
      // SHEET 2 ─ STUDENT RANKINGS
      // ═══════════════════════════════════════════════════════════════
      const lbSheet = workbook.addWorksheet("Student Rankings", {
        properties: { tabColor: { argb: "FF2196F3" } },
      });

      const lbCols = ["Rank", "Name", "Roll Number", "Department", "Section", "Grad. Year", "Modules Done", "Total Score", "Status"];
      const lbColCount = lbCols.length;

      addTitle(lbSheet, `STUDENT RANKINGS  —  ${cohortTitle}`, lbColCount);

      // Subtitle row with student count
      lbSheet.mergeCells(2, 1, 2, lbColCount);
      const subtitleCell = lbSheet.getCell("A2");
      subtitleCell.value = `Total Students: ${sortedLeaderboard.length}`;
      subtitleCell.font = { size: 10, italic: true, color: { argb: COLORS.gray } };
      subtitleCell.alignment = { horizontal: "center" };

      lbSheet.getRow(3).values = lbCols;
      styleHeader(lbSheet, 3, lbColCount);

      sortedLeaderboard.forEach((entry, idx) => {
        const r = idx + 4;
        const rank = entry.rank || idx + 1;
        lbSheet.getRow(r).values = [
          rank,
          entry.user?.name || "Unknown",
          entry.user?.rollNumber || "-",
          entry.user?.department || "-",
          entry.user?.section || "-",
          entry.user?.graduatingYear || entry.user?.graduationYear || "-",
          entry.completedModules ?? 0,
          entry.totalScore ?? 0,
          (entry.status || "enrolled").charAt(0).toUpperCase() + (entry.status || "enrolled").slice(1),
        ];

        // Top-3 highlight
        if (rank <= 3) {
          const medalColor = rank === 1 ? COLORS.gold : rank === 2 ? COLORS.silver : COLORS.bronze;
          for (let c = 1; c <= lbColCount; c++) {
            lbSheet.getRow(r).getCell(c).fill = {
              type: "pattern", pattern: "solid", fgColor: { argb: medalColor },
            };
          }
          lbSheet.getRow(r).font = { bold: true };
        } else {
          altRowFill(lbSheet, r, lbColCount);
        }

        // Center-align columns
        [1, 5, 6, 7, 8].forEach((c) => {
          lbSheet.getRow(r).getCell(c).alignment = { horizontal: "center" };
        });
      });

      // Borders for all data
      addBorders(lbSheet, 3, sortedLeaderboard.length + 3, lbColCount);

      // Column widths
      [8, 24, 16, 18, 10, 12, 16, 14, 12].forEach((w, i) => {
        lbSheet.getColumn(i + 1).width = w;
      });

      // ═══════════════════════════════════════════════════════════════
      // SHEET 3 ─ MODULE DETAILS
      // ═══════════════════════════════════════════════════════════════
      if (cohort?.modules && cohort.modules.length > 0) {
        const modSheet = workbook.addWorksheet("Module Details", {
          properties: { tabColor: { argb: "FF9C27B0" } },
        });

        const modCols = ["#", "Module Name", "Description", "Questions", "Completion %", "Students Completed"];
        const modColCount = modCols.length;

        addTitle(modSheet, "MODULE DETAILS", modColCount, "FF9C27B0");
        modSheet.getRow(3).values = modCols;
        styleHeader(modSheet, 3, modColCount, "FF7B1FA2");

        let totalQuestionsAll = 0;
        let avgCompletionSum = 0;

        cohort.modules.forEach((mod, idx) => {
          const r = idx + 4;
          const modCompletion = stats?.moduleCompletionRates?.find((m) => m.name === mod.title);
          const pct = modCompletion?.completion ?? 0;
          const qCount = mod?.questions?.length || 0;
          const studentsCompleted = enrolledCount > 0 ? Math.round((pct / 100) * enrolledCount) : 0;

          totalQuestionsAll += qCount;
          avgCompletionSum += pct;

          modSheet.getRow(r).values = [
            idx + 1,
            mod?.title || "Untitled",
            mod?.description || "-",
            qCount,
            `${pct}%`,
            `${studentsCompleted} / ${enrolledCount}`,
          ];

          altRowFill(modSheet, r, modColCount);

          // Center specific cols
          [1, 4, 5, 6].forEach((c) => {
            modSheet.getRow(r).getCell(c).alignment = { horizontal: "center" };
          });

          // Color-code completion
          colorPctCell(modSheet.getRow(r).getCell(5), pct);
        });

        // Summary / totals row
        const sumRow = cohort.modules.length + 4;
        modSheet.getRow(sumRow).values = [
          "", "TOTAL / AVERAGE", "",
          totalQuestionsAll,
          `${cohort.modules.length > 0 ? (avgCompletionSum / cohort.modules.length).toFixed(1) : 0}%`,
          "",
        ];
        modSheet.getRow(sumRow).font = { bold: true, size: 11 };
        for (let c = 1; c <= modColCount; c++) {
          modSheet.getRow(sumRow).getCell(c).fill = {
            type: "pattern", pattern: "solid", fgColor: { argb: COLORS.sectionBg },
          };
          modSheet.getRow(sumRow).getCell(c).alignment = { horizontal: "center" };
        }

        addBorders(modSheet, 3, sumRow, modColCount);

        [6, 30, 50, 14, 16, 22].forEach((w, i) => {
          modSheet.getColumn(i + 1).width = w;
        });
      }

      // ═══════════════════════════════════════════════════════════════
      // SHEET 4 ─ DEPARTMENT ANALYSIS
      // ═══════════════════════════════════════════════════════════════
      const deptSheet = workbook.addWorksheet("Department Analysis", {
        properties: { tabColor: { argb: "FF00897B" } },
      });

      // Build department-level aggregates
      const deptMap = {};
      sortedLeaderboard.forEach((entry) => {
        const dept = entry.user?.department || "Unknown";
        if (!deptMap[dept]) {
          deptMap[dept] = { students: 0, totalScore: 0, totalModulesDone: 0, topScore: 0, statusCounts: {} };
        }
        const d = deptMap[dept];
        d.students++;
        d.totalScore += entry.totalScore || 0;
        d.totalModulesDone += entry.completedModules || 0;
        d.topScore = Math.max(d.topScore, entry.totalScore || 0);
        const st = entry.status || "enrolled";
        d.statusCounts[st] = (d.statusCounts[st] || 0) + 1;
      });

      const deptCols = ["Department", "Students", "Avg Score", "Total Score", "Top Score", "Avg Modules Done", "Completed"];
      const deptColCount = deptCols.length;

      addTitle(deptSheet, "DEPARTMENT-WISE ANALYSIS", deptColCount, "FF00897B");
      deptSheet.getRow(3).values = deptCols;
      styleHeader(deptSheet, 3, deptColCount, "FF00695C");

      const deptEntries = Object.entries(deptMap).sort((a, b) => b[1].totalScore - a[1].totalScore);
      deptEntries.forEach(([dept, d], idx) => {
        const r = idx + 4;
        deptSheet.getRow(r).values = [
          dept,
          d.students,
          Number((d.totalScore / d.students).toFixed(1)),
          d.totalScore,
          d.topScore,
          Number((d.totalModulesDone / d.students).toFixed(1)),
          d.statusCounts.completed || 0,
        ];
        altRowFill(deptSheet, r, deptColCount);
        for (let c = 2; c <= deptColCount; c++) {
          deptSheet.getRow(r).getCell(c).alignment = { horizontal: "center" };
        }
      });

      // Department totals
      const deptTotalRow = deptEntries.length + 4;
      const totalStudents = deptEntries.reduce((s, [, d]) => s + d.students, 0);
      const totalScore = deptEntries.reduce((s, [, d]) => s + d.totalScore, 0);
      const totalCompleted = deptEntries.reduce((s, [, d]) => s + (d.statusCounts.completed || 0), 0);
      deptSheet.getRow(deptTotalRow).values = [
        "TOTAL", totalStudents,
        totalStudents > 0 ? Number((totalScore / totalStudents).toFixed(1)) : 0,
        totalScore, "-",
        "-", totalCompleted,
      ];
      deptSheet.getRow(deptTotalRow).font = { bold: true };
      for (let c = 1; c <= deptColCount; c++) {
        deptSheet.getRow(deptTotalRow).getCell(c).fill = {
          type: "pattern", pattern: "solid", fgColor: { argb: COLORS.sectionBg },
        };
        deptSheet.getRow(deptTotalRow).getCell(c).alignment = { horizontal: "center" };
      }

      addBorders(deptSheet, 3, deptTotalRow, deptColCount);
      [24, 12, 14, 14, 14, 18, 14].forEach((w, i) => { deptSheet.getColumn(i + 1).width = w; });

      // ═══════════════════════════════════════════════════════════════
      // SHEET 5 ─ YEAR-WISE ANALYSIS
      // ═══════════════════════════════════════════════════════════════
      const yearSheet = workbook.addWorksheet("Year-wise Analysis", {
        properties: { tabColor: { argb: "FFFF7043" } },
      });

      const yearMap = {};
      sortedLeaderboard.forEach((entry) => {
        const yr = entry.user?.graduatingYear || entry.user?.graduationYear || "Unknown";
        if (!yearMap[yr]) {
          yearMap[yr] = { students: 0, totalScore: 0, totalModulesDone: 0, topScore: 0 };
        }
        const y = yearMap[yr];
        y.students++;
        y.totalScore += entry.totalScore || 0;
        y.totalModulesDone += entry.completedModules || 0;
        y.topScore = Math.max(y.topScore, entry.totalScore || 0);
      });

      const yrCols = ["Graduation Year", "Students", "Avg Score", "Total Score", "Top Score", "Avg Modules Done"];
      const yrColCount = yrCols.length;

      addTitle(yearSheet, "YEAR-WISE ANALYSIS", yrColCount, "FFFF7043");
      yearSheet.getRow(3).values = yrCols;
      styleHeader(yearSheet, 3, yrColCount, "FFE64A19");

      const yrEntries = Object.entries(yearMap).sort(([a], [b]) => String(a).localeCompare(String(b)));
      yrEntries.forEach(([yr, y], idx) => {
        const r = idx + 4;
        yearSheet.getRow(r).values = [
          yr,
          y.students,
          Number((y.totalScore / y.students).toFixed(1)),
          y.totalScore,
          y.topScore,
          Number((y.totalModulesDone / y.students).toFixed(1)),
        ];
        altRowFill(yearSheet, r, yrColCount);
        for (let c = 1; c <= yrColCount; c++) {
          yearSheet.getRow(r).getCell(c).alignment = { horizontal: "center" };
        }
      });

      addBorders(yearSheet, 3, yrEntries.length + 3, yrColCount);
      [18, 12, 14, 14, 14, 18].forEach((w, i) => { yearSheet.getColumn(i + 1).width = w; });

      // ═══════════════════════════════════════════════════════════════
      // SHEET 7 ─ STATISTICS SUMMARY (admin-only data)
      // ═══════════════════════════════════════════════════════════════
      if (stats) {
        const stSheet = workbook.addWorksheet("Statistics", {
          properties: { tabColor: { argb: "FF43A047" } },
          views: [{ showGridLines: false }],
        });

        addTitle(stSheet, "COHORT STATISTICS", 3, "FF43A047");

        // ── Overall metrics ──
        stSheet.getCell("A3").value = "OVERALL METRICS";
        stSheet.mergeCells("A3:C3");
        stSheet.getCell("A3").font = { bold: true, size: 12 };
        stSheet.getCell("A3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.sectionBg } };
        stSheet.getCell("A3").alignment = { horizontal: "center" };

        const metricsData = [
          ["Total Eligible Students", stats.totalEnrolled ?? "-", "Based on cohort eligibility criteria"],
          ["Enrolled Students", stats.enrolledUsers ?? "-", "Students who joined the cohort"],
          ["Active Students", stats.activeUsers ?? 0, "Students who completed at least 1 question"],
          ["Completion Rate", `${stats.completionRate ?? 0}%`, "Percentage of enrolled who completed all modules"],
        ];

        stSheet.getRow(4).values = ["Metric", "Value", "Description"];
        styleHeader(stSheet, 4, 3, "FF2E7D32");

        metricsData.forEach(([metric, value, desc], i) => {
          const r = i + 5;
          stSheet.getRow(r).values = [metric, value, desc];
          stSheet.getRow(r).getCell(1).font = { bold: true };
          stSheet.getRow(r).getCell(2).alignment = { horizontal: "center" };
          stSheet.getRow(r).getCell(2).font = { bold: true, size: 12 };
          stSheet.getRow(r).getCell(3).font = { italic: true, size: 10, color: { argb: COLORS.gray } };
          altRowFill(stSheet, r, 3);
        });
        addBorders(stSheet, 4, metricsData.length + 4, 3);

        // ── Module completion rates ──
        if (stats.moduleCompletionRates?.length > 0) {
          const mcStartRow = metricsData.length + 7;
          stSheet.getCell(`A${mcStartRow}`).value = "MODULE COMPLETION RATES";
          stSheet.mergeCells(mcStartRow, 1, mcStartRow, 3);
          stSheet.getCell(`A${mcStartRow}`).font = { bold: true, size: 12 };
          stSheet.getCell(`A${mcStartRow}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.sectionBg } };
          stSheet.getCell(`A${mcStartRow}`).alignment = { horizontal: "center" };

          const mcHeaderRow = mcStartRow + 1;
          stSheet.getRow(mcHeaderRow).values = ["Module Name", "Completion %", "Status"];
          styleHeader(stSheet, mcHeaderRow, 3, "FF2E7D32");

          stats.moduleCompletionRates.forEach((mod, i) => {
            const r = mcHeaderRow + 1 + i;
            const pct = mod.completion ?? 0;
            const statusLabel = pct >= 70 ? "On Track" : pct >= 40 ? "Needs Attention" : "At Risk";

            stSheet.getRow(r).values = [mod.name, `${pct}%`, statusLabel];
            stSheet.getRow(r).getCell(2).alignment = { horizontal: "center" };
            stSheet.getRow(r).getCell(3).alignment = { horizontal: "center" };

            // Color-code completion
            colorPctCell(stSheet.getRow(r).getCell(2), pct);

            // Status badge coloring
            const statusCell = stSheet.getRow(r).getCell(3);
            if (pct >= 70) {
              statusCell.font = { bold: true, color: { argb: "FF2E7D32" } };
            } else if (pct >= 40) {
              statusCell.font = { bold: true, color: { argb: "FFF57F17" } };
            } else {
              statusCell.font = { bold: true, color: { argb: "FFC62828" } };
            }
          });
          addBorders(stSheet, mcHeaderRow, mcHeaderRow + stats.moduleCompletionRates.length, 3);
        }

        stSheet.getColumn(1).width = 35;
        stSheet.getColumn(2).width = 18;
        stSheet.getColumn(3).width = 35;
      }

      // ═══════════════════════════════════════════════════════════════
      // GENERATE & DOWNLOAD
      // ═══════════════════════════════════════════════════════════════
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const safeName = cohortTitle.replace(/[^a-z0-9]/gi, "_");
      const dateStr = new Date().toISOString().split("T")[0];
      
      // Add graduation year to filename if filters are applied
      let graduationYearPart = "";
      if (exportGraduationYears.length > 0 && exportGraduationYears.length < uniqueYears.length) {
        graduationYearPart = `_Grad${exportGraduationYears.sort().join("-")}`;
      }
      
      const filename = `${safeName}_Progress_Report${graduationYearPart}_${dateStr}.xlsx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        height: "100%",
        bgcolor: "transparent",
        color: isDarkMode ? "#FFFFFF" : "#333333",
        borderRadius: { xs: 0, md: "10px" },
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      }}
    >
      {/* Progress Dashboard Header */}
      <Box sx={{ mb: 1 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            fontSize: "1.25rem",
          }}
        >
          Progress Dashboard
        </Typography>
      </Box>

      {/* Tabs for different sections */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
              minWidth: 0,
              px: 3,
            },
          }}
        >
          {!isAdmin && <Tab label="Overview" />}
          <Tab label="Leaderboard" />
          {isAdmin && <Tab label="Statistics" />}
        </Tabs>
      </Box>

      {/* Content area with scrolling */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          mt: 2,
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: alpha(isDarkMode ? "#ffffff" : "#000000", 0.2),
            borderRadius: "4px",
          },
        }}
      >
        {/* Overview Panel - Only for regular users */}
        {!isAdmin && (
          <TabPanel value={activeTab} index={0}>
            {/* Your Progress Summary - Compact inline */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                mb: 3,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: isDarkMode
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(0,0,0,0.6)",
                  }}
                >
                  Points:
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 700, color: "#0088CC" }}
                >
                  {userProgress?.totalScore || "0"}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: isDarkMode
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(0,0,0,0.6)",
                  }}
                >
                  Completed:
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 700, color: "#0088CC" }}
                >
                  {getQuestionsCompletedCount()}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: isDarkMode
                      ? "rgba(255,255,255,0.6)"
                      : "rgba(0,0,0,0.6)",
                  }}
                >
                  Rank:
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 700, color: "#0088CC" }}
                >
                  #{userProgress?.rank || "-"}
                </Typography>
              </Box>
            </Box>

            {/* Difficulty Progress */}
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Progress by Difficulty
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <Card
                  sx={{
                    bgcolor: isDarkMode ? "#000D16" : "#f5f8fa",
                    borderRadius: 2,
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 600, color: "#4caf50" }}
                      >
                        Easy
                      </Typography>
                      <Chip
                        label={`${difficultyProgress.easy.completed}/${difficultyProgress.easy.total}`}
                        size="small"
                        sx={{
                          bgcolor: alpha("#4caf50", 0.1),
                          color: "#4caf50",
                        }}
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={difficultyProgress.easy.percentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: alpha("#4caf50", 0.15),
                        "& .MuiLinearProgress-bar": {
                          bgcolor: "#4caf50",
                        },
                      }}
                    />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card
                  sx={{
                    bgcolor: isDarkMode ? "#000D16" : "#f5f8fa",
                    borderRadius: 2,
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 600, color: "#ff9800" }}
                      >
                        Medium
                      </Typography>
                      <Chip
                        label={`${difficultyProgress.medium.completed}/${difficultyProgress.medium.total}`}
                        size="small"
                        sx={{
                          bgcolor: alpha("#ff9800", 0.1),
                          color: "#ff9800",
                        }}
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={difficultyProgress.medium.percentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: alpha("#ff9800", 0.15),
                        "& .MuiLinearProgress-bar": {
                          bgcolor: "#ff9800",
                        },
                      }}
                    />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card
                  sx={{
                    bgcolor: isDarkMode ? "#000D16" : "#f5f8fa",
                    borderRadius: 2,
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 600, color: "#f44336" }}
                      >
                        Hard
                      </Typography>
                      <Chip
                        label={`${difficultyProgress.hard.completed}/${difficultyProgress.hard.total}`}
                        size="small"
                        sx={{
                          bgcolor: alpha("#f44336", 0.1),
                          color: "#f44336",
                        }}
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={difficultyProgress.hard.percentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: alpha("#f44336", 0.15),
                        "& .MuiLinearProgress-bar": {
                          bgcolor: "#f44336",
                        },
                      }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Module Progress */}
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Module Progress
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              {userProgress?.moduleProgress &&
              userProgress.moduleProgress.length > 0 ? (
                userProgress.moduleProgress.map((module, index) => {
                  // Find the module name from cohort.modules
                  const moduleData = cohort.modules?.find(
                    (m) => m._id === module.module
                  );
                  const moduleName = moduleData?.title || `Module ${index + 1}`;

                  return (
                    <Grid item xs={12} key={index}>
                      <Card
                        sx={{
                          bgcolor: isDarkMode ? "#000D16" : "#f5f8fa",
                          borderRadius: 2,
                        }}
                      >
                        <CardContent>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              mb: 2,
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 600 }}
                            >
                              {moduleName}
                            </Typography>
                            <Chip
                              label={`${module.questionsCompleted}/${module.totalQuestions}`}
                              size="small"
                              sx={{
                                bgcolor: alpha("#0088CC", 0.1),
                                color: "#0088CC",
                              }}
                            />
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={
                              module.totalQuestions > 0
                                ? (module.questionsCompleted /
                                    module.totalQuestions) *
                                  100
                                : 0
                            }
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: alpha("#0088CC", 0.15),
                              "& .MuiLinearProgress-bar": {
                                bgcolor: "#0088CC",
                              },
                            }}
                          />
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })
              ) : (
                <Grid item xs={12}>
                  <Box sx={{ p: 3, textAlign: "center" }}>
                    <Typography
                      variant="body1"
                      sx={{
                        color: isDarkMode
                          ? "rgba(255,255,255,0.5)"
                          : "rgba(0,0,0,0.5)",
                      }}
                    >
                      No module progress available.
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>

            {/* Recent Activity */}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Your Recent Activity
                </Typography>

                <Card
                  sx={{
                    bgcolor: isDarkMode ? "#000D16" : "#f5f8fa",
                    borderRadius: 2,
                    mb: 2,
                  }}
                >
                  <CardContent sx={{ p: 0 }}>
                    {userProgress?.questionProgress &&
                    userProgress.questionProgress.length > 0 ? (
                      <Box
                        component="ul"
                        sx={{ listStyle: "none", p: 0, m: 0 }}
                      >
                        {userProgress.questionProgress
                          .filter((qp) => qp.solved) // Only show solved questions
                          .sort(
                            (a, b) =>
                              new Date(b.solvedAt || 0) -
                              new Date(a.solvedAt || 0)
                          ) // Sort by most recent
                          .slice(0, 5) // Show only 5 most recent
                          .map((activity, index) => {
                            // Try to find question details
                            let questionTitle = "Untitled Question";
                            let questionData = null;

                            // Search for the question in populated modules (which have full question objects)
                            const modulesToSearch = populatedModules?.length > 0 ? populatedModules : cohort.modules;
                            modulesToSearch?.forEach((module) => {
                              module.questions?.forEach((question) => {
                                const questionId = typeof question === 'string' ? question : question?._id;
                                const activityQuestionId = typeof activity.question === 'string' ? activity.question : activity.question?.toString();
                                if (questionId === activityQuestionId || questionId?.toString() === activityQuestionId) {
                                  questionData = typeof question === 'object' ? question : null;
                                  questionTitle = question?.title || questionTitle;
                                }
                              });
                            });

                            const formattedDate = activity.solvedAt
                              ? new Date(activity.solvedAt).toLocaleDateString()
                              : "Unknown date";

                            return (
                              <Box
                                component="li"
                                key={index}
                                sx={{
                                  p: 2,
                                  borderBottom:
                                    index <
                                    Math.min(
                                      4,
                                      userProgress.questionProgress.filter(
                                        (qp) => qp.solved
                                      ).length - 1
                                    )
                                      ? `1px solid ${
                                          isDarkMode
                                            ? "rgba(255,255,255,0.1)"
                                            : "rgba(0,0,0,0.1)"
                                        }`
                                      : "none",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    bgcolor: alpha("#4caf50", 0.2),
                                    color: "#4caf50",
                                    mr: 2,
                                  }}
                                >
                                  <TrophyIcon />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography
                                    variant="body1"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {questionTitle}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: isDarkMode
                                        ? "rgba(255,255,255,0.6)"
                                        : "rgba(0,0,0,0.6)",
                                    }}
                                  >
                                    {formattedDate}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={`+${activity.bestScore} points`}
                                  size="small"
                                  sx={{
                                    bgcolor: alpha("#4caf50", 0.1),
                                    color: "#4caf50",
                                  }}
                                />
                              </Box>
                            );
                          })}
                      </Box>
                    ) : (
                      <Box sx={{ p: 3, textAlign: "center" }}>
                        <Typography
                          variant="body1"
                          sx={{
                            color: isDarkMode
                              ? "rgba(255,255,255,0.5)"
                              : "rgba(0,0,0,0.5)",
                          }}
                        >
                          No recent activity found. Solve some questions to see
                          your activity here!
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        )}

        {/* Leaderboard Panel */}
        <TabPanel value={activeTab} index={isAdmin ? 0 : 1}>
          {/* Search + Refresh Row */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
              gap: 2,
            }}
          >
            <Paper
              component="form"
              onSubmit={(e) => e.preventDefault()}
              sx={{
                p: "0px 4px",
                display: "flex",
                alignItems: "center",
                borderRadius: "20px",
                backgroundColor: isDarkMode
                  ? "rgba(23, 23, 23, 0.45)"
                  : "rgba(0, 0, 0, 0.05)",
                border: `1px solid ${isDarkMode ? "#232323" : "rgba(0, 0, 0, 0.1)"}`,
                "&:hover": {
                  backgroundColor: isDarkMode
                    ? "rgba(35, 35, 35, 0.4)"
                    : "rgba(0, 0, 0, 0.08)",
                },
                boxShadow: "none",
                height: "36px",
                width: "100%",
                maxWidth: "300px",
              }}
            >
              <IconButton
                sx={{
                  p: "5px",
                  color: isDarkMode ? "#ffffff" : "rgba(0, 0, 0, 0.5)",
                }}
                aria-label="search"
              >
                <SearchIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <InputBase
                placeholder="Search by name, roll no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  ml: 0.5,
                  flex: 1,
                  color: isDarkMode
                    ? "rgba(255, 255, 255, 0.9)"
                    : "rgba(0, 0, 0, 0.9)",
                  fontSize: "0.82rem",
                  "& input": { padding: "0px" },
                }}
              />
              {searchTerm && (
                <IconButton
                  size="small"
                  onClick={() => setSearchTerm("")}
                  sx={{
                    p: "5px",
                    mr: 0.5,
                    color: isDarkMode ? "#ffffff" : "rgba(0, 0, 0, 0.5)",
                  }}
                >
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              )}
            </Paper>

            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              {/* Export Options Section (Admin/Teacher Only) */}
              {isAdmin && (
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  {showExportOptions && (
                    <FormControl size="small" variant="outlined" sx={{ minWidth: 200 }}>
                      <InputLabel
                        sx={{
                          color: isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                        }}
                      >
                        Select Graduation Year(s)
                      </InputLabel>
                      <Select
                        multiple
                        value={exportGraduationYears}
                        onChange={(e) => setExportGraduationYears(e.target.value)}
                        label="Select Graduation Year(s)"
                        sx={{
                          bgcolor: isDarkMode ? "rgba(23, 23, 23, 0.8)" : "#fff",
                          color: isDarkMode ? "#fff" : "#000",
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            borderColor: "#0088CC",
                          },
                        }}
                        renderValue={(selected) =>
                          selected.length === 0
                            ? "All Years"
                            : selected.length === uniqueYears.length
                            ? "All Years"
                            : `${selected.length} year(s) selected`
                        }
                      >
                        <MenuItem value="">
                          <em>All Years</em>
                        </MenuItem>
                        {uniqueYears.map((yr) => (
                          <MenuItem key={yr} value={yr.toString()}>
                            {yr}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}

                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                    onClick={() => {
                      if (showExportOptions) {
                        handleExportToExcel();
                        setShowExportOptions(false);
                        setExportGraduationYears([]);
                      } else {
                        setShowExportOptions(true);
                      }
                    }}
                    sx={{
                      height: "32px",
                      fontSize: "0.78rem",
                      textTransform: "none",
                      bgcolor: showExportOptions ? "#006699" : "#0088CC",
                      "&:hover": { bgcolor: "#006699" },
                      boxShadow: "none",
                      px: 2,
                      borderRadius: 2,
                    }}
                  >
                    {showExportOptions ? "Confirm Export" : "Export"}
                  </Button>

                  {showExportOptions && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setShowExportOptions(false);
                        setExportGraduationYears([]);
                      }}
                      sx={{
                        height: "32px",
                        fontSize: "0.78rem",
                        textTransform: "none",
                        color: isDarkMode ? "#fff" : "#0088CC",
                        borderColor: isDarkMode ? "rgba(255,255,255,0.3)" : "#0088CC",
                        "&:hover": {
                          borderColor: isDarkMode ? "rgba(255,255,255,0.5)" : "#006699",
                          bgcolor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,136,204,0.05)",
                        },
                        px: 2,
                        borderRadius: 2,
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </Box>
              )}
              <Tooltip title="Refresh Leaderboard">
                <IconButton
                  onClick={fetchLeaderboard}
                  sx={{
                    color: isDarkMode ? "#ffffff" : "rgba(0, 0, 0, 0.7)",
                    bgcolor: isDarkMode
                      ? "rgba(23, 23, 23, 0.45)"
                      : "rgba(0, 0, 0, 0.05)",
                    border: `1px solid ${isDarkMode ? "#232323" : "rgba(0, 0, 0, 0.1)"}`,
                    "&:hover": {
                      bgcolor: isDarkMode
                        ? "rgba(35, 35, 35, 0.4)"
                        : "rgba(0, 0, 0, 0.08)",
                    },
                  }}
                >
                  <RefreshIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Filters */}
          <Box
            sx={{
              mb: 2,
              px: 1.5,
              py: 1.5,
              borderRadius: 2,
              bgcolor: isDarkMode ? "rgba(23, 23, 23, 0.45)" : "#ffffff",
              border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              boxShadow: isDarkMode
                ? "0 2px 10px rgba(0,0,0,0.3)"
                : "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
              <FilterListIcon sx={{ color: "#0088cc", mr: 0.75, fontSize: 18 }} />
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{
                  color: isDarkMode ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)",
                  fontSize: "0.8rem",
                }}
              >
                Filters
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                size="small"
                variant="text"
                onClick={handleClearFilters}
                startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
                sx={{
                  color: "#0088cc",
                  "&:hover": { bgcolor: "rgba(0,136,204,0.1)" },
                  textTransform: "none",
                  fontSize: "0.75rem",
                  py: 0.25,
                  minHeight: 0,
                }}
              >
                Reset
              </Button>
            </Box>

            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small" variant="outlined">
                  <InputLabel
                    sx={{
                      color: isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Department
                  </InputLabel>
                  <Select
                    value={departmentFilter}
                    label="Department"
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    sx={selectSx}
                    MenuProps={dropdownMenuProps}
                  >
                    <MenuItem value="">All Departments</MenuItem>
                    {uniqueDepartments.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small" variant="outlined">
                  <InputLabel
                    sx={{
                      color: isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Section
                  </InputLabel>
                  <Select
                    value={sectionFilter}
                    label="Section"
                    onChange={(e) => setSectionFilter(e.target.value)}
                    sx={selectSx}
                    MenuProps={dropdownMenuProps}
                  >
                    <MenuItem value="">All Sections</MenuItem>
                    {uniqueSections.map((sec) => (
                      <MenuItem key={sec} value={sec}>
                        Section {sec}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small" variant="outlined">
                  <InputLabel
                    sx={{
                      color: isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
                    }}
                  >
                    Year
                  </InputLabel>
                  <Select
                    value={yearFilter}
                    label="Year"
                    onChange={(e) => setYearFilter(e.target.value)}
                    sx={selectSx}
                    MenuProps={dropdownMenuProps}
                  >
                    <MenuItem value="">All Years</MenuItem>
                    {uniqueYears.map((yr) => (
                      <MenuItem key={yr} value={yr.toString()}>
                        {yr}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Active Filter Chips */}
            {(departmentFilter || sectionFilter || yearFilter || searchTerm.trim()) && (
              <Box sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
                {departmentFilter && (
                  <Chip
                    size="small"
                    label={`Department: ${departmentFilter}`}
                    onDelete={() => setDepartmentFilter("")}
                    sx={{
                      bgcolor: isDarkMode ? "rgba(0,136,204,0.2)" : "#0088cc20",
                      color: "#0088cc",
                    }}
                  />
                )}
                {sectionFilter && (
                  <Chip
                    size="small"
                    label={`Section: ${sectionFilter}`}
                    onDelete={() => setSectionFilter("")}
                    sx={{
                      bgcolor: isDarkMode ? "rgba(0,136,204,0.2)" : "#0088cc20",
                      color: "#0088cc",
                    }}
                  />
                )}
                {yearFilter && (
                  <Chip
                    size="small"
                    label={`Year: ${yearFilter}`}
                    onDelete={() => setYearFilter("")}
                    sx={{
                      bgcolor: isDarkMode ? "rgba(0,136,204,0.2)" : "#0088cc20",
                      color: "#0088cc",
                    }}
                  />
                )}
                {searchTerm.trim() && (
                  <Chip
                    size="small"
                    label={`Search: "${searchTerm}"`}
                    onDelete={() => setSearchTerm("")}
                    sx={{
                      bgcolor: isDarkMode ? "rgba(0,136,204,0.2)" : "#0088cc20",
                      color: "#0088cc",
                    }}
                  />
                )}
              </Box>
            )}

            {/* Results count */}
            <Box
              sx={{
                mt: 1.5,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                  fontSize: "0.8rem",
                }}
              >
                Showing {filteredLeaderboard.length} of {leaderboard.length} students
              </Typography>
              {filteredLeaderboard.length === 0 && leaderboard.length > 0 && (
                <Typography variant="body2" sx={{ color: "warning.main" }}>
                  No students match the current filters
                </Typography>
              )}
            </Box>
          </Box>

          {/* Leaderboard Table */}
          <Paper
            elevation={0}
            sx={{
              bgcolor: isDarkMode ? "transparent" : "#ffffff",
              borderRadius: 2,
              overflow: "visible",
              ...scrollbarStyles,
            }}
          >
            <TableContainer
              sx={{
                borderRadius: 2,
                overflowX: "auto",
                overflowY: "visible",
                ...scrollbarStyles,
                "&::-webkit-scrollbar": { height: "8px" },
              }}
            >
              <Table
                sx={{
                  width: "100%",
                  "& .MuiTableCell-root": {
                    color: isDarkMode ? "#ffffff" : "#000000",
                    borderBottom: isDarkMode
                      ? "1px solid rgba(255,255,255,0.1)"
                      : "1px solid rgba(0,0,0,0.1)",
                    padding: "12px 16px",
                    fontSize: "0.875rem",
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: isDarkMode ? "rgba(0, 136, 204, 0.35)" : "#ffffff",
                      "& .MuiTableCell-root": {
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        color: isDarkMode ? "#ffffff" : "#000000",
                        py: 2,
                        borderBottom: isDarkMode
                          ? "1px solid rgba(0, 136, 204, 0.3)"
                          : "1px solid rgba(0, 0, 0, 0.1)",
                      },
                    }}
                  >
                    <TableCell>Rank</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Roll No</TableCell>
                    <TableCell>Dept</TableCell>
                    <TableCell>Section</TableCell>
                    <TableCell>Year</TableCell>
                    <TableCell>Modules</TableCell>
                    <TableCell>Score</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && leaderboard.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Box sx={{ py: 4 }}>
                          <CircularProgress
                            size={40}
                            sx={{ color: isDarkMode ? "#0088CC" : "#1976d2" }}
                          />
                          <Typography variant="body2" sx={{ mt: 2 }}>
                            Loading students...
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : filteredLeaderboard.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Box
                          sx={{
                            py: 4,
                            color: isDarkMode
                              ? "rgba(255,255,255,0.5)"
                              : "rgba(0,0,0,0.5)",
                          }}
                        >
                          <Typography variant="h6" gutterBottom>
                            No students found
                          </Typography>
                          <Typography variant="body2">
                            Try adjusting your filters
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedLeaderboard.map((entry, index) => {
                      const globalIndex = (page - 1) * rowsPerPage + index;
                      const isCurrentUser = entry.user?._id === userProgress?.user;
                      const isTop3 = entry.rank <= 3;
                      return (
                        <TableRow
                          key={entry.user?._id || index}
                          hover
                          sx={{
                            bgcolor: isCurrentUser
                              ? isDarkMode
                                ? alpha("#0088CC", 0.15)
                                : alpha("#0088CC", 0.05)
                              : isTop3
                              ? isDarkMode
                                ? "rgba(0, 136, 204, 0.1)"
                                : "rgba(0, 136, 204, 0.05)"
                              : isDarkMode
                              ? globalIndex % 2 === 0
                                ? "rgba(255,255,255,0.03)"
                                : "transparent"
                              : "#ffffff",
                            transition: "all 0.2s",
                            "&:hover": {
                              bgcolor: isDarkMode
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.05)",
                            },
                          }}
                        >
                          {/* Rank */}
                          <TableCell align="center" sx={{ p: 1, width: "60px" }}>
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: isTop3
                                  ? ["#FFD700", "#C0C0C0", "#CD7F32"][entry.rank - 1]
                                  : "transparent",
                                color: isTop3
                                  ? "#000"
                                  : isDarkMode
                                  ? "white"
                                  : "rgba(0,0,0,0.8)",
                                fontWeight: "bold",
                              }}
                            >
                              {entry.rank}
                            </Box>
                          </TableCell>

                          {/* Name + Avatar */}
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                              <Avatar
                                alt={entry.user?.name || "User"}
                                src={entry.user?.profilePicture || entry.user?.avatar}
                                sx={{
                                  width: 40,
                                  height: 40,
                                  border: `2px solid ${
                                    isDarkMode
                                      ? "rgba(0,136,204,0.5)"
                                      : "rgba(0,136,204,0.3)"
                                  }`,
                                }}
                              >
                                {entry.user?.name?.charAt(0)?.toUpperCase() || "U"}
                              </Avatar>
                              <Box>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Typography variant="body1" fontWeight="medium">
                                    {entry.user?.name || "Anonymous"}
                                  </Typography>
                                  {isCurrentUser && (
                                    <Chip
                                      size="small"
                                      label="YOU"
                                      color="primary"
                                      variant="outlined"
                                      sx={{ height: 20, fontSize: "0.7rem" }}
                                    />
                                  )}
                                </Box>
                                <Typography variant="body2" color="textSecondary">
                                  {entry.user?.department || ""}{entry.user?.section ? ` - ${entry.user.section}` : ""}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          {/* Roll Number */}
                          <TableCell>
                            <Typography variant="body2">
                              {entry.user?.rollNumber
                                ? entry.user.rollNumber.toUpperCase()
                                : "-"}
                            </Typography>
                          </TableCell>

                          {/* Department */}
                          <TableCell>
                            <Typography variant="body2">
                              {entry.user?.department || "-"}
                            </Typography>
                          </TableCell>

                          {/* Section */}
                          <TableCell>
                            <Typography variant="body2">
                              {entry.user?.section || "-"}
                            </Typography>
                          </TableCell>

                          {/* Year */}
                          <TableCell>
                            <Typography variant="body2">
                              {entry.user?.graduatingYear ||
                                entry.user?.graduationYear ||
                                "-"}
                            </Typography>
                          </TableCell>

                          {/* Modules */}
                          <TableCell>
                            <Chip
                              label={entry.completedModules || 0}
                              size="small"
                              sx={{
                                bgcolor: isDarkMode
                                  ? alpha("#4caf50", 0.2)
                                  : alpha("#4caf50", 0.1),
                                color: "#4caf50",
                                fontWeight: "bold",
                                minWidth: 32,
                                height: 22,
                                fontSize: "0.75rem",
                              }}
                            />
                          </TableCell>

                          {/* Score */}
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ color: "#0088cc", fontWeight: 600 }}
                            >
                              {entry.totalScore || 0}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination Controls */}
            <Box
              sx={{
                mt: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                bgcolor: isDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                borderRadius: "8px",
                p: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(e.target.value);
                    setPage(1);
                  }}
                  size="small"
                  sx={{
                    minWidth: 65,
                    height: 32,
                    color: isDarkMode ? "white" : "black",
                    ".MuiOutlinedInput-notchedOutline": { border: "none" },
                    bgcolor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    "&:hover": {
                      bgcolor: isDarkMode
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.05)",
                    },
                    "& .MuiSelect-icon": {
                      color: isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.54)",
                    },
                  }}
                >
                  {[5, 10, 25, 50, 100].map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
                <Typography
                  variant="body2"
                  sx={{
                    color: isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                  }}
                >
                  per page
                </Typography>
              </Box>

              <Stack direction="row" spacing={0.5}>
                <Button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  sx={{
                    minWidth: 32,
                    height: 32,
                    p: 0,
                    color: isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                    "&:hover": {
                      bgcolor: isDarkMode
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.05)",
                    },
                    "&.Mui-disabled": {
                      color: isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                    },
                  }}
                >
                  <ArrowBack fontSize="small" />
                </Button>

                {(() => {
                  const pages = [];
                  const maxVisible = 5;
                  let start = Math.max(1, page - Math.floor(maxVisible / 2));
                  let end = Math.min(totalPages, start + maxVisible - 1);
                  if (end - start + 1 < maxVisible) {
                    start = Math.max(1, end - maxVisible + 1);
                  }
                  if (start > 1) {
                    pages.push(
                      <Button key={1} onClick={() => setPage(1)} sx={{ minWidth: 32, height: 32, p: 0, color: isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
                        1
                      </Button>
                    );
                    if (start > 2) pages.push(<Typography key="start-ellipsis" sx={{ px: 0.5, color: isDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>...</Typography>);
                  }
                  for (let i = start; i <= end; i++) {
                    pages.push(
                      <Button
                        key={i}
                        onClick={() => setPage(i)}
                        sx={{
                          minWidth: 32,
                          height: 32,
                          p: 0,
                          bgcolor: page === i ? "#0088cc" : "transparent",
                          color: page === i ? "white" : isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                          "&:hover": { bgcolor: page === i ? "#006699" : isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)" },
                          borderRadius: "6px",
                          fontWeight: page === i ? 700 : 400,
                        }}
                      >
                        {i}
                      </Button>
                    );
                  }
                  if (end < totalPages) {
                    if (end < totalPages - 1) pages.push(<Typography key="end-ellipsis" sx={{ px: 0.5, color: isDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>...</Typography>);
                    pages.push(
                      <Button key={totalPages} onClick={() => setPage(totalPages)} sx={{ minWidth: 32, height: 32, p: 0, color: isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>
                        {totalPages}
                      </Button>
                    );
                  }
                  return pages;
                })()}

                <Button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages || totalPages === 0}
                  sx={{
                    minWidth: 32,
                    height: 32,
                    p: 0,
                    color: isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
                    "&:hover": {
                      bgcolor: isDarkMode
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.05)",
                    },
                    "&.Mui-disabled": {
                      color: isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
                    },
                  }}
                >
                  <ArrowForward fontSize="small" />
                </Button>
              </Stack>

              <Typography
                variant="body2"
                sx={{ color: isDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}
              >
                {totalPages === 0
                  ? "No results"
                  : `${(page - 1) * rowsPerPage + 1}-${Math.min(
                      page * rowsPerPage,
                      filteredLeaderboard.length
                    )} of ${filteredLeaderboard.length}`}
              </Typography>
            </Box>
          </Paper>
        </TabPanel>

        {/* Statistics Panel */}
        {isAdmin && (
          <TabPanel value={activeTab} index={1}>
            {/* Cohort Stats Summary */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: { xs: 3, md: 5 },
                mb: 4,
                py: 2,
              }}
            >
              {[
                { icon: <EqualizerIcon sx={{ fontSize: 26, color: '#0088CC' }} />, value: stats?.totalEnrolled || 0, label: 'Eligible Students' },
                { icon: <PeopleIcon sx={{ fontSize: 26, color: '#0088CC' }} />, value: stats?.enrolledUsers || 0, label: 'Enrolled Students' },
                { icon: <TimelineIcon sx={{ fontSize: 26, color: '#0088CC' }} />, value: `${stats?.completionRate || 0}%`, label: 'Completion Rate' },
                { icon: <TimeIcon sx={{ fontSize: 26, color: '#0088CC' }} />, value: stats?.activeUsers || 0, label: 'Active Students' },
              ].map((item, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  {item.icon}
                  <Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        lineHeight: 1.2,
                        color: isDarkMode ? '#ffffff' : '#333333',
                      }}
                    >
                      {item.value}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Module Completion Rates */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Module Completion Rates
              </Typography>
              <Card
                sx={{
                  bgcolor: isDarkMode ? "#000D16" : "#f5f8fa",
                  borderRadius: 2,
                }}
              >
                <CardContent>
                  <Grid container spacing={2}>
                    {(stats?.moduleCompletionRates || []).map(
                      (module, index) => (
                        <Grid item xs={12} key={index}>
                          <Box
                            sx={{
                              mb:
                                index < stats?.moduleCompletionRates.length - 1
                                  ? 2
                                  : 0,
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                mb: 1,
                              }}
                            >
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: 500 }}
                              >
                                {module.name}
                              </Typography>
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: 500 }}
                              >
                                {module.completion}%
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={module.completion}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                bgcolor: alpha("#0088CC", 0.15),
                                "& .MuiLinearProgress-bar": {
                                  bgcolor: "#0088CC",
                                },
                              }}
                            />
                          </Box>
                        </Grid>
                      )
                    )}
                    {!stats?.moduleCompletionRates ||
                    stats.moduleCompletionRates.length === 0 ? (
                      <Grid item xs={12}>
                        <Box sx={{ p: 3, textAlign: "center" }}>
                          <Typography
                            variant="body1"
                            sx={{
                              color: isDarkMode
                                ? "rgba(255,255,255,0.5)"
                                : "rgba(0,0,0,0.5)",
                            }}
                          >
                            No module data available.
                          </Typography>
                        </Box>
                      </Grid>
                    ) : null}
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>
        )}
      </Box>
    </Box>
  );
};

export default CohortProgress;
