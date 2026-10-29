import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Divider,
  useTheme,
  Alert,
  Tab,
  Tabs,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  FormControlLabel,
  Checkbox,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Rating,
  Avatar,
  Stack,
  InputAdornment,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  ArrowForward as ArrowForwardIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Group as GroupIcon,
  CalendarToday as CalendarTodayIcon,
  DateRange as DateRangeIcon,
  Create as CreateIcon,
  ContentCopy as ContentCopyIcon,
  FileCopy as FileCopyIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  RateReview as RateReviewIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import axios from "axios";
import { apiUrl } from "../../config/apiConfig";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import AttachedUserGroupsDialog from "../userGroupManagement/AttachedUserGroupsDialog";
import { cohortUserGroupApi } from "../../services/userGroupApi";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { format } from "date-fns";

// Tabs for the cohort management view
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`cohort-tabpanel-${index}`}
      aria-labelledby={`cohort-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const CohortManagementTab = () => {
  const { user, token } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [cohorts, setCohorts] = useState([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState(null);

  // Deletion impact state
  const [deletionImpact, setDeletionImpact] = useState(null);
  const [loadingDeletionImpact, setLoadingDeletionImpact] = useState(false);

  // Duplication Loading Dialog State
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [duplicateProgress, setDuplicateProgress] = useState("");
  const [duplicatingCohort, setDuplicatingCohort] = useState(null);

  // User groups dialog: the cohort whose attached user groups are being managed
  const [userGroupsCohort, setUserGroupsCohort] = useState(null);

  // Reviews Management State
  const [allReviews, setAllReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsLoaded, setReviewsLoaded] = useState(false); // Track if reviews have been loaded
  const [reviewFilter, setReviewFilter] = useState({
    cohortId: "all",
    rating: "all",
    searchUser: "",
  });
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [deleteReviewsDialogOpen, setDeleteReviewsDialogOpen] = useState(false);

  // Form state for creating/editing cohort
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    videoResource: "",
    documentationUrl: "",
    isActive: true,
    isDraft: true,
    // Delivery mode. Practice is the default; exam adds a hard time window.
    mode: "practice",
    examStartTime: null,
    examEndTime: null,
    // Blank means the attempt simply runs to the exam end time.
    examDurationMinutes: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  // Which cohort's report is currently being generated, so only that card's
  // button shows a spinner.
  const [exportingCohortId, setExportingCohortId] = useState(null);

  // Cleanup flag to prevent state updates after unmount
  const [isMounted, setIsMounted] = useState(true);

  // Cleanup on unmount
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  // LAZY LOAD: Fetch cohorts on first mount only
  useEffect(() => {
    if (!hasLoadedData) {
      fetchCohorts();
      setHasLoadedData(true);
    }
  }, [token, hasLoadedData]);

  // Fetch all cohorts
  const fetchCohorts = async () => {
    if (!isMounted) return; // Prevent fetch if unmounted

    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/cohorts/admin`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (isMounted) {
        setCohorts(response.data);
      }
    } catch (error) {
      console.error("Error fetching cohorts:", error);
      if (isMounted) {
        toast.error("Failed to fetch cohorts");
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Open the create cohort dialog
  const handleOpenCreateDialog = () => {
    setIsEditMode(false);
    setFormData({
      title: "",
      description: "",
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      videoResource: "",
      documentationUrl: "",
      isActive: true,
      isDraft: true,
      mode: "practice",
      examStartTime: null,
      examEndTime: null,
      examDurationMinutes: "",
    });
    setFormErrors({});
    setOpenCreateDialog(true);
  };

  // Open the edit cohort dialog
  const handleEditCohort = (cohort) => {
    setIsEditMode(true);
    setFormData({
      title: cohort.title,
      description: cohort.description,
      startDate: new Date(cohort.startDate),
      endDate: new Date(cohort.endDate),
      videoResource: cohort.videoResource || "",
      documentationUrl: cohort.documentationUrl || "",
      isActive: cohort.isActive,
      isDraft: cohort.isDraft,
      // Cohorts created before exam mode existed have no `mode` field.
      mode: cohort.mode === "exam" ? "exam" : "practice",
      examStartTime: cohort.examStartTime ? new Date(cohort.examStartTime) : null,
      examEndTime: cohort.examEndTime ? new Date(cohort.examEndTime) : null,
      examDurationMinutes: cohort.examDurationMinutes ?? "",
    });
    setSelectedCohort(cohort);
    setFormErrors({});
    setOpenCreateDialog(true);
  };

  // Close the create/edit dialog
  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
  };

  // Open the delete confirmation dialog
  const handleOpenDeleteDialog = async (cohort) => {
    setSelectedCohort(cohort);
    setOpenDeleteDialog(true);
    setDeletionImpact(null);
    await loadDeletionImpact(cohort);
  };

  // Ask the server what deleting a cohort would remove, and which user groups are still attached
  const loadDeletionImpact = async (cohort) => {
    setLoadingDeletionImpact(true);

    try {
      // Fetch deletion impact information
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohort._id}/deletion-impact`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setDeletionImpact(response.data);
    } catch (error) {
      console.error("Error fetching deletion impact:", error);
      toast.error("Failed to check deletion impact");
    } finally {
      setLoadingDeletionImpact(false);
    }
  };

  // After user groups were attached or detached: refresh the counts, and the delete check if it is open
  const handleUserGroupsChanged = () => {
    fetchCohorts();
    if (openDeleteDialog && selectedCohort) loadDeletionImpact(selectedCohort);
  };

  // Close the delete dialog
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  // Validate the form data
  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = "Title is required";
    }

    if (!formData.description.trim()) {
      errors.description = "Description is required";
    }

    if (!formData.startDate) {
      errors.startDate = "Start date is required";
    }

    if (!formData.endDate) {
      errors.endDate = "End date is required";
    }

    if (
      formData.startDate &&
      formData.endDate &&
      formData.startDate >= formData.endDate
    ) {
      errors.endDate = "End date must be after start date";
    }

    // Exam mode needs a complete, ordered window. The backend enforces the same
    // rules; this only saves a round trip.
    if (formData.mode === "exam") {
      if (!formData.examStartTime) {
        errors.examStartTime = "Exam start time is required";
      }
      if (!formData.examEndTime) {
        errors.examEndTime = "Exam end time is required";
      }
      if (
        formData.examStartTime &&
        formData.examEndTime &&
        formData.examStartTime >= formData.examEndTime
      ) {
        errors.examEndTime = "Exam end time must be after the exam start time";
      }

      // Duration is optional. When given it must be a whole number of minutes
      // that fits inside the window, since nobody could ever use more than that.
      const rawDuration = String(formData.examDurationMinutes ?? "").trim();
      if (rawDuration !== "") {
        const duration = Number(rawDuration);

        if (!Number.isInteger(duration) || duration < 1) {
          errors.examDurationMinutes =
            "Enter a whole number of minutes, at least 1";
        } else if (duration > 1440) {
          errors.examDurationMinutes = "Duration cannot exceed 24 hours";
        } else if (formData.examStartTime && formData.examEndTime) {
          const windowMinutes = Math.floor(
            (formData.examEndTime - formData.examStartTime) / 60000
          );
          if (duration > windowMinutes) {
            errors.examDurationMinutes = `Longer than the exam window (${windowMinutes} min)`;
          }
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });

    // Clear the error for this field
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null,
      });
    }
  };

  // Handle date picker changes
  const handleDateChange = (name, date) => {
    setFormData({
      ...formData,
      [name]: date,
    });

    // Clear the error for this field
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null,
      });
    }
  };

  // Create or update a cohort
  const handleSaveCohort = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let response;

      if (isEditMode) {
        // Update an existing cohort
        response = await axios.put(
          `${apiUrl}/cohorts/${selectedCohort._id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        toast.success("Cohort updated successfully");
      } else {
        // Create a new cohort
        response = await axios.post(`${apiUrl}/cohorts`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        toast.success("Cohort created successfully");
      }

      // Refresh the cohorts list
      fetchCohorts();

      // Close the dialog
      handleCloseCreateDialog();
    } catch (error) {
      console.error("Error saving cohort:", error);
      toast.error(error.response?.data?.message || "Failed to save cohort");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Downloads the exam results workbook for an exam cohort.
   *
   * The server builds the .xlsx, so this only has to hand the blob to the
   * browser. Exam cohorts only — the button is not rendered for practice.
   */
  const handleDownloadExamReport = async (cohort) => {
    setExportingCohortId(cohort._id);
    try {
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohort._id}/exam-report/export`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Prefer the filename the server chose; fall back to the cohort title.
      const disposition = response.headers["content-disposition"] || "";
      const match = /filename="?([^"]+)"?/.exec(disposition);
      link.download =
        match?.[1] || `${cohort.title.replace(/\s+/g, "-")}-results.xlsx`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Exam report downloaded");
    } catch (error) {
      console.error("Error downloading exam report:", error);
      toast.error(
        error.response?.data?.message || "Failed to download the exam report"
      );
    } finally {
      setExportingCohortId(null);
    }
  };

  // Delete a cohort
  const handleDeleteCohort = async () => {
    setLoading(true);
    try {
      const response = await axios.delete(
        `${apiUrl}/cohorts/${selectedCohort._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Show deletion summary
      const summary = response.data;
      const message = `Cohort deleted successfully! Removed ${summary.userProgressDeleted} user progress records. Preserved ${summary.modulesPreserved} modules and ${summary.questionsPreserved} questions.`;

      toast.success(message, { duration: 5000 });

      // Refresh the cohorts list
      fetchCohorts();

      // Close the dialog
      handleCloseDeleteDialog();
    } catch (error) {
      console.error("Error deleting cohort:", error);
      toast.error(error.response?.data?.message || "Failed to delete cohort");
      // Someone may have attached a group meanwhile
      if (error.response?.data?.reason === "user_groups_attached") {
        loadDeletionImpact(selectedCohort);
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // REVIEWS MANAGEMENT FUNCTIONS
  // ============================================================================

  // Fetch all reviews across all cohorts (LAZY LOADED)
  const fetchAllReviews = async (forceRefresh = false) => {
    if (reviewsLoaded && !forceRefresh) {
      return; // Don't fetch again if already loaded
    }

    setLoadingReviews(true);

    try {
      // Fetch all cohorts to get their reviews
      const reviewsMap = new Map(); // Use Map to deduplicate by review ID
      let totalFetched = 0;

      for (const cohort of cohorts) {
        try {
          const response = await axios.get(
            `${apiUrl}/cohorts/${cohort._id}/feedback`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.data && response.data.feedbacks) {
            totalFetched += response.data.feedbacks.length;

            response.data.feedbacks.forEach((feedback) => {
              const reviewId = feedback._id;

              if (reviewsMap.has(reviewId)) {
                // Review already exists - this is a related cohort (clone group)
                // Add this cohort to the list of cohorts sharing this review
                const existingReview = reviewsMap.get(reviewId);
                if (!existingReview.relatedCohorts) {
                  existingReview.relatedCohorts = [existingReview.cohortTitle];
                }
                if (!existingReview.relatedCohorts.includes(cohort.title)) {
                  existingReview.relatedCohorts.push(cohort.title);
                }
              } else {
                // New unique review - add to map
                reviewsMap.set(reviewId, {
                  ...feedback,
                  cohortId: cohort._id,
                  cohortTitle: cohort.title,
                  relatedCohorts: null, // Will be populated if duplicates found
                });
              }
            });
          }
        } catch (error) {
          console.error(
            `Error fetching reviews for cohort ${cohort.title}:`,
            error
          );
        }
      }

      // Convert Map to Array of unique reviews
      const uniqueReviews = Array.from(reviewsMap.values());
      const duplicatesRemoved = totalFetched - uniqueReviews.length;

      setAllReviews(uniqueReviews);
      setReviewsLoaded(true);
    } catch (error) {
      console.error("Error fetching all reviews:", error);
      toast.error("Failed to fetch reviews");
    } finally {
      setLoadingReviews(false);
    }
  };

  // Load reviews when Reviews tab is opened (LAZY LOADING)
  useEffect(() => {
    if (currentTab === 3 && cohorts.length > 0 && !reviewsLoaded) {
      fetchAllReviews();
    }
  }, [currentTab, cohorts, reviewsLoaded]);

  // Handle review selection for bulk deletion
  const handleSelectReview = (reviewId) => {
    setSelectedReviews((prev) =>
      prev.includes(reviewId)
        ? prev.filter((id) => id !== reviewId)
        : [...prev, reviewId]
    );
  };

  // Handle select all reviews
  const handleSelectAllReviews = () => {
    const filteredReviewIds = getFilteredReviews().map((r) => r._id);
    if (selectedReviews.length === filteredReviewIds.length) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(filteredReviewIds);
    }
  };

  // Delete selected reviews
  const handleDeleteSelectedReviews = async () => {
    try {
      setLoading(true);

      for (const reviewId of selectedReviews) {
        const review = allReviews.find((r) => r._id === reviewId);
        if (review) {
          await axios.delete(
            `${apiUrl}/cohorts/${review.cohortId}/feedback/${reviewId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );
        }
      }

      toast.success(`${selectedReviews.length} review(s) deleted successfully`);
      setSelectedReviews([]);
      setDeleteReviewsDialogOpen(false);

      // Refresh reviews (force refresh to show updated data)
      await fetchAllReviews(true);
    } catch (error) {
      console.error("Error deleting reviews:", error);
      toast.error("Failed to delete reviews");
    } finally {
      setLoading(false);
    }
  };

  // Delete single review
  const handleDeleteSingleReview = async (review) => {
    try {
      await axios.delete(
        `${apiUrl}/cohorts/${review.cohortId}/feedback/${review._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Review deleted successfully");

      // Refresh reviews (force refresh to show updated data)
      await fetchAllReviews(true);
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error("Failed to delete review");
    }
  };

  // Get filtered reviews based on filters
  const getFilteredReviews = () => {
    return allReviews.filter((review) => {
      // Filter by cohort
      if (
        reviewFilter.cohortId !== "all" &&
        review.cohortId !== reviewFilter.cohortId
      ) {
        return false;
      }

      // Filter by rating
      if (reviewFilter.rating !== "all") {
        const ratingValue = parseInt(reviewFilter.rating);
        if (review.rating !== ratingValue) {
          return false;
        }
      }

      // Filter by user search (name or rollNumber)
      if (reviewFilter.searchUser) {
        const searchTerm = reviewFilter.searchUser.toLowerCase();
        const userName = review.user?.name?.toLowerCase() || "";
        const userRollNumber = review.user?.rollNumber?.toLowerCase() || "";
        if (
          !userName.includes(searchTerm) &&
          !userRollNumber.includes(searchTerm)
        ) {
          return false;
        }
      }

      return true;
    });
  };

  // ============================================================================
  // END REVIEWS MANAGEMENT FUNCTIONS
  // ============================================================================

  // Duplicate a cohort
  const handleDuplicateCohort = async (cohort) => {
    setDuplicateLoading(true);
    setDuplicatingCohort(cohort);
    setDuplicateProgress("Creating duplicate cohort...");

    try {
      setDuplicateProgress("Copying cohort metadata and module references...");

      const response = await axios.post(
        `${apiUrl}/cohorts/${cohort._id}/duplicate`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 60000, // 1 minute timeout should be enough since we're not copying modules/questions
        }
      );

      setDuplicateProgress("Duplication completed successfully!");

      // Short delay to show success message
      setTimeout(() => {
        setDuplicateLoading(false);
        setDuplicateProgress("");
        setDuplicatingCohort(null);

        toast.success(
          `Cohort "${
            cohort.title
          }" duplicated successfully as draft with references to ${
            response.data.stats?.modulesReferenced || 0
          } modules!`
        );

        // Refresh the cohorts list to show the new duplicate
        fetchCohorts();
      }, 2000);
    } catch (error) {
      console.error("Error duplicating cohort:", error);
      setDuplicateLoading(false);
      setDuplicateProgress("");
      setDuplicatingCohort(null);

      const errorMessage =
        error.response?.data?.message || error.code === "ECONNABORTED"
          ? "Request timed out"
          : "Failed to duplicate cohort";
      toast.error(errorMessage);
    }
  };

  // Navigate to cohort detail page
  const handleManageCohort = (cohort) => {
    // Redirect to cohort detail management page
    window.location.href = `/admin/cohorts/${cohort._id}`;
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy HH:mm");
    } catch (error) {
      return "Invalid date";
    }
  };

  // Calculate cohort status
  const getCohortStatus = (cohort) => {
    const now = new Date();
    const startDate = new Date(cohort.startDate);
    const endDate = new Date(cohort.endDate);

    if (cohort.isDraft) {
      return { text: "Draft", color: "default" };
    }

    // An exam cohort's status is its window, not the generic cohort dates.
    if (cohort.mode === "exam" && cohort.examStartTime && cohort.examEndTime) {
      const examStart = new Date(cohort.examStartTime);
      const examEnd = new Date(cohort.examEndTime);

      if (now < examStart) {
        return { text: "Exam Scheduled", color: "info" };
      }
      // Past the end time nobody new can join, though attempts already running
      // continue to their own deadlines.
      if (now >= examEnd) {
        return { text: "Joining Closed", color: "warning" };
      }
      return { text: "Exam Live", color: "success" };
    }

    if (!cohort.isActive) {
      return { text: "Inactive", color: "error" };
    } else if (now < startDate) {
      return { text: "Upcoming", color: "info" };
    } else if (now > endDate) {
      return { text: "Ended", color: "warning" };
    } else {
      return { text: "Active", color: "success" };
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        minHeight: "100%",
        backgroundColor:
          theme.palette.mode === "dark" ? "transparent" : "#f5f5f5",
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h5" component="h2" sx={{ fontWeight: "bold" }}>
            Cohort Management
          </Typography>
          {user?.userType !== "teacher" && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateDialog}
            >
              Create Cohort
            </Button>
          )}
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Create and manage programming cohorts with modules, learning paths,
          and problem sets.
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="All Cohorts" />
            <Tab label="Active Cohorts" />
            <Tab label="Drafts" />
            <Tab label="Reviews" />
          </Tabs>
        </Box>
      </Box>

      {/* All Cohorts Tab */}
      <TabPanel value={currentTab} index={0}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : cohorts.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No cohorts found. Create a new cohort to get started.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {cohorts.map((cohort) => {
              const status = getCohortStatus(cohort);

              return (
                <Grid item xs={12} sm={6} md={4} key={cohort._id}>
                  <Card
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-5px)",
                        boxShadow: theme.shadows[10],
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant="h6"
                          component="h3"
                          sx={{ fontWeight: "medium" }}
                        >
                          {cohort.title}
                        </Typography>
                        <Chip
                          label={status.text}
                          color={status.color}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      </Box>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          height: "4.5em",
                        }}
                      >
                        {cohort.description}
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <CalendarTodayIcon
                            color="action"
                            sx={{ mr: 1, fontSize: "0.9rem" }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            Start: {formatDate(cohort.startDate)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <DateRangeIcon
                            color="action"
                            sx={{ mr: 1, fontSize: "0.9rem" }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            End: {formatDate(cohort.endDate)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <GroupIcon
                            color="action"
                            sx={{ mr: 1, fontSize: "0.9rem" }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            Eligible Users: {cohort.eligibleUsersCount || 0} · User groups:{" "}
                            {cohort.userGroupsCount || 0}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <CreateIcon
                            color="action"
                            sx={{ mr: 1, fontSize: "0.9rem" }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            Created by: {cohort.createdBy?.name || "Admin"}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>

                    <Divider />

                    <CardActions
                      sx={{ justifyContent: "space-between", p: 1.5 }}
                    >
                      {user?.userType !== "teacher" && (
                        <Box>
                          <Tooltip title="Edit Cohort">
                            <IconButton
                              size="small"
                              onClick={() => handleEditCohort(cohort)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          {cohort.mode === "exam" && (
                            <Tooltip title="Download exam results (Excel)">
                              <IconButton
                                size="small"
                                onClick={() => handleDownloadExamReport(cohort)}
                                disabled={exportingCohortId === cohort._id}
                                sx={{ color: "#2e7d32" }}
                              >
                                {exportingCohortId === cohort._id ? (
                                  <CircularProgress size={18} />
                                ) : (
                                  <DownloadIcon />
                                )}
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Duplicate Cohort">
                            <IconButton
                              size="small"
                              onClick={() => handleDuplicateCohort(cohort)}
                              color="secondary"
                              disabled={loading || duplicateLoading}
                              sx={{
                                color:
                                  theme.palette.mode === "dark"
                                    ? "#90caf9"
                                    : "#1976d2",
                                "&:hover": {
                                  backgroundColor:
                                    theme.palette.mode === "dark"
                                      ? "rgba(144, 202, 249, 0.08)"
                                      : "rgba(25, 118, 210, 0.08)",
                                },
                              }}
                            >
                              <FileCopyIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Cohort">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDeleteDialog(cohort)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}

                      <Box>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setUserGroupsCohort(cohort)}
                          startIcon={<PeopleIcon />}
                          sx={{ mr: 1 }}
                        >
                          User Groups
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          color="primary"
                          onClick={() => handleManageCohort(cohort)}
                          endIcon={<ArrowForwardIcon />}
                        >
                          Manage
                        </Button>
                      </Box>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </TabPanel>

      {/* Active Cohorts Tab */}
      <TabPanel value={currentTab} index={1}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : cohorts.filter((c) => c.isActive && !c.isDraft).length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No active cohorts found.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {cohorts
              .filter((c) => c.isActive && !c.isDraft)
              .map((cohort) => {
                const status = getCohortStatus(cohort);

                return (
                  <Grid item xs={12} sm={6} md={4} key={cohort._id}>
                    <Card
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        transition: "transform 0.2s, box-shadow 0.2s",
                        "&:hover": {
                          transform: "translateY(-5px)",
                          boxShadow: theme.shadows[10],
                        },
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            mb: 1,
                          }}
                        >
                          <Typography
                            variant="h6"
                            component="h3"
                            sx={{ fontWeight: "medium" }}
                          >
                            {cohort.title}
                          </Typography>
                          <Chip
                            label={status.text}
                            color={status.color}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Box>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            height: "4.5em",
                          }}
                        >
                          {cohort.description}
                        </Typography>

                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <CalendarTodayIcon
                              color="action"
                              sx={{ mr: 1, fontSize: "0.9rem" }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              Start: {formatDate(cohort.startDate)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <DateRangeIcon
                              color="action"
                              sx={{ mr: 1, fontSize: "0.9rem" }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              End: {formatDate(cohort.endDate)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <GroupIcon
                              color="action"
                              sx={{ mr: 1, fontSize: "0.9rem" }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              Eligible Users: {cohort.eligibleUsersCount || 0} · User groups:{" "}
                            {cohort.userGroupsCount || 0}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>

                      <Divider />

                      <CardActions
                        sx={{ justifyContent: "space-between", p: 1.5 }}
                      >
                        {user?.userType !== "teacher" && (
                          <Box>
                            <Tooltip title="Edit Cohort">
                              <IconButton
                                size="small"
                                onClick={() => handleEditCohort(cohort)}
                                color="primary"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            {cohort.mode === "exam" && (
                              <Tooltip title="Download exam results (Excel)">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadExamReport(cohort)}
                                  disabled={exportingCohortId === cohort._id}
                                  sx={{ color: "#2e7d32" }}
                                >
                                  {exportingCohortId === cohort._id ? (
                                    <CircularProgress size={18} />
                                  ) : (
                                    <DownloadIcon />
                                  )}
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Duplicate Cohort">
                              <IconButton
                                size="small"
                                onClick={() => handleDuplicateCohort(cohort)}
                                color="secondary"
                                disabled={loading || duplicateLoading}
                                sx={{
                                  color:
                                    theme.palette.mode === "dark"
                                      ? "#90caf9"
                                      : "#1976d2",
                                  "&:hover": {
                                    backgroundColor:
                                      theme.palette.mode === "dark"
                                        ? "rgba(144, 202, 249, 0.08)"
                                        : "rgba(25, 118, 210, 0.08)",
                                  },
                                }}
                              >
                                <FileCopyIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                        <Box>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setUserGroupsCohort(cohort)}
                            startIcon={<PeopleIcon />}
                            sx={{ mr: 1 }}
                          >
                            User Groups
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            color="primary"
                            onClick={() => handleManageCohort(cohort)}
                            endIcon={<ArrowForwardIcon />}
                          >
                            Manage
                          </Button>
                        </Box>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
          </Grid>
        )}
      </TabPanel>

      {/* Drafts Tab */}
      <TabPanel value={currentTab} index={2}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : cohorts.filter((c) => c.isDraft).length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No draft cohorts found.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            {cohorts
              .filter((c) => c.isDraft)
              .map((cohort) => {
                const status = getCohortStatus(cohort);

                return (
                  <Grid item xs={12} sm={6} md={4} key={cohort._id}>
                    <Card
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        transition: "transform 0.2s, box-shadow 0.2s",
                        "&:hover": {
                          transform: "translateY(-5px)",
                          boxShadow: theme.shadows[10],
                        },
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            mb: 1,
                          }}
                        >
                          <Typography
                            variant="h6"
                            component="h3"
                            sx={{ fontWeight: "medium" }}
                          >
                            {cohort.title}
                          </Typography>
                          <Chip
                            label={status.text}
                            color={status.color}
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        </Box>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mb: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: "vertical",
                            height: "4.5em",
                          }}
                        >
                          {cohort.description}
                        </Typography>

                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <CalendarTodayIcon
                              color="action"
                              sx={{ mr: 1, fontSize: "0.9rem" }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              Start: {formatDate(cohort.startDate)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <DateRangeIcon
                              color="action"
                              sx={{ mr: 1, fontSize: "0.9rem" }}
                            />
                            <Typography variant="body2" color="text.secondary">
                              End: {formatDate(cohort.endDate)}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>

                      <Divider />

                      <CardActions
                        sx={{ justifyContent: "space-between", p: 1.5 }}
                      >
                        {user?.userType !== "teacher" && (
                          <Box>
                            <Tooltip title="Edit Cohort">
                              <IconButton
                                size="small"
                                onClick={() => handleEditCohort(cohort)}
                                color="primary"
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            {cohort.mode === "exam" && (
                              <Tooltip title="Download exam results (Excel)">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadExamReport(cohort)}
                                  disabled={exportingCohortId === cohort._id}
                                  sx={{ color: "#2e7d32" }}
                                >
                                  {exportingCohortId === cohort._id ? (
                                    <CircularProgress size={18} />
                                  ) : (
                                    <DownloadIcon />
                                  )}
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Duplicate Cohort">
                              <IconButton
                                size="small"
                                onClick={() => handleDuplicateCohort(cohort)}
                                color="secondary"
                                disabled={loading || duplicateLoading}
                                sx={{
                                  color:
                                    theme.palette.mode === "dark"
                                      ? "#90caf9"
                                      : "#1976d2",
                                  "&:hover": {
                                    backgroundColor:
                                      theme.palette.mode === "dark"
                                        ? "rgba(144, 202, 249, 0.08)"
                                        : "rgba(25, 118, 210, 0.08)",
                                  },
                                }}
                              >
                                <FileCopyIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Cohort">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDeleteDialog(cohort)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}

                        <Button
                          variant="contained"
                          size="small"
                          color="primary"
                          onClick={() => handleManageCohort(cohort)}
                          endIcon={<ArrowForwardIcon />}
                        >
                          Edit Draft
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                );
              })}
          </Grid>
        )}
      </TabPanel>

      {/* Reviews Tab */}
      <TabPanel value={currentTab} index={3}>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <RateReviewIcon />
            Reviews Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            View and manage all reviews across all cohorts. Reviews are shared
            across related cohorts (clone families).
          </Typography>

          {/* Filters */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Cohort</InputLabel>
                  <Select
                    value={reviewFilter.cohortId}
                    label="Filter by Cohort"
                    onChange={(e) =>
                      setReviewFilter({
                        ...reviewFilter,
                        cohortId: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="all">All Cohorts</MenuItem>
                    {cohorts.map((cohort) => (
                      <MenuItem key={cohort._id} value={cohort._id}>
                        {cohort.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Rating</InputLabel>
                  <Select
                    value={reviewFilter.rating}
                    label="Filter by Rating"
                    onChange={(e) =>
                      setReviewFilter({
                        ...reviewFilter,
                        rating: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="all">All Ratings</MenuItem>
                    <MenuItem value="5">5 Stars</MenuItem>
                    <MenuItem value="4">4 Stars</MenuItem>
                    <MenuItem value="3">3 Stars</MenuItem>
                    <MenuItem value="2">2 Stars</MenuItem>
                    <MenuItem value="1">1 Star</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by user name or roll number..."
                  value={reviewFilter.searchUser}
                  onChange={(e) =>
                    setReviewFilter({
                      ...reviewFilter,
                      searchUser: e.target.value,
                    })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            {/* Bulk Actions */}
            {selectedReviews.length > 0 && (
              <Box
                sx={{ mt: 2, display: "flex", gap: 2, alignItems: "center" }}
              >
                <Typography variant="body2">
                  {selectedReviews.length} review(s) selected
                </Typography>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteReviewsDialogOpen(true)}
                >
                  Delete Selected
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setSelectedReviews([])}
                >
                  Clear Selection
                </Button>
              </Box>
            )}
          </Paper>
        </Box>

        {loadingReviews ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : getFilteredReviews().length === 0 ? (
          <Alert severity="info">
            {allReviews.length === 0
              ? "No reviews found across any cohorts."
              : "No reviews match the current filters."}
          </Alert>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={
                        selectedReviews.length > 0 &&
                        selectedReviews.length === getFilteredReviews().length
                      }
                      indeterminate={
                        selectedReviews.length > 0 &&
                        selectedReviews.length < getFilteredReviews().length
                      }
                      onChange={handleSelectAllReviews}
                    />
                  </TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Cohort</TableCell>
                  <TableCell>Rating</TableCell>
                  <TableCell>Comment</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getFilteredReviews().map((review) => (
                  <TableRow key={review._id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedReviews.includes(review._id)}
                        onChange={() => handleSelectReview(review._id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          src={review.user?.profilePicture}
                          alt={review.user?.name}
                          sx={{ width: 32, height: 32 }}
                        >
                          {review.user?.name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {review.user?.name || "Anonymous"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {review.user?.rollNumber || "No roll number"}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {review.relatedCohorts &&
                      review.relatedCohorts.length > 1 ? (
                        <Tooltip
                          title={
                            <Box>
                              <Typography variant="caption" fontWeight="bold">
                                Shared across {review.relatedCohorts.length}{" "}
                                cohorts:
                              </Typography>
                              {review.relatedCohorts.map((cohortTitle, idx) => (
                                <Typography
                                  key={idx}
                                  variant="caption"
                                  display="block"
                                >
                                  • {cohortTitle}
                                </Typography>
                              ))}
                            </Box>
                          }
                        >
                          <Box>
                            <Chip
                              label={review.cohortTitle}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <Chip
                              label={`+${
                                review.relatedCohorts.length - 1
                              } more`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                              sx={{ ml: 0.5 }}
                            />
                          </Box>
                        </Tooltip>
                      ) : (
                        <Chip
                          label={review.cohortTitle}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Rating value={review.rating} readOnly size="small" />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        {review.rating.toFixed(1)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 400,
                          wordBreak: "break-word",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {review.comment || "No comment"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip
                        title={new Date(review.createdAt).toLocaleString()}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Delete Review">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Are you sure you want to delete this review?"
                              )
                            ) {
                              handleDeleteSingleReview(review);
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Stats Summary */}
        {!loadingReviews && allReviews.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Total Reviews:</strong> {allReviews.length} |{" "}
                <strong>Filtered:</strong> {getFilteredReviews().length} |{" "}
                <strong>Average Rating:</strong>{" "}
                {(
                  allReviews.reduce((sum, r) => sum + r.rating, 0) /
                  allReviews.length
                ).toFixed(2)}{" "}
                ⭐
              </Typography>
            </Paper>
          </Box>
        )}
      </TabPanel>

      {/* Create/Edit Cohort Dialog */}
      <Dialog
        open={openCreateDialog}
        onClose={handleCloseCreateDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isEditMode ? "Edit Cohort" : "Create New Cohort"}
          <IconButton
            aria-label="close"
            onClick={handleCloseCreateDialog}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                fullWidth
                required
                error={!!formErrors.title}
                helperText={formErrors.title}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                multiline
                rows={4}
                fullWidth
                required
                error={!!formErrors.description}
                helperText={formErrors.description}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Start Date"
                  value={formData.startDate}
                  onChange={(date) => handleDateChange("startDate", date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      error: !!formErrors.startDate,
                      helperText: formErrors.startDate,
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="End Date"
                  value={formData.endDate}
                  onChange={(date) => handleDateChange("endDate", date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      error: !!formErrors.endDate,
                      helperText: formErrors.endDate,
                    },
                  }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Video Resource URL"
                name="videoResource"
                value={formData.videoResource}
                onChange={handleInputChange}
                fullWidth
                placeholder="https://youtu.be/example"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Documentation URL"
                name="documentationUrl"
                value={formData.documentationUrl}
                onChange={handleInputChange}
                fullWidth
                placeholder="https://example.com/docs"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="active-status-label">Status</InputLabel>
                <Select
                  labelId="active-status-label"
                  name="isActive"
                  value={formData.isActive}
                  onChange={handleInputChange}
                  label="Status"
                >
                  <MenuItem value={true}>Active</MenuItem>
                  <MenuItem value={false}>Inactive</MenuItem>
                </Select>
                <FormHelperText>
                  Active cohorts are visible to eligible users
                </FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="draft-status-label">
                  Publication Status
                </InputLabel>
                <Select
                  labelId="draft-status-label"
                  name="isDraft"
                  value={formData.isDraft}
                  onChange={handleInputChange}
                  label="Publication Status"
                >
                  <MenuItem value={true}>Draft</MenuItem>
                  <MenuItem value={false}>Published</MenuItem>
                </Select>
                <FormHelperText>
                  Draft cohorts are only visible to administrators
                </FormHelperText>
              </FormControl>
            </Grid>

            {/* Delivery mode. Exam mode reveals the window inputs below. */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="cohort-mode-label">Cohort Type</InputLabel>
                <Select
                  labelId="cohort-mode-label"
                  name="mode"
                  value={formData.mode}
                  onChange={handleInputChange}
                  label="Cohort Type"
                >
                  <MenuItem value="practice">Practice Mode</MenuItem>
                  <MenuItem value="exam">Exam Mode</MenuItem>
                </Select>
                <FormHelperText>
                  {formData.mode === "exam"
                    ? "Accessible only between the exam start and end times"
                    : "Open to eligible users at any time"}
                </FormHelperText>
              </FormControl>
            </Grid>

            {formData.mode === "exam" && (
              <>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Once published, an exam cohort is visible to every eligible
                    user, but it can only be <strong>started</strong> between the
                    times below.
                    {String(formData.examDurationMinutes ?? "").trim() === "" ? (
                      <>
                        {" "}
                        With no duration set, everyone works until the exam end
                        time and stops together.
                      </>
                    ) : (
                      <>
                        {" "}
                        With a duration set, each student gets{" "}
                        <strong>
                          {formData.examDurationMinutes} minutes
                        </strong>{" "}
                        of their own from the moment they start. A student who
                        starts late keeps their full time even if it runs past the
                        end time; once the end time passes, nobody new can start.
                      </>
                    )}{" "}
                    When a student&apos;s time runs out their exam is submitted
                    automatically.
                  </Alert>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DateTimePicker
                      label="Exam Start Time"
                      value={formData.examStartTime}
                      onChange={(date) => handleDateChange("examStartTime", date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                          error: !!formErrors.examStartTime,
                          helperText: formErrors.examStartTime,
                        },
                      }}
                    />
                  </LocalizationProvider>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DateTimePicker
                      label="Exam End Time"
                      value={formData.examEndTime}
                      onChange={(date) => handleDateChange("examEndTime", date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                          error: !!formErrors.examEndTime,
                          helperText: formErrors.examEndTime,
                        },
                      }}
                    />
                  </LocalizationProvider>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Time Allowed Per Student (minutes)"
                    name="examDurationMinutes"
                    type="number"
                    value={formData.examDurationMinutes}
                    onChange={handleInputChange}
                    fullWidth
                    inputProps={{ min: 1, max: 1440, step: 1 }}
                    placeholder="e.g. 120"
                    error={!!formErrors.examDurationMinutes}
                    helperText={
                      formErrors.examDurationMinutes ||
                      "Leave blank to let everyone work until the exam end time"
                    }
                  />
                </Grid>

                {/* Worked example, so the two clocks are unambiguous. */}
                {formData.examStartTime &&
                  formData.examEndTime &&
                  String(formData.examDurationMinutes ?? "").trim() !== "" && (
                    <Grid item xs={12} sm={6}>
                      <Alert severity="success" sx={{ height: "100%" }}>
                        <Typography variant="body2">
                          Students may start any time between{" "}
                          <strong>
                            {formData.examStartTime.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </strong>{" "}
                          and{" "}
                          <strong>
                            {formData.examEndTime.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </strong>
                          , and each gets {formData.examDurationMinutes} minutes.
                        </Typography>
                      </Alert>
                    </Grid>
                  )}
              </>
            )}
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseCreateDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSaveCohort}
            color="primary"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : isEditMode
              ? "Update Cohort"
              : "Create Cohort"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Cohort</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete the cohort "
            <strong>{selectedCohort?.title}</strong>"?
          </Typography>

          {deletionImpact?.userGroups?.length > 0 && (
            <Alert
              severity="warning"
              sx={{ mt: 2 }}
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setUserGroupsCohort(selectedCohort)}
                >
                  Detach groups
                </Button>
              }
            >
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Detach the user groups first
              </Typography>
              <Typography variant="body2">
                This cohort cannot be deleted while these user groups are attached:{" "}
                {deletionImpact.userGroups.map((group) => group.name).join(", ")}.
              </Typography>
            </Alert>
          )}

          {loadingDeletionImpact ? (
            <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
              <CircularProgress size={40} />
            </Box>
          ) : deletionImpact ? (
            <>
              {deletionImpact.isLastCohort ? (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    ⚠️ WARNING: This is the LAST cohort in this group!
                  </Typography>
                  <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                    Deleting this cohort will permanently remove:
                  </Typography>
                  <Typography
                    variant="body2"
                    component="ul"
                    sx={{ mt: 1, mb: 1 }}
                  >
                    <li>
                      <strong>{deletionImpact.modulesCount}</strong> modules
                    </li>
                    <li>
                      <strong>{deletionImpact.questionsCount}</strong> questions
                    </li>
                    <li>
                      <strong>{deletionImpact.userProgressCount}</strong> user
                      progress records
                    </li>
                  </Typography>
                  <Typography variant="body2" color="error" fontWeight="bold">
                    This action CANNOT be undone!
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    ✅ Safe to delete - Related cohorts exist
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    This cohort has{" "}
                    <strong>{deletionImpact.relatedCohortsCount}</strong>{" "}
                    related cohort(s):
                  </Typography>
                  <Typography
                    variant="body2"
                    component="ul"
                    sx={{ mt: 1, mb: 1 }}
                  >
                    {deletionImpact.relatedCohorts.slice(0, 3).map((rc) => (
                      <li key={rc.id}>{rc.title}</li>
                    ))}
                    {deletionImpact.relatedCohortsCount > 3 && (
                      <li>
                        ...and {deletionImpact.relatedCohortsCount - 3} more
                      </li>
                    )}
                  </Typography>
                  <Typography variant="body2">This will delete:</Typography>
                  <Typography
                    variant="body2"
                    component="ul"
                    sx={{ mt: 1, mb: 1 }}
                  >
                    <li>The cohort record</li>
                    <li>
                      <strong>{deletionImpact.userProgressCount}</strong> user
                      progress records
                    </li>
                  </Typography>
                  <Typography
                    variant="body2"
                    color="success.main"
                    fontWeight="bold"
                  >
                    Modules and questions will be preserved for other cohorts.
                  </Typography>
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                This will delete the cohort and user progress.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteCohort}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
            disabled={
              loading ||
              loadingDeletionImpact ||
              deletionImpact?.canDelete === false
            }
          >
            {loading
              ? "Deleting..."
              : deletionImpact?.isLastCohort
              ? "Delete Everything"
              : "Delete Cohort"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User groups attached to a cohort (decide who is eligible) */}
      <AttachedUserGroupsDialog
        open={Boolean(userGroupsCohort)}
        target={userGroupsCohort}
        api={cohortUserGroupApi}
        entityLabel="cohort"
        onClose={() => setUserGroupsCohort(null)}
        onChanged={handleUserGroupsChanged}
      />

      {/* Duplication Progress Dialog */}
      <Dialog
        open={duplicateLoading}
        disableEscapeKeyDown
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle sx={{ textAlign: "center", pb: 1 }}>
          <Typography variant="h6" component="div">
            Duplicating Cohort
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ textAlign: "center", py: 3 }}>
          <Box sx={{ mb: 3 }}>
            <CircularProgress size={60} thickness={4} />
          </Box>

          {duplicatingCohort && (
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "medium" }}>
              "{duplicatingCohort.title}"
            </Typography>
          )}

          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {duplicateProgress}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontStyle: "italic" }}
          >
            This creates a new cohort that references the same modules and
            questions as the original. No data is being copied, only references
            are being created.
          </Typography>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Reviews Confirmation Dialog */}
      <Dialog
        open={deleteReviewsDialogOpen}
        onClose={() => !loading && setDeleteReviewsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="span" color="error">
            ⚠️ Confirm Bulk Deletion
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            You are about to delete {selectedReviews.length} review(s). This
            action will remove these reviews from ALL related cohorts and cannot
            be undone.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteReviewsDialogOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteSelectedReviews}
            variant="contained"
            color="error"
            disabled={loading}
            startIcon={
              loading ? <CircularProgress size={20} /> : <DeleteIcon />
            }
          >
            {loading ? "Deleting..." : "Delete Reviews"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CohortManagementTab;
