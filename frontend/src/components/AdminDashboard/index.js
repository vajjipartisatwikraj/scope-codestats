import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Paper,
  Grid,
  Typography,
  Button,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Avatar,
  Card,
  CardContent,
  Chip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  FileDownload as FileDownloadIcon,
  People,
  TrendingUp,
  Code,
  PieChart as PieChartIcon,
  Leaderboard as LeaderboardIcon,
  BarChart as BarChartIcon,
  CalendarToday as CalendarIcon,
  Sync as SyncIcon,
  Timer as TimerIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import axios from "axios";
import * as XLSX from "exceljs";
import { useAuth } from "../../contexts/AuthContext";

// Import modular components
import {
  ProblemAnalytics,
  DepartmentStats,
  UserRegistrations,
  ProfileSync,
  DailyStatsCron,
} from "./components";

import { apiUrl } from "../../config/apiConfig";
import { normalizeSkillSets } from "../../utils/skillSets";
import { normalizeDescriptionPoints } from "../../utils/descriptionPoints";

// Descriptions are bullet points; flatten them into one spreadsheet cell
const formatDescriptionPoints = (description) =>
  normalizeDescriptionPoints(description)
    .map((point) => `• ${point}`)
    .join("\n") || "-";

const AdminDashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isMounted, setIsMounted] = useState(false);

  // Fetch admin stats
  const fetchAdminStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/admin/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: {
          timeframe: "weekly",
        },
      });

      if (response.data) {
        setStats(response.data);

        // Fetch leaderboard data for export
        try {
          const leaderboardResponse = await axios.get(`${apiUrl}/leaderboard`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          setLeaderboardData(leaderboardResponse.data || []);
        } catch (leaderboardError) {
          console.error("Failed to fetch leaderboard:", leaderboardError);
        }
      }
    } catch (error) {
      const errorMessage =
        error.response?.status === 404
          ? "API endpoint not found. Please check server configuration."
          : error.response?.status === 401
            ? "Unauthorized access. Please log in again."
            : "Failed to fetch dashboard statistics. Please try again later.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
    setIsMounted(true);
    return () => setIsMounted(false);
  }, [token]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    fetchAdminStats();
    toast.success("Dashboard data refreshed");
  };

  const exportToExcel = () => {
    toast.info("Preparing data for export...", { autoClose: 2000 });
    fetchExportData();
  };

  const fetchExportData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Fetch leaderboard data
      const response = await axios.get(`${apiUrl}/leaderboard/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: {
          includeComplete: "true",
          debug: "true",
        },
      });

      // Fetch achievements data
      const achievementsResponse = await axios.get(
        `${apiUrl}/achievements/export/all`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (
        !response.data ||
        !Array.isArray(response.data) ||
        response.data.length === 0
      ) {
        toast.error("No data available for export");
        setLoading(false);
        return;
      }

      toast.info(
        `Processing export data for ${response.data.length} users...`,
        { autoClose: 2000 },
      );

      const achievementsData = achievementsResponse.data?.achievements || {};

      // Sort users by totalScore in descending order
      const sortedData = [...response.data].sort((a, b) => {
        const scoreA = Math.max(
          Number(a.totalScore) || 0,
          Number(a.profiles?.totalScore) || 0,
          Number(a.platformData?.totalScore) || 0,
        );

        const scoreB = Math.max(
          Number(b.totalScore) || 0,
          Number(b.profiles?.totalScore) || 0,
          Number(b.platformData?.totalScore) || 0,
        );

        return scoreB - scoreA;
      });

      // Process the data for export
      const exportData = sortedData.map((user, index) => {
        const calculatedRank = index + 1;

        const totalScore = Math.max(
          Number(user.totalScore) || 0,
          Number(user.profiles?.totalScore) || 0,
          Number(user.platformData?.totalScore) || 0,
        );

        const totalProblems = Math.max(
          Number(user.totalProblemsSolved) || 0,
          Number(user.problemStats?.totalProblemsSolved) || 0,
          Number(user.profiles?.problemsSolved) || 0,
        );

        const platformData = user.platformData || {};
        const codingProfiles = user.codingProfiles || {};
        const profiles = user.profiles || {};
        const platforms = user.platforms || {};

        const getPlatformScore = (platform) => {
          return Math.max(
            Number(platforms[platform]?.score) || 0,
            Number(codingProfiles[platform]?.score) || 0,
            Number(platformData[platform]?.score) || 0,
            // platformScores holds an object per platform, so the score has to
            // be read out of it. Coercing the object itself gives NaN, which
            // silently collapsed this fallback to 0.
            Number(user.platformScores?.[platform]?.score) || 0,
          );
        };

        const getPlatformProblems = (platform) => {
          return Math.max(
            Number(platforms[platform]?.problemsSolved) || 0,
            Number(codingProfiles[platform]?.problemsSolved) || 0,
            Number(platformData[platform]?.problemsSolved) || 0,
            Number(platformData[platform]?.totalSolved) || 0,
          );
        };

        const getPlatformUsername = (platform) => {
          return (
            platforms[platform]?.username ||
            codingProfiles[platform]?.username ||
            platformData[platform]?.username ||
            profiles[platform] ||
            "-"
          );
        };

        const githubStats =
          user.githubStats || platforms.github || codingProfiles.github || {};

        return {
          Rank: calculatedRank,
          Name: user.name || "",
          "Roll Number": user.rollNumber || "-",
          Department: user.department || platformData.department || "-",
          Section: user.section || platformData.section || "-",
          Email: user.email || "-",
          "Graduation Year":
            user.graduatingYear || platformData.graduatingYear || "-",
          "Total Score": totalScore,
          "Total Problems": totalProblems,

          // ScopeCodeStats data (Internal Platform) - ordered as specified
          "ScopeCodeStats Total Score": getPlatformScore("scopecodestats"),
          "ScopeCodeStats Cohort Score":
            platforms.scopecodestats?.totalCohortScore ||
            codingProfiles.scopecodestats?.totalCohortScore ||
            platformData.scopecodestats?.totalCohortScore ||
            0,
          "ScopeCodeStats PA Contests Score":
            platforms.scopecodestats?.practiceArenaScore ||
            codingProfiles.scopecodestats?.practiceArenaScore ||
            platformData.scopecodestats?.practiceArenaScore ||
            0,
          "ScopeCodeStats Consistency Score":
            platforms.scopecodestats?.consistencyScore ||
            codingProfiles.scopecodestats?.consistencyScore ||
            platformData.scopecodestats?.consistencyScore ||
            0,
          "ScopeCodeStats Problems Solved":
            getPlatformProblems("scopecodestats"),
          "ScopeCodeStats PA Contests":
            platforms.scopecodestats?.totalPracticeArenaContests ||
            codingProfiles.scopecodestats?.totalPracticeArenaContests ||
            platformData.scopecodestats?.totalPracticeArenaContests ||
            0,
          "ScopeCodeStats Current Consistency Index":
            platforms.scopecodestats?.consistencyIndex ||
            codingProfiles.scopecodestats?.consistencyIndex ||
            platformData.scopecodestats?.consistencyIndex ||
            0,

          // LeetCode data
          "LeetCode Username": getPlatformUsername("leetcode"),
          "LeetCode Score": getPlatformScore("leetcode"),
          "LeetCode Problems": getPlatformProblems("leetcode"),
          "LeetCode Rating":
            platforms.leetcode?.rating ||
            codingProfiles.leetcode?.rating ||
            platformData.leetcode?.rating ||
            0,

          // CodeForces data
          "CodeForces Username": getPlatformUsername("codeforces"),
          "CodeForces Score": getPlatformScore("codeforces"),
          "CodeForces Problems": getPlatformProblems("codeforces"),
          "CodeForces Rating":
            platforms.codeforces?.rating ||
            codingProfiles.codeforces?.rating ||
            platformData.codeforces?.rating ||
            0,

          // CodeChef data
          "CodeChef Username": getPlatformUsername("codechef"),
          "CodeChef Score": getPlatformScore("codechef"),
          "CodeChef Problems": getPlatformProblems("codechef"),
          "CodeChef Rating":
            platforms.codechef?.rating ||
            codingProfiles.codechef?.rating ||
            platformData.codechef?.rating ||
            0,

          // HackerRank data
          "HackerRank Username": getPlatformUsername("hackerrank"),
          "HackerRank Score": getPlatformScore("hackerrank"),
          "HackerRank Problems": getPlatformProblems("hackerrank"),

          // GitHub data
          "GitHub Username": getPlatformUsername("github"),
          "GitHub Score": getPlatformScore("github"),
          "GitHub Repositories": githubStats.publicRepos || 0,
          "GitHub Stars": githubStats.starsReceived || 0,
          "GitHub Followers": githubStats.followers || 0,
        };
      });

      // Create a workbook and worksheet using exceljs
      const workbook = new XLSX.Workbook();

      // ========== ALL STUDENT INFO TAB (FIRST TAB) ==========
      const studentInfoSheet = workbook.addWorksheet("All Student Info");
      const studentInfoColumns = [
        { header: "Name", key: "name", width: 30 },
        { header: "Roll Number", key: "rollNumber", width: 18 },
        { header: "Department", key: "department", width: 15 },
        { header: "Section", key: "section", width: 10 },
        { header: "Email", key: "email", width: 35 },
        { header: "Graduation Year", key: "graduationYear", width: 18 },
        { header: "Mobile Number", key: "mobileNumber", width: 18 },
        { header: "Total Score", key: "totalScore", width: 15 },
        { header: "Rank", key: "rank", width: 8 },
        { header: "Skills", key: "skills", width: 50 },
        { header: "Interests", key: "interests", width: 50 },
        { header: "Bio (About)", key: "about", width: 60 },
        { header: "LinkedIn URL", key: "linkedinUrl", width: 50 },
        { header: "GitHub URL", key: "githubUrl", width: 50 },
        { header: "Resume Link", key: "resumeLink", width: 50 },
      ];
      studentInfoSheet.columns = studentInfoColumns;

      // Populate student info data
      sortedData.forEach((user, index) => {
        const platformData = user.platformData || {};
        const codingProfiles = user.codingProfiles || {};
        const profiles = user.profiles || {};

        // Get GitHub username and construct URL properly
        const githubUsername =
          profiles.github ||
          codingProfiles.github?.username ||
          platformData.github?.username ||
          null;
        const githubUrl = githubUsername
          ? `https://github.com/${githubUsername}`
          : "-";

        const linkedinUrl = user.linkedinUrl || "-";
        const resumeLink = user.resumeLink || "-";

        const rowIndex = index + 2; // +2 because row 1 is header

        const row = studentInfoSheet.addRow({
          name: user.name || "-",
          rollNumber: user.rollNumber || "-",
          department: user.department || "-",
          section: user.section || "-",
          email: user.email || "-",
          graduationYear: user.graduatingYear || "-",
          mobileNumber: user.mobileNumber || "-",
          totalScore: Math.max(
            Number(user.totalScore) || 0,
            Number(user.profiles?.totalScore) || 0,
            Number(user.platformData?.totalScore) || 0,
          ),
          rank: index + 1,
          skills:
            normalizeSkillSets(user.skills)
              .map((set) => `${set.name}: ${set.skills.join(", ")}`)
              .join(" | ") || "-",
          interests: Array.isArray(user.interests)
            ? user.interests.join(", ")
            : "-",
          about: user.about || "-",
          linkedinUrl: linkedinUrl,
          githubUrl: githubUrl,
          resumeLink: resumeLink,
        });

        // Add hyperlinks for LinkedIn URL (column M - 13)
        if (
          linkedinUrl &&
          linkedinUrl !== "-" &&
          linkedinUrl.startsWith("http")
        ) {
          const linkedinCell = studentInfoSheet.getCell(`M${rowIndex}`);
          linkedinCell.value = {
            text: linkedinUrl,
            hyperlink: linkedinUrl,
          };
          linkedinCell.font = { color: { argb: "0563C1" }, underline: true };
        }

        // Add hyperlinks for GitHub URL (column N - 14)
        if (githubUrl && githubUrl !== "-") {
          const githubCell = studentInfoSheet.getCell(`N${rowIndex}`);
          githubCell.value = {
            text: githubUrl,
            hyperlink: githubUrl,
          };
          githubCell.font = { color: { argb: "0563C1" }, underline: true };
        }

        // Add hyperlinks for Resume Link (column O - 15)
        if (resumeLink && resumeLink !== "-" && resumeLink.startsWith("http")) {
          const resumeCell = studentInfoSheet.getCell(`O${rowIndex}`);
          resumeCell.value = {
            text: resumeLink,
            hyperlink: resumeLink,
          };
          resumeCell.font = { color: { argb: "0563C1" }, underline: true };
        }
      });

      // Style student info header
      studentInfoSheet.getRow(1).font = { bold: true };
      studentInfoSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "00897B" }, // Teal color
      };
      studentInfoSheet.getRow(1).font = {
        bold: true,
        color: { argb: "FFFFFF" },
      };

      // ========== LEADERBOARD TAB ==========
      const worksheet = workbook.addWorksheet("Leaderboard");

      // Add headers
      if (exportData.length > 0) {
        const headers = Object.keys(exportData[0]);
        worksheet.columns = headers.map((header) => ({
          header,
          key: header,
          width: header.length + 5,
        }));

        // Customize column widths
        const colWidths = {
          Rank: 5,
          Name: 25,
          "Roll Number": 15,
          Department: 20,
          Section: 10,
          Email: 25,
          "Graduation Year": 15,
          "Total Score": 10,
          "Total Problems": 12,
        };

        worksheet.columns.forEach((column) => {
          if (colWidths[column.header]) {
            column.width = colWidths[column.header];
          } else if (column.header.includes("Username")) {
            column.width = 20;
          } else if (column.header.includes("Score")) {
            column.width = 15;
          } else {
            column.width = 15;
          }
        });
      }

      // Add data rows
      exportData.forEach((data) => {
        worksheet.addRow(data);
      });

      // Add generated date
      const dateCell = worksheet.getCell(`A${exportData.length + 3}`);
      dateCell.value = `Generated: ${new Date().toLocaleString()}`;

      // Style the headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4167B8" },
      };
      worksheet.getRow(1).font = {
        bold: true,
        color: { argb: "FFFFFF" },
      };

      // ========== ACHIEVEMENTS TAB ==========
      const achievementsSheet = workbook.addWorksheet("Achievements");
      const achievementsColumns = [
        { header: "Name", key: "name", width: 25 },
        { header: "Roll Number", key: "rollNumber", width: 15 },
        { header: "Department", key: "department", width: 15 },
        { header: "Graduation Year", key: "graduationYear", width: 18 },
        { header: "Email", key: "email", width: 30 },
        { header: "Achievement Title", key: "title", width: 40 },
        { header: "Description", key: "description", width: 50 },
        { header: "Tags", key: "tags", width: 30 },
        { header: "Link", key: "link", width: 40 },
        { header: "Image URL", key: "imageUrl", width: 40 },
        { header: "Start Date", key: "startDate", width: 15 },
        { header: "End Date", key: "endDate", width: 15 },
        { header: "Created At", key: "createdAt", width: 20 },
      ];
      achievementsSheet.columns = achievementsColumns;

      // Populate achievements data
      let achievementRowIndex = 2;
      sortedData.forEach((user) => {
        const userAchievements = achievementsData[user._id] || [];
        const achievements = userAchievements.filter(
          (a) => a.type === "achievement",
        );

        if (achievements.length > 0) {
          achievements.forEach((achievement) => {
            const achievementLink = achievement.link || "-";
            const achievementImageUrl = achievement.imageUrl || "-";

            achievementsSheet.addRow({
              name: user.name,
              rollNumber: user.rollNumber,
              department: user.department,
              graduationYear: user.graduatingYear || "-",
              email: user.email,
              title: achievement.title || "-",
              description: formatDescriptionPoints(achievement.description),
              tags: achievement.tags?.join(", ") || "-",
              link: achievementLink,
              imageUrl: achievementImageUrl,
              startDate: achievement.startDate
                ? new Date(achievement.startDate).toLocaleDateString()
                : "-",
              endDate: achievement.endDate
                ? new Date(achievement.endDate).toLocaleDateString()
                : "-",
              createdAt: achievement.createdAt
                ? new Date(achievement.createdAt).toLocaleString()
                : "-",
            });

            // Add hyperlink for Link (column I - 9)
            if (
              achievementLink &&
              achievementLink !== "-" &&
              achievementLink.startsWith("http")
            ) {
              const linkCell = achievementsSheet.getCell(
                `I${achievementRowIndex}`,
              );
              linkCell.value = {
                text: achievementLink,
                hyperlink: achievementLink,
              };
              linkCell.font = { color: { argb: "0563C1" }, underline: true };
            }

            // Add hyperlink for Image URL (column J - 10)
            if (
              achievementImageUrl &&
              achievementImageUrl !== "-" &&
              achievementImageUrl.startsWith("http")
            ) {
              const imageCell = achievementsSheet.getCell(
                `J${achievementRowIndex}`,
              );
              imageCell.value = {
                text: achievementImageUrl,
                hyperlink: achievementImageUrl,
              };
              imageCell.font = { color: { argb: "0563C1" }, underline: true };
            }

            achievementRowIndex++;
          });
        }
      });

      // Style achievements header
      achievementsSheet.getRow(1).font = { bold: true };
      achievementsSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "4CAF50" },
      };
      achievementsSheet.getRow(1).font = {
        bold: true,
        color: { argb: "FFFFFF" },
      };

      // ========== PROJECTS TAB ==========
      const projectsSheet = workbook.addWorksheet("Projects");
      const projectsColumns = [
        { header: "Name", key: "name", width: 25 },
        { header: "Roll Number", key: "rollNumber", width: 15 },
        { header: "Department", key: "department", width: 15 },
        { header: "Graduation Year", key: "graduationYear", width: 18 },
        { header: "Email", key: "email", width: 30 },
        { header: "Project Title", key: "title", width: 40 },
        { header: "Description", key: "description", width: 50 },
        { header: "Tags", key: "tags", width: 30 },
        { header: "Project Link", key: "link", width: 40 },
        { header: "Domain Link", key: "domainLink", width: 40 },
        { header: "Image URL", key: "imageUrl", width: 40 },
        { header: "Start Date", key: "startDate", width: 15 },
        { header: "End Date", key: "endDate", width: 15 },
        { header: "Created At", key: "createdAt", width: 20 },
      ];
      projectsSheet.columns = projectsColumns;

      // Populate projects data
      let projectRowIndex = 2;
      sortedData.forEach((user) => {
        const userAchievements = achievementsData[user._id] || [];
        const projects = userAchievements.filter((a) => a.type === "project");

        if (projects.length > 0) {
          projects.forEach((project) => {
            const projectLink = project.link || "-";
            const domainLink = project.domainLink || "-";
            const projectImageUrl = project.imageUrl || "-";

            projectsSheet.addRow({
              name: user.name,
              rollNumber: user.rollNumber,
              department: user.department,
              graduationYear: user.graduatingYear || "-",
              email: user.email,
              title: project.title || "-",
              description: formatDescriptionPoints(project.description),
              tags: project.tags?.join(", ") || "-",
              link: projectLink,
              domainLink: domainLink,
              imageUrl: projectImageUrl,
              startDate: project.startDate
                ? new Date(project.startDate).toLocaleDateString()
                : "-",
              endDate: project.endDate
                ? new Date(project.endDate).toLocaleDateString()
                : "-",
              createdAt: project.createdAt
                ? new Date(project.createdAt).toLocaleString()
                : "-",
            });

            // Add hyperlink for Project Link (column I - 9)
            if (
              projectLink &&
              projectLink !== "-" &&
              projectLink.startsWith("http")
            ) {
              const linkCell = projectsSheet.getCell(`I${projectRowIndex}`);
              linkCell.value = {
                text: projectLink,
                hyperlink: projectLink,
              };
              linkCell.font = { color: { argb: "0563C1" }, underline: true };
            }

            // Add hyperlink for Domain Link (column J - 10)
            if (
              domainLink &&
              domainLink !== "-" &&
              domainLink.startsWith("http")
            ) {
              const domainCell = projectsSheet.getCell(`J${projectRowIndex}`);
              domainCell.value = {
                text: domainLink,
                hyperlink: domainLink,
              };
              domainCell.font = { color: { argb: "0563C1" }, underline: true };
            }

            // Add hyperlink for Image URL (column K - 11)
            if (
              projectImageUrl &&
              projectImageUrl !== "-" &&
              projectImageUrl.startsWith("http")
            ) {
              const imageCell = projectsSheet.getCell(`K${projectRowIndex}`);
              imageCell.value = {
                text: projectImageUrl,
                hyperlink: projectImageUrl,
              };
              imageCell.font = { color: { argb: "0563C1" }, underline: true };
            }

            projectRowIndex++;
          });
        }
      });

      // Style projects header
      projectsSheet.getRow(1).font = { bold: true };
      projectsSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "2196F3" },
      };
      projectsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };

      // ========== INTERNSHIPS TAB ==========
      const internshipsSheet = workbook.addWorksheet("Internships");
      const internshipsColumns = [
        { header: "Name", key: "name", width: 25 },
        { header: "Roll Number", key: "rollNumber", width: 15 },
        { header: "Department", key: "department", width: 15 },
        { header: "Graduation Year", key: "graduationYear", width: 18 },
        { header: "Email", key: "email", width: 30 },
        { header: "Internship Title", key: "title", width: 40 },
        { header: "Description", key: "description", width: 50 },
        { header: "Tags", key: "tags", width: 30 },
        { header: "Offer Letter Link", key: "link", width: 40 },
        { header: "Company/Domain Link", key: "domainLink", width: 40 },
        { header: "Certificate/Image URL", key: "imageUrl", width: 40 },
        { header: "Start Date", key: "startDate", width: 15 },
        { header: "End Date", key: "endDate", width: 15 },
        { header: "Created At", key: "createdAt", width: 20 },
      ];
      internshipsSheet.columns = internshipsColumns;

      // Populate internships data
      let internshipRowIndex = 2;
      sortedData.forEach((user) => {
        const userAchievements = achievementsData[user._id] || [];
        const internships = userAchievements.filter(
          (a) => a.type === "internship",
        );

        if (internships.length > 0) {
          internships.forEach((internship) => {
            const internshipLink = internship.link || "-";
            const internshipDomainLink = internship.domainLink || "-";
            const internshipImageUrl = internship.imageUrl || "-";

            internshipsSheet.addRow({
              name: user.name,
              rollNumber: user.rollNumber,
              department: user.department,
              graduationYear: user.graduatingYear || "-",
              email: user.email,
              title: internship.title || "-",
              description: formatDescriptionPoints(internship.description),
              tags: internship.tags?.join(", ") || "-",
              link: internshipLink,
              domainLink: internshipDomainLink,
              imageUrl: internshipImageUrl,
              startDate: internship.startDate
                ? new Date(internship.startDate).toLocaleDateString()
                : "-",
              endDate: internship.endDate
                ? new Date(internship.endDate).toLocaleDateString()
                : "-",
              createdAt: internship.createdAt
                ? new Date(internship.createdAt).toLocaleString()
                : "-",
            });

            // Add hyperlink for Offer Letter Link (column I - 9)
            if (
              internshipLink &&
              internshipLink !== "-" &&
              internshipLink.startsWith("http")
            ) {
              const linkCell = internshipsSheet.getCell(
                `I${internshipRowIndex}`,
              );
              linkCell.value = {
                text: internshipLink,
                hyperlink: internshipLink,
              };
              linkCell.font = { color: { argb: "0563C1" }, underline: true };
            }

            // Add hyperlink for Company/Domain Link (column J - 10)
            if (
              internshipDomainLink &&
              internshipDomainLink !== "-" &&
              internshipDomainLink.startsWith("http")
            ) {
              const domainCell = internshipsSheet.getCell(
                `J${internshipRowIndex}`,
              );
              domainCell.value = {
                text: internshipDomainLink,
                hyperlink: internshipDomainLink,
              };
              domainCell.font = { color: { argb: "0563C1" }, underline: true };
            }

            // Add hyperlink for Certificate/Image URL (column K - 11)
            if (
              internshipImageUrl &&
              internshipImageUrl !== "-" &&
              internshipImageUrl.startsWith("http")
            ) {
              const imageCell = internshipsSheet.getCell(
                `K${internshipRowIndex}`,
              );
              imageCell.value = {
                text: internshipImageUrl,
                hyperlink: internshipImageUrl,
              };
              imageCell.font = { color: { argb: "0563C1" }, underline: true };
            }

            internshipRowIndex++;
          });
        }
      });

      // Style internships header
      internshipsSheet.getRow(1).font = { bold: true };
      internshipsSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF9800" },
      };
      internshipsSheet.getRow(1).font = {
        bold: true,
        color: { argb: "FFFFFF" },
      };

      // ========== CERTIFICATIONS TAB ==========
      const certificationsSheet = workbook.addWorksheet("Certifications");
      const certificationsColumns = [
        { header: "Name", key: "name", width: 25 },
        { header: "Roll Number", key: "rollNumber", width: 15 },
        { header: "Department", key: "department", width: 15 },
        { header: "Graduation Year", key: "graduationYear", width: 18 },
        { header: "Email", key: "email", width: 30 },
        { header: "Certification Title", key: "title", width: 40 },
        { header: "Description", key: "description", width: 50 },
        { header: "Tags", key: "tags", width: 30 },
        { header: "Certificate Link", key: "link", width: 40 },
        { header: "Issuing Organization", key: "domainLink", width: 40 },
        { header: "Certificate ID", key: "certificateId", width: 30 },
        { header: "Image URL", key: "imageUrl", width: 40 },
        { header: "Issue Date", key: "startDate", width: 15 },
        { header: "Expiry Date", key: "endDate", width: 15 },
        { header: "Created At", key: "createdAt", width: 20 },
      ];
      certificationsSheet.columns = certificationsColumns;

      // Populate certifications data
      let certificationRowIndex = 2;
      sortedData.forEach((user) => {
        const userAchievements = achievementsData[user._id] || [];
        const certifications = userAchievements.filter(
          (a) => a.type === "certification",
        );

        if (certifications.length > 0) {
          certifications.forEach((certification) => {
            const certificationLink = certification.link || "-";
            const certificationDomainLink = certification.domainLink || "-";
            const certificationImageUrl = certification.imageUrl || "-";

            certificationsSheet.addRow({
              name: user.name,
              rollNumber: user.rollNumber,
              department: user.department,
              graduationYear: user.graduatingYear || "-",
              email: user.email,
              title: certification.title || "-",
              description: formatDescriptionPoints(certification.description),
              tags: certification.tags?.join(", ") || "-",
              link: certificationLink,
              domainLink: certificationDomainLink,
              certificateId: certification.certificateId || "-",
              imageUrl: certificationImageUrl,
              startDate: certification.startDate
                ? new Date(certification.startDate).toLocaleDateString()
                : "-",
              endDate: certification.endDate
                ? new Date(certification.endDate).toLocaleDateString()
                : "-",
              createdAt: certification.createdAt
                ? new Date(certification.createdAt).toLocaleString()
                : "-",
            });

            // Add hyperlink for Certificate Link (column I - 9)
            if (
              certificationLink &&
              certificationLink !== "-" &&
              certificationLink.startsWith("http")
            ) {
              const linkCell = certificationsSheet.getCell(
                `I${certificationRowIndex}`,
              );
              linkCell.value = {
                text: certificationLink,
                hyperlink: certificationLink,
              };
              linkCell.font = { color: { argb: "0563C1" }, underline: true };
            }

            // Add hyperlink for Issuing Organization (column J - 10)
            if (
              certificationDomainLink &&
              certificationDomainLink !== "-" &&
              certificationDomainLink.startsWith("http")
            ) {
              const domainCell = certificationsSheet.getCell(
                `J${certificationRowIndex}`,
              );
              domainCell.value = {
                text: certificationDomainLink,
                hyperlink: certificationDomainLink,
              };
              domainCell.font = { color: { argb: "0563C1" }, underline: true };
            }

            // Add hyperlink for Image URL (column L - 12)
            if (
              certificationImageUrl &&
              certificationImageUrl !== "-" &&
              certificationImageUrl.startsWith("http")
            ) {
              const imageCell = certificationsSheet.getCell(
                `L${certificationRowIndex}`,
              );
              imageCell.value = {
                text: certificationImageUrl,
                hyperlink: certificationImageUrl,
              };
              imageCell.font = { color: { argb: "0563C1" }, underline: true };
            }

            certificationRowIndex++;
          });
        }
      });

      // Style certifications header
      certificationsSheet.getRow(1).font = { bold: true };
      certificationsSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "9C27B0" },
      };
      certificationsSheet.getRow(1).font = {
        bold: true,
        color: { argb: "FFFFFF" },
      };

      toast.info("Generating Excel file...", { autoClose: 1500 });

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();

      // Create filename with current date and time
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD
      const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, ""); // HHMMSS
      const filename = `scopecodestats_${dateStr}_${timeStr}.xlsx`;

      // Create a blob and trigger download
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success(
        `Successfully exported data for ${exportData.length} users with Achievements, Projects, Internships, and Certifications`,
      );
    } catch (error) {
      let errorMessage = "Failed to export data. Please try again.";

      if (error.response) {
        errorMessage = `Server error ${error.response.status}: ${
          error.response.data?.message || "Failed to fetch data"
        }`;
      } else if (error.request) {
        errorMessage = "No response from server. Please check your connection.";
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: 3,
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="#ffffff">
          Loading Admin Dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor: theme.palette.mode === "dark" ? "#000000" : "#f5f5f7",
        minHeight: "100vh",
        pt: 3,
        pb: 8,
      }}
    >
      <Container maxWidth="xl">
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            mb: 3,
            borderRadius: 2,
            backgroundColor: "#0585E0",
            border:
              theme.palette.mode === "dark"
                ? "1px solid #232323"
                : "1px solid rgba(0,0,0,0.1)",
            color: "white",
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography
                variant={isMobile ? "h5" : "h4"}
                fontWeight="bold"
                gutterBottom
                sx={{ color: "white" }}
              >
                Admin Dashboard
              </Typography>
              <Typography
                variant={isMobile ? "body2" : "subtitle1"}
                sx={{ color: "white" }}
              >
                Monitor user performance metrics and department analytics
              </Typography>
            </Grid>
            <Grid
              item
              xs={12}
              md={4}
              sx={{
                display: "flex",
                justifyContent: { xs: "flex-start", md: "flex-end" },
                alignItems: "center",
                mt: { xs: 1, md: 0 },
              }}
            >
              <Tooltip title="Refresh data">
                <IconButton
                  onClick={handleRefresh}
                  sx={{
                    color: "white",
                    backgroundColor: "rgba(255,255,255,0.1)",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
                    mr: 2,
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<FileDownloadIcon />}
                onClick={exportToExcel}
                sx={{
                  bgcolor: "white",
                  color: "primary.main",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.9)" },
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  px: { xs: 2, sm: 3 },
                }}
              >
                {isMobile ? "Export" : "Export Leaderboard"}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
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
              }}
            >
              <Box sx={{ height: 5, bgcolor: "#4CAF50" }}></Box>
              <CardContent
                sx={{
                  height: "calc(100% - 5px)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: "rgba(76, 175, 80, 0.1)",
                      color: "#4CAF50",
                      mr: 2,
                    }}
                  >
                    <People />
                  </Avatar>
                  <Typography
                    color={
                      theme.palette.mode === "dark" ? "#ffffff" : "text.primary"
                    }
                    fontWeight="medium"
                  >
                    Total Users
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    color={
                      theme.palette.mode === "dark" ? "#ffffff" : "text.primary"
                    }
                  >
                    {stats?.userStats?.totalUsers || 0}
                  </Typography>
                  <Box
                    sx={{
                      mt: 2,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box>
                      <Typography
                        variant="body2"
                        color="primary.main"
                        fontWeight="medium"
                      >
                        Admin Users
                      </Typography>
                      <Typography variant="h6">
                        {stats?.userStats?.adminUsers || 0}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        color="#cccccc"
                        fontWeight="medium"
                      >
                        Regular Users
                      </Typography>
                      <Typography variant="h6" color="#ffffff">
                        {stats?.userStats?.regularUsers || 0}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
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
              }}
            >
              <Box sx={{ height: 5, bgcolor: "#673AB7" }}></Box>
              <CardContent
                sx={{
                  height: "calc(100% - 5px)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: "rgba(103, 58, 183, 0.1)",
                      color: "#673AB7",
                      mr: 2,
                    }}
                  >
                    <TrendingUp />
                  </Avatar>
                  <Typography
                    color={
                      theme.palette.mode === "dark" ? "#ffffff" : "text.primary"
                    }
                    fontWeight="medium"
                  >
                    Total Contributions
                  </Typography>
                </Box>
                <Box>
                  <Tooltip title="Total number of problems solved by all users across all coding platforms">
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      color={
                        theme.palette.mode === "dark"
                          ? "#ffffff"
                          : "text.primary"
                      }
                      sx={{ cursor: "help" }}
                    >
                      {stats?.problemsStats?.totalProblems?.toLocaleString() ||
                        stats?.problemsStats?.platformStats
                          ?.reduce(
                            (sum, platform) =>
                              sum + (platform.totalProblems || 0),
                            0,
                          )
                          .toLocaleString() ||
                        0}
                    </Typography>
                  </Tooltip>
                  <Typography variant="body2" color="#cccccc" sx={{ mt: 1 }}>
                    Problems solved across all platforms
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
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
              }}
            >
              <Box sx={{ height: 5, bgcolor: "#2196F3" }}></Box>
              <CardContent
                sx={{
                  height: "calc(100% - 5px)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: "rgba(33, 150, 243, 0.1)",
                      color: "#2196F3",
                      mr: 2,
                    }}
                  >
                    <Code />
                  </Avatar>
                  <Typography
                    color={
                      theme.palette.mode === "dark" ? "#ffffff" : "text.primary"
                    }
                    fontWeight="medium"
                  >
                    Total Platforms
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight="bold"
                    color={
                      theme.palette.mode === "dark" ? "#ffffff" : "text.primary"
                    }
                  >
                    {stats?.platformEngagement?.length || 0}
                  </Typography>
                  <Typography
                    variant="body2"
                    color={
                      theme.palette.mode === "dark"
                        ? "#cccccc"
                        : "text.secondary"
                    }
                    sx={{ mt: 1 }}
                  >
                    {Math.round(
                      stats?.problemsStats?.platformStats?.reduce(
                        (sum, platform) => sum + (platform.avgProblems || 0),
                        0,
                      ) / (stats?.platformEngagement?.length || 1),
                    )}{" "}
                    avg problems per platform
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
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
              }}
            >
              <Box sx={{ height: 5, bgcolor: "#FF9800" }}></Box>
              <CardContent
                sx={{
                  height: "calc(100% - 5px)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: "rgba(255, 152, 0, 0.1)",
                      color: "#FF9800",
                      mr: 2,
                    }}
                  >
                    <LeaderboardIcon />
                  </Avatar>
                  <Typography
                    color={
                      theme.palette.mode === "dark" ? "#ffffff" : "text.primary"
                    }
                    fontWeight="medium"
                  >
                    Top Performer
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant={isMobile ? "h6" : "h6"}
                    fontWeight="bold"
                    color={
                      theme.palette.mode === "dark" ? "#ffffff" : "text.primary"
                    }
                    noWrap
                  >
                    {stats?.userStats?.topUsers?.[0]?.name || "N/A"}
                  </Typography>
                  <Typography
                    variant="body2"
                    color={
                      theme.palette.mode === "dark"
                        ? "#cccccc"
                        : "text.secondary"
                    }
                    sx={{ mt: 1 }}
                  >
                    Score: {stats?.userStats?.topUsers?.[0]?.totalScore || 0}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs Navigation */}
        <Paper
          sx={{
            mb: 3,
            backgroundColor:
              theme.palette.mode === "dark" ? "#0A0A0A" : "white",
            border:
              theme.palette.mode === "dark"
                ? "1px solid #232323"
                : "1px solid rgba(0,0,0,0.1)",
            borderRadius: 2,
            overflowX: "auto",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons="auto"
            sx={{
              "& .MuiTabs-indicator": {
                height: 3,
                borderRadius: "3px 3px 0 0",
              },
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: isMobile ? "0.875rem" : "1rem",
                minWidth: isMobile ? 100 : 120,
                color:
                  theme.palette.mode === "dark" ? "#ffffff" : "text.primary",
                "&.Mui-selected": {
                  color: "#6b73ff",
                },
              },
            }}
          >
            <Tab
              label="Problem Analytics"
              icon={<BarChartIcon />}
              iconPosition={isMobile ? "top" : "start"}
            />
            <Tab
              label="Department Stats"
              icon={<PieChartIcon />}
              iconPosition={isMobile ? "top" : "start"}
            />
            <Tab
              label="User Registrations"
              icon={<CalendarIcon />}
              iconPosition={isMobile ? "top" : "start"}
            />
            <Tab
              label="Profile Sync"
              icon={<SyncIcon />}
              iconPosition={isMobile ? "top" : "start"}
            />
            <Tab
              label="Daily Stats Cron"
              icon={<TimerIcon />}
              iconPosition={isMobile ? "top" : "start"}
            />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {activeTab === 0 && <ProblemAnalytics />}
        {activeTab === 1 && (
          <DepartmentStats
            stats={stats}
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        )}
        {activeTab === 2 && (
          <UserRegistrations
            token={token}
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        )}
        {activeTab === 3 && (
          <ProfileSync
            token={token}
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        )}
        {activeTab === 4 && (
          <DailyStatsCron
            token={token}
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        )}
      </Container>
    </Box>
  );
};

export default AdminDashboard;
