import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useParams,
  useLocation,
} from "react-router-dom";
import {
  ThemeProvider as MuiThemeProvider,
  CssBaseline,
  Box,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  useMediaQuery,
} from "@mui/material";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AnimatePresence } from "framer-motion";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import useWhiteControls from "./hooks/useWhiteControls";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { AcademicYearProvider } from "./contexts/AcademicYearContext";
import ErrorBoundary from "./components/ErrorBoundary";
import axios from "./utils/axiosConfig";

import Navbar from "./components/Navbar/Navbar";
import Sidebar from "./components/Sidebar/Sidebar";
import Footer from "./components/Footer";
import Login from "./components/Login";
import MultiStepRegister from "./components/MultiStepRegister";
import StudentDashboard from "./components/StudentDashboard";
import AdminDashboard from "./components/AdminDashboard";
import Leaderboard from "./components/leaderboard";
import Courses from "./components/courses";
import Opportunities from "./components/opportunities";
import Landing from "./components/Landing";
import ProfilePage from "./components/profilePage";
import PrivateRoute from "./components/PrivateRoute";
import About from "./pages/About";
import Docs from "./pages/Docs";
import Contact from "./pages/Contact";
import CourseManagement from "./components/courseManagement";
import OpportunityManagement from "./components/opportunityManagement";
import NotificationManagement from "./components/notificationManagement";
import ManageUsers from "./components/manageUsers";
import UserGroups from "./components/userGroupManagement";
import TeacherRequests from "./components/teacherRequests";
import AccessList from "./components/accessList";
import BankLibrary from "./components/bankLibrary";
import TeacherAccess from "./components/TeacherAccess";
import AcademicYearConfigAdmin from "./components/academicYearConfig";
import PublicProfile, { PublicProfileRedirect } from "./components/publicProfile";
import ConditionalDashboard from "./components/ConditionalDashboard";
import CodePad from "./components/CodePad/index.js";
import TestGoogleImage from "./components/TestGoogleImage";
import NotificationSettingsPage from "./pages/NotificationSettingsPage";
import NotificationPage from "./pages/NotificationPage";
import SearchPage from "./pages/SearchPage";
import NotFound from "./components/NotFound";
import MobileRestrictedRoute from "./components/MobileRestrictedRoute";
import PageTransition from "./components/PageTransition";
import LandingNavbar from "./components/LandingNavbar";

// Import Practice Arena components
import PracticeArena from "./components/PracticeArena/PracticeArena";
import PracticeArenaManagement from "./components/PracticeArena/PracticeArenaManagement";
import PATestView from "./components/PracticeArena/PATestView";
import PARandomTestForm from "./components/PracticeArena/PARandomTestForm";
import PATestResults from "./components/PracticeArena/PATestResults";

// Import speech (communication) test components
import { SpeechTestDashboard } from "./components/speechX/dashboard";
import { SpeechTestOverview } from "./components/speechX/overview";
import { SpeechTestSetup } from "./components/speechX/setup";
import SpeechSectionRunner from "./components/speechX/runner";
import { SectionResultsPage } from "./components/speechX/results";
import { SpeechTestFeedbackPage } from "./components/speechX/feedback";
import { SpeechTestLeaderboardPage } from "./components/speechX/leaderboard";
import { CommunicationTestManagement, CommunicationTestEditor } from "./components/speechX/admin";

// Import resume builder components
import { ResumeList, ResumeEditor } from "./components/resumeBuilder";

// Import cohort components
import CohortList from "./components/cohorts/student/list";
import CohortDetail from "./components/cohorts/staff/detail";
import CohortDetailRoute from "./components/cohorts/student/detail";
import CohortProblem from "./components/cohorts/student/problem";
import ExamSessionHeader from "./components/cohort/ExamSessionHeader";
import { EXAM_BAR_HEIGHT } from "./components/cohort/ExamSessionBar";
import {
  cohortIdFromPath,
  isExamSessionSearch,
} from "./utils/examSession";
import CohortManagementTab from "./components/cohorts/staff/list";
import CohortStats from "./components/cohort/CohortStats";
import QuestionReports from "./components/cohort/QuestionReports";
import TeacherQuestionView from "./components/cohort/TeacherQuestionView";


// Add custom menu icon component
const CustomMenuIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M7 6h10" />
    <path d="M4 12h16" />
    <path d="M7 12h13" />
    <path d="M7 18h10" />
  </svg>
);

// MainContent component that uses the theme from context
const MainContent = () => {
  const { theme, darkMode } = useTheme();
  const { token, user, isAuthenticated, isInitialized } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useWhiteControls(location.pathname);

  // The page scrolls inside <main> (it has overflow: auto), not the window, so a new page would
  // otherwise open at the position the previous one was left at. Every new path starts at the top.
  const mainRef = useRef(null);
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Handler for sidebar toggle events
  const handleSidebarToggle = (isOpen) => {
    setSidebarOpen(isOpen);
  };

  // Handler for mobile menu
  const handleMobileMenuToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Check if current path is an auth page (the teacher access page is a full-screen
  // waiting room, so it has no navbar, sidebar or footer either)
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/teacher-login" ||
    location.pathname === "/teacher-access" ||
    location.pathname === "/register" ||
    location.pathname.startsWith("/register");

  // Check if current path is a landing-related page
  const isLandingPage =
    location.pathname === "/" ||
    location.pathname === "/about" ||
    location.pathname === "/docs" ||
    location.pathname === "/contact";

  // Check if current path is a public page (no authentication required)
  const isPublicPage = location.pathname.startsWith("/public-profile/");

  // Check if current path is a cohort problem page
  const isCohortProblemPage =
    /^\/cohorts\/[^/]+\/modules\/[^/]+\/questions\/[^/]+$/.test(
      location.pathname
    );

  // The resume editor is a full-screen surface with its own rail and top bar,
  // so the app shell (navbar + sidebar + footer) is hidden for it.
  const isResumeEditorPage = /^\/build-resume\/[^/]+\/edit$/.test(
    location.pathname
  );

  // Exam session tab: opened from the cohort list with `?exam=1`. The navbar
  // collapses upwards and the sidebar collapses to the left, leaving a
  // distraction-free screen with the countdown centred at the top.
  const isExamSession =
    isExamSessionSearch(location.search) &&
    location.pathname.startsWith("/cohorts/");
  const examSessionCohortId = isExamSession
    ? cohortIdFromPath(location.pathname)
    : null;

  // Check if current path is a test page
  const isTestPage = location.pathname.startsWith("/practice-arena/tests/");

  // A running speech-test section has its own fixed header: no app navbar or
  // sidebar, so the student cannot navigate away mid-section. The footer stays;
  // the page is sized to leave room for it so nothing scrolls.
  const isSpeechSectionPage = /^\/speech-tests\/[^/]+\/sections\/[^/]+$/.test(
    location.pathname
  );

  // Check if current path is the specific test page that needs to open in a new window
  const isSpecificTestPage =
    location.pathname === "/practice-arena/tests/682a240c9f66f41e5696e2ce";

  // The pre-test setup screens (instructions, audio check) have their own
  // header, so the app navbar and sidebar are hidden. The footer stays.
  const isSpeechSetupPage =
    /^\/speech-tests\/[^/]+\/(setup|feedback)$/.test(location.pathname) ||
    // Detailed results of one section.
    /^\/speech-tests\/[^/]+\/sections\/[^/]+\/results$/.test(location.pathname) ||
    // The student's section list (`/speech-tests/:id`) uses the same fixed
    // header in place of the app navbar and sidebar.
    /^\/speech-tests\/[^/]+$/.test(location.pathname);

  // Check if current path is an admin page
  const isAdminPage = location.pathname.startsWith("/admin/");

  // Check if current path is a cohort-related page (including list, detail, and admin cohort pages)
  const isCohortPage =
    location.pathname === "/cohorts" ||
    location.pathname.match(/^\/cohorts\/[^/]+$/) || // CohortDetail page
    location.pathname.match(
      /^\/cohorts\/[^/]+\/modules\/[^/]+\/questions\/[^/]+\/view$/
    ) || // Teacher view
    location.pathname.match(
      /^\/admin\/cohorts\/[^/]+\/modules\/[^/]+\/questions\/[^/]+\/view$/
    ) || // Admin teacher view
    location.pathname.startsWith("/admin/cohorts");

  // The cohort list keeps its heading and filters in place while the list scrolls (position:
  // sticky). Sticky binds to the nearest scrolling ancestor, which is <main>; with the shell only
  // min-height 100vh, <main> grows to fit its content and the window scrolls instead, so nothing
  // could stick. A shell exactly as tall as the window makes <main> the scroller. This page has no
  // footer, so nothing is lost below it. dvh keeps the last card clear of a phone's browser bars.
  // The bank library (all three levels) fixes its heading and search the same way.
  const isFixedTopPage =
    location.pathname === "/cohorts" ||
    location.pathname === "/admin/cohorts" ||
    location.pathname.startsWith("/admin/bank-library");

  // Check if current path should not show footer
  const isNoFooterPage =
    isCohortProblemPage ||
    isResumeEditorPage ||
    isLandingPage || // Landing pages have their own footer
    location.pathname === "/codepad" ||
    // The student dashboard is one screen that fits the window; a footer below it would make it scroll
    location.pathname === "/dashboard" ||
    isCohortPage || // All cohort pages (list, detail, admin)
    location.pathname.startsWith("/admin/bank-library") || // a window-high page: only its list scrolls
    isTestPage;

  // List of valid routes (excluding dynamic routes)
  const validStaticRoutes = [
    "/",
    "/about",
    "/docs",
    "/contact",
    "/login",
    "/teacher-login",
    "/teacher-access",
    "/register",
    "/dashboard",
    "/admin",
    "/admin/dashboard",
    "/leaderboard",
    "/codepad",
    "/build-resume",
    "/courses",
    "/opportunities",
    "/profile",
    "/notification-settings",
    "/notifications",
    "/course-management",
    "/admin/courses",
    "/opportunity-management",
    "/admin/opportunities",
    "/admin/notifications",
    "/admin/manage-users",
    "/admin/user-groups",
    "/admin/teacher-requests",
    "/admin/access-list",
    "/admin/bank-library",
    "/practice-arena",
    "/cohorts",
    "/admin/practice-arena",
    "/admin/cohorts",
    "/speech-tests",
    "/admin/communication-tests",
  ];

  // Check if current path might be a 404 page
  const is404Page =
    !validStaticRoutes.includes(location.pathname) &&
    !location.pathname.startsWith("/notifications/") &&
    !location.pathname.startsWith("/cohorts/") &&
    !location.pathname.startsWith("/admin/cohorts/") &&
    !location.pathname.startsWith("/admin/bank-library/") &&
    !location.pathname.startsWith("/practice-arena/") &&
    !location.pathname.startsWith("/speech-tests/") &&
    !location.pathname.startsWith("/admin/communication-tests/") &&
    !location.pathname.startsWith("/user-view/") &&
    !location.pathname.startsWith("/build-resume/") &&
    !location.pathname.startsWith("/public-profile/");

  // Show Navbar and Sidebar for authenticated users on valid pages
  const shouldShowNavigation =
    token &&
    !isAuthPage &&
    !isLandingPage &&
    !isCohortProblemPage &&
    !isResumeEditorPage &&
    !is404Page &&
    !isTestPage &&
    !isSpeechSectionPage &&
    !isSpeechSetupPage &&
    !isPublicPage &&
    !isExamSession;

  // Effect to open specific test page in a new tab
  useEffect(() => {
    if (
      isSpecificTestPage &&
      window.opener === null &&
      !window.sessionStorage.getItem("testPageOpened")
    ) {
      // Set a flag in session storage to prevent infinite loop
      window.sessionStorage.setItem("testPageOpened", "true");

      // Open current URL in new tab
      const newTab = window.open(window.location.href, "_blank");

      // If new tab was successfully opened, close the current one
      if (newTab) {
        window.close();
      }
    }
  }, [isSpecificTestPage, location.pathname]);

  // Automatically collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  // Show loading indicator while authentication is initializing
  if (!isInitialized) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: theme.palette.background.default,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Initializing application...
        </Typography>
      </Box>
    );
  }

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          ...(isFixedTopPage && { height: "100vh", "@supports (height: 100dvh)": { height: "100dvh" } }),
          backgroundColor: "transparent", // Allow theme background to show through for Liquid Glass UI
        }}
      >
        {/* Exam session bar. Lives above the routes so the countdown survives
            navigating between the cohort page and its questions, and so it is
            the single owner of the tab's exam guard. */}
        {isExamSession && examSessionCohortId && (
          <ExamSessionHeader cohortId={examSessionCohortId} />
        )}

        {/* Navigation and Main Content Wrapper */}
        <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Mobile Menu Button - Hide when sidebar is open */}
          {shouldShowNavigation && isMobile && !mobileOpen && (
            <button type="button" className="ds-menu-button" aria-label="Open navigation menu" onClick={handleMobileMenuToggle}>
              <CustomMenuIcon />
            </button>
          )}

          {/* Navbar */}
          {shouldShowNavigation && <Navbar />}

          {/* Sidebar */}
          {shouldShowNavigation && (
            <Sidebar
              onToggle={handleSidebarToggle}
              mobileOpen={mobileOpen}
              onMobileClose={() => setMobileOpen(false)}
            />
          )}

          <Box
            component="main"
            ref={mainRef}
            sx={{
              flexGrow: 1,
              minHeight: "auto", // Remove height constraints
              height: "auto",
              // Exam sessions have no navbar, only the slim countdown bar, so
              // the content clears exactly that much.
              pt: shouldShowNavigation
                ? { xs: 6, sm: 8 }
                : isExamSession
                ? `${EXAM_BAR_HEIGHT}px`
                : 0,
              transition: "all 0.25s",
              position: "relative",
              zIndex: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "auto", // Allow scrolling
              ml: {
                xs: 0,
              },
              width: {
                xs: "100%",
                md: shouldShowNavigation
                  ? `calc(100% - ${sidebarOpen ? "280px" : "75px"})`
                  : "100%",
              },
              px: { xs: 0, sm: 0 },
            }}
          >
            <Container
              maxWidth={false}
              disableGutters
              sx={{
                minHeight: "auto",
                height: "auto",
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "visible",
                boxSizing: "border-box",
                p:
                  isPublicPage ||
                  isAuthPage ||
                  isLandingPage ||
                  location.pathname === "/search"
                    ? 0
                    : { xs: 2, md: 0 },
              }}
            >
              {/* Persistent navbar for public/landing pages - rendered
                  outside AnimatePresence so it stays static and does not
                  animate during page transitions */}
              {isLandingPage && <LandingNavbar />}
              <AnimatePresence mode="wait" initial={false}>
                <Routes location={location} key={location.pathname}>
                  <Route
                    path="/"
                    element={
                      <PageTransition>
                        <Landing />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/about"
                    element={
                      <PageTransition>
                        <About />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/docs"
                    element={
                      <PageTransition>
                        <Docs />
                      </PageTransition>
                    }
                  />
                  <Route
                    path="/contact"
                    element={
                      <PageTransition>
                        <Contact />
                      </PageTransition>
                    }
                  />
                <Route path="/login" element={<Login />} />
                <Route path="/teacher-login" element={<Login variant="teacher" />} />
                <Route
                  path="/teacher-access"
                  element={
                    <PrivateRoute>
                      <TeacherAccess />
                    </PrivateRoute>
                  }
                />
                <Route path="/register" element={<MultiStepRegister />} />
                <Route
                  path="/search"
                  element={
                    <PrivateRoute>
                      <SearchPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/auth/success"
                  element={
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100vh",
                        backgroundColor: "#121212",
                      }}
                    >
                      <CircularProgress size={60} sx={{ color: "#0088cc" }} />
                      <Typography variant="h6" sx={{ mt: 4, color: "white" }}>
                        Completing your login...
                      </Typography>
                    </Box>
                  }
                />

                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <PrivateRoute>
                      {/* StudentDashboard is the student home. Platforms are linked on /profile. */}
                      <ConditionalDashboard>
                        <StudentDashboard />
                      </ConditionalDashboard>
                    </PrivateRoute>
                  }
                />
                {/* `/admin` is kept as a redirect so existing links, bookmarks
                    and any older navigate("/admin") calls land on the canonical
                    URL instead of showing the dashboard at a second address. */}
                <Route
                  path="/admin"
                  element={<Navigate to="/admin/dashboard" replace />}
                />
                <Route
                  path="/admin/dashboard"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <AdminDashboard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/leaderboard"
                  element={
                    <PrivateRoute>
                      <Leaderboard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/codepad"
                  element={
                    <PrivateRoute>
                      <CodePad />
                    </PrivateRoute>
                  }
                />
                {/* Resume builder (students only, enforced in PrivateRoute) */}
                <Route
                  path="/build-resume"
                  element={
                    <PrivateRoute>
                      <ResumeList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/build-resume/:id/edit"
                  element={
                    <PrivateRoute>
                      <ResumeEditor />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/courses"
                  element={
                    <PrivateRoute>
                      <Courses />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/opportunities"
                  element={
                    <PrivateRoute>
                      <Opportunities />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <PrivateRoute>
                      <ProfilePage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/notification-settings"
                  element={
                    <PrivateRoute>
                      <NotificationSettingsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/notifications/:id"
                  element={
                    <PrivateRoute>
                      <NotificationPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/course-management"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <CourseManagement />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/courses"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <CourseManagement />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/opportunity-management"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <OpportunityManagement />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/opportunities"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <OpportunityManagement />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/notifications"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <NotificationManagement />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/manage-users"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <ManageUsers />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/teacher-requests"
                  element={
                    <PrivateRoute adminOnly={true} strictAdmin={true}>
                      <TeacherRequests />
                    </PrivateRoute>
                  }
                />
                {/* Who may sign in when the server runs LOGIN_MODE=allowlist. Admins only. */}
                <Route
                  path="/admin/access-list"
                  element={
                    <PrivateRoute adminOnly={true} strictAdmin={true}>
                      <AccessList />
                    </PrivateRoute>
                  }
                />
                {/* Banks of questions kept in S3 (bank > topic > question). Admins manage them here;
                    teachers import from them inside a cohort. */}
                <Route
                  path="/admin/bank-library"
                  element={
                    <PrivateRoute adminOnly={true} strictAdmin={true}>
                      <BankLibrary />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/bank-library/:bankId"
                  element={
                    <PrivateRoute adminOnly={true} strictAdmin={true}>
                      <BankLibrary />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/bank-library/:bankId/:topicId"
                  element={
                    <PrivateRoute adminOnly={true} strictAdmin={true}>
                      <BankLibrary />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/user-groups"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <MobileRestrictedRoute pageName="User Groups">
                        <UserGroups />
                      </MobileRestrictedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/academic-year-config"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <AcademicYearConfigAdmin />
                    </PrivateRoute>
                  }
                />
                {/* The one profile page. /user-view/ is its old address. */}
                <Route path="/public-profile/:username" element={<PublicProfile />} />
                <Route path="/user-view/:username" element={<PublicProfileRedirect />} />
                <Route
                  path="/test/google-image"
                  element={
                    <PrivateRoute>
                      <TestGoogleImage />
                    </PrivateRoute>
                  }
                />

                {/* Practice Arena Routes */}
                <Route
                  path="/practice-arena"
                  element={
                    <PrivateRoute>
                      <MobileRestrictedRoute pageName="Practice Arena">
                        <PracticeArena />
                      </MobileRestrictedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/practice-arena/tests/:testId"
                  element={
                    <PrivateRoute>
                      <MobileRestrictedRoute pageName="Practice Arena Test">
                        <PATestView />
                      </MobileRestrictedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/practice-arena/tests/:testId/results"
                  element={
                    <PrivateRoute>
                      <PATestResults />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/practice-arena/create"
                  element={
                    <PrivateRoute>
                      <MobileRestrictedRoute pageName="Practice Arena Test Creator">
                        <PARandomTestForm />
                      </MobileRestrictedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/practice-arena"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <MobileRestrictedRoute pageName="Practice Arena Management">
                        <PracticeArenaManagement />
                      </MobileRestrictedRoute>
                    </PrivateRoute>
                  }
                />

                {/* Speech Test Routes (students) */}
                <Route
                  path="/speech-tests"
                  element={
                    <PrivateRoute>
                      <SpeechTestDashboard />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/speech-tests/:id"
                  element={
                    <PrivateRoute>
                      <SpeechTestOverview />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/speech-tests/:id/setup"
                  element={
                    <PrivateRoute>
                      <SpeechTestSetup />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/speech-tests/:id/sections/:sectionId"
                  element={
                    <PrivateRoute>
                      <SpeechSectionRunner />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/speech-tests/:id/feedback"
                  element={
                    <PrivateRoute>
                      <SpeechTestFeedbackPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/speech-tests/:id/sections/:sectionId/results"
                  element={
                    <PrivateRoute>
                      <SectionResultsPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/speech-tests/:id/leaderboard"
                  element={
                    <PrivateRoute>
                      <SpeechTestLeaderboardPage />
                    </PrivateRoute>
                  }
                />

                {/* Communication Test Routes (teachers and admins) */}
                <Route
                  path="/admin/communication-tests"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <MobileRestrictedRoute pageName="Communication Tests">
                        <CommunicationTestManagement />
                      </MobileRestrictedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/communication-tests/new"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <MobileRestrictedRoute pageName="Communication Test Editor">
                        <CommunicationTestEditor />
                      </MobileRestrictedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/communication-tests/:id/edit"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <MobileRestrictedRoute pageName="Communication Test Editor">
                        <CommunicationTestEditor />
                      </MobileRestrictedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/communication-tests/:id/results"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <SpeechTestLeaderboardPage />
                    </PrivateRoute>
                  }
                />

                {/* Cohort Routes */}
                <Route
                  path="/cohorts"
                  element={
                    <PrivateRoute>
                      <CohortList />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/cohorts/:id"
                  element={
                    <PrivateRoute>
                      <CohortDetailRoute />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/cohorts/:cohortId/modules/:moduleId/questions/:questionId"
                  element={
                    <PrivateRoute>
                      <CohortProblem />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/cohorts/:cohortId/modules/:moduleId/questions/:questionId/view"
                  element={
                    <PrivateRoute>
                      <MobileRestrictedRoute pageName="Teacher Question View">
                        <TeacherQuestionView />
                      </MobileRestrictedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/cohorts"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <CohortManagementTab />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/cohorts/:id"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <CohortDetail />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/cohorts/:cohortId/modules/:moduleId/questions/:questionId/view"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <MobileRestrictedRoute pageName="Teacher Question View">
                        <TeacherQuestionView />
                      </MobileRestrictedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/admin/cohorts/:id/stats"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <MobileRestrictedRoute pageName="Cohort Statistics">
                        <CohortStats />
                      </MobileRestrictedRoute>
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/cohorts/:cohortId/reports"
                  element={
                    <PrivateRoute adminOnly={true}>
                      <MobileRestrictedRoute pageName="Question Reports">
                        <QuestionReports />
                      </MobileRestrictedRoute>
                    </PrivateRoute>
                  }
                />

                {/* 404 catch-all route - must be the last route */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </AnimatePresence>
            </Container>
          </Box>
        </Box>{" "}
        {/* Close navigation wrapper */}
        {/* Footer - Show on most pages except auth pages and specific pages */}
        {!isAuthPage && !isNoFooterPage && <Footer />}
        {/* Toast container for notifications */}
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={darkMode ? "dark" : "light"}
        />
        {/* Add dedicated container for dialogs to avoid aria-hidden issues */}
        <div id="dialog-container" />
      </Box>
    </MuiThemeProvider>
  );
};

/**
 * Main App component for CodeStats
 *
 * Note: We use the /auth/success route as part of the OAuth flow
 * The backend redirects to this route after successful Google authentication
 */
function App() {
  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <ThemeProvider>
            <AcademicYearProvider>
              <NotificationProvider>
                <MainContent />
              </NotificationProvider>
            </AcademicYearProvider>
          </ThemeProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
