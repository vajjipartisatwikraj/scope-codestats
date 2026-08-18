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
  AddCircle as AddCircleIcon,
  DeleteForever as DeleteForeverIcon,
  Remove as RemoveIcon,
  CalendarToday as CalendarTodayIcon,
  DateRange as DateRangeIcon,
  Create as CreateIcon,
  ContentCopy as ContentCopyIcon,
  FileCopy as FileCopyIcon,
  Download as DownloadIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  RateReview as RateReviewIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  VerifiedUser as VerifiedUserIcon,
} from "@mui/icons-material";
import axios from "axios";
import { apiUrl } from "../../config/apiConfig";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import RollNumberCsvImport from "./RollNumberCsvImport";
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

  // User Management Dialog State
  const [userManagementOpen, setUserManagementOpen] = useState(false);
  const [ineligibleUsers, setIneligibleUsers] = useState([]);
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [loading_users, setLoadingUsers] = useState(false);

  // User Removal Preview Dialog State
  const [removalPreviewOpen, setRemovalPreviewOpen] = useState(false);
  const [removalPreviewData, setRemovalPreviewData] = useState(null);
  const [removingUser, setRemovingUser] = useState(null);
  const [isRemovingAll, setIsRemovingAll] = useState(false);

  // Conflict Dialog State
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictData, setConflictData] = useState(null);

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

  // Filter state for department/section/class filtering
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [filterGraduatingYear, setFilterGraduatingYear] = useState("");

  // Search state - email only
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [eligibleSearchQuery, setEligibleSearchQuery] = useState("");

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
    setLoadingDeletionImpact(true);
    setDeletionImpact(null);

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
      toast.error("Failed to delete cohort");
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

  // Open User Management Dialog
  const handleOpenUserManagement = async (cohort) => {
    setSelectedCohort(cohort);
    setUserManagementOpen(true);

    // Reset filters
    setFilterDepartment("");
    setFilterSection("");
    setFilterGraduatingYear("");
    setSearchQuery("");

    // Load initial eligible users and pass them directly to fetchFilteredUsers
    // (state updates are async, so eligibleUsers would be stale otherwise)
    const currentEligible = await fetchEligibleUsers(cohort._id);

    // Load all users based on current filters, excluding already-eligible users
    await fetchFilteredUsers(currentEligible);
  };

  // Fetch eligible users for the cohort (returns the users array for immediate use)
  const fetchEligibleUsers = async (cohortId) => {
    setLoadingUsers(true);
    try {
      const response = await axios.get(
        `${apiUrl}/cohorts/${cohortId}/eligible-users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data && response.data.users) {
        const users = response.data.users.map((user) => ({
          _id: user._id,
          name: user.name || "Unknown",
          email: user.email || "No email",
          department: user.department || "",
          section: user.section || "",
          graduatingYear: user.graduatingYear || "",
        }));
        setEligibleUsers(users);
        return users;
      } else {
        setEligibleUsers([]);
        return [];
      }
    } catch (error) {
      console.error("Error fetching eligible users:", error);
      toast.error("Failed to fetch eligible users");
      setEligibleUsers([]);
      return [];
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch filtered users based on current filters and search
  // currentEligible: optional array of eligible users to use instead of stale state
  const fetchFilteredUsers = async (currentEligible) => {
    setLoadingUsers(true);
    try {
      let url = `${apiUrl}/users/search`;
      const params = new URLSearchParams();

      // Always load all users (backend returns empty without this flag when no filters)
      params.append("all", "true");
      params.append("limit", "5000");

      // Apply filters
      if (filterDepartment) params.append("department", filterDepartment);
      if (filterSection) params.append("section", filterSection);
      if (filterGraduatingYear)
        params.append("graduatingYear", filterGraduatingYear);

      // Apply search by email
      if (searchQuery.trim()) {
        params.append("email", searchQuery.trim());
      }

      url += `?${params.toString()}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data && response.data.users) {
        const allUsers = response.data.users.map((user) => ({
          _id: user._id,
          name: user.name || "Unknown",
          email: user.email || "No email",
          department: user.department || "",
          section: user.section || "",
          graduatingYear: user.graduatingYear || "",
        }));

        // Filter out users who are already eligible
        // Use passed-in array if available (avoids stale state on initial load)
        const currentEligibleList = currentEligible || eligibleUsers;
        const eligibleIds = currentEligibleList.map((u) => u._id);
        const ineligible = allUsers.filter(
          (user) => !eligibleIds.includes(user._id)
        );

        setIneligibleUsers(ineligible);
      } else {
        setIneligibleUsers([]);
      }
    } catch (error) {
      console.error("Error fetching filtered users:", error);

      if (error.response?.status === 404) {
        toast.error("Search endpoint not found. Please check backend server.");
      } else if (error.response?.status === 403) {
        toast.error("Access denied. Admin privileges required.");
      } else if (error.response?.status === 401) {
        toast.error("Authentication failed. Please login again.");
      } else {
        toast.error("Failed to search users.");
      }

      setIneligibleUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Apply current filters
  const handleApplyFilters = () => {
    fetchFilteredUsers();
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilterDepartment("");
    setFilterSection("");
    setFilterGraduatingYear("");
    setSearchQuery("");
    fetchFilteredUsers();
  };

  // Handle search input change
  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Search users by email
  const handleSearchByEmail = () => {
    if (searchQuery.trim().length >= 3) {
      fetchFilteredUsers();
    } else {
      toast.warning("Please enter at least 3 characters to search");
    }
  };

  // Add user to cohort
  const handleAddUserToCohort = async (user) => {
    if (!selectedCohort) return;

    try {
      // Add the user to eligible users list
      const updatedEligibleUsers = [...eligibleUsers, user];
      const userIds = updatedEligibleUsers.map((u) => u._id);

      // Update the cohort's eligible users
      await axios.put(
        `${apiUrl}/cohorts/${selectedCohort._id}/eligible-users`,
        { userIds },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Update local state
      setEligibleUsers(updatedEligibleUsers);
      setIneligibleUsers(ineligibleUsers.filter((u) => u._id !== user._id));

      toast.success(`${user.name} added to cohort successfully`);
    } catch (error) {
      console.error("Error adding user to cohort:", error);

      // ✅ Handle eligibility conflicts (409) - already eligible in related cohort
      if (
        error.response?.status === 409 &&
        error.response?.data?.conflictsByCohort
      ) {
        setConflictData({
          type: "eligibility",
          conflictsByCohort: error.response.data.conflictsByCohort,
          totalConflicts: error.response.data.totalConflicts,
          hint: error.response.data.hint,
          attemptedAction: "add user",
        });
        setConflictDialogOpen(true);
      }
      // ✅ Handle enrollment conflicts (409) - already enrolled in related cohort
      else if (
        error.response?.status === 409 &&
        error.response?.data?.conflicts
      ) {
        // Convert old format to new format for consistency
        const conflictsByCohort = {};
        error.response.data.conflicts.forEach((conflict) => {
          if (!conflictsByCohort[conflict.enrolledInCohort]) {
            conflictsByCohort[conflict.enrolledInCohort] = {
              cohortTitle: conflict.enrolledInCohort,
              cohortId: conflict.enrolledInCohortId,
              users: [],
            };
          }
          conflictsByCohort[conflict.enrolledInCohort].users.push({
            userName: conflict.userName,
            userEmail: conflict.userEmail,
            rollNumber: conflict.rollNumber,
            status: "enrolled",
          });
        });

        setConflictData({
          type: "enrollment",
          conflictsByCohort: Object.values(conflictsByCohort),
          totalConflicts: error.response.data.conflicts.length,
          hint: "Users can only be enrolled in one cohort from related cohorts (original + clones).",
          attemptedAction: "add user",
        });
        setConflictDialogOpen(true);
      } else {
        toast.error(
          error.response?.data?.message || "Failed to add user to cohort"
        );
      }
    }
  };

  // Remove user from cohort with preview
  const handleRemoveUserFromCohort = async (user) => {
    if (!selectedCohort) return;

    try {
      setLoadingUsers(true);

      // Remove the user from eligible users list
      const updatedEligibleUsers = eligibleUsers.filter(
        (u) => u._id !== user._id
      );
      const userIds = updatedEligibleUsers.map((u) => u._id);

      // 📋 STEP 1: Preview what data will be deleted
      const previewResponse = await axios.put(
        `${apiUrl}/cohorts/${selectedCohort._id}/eligible-users?preview=true`,
        { userIds },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Show preview dialog with deletion details
      if (previewResponse.data.preview && previewResponse.data.userDetails) {
        const userToRemove = previewResponse.data.userDetails.find(
          (u) => u.userId === user._id
        );

        if (userToRemove) {
          setRemovingUser(user);
          setRemovalPreviewData(previewResponse.data);
          setIsRemovingAll(false);
          setRemovalPreviewOpen(true);
          setLoadingUsers(false);
          return; // Wait for user confirmation in dialog
        }
      }

      setLoadingUsers(false);
    } catch (error) {
      console.error("Error previewing user removal:", error);
      setLoadingUsers(false);
      toast.error(
        error.response?.data?.message || "Failed to preview user removal"
      );
    }
  };

  // Confirm and execute user removal
  const confirmRemoveUser = async () => {
    if (!selectedCohort || (!removingUser && !isRemovingAll)) return;

    try {
      setLoadingUsers(true);

      const userIds = isRemovingAll
        ? []
        : eligibleUsers
            .filter((u) => u._id !== removingUser._id)
            .map((u) => u._id);

      // 🗑️ Perform actual deletion
      await axios.put(
        `${apiUrl}/cohorts/${selectedCohort._id}/eligible-users`,
        { userIds },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Update local state
      if (isRemovingAll) {
        setEligibleUsers([]);
        await fetchFilteredUsers();
        toast.success("All users removed from cohort successfully");
      } else {
        const updatedEligibleUsers = eligibleUsers.filter(
          (u) => u._id !== removingUser._id
        );
        setEligibleUsers(updatedEligibleUsers);

        // Add back to ineligible list if it matches current filters
        const matchesFilters =
          (!filterDepartment || removingUser.department === filterDepartment) &&
          (!filterSection || removingUser.section === filterSection) &&
          (!filterGraduatingYear ||
            removingUser.graduatingYear === filterGraduatingYear) &&
          (!searchQuery.trim() ||
            removingUser.email
              .toLowerCase()
              .includes(searchQuery.toLowerCase()));

        if (matchesFilters) {
          setIneligibleUsers([...ineligibleUsers, removingUser]);
        }

        toast.success(`${removingUser.name} removed from cohort successfully`);
      }

      // Close preview dialog
      setRemovalPreviewOpen(false);
      setRemovingUser(null);
      setRemovalPreviewData(null);
      setIsRemovingAll(false);
      setLoadingUsers(false);
    } catch (error) {
      console.error("Error removing user from cohort:", error);
      setLoadingUsers(false);
      toast.error(
        error.response?.data?.message || "Failed to remove user from cohort"
      );
    }
  };

  // Add all filtered users to cohort
  const handleAddAllUsers = async () => {
    if (!selectedCohort || ineligibleUsers.length === 0) return;

    const confirmed = window.confirm(
      `Add all ${ineligibleUsers.length} filtered users to this cohort?`
    );
    if (!confirmed) return;

    try {
      setLoadingUsers(true);

      // Combine eligible users with all ineligible users
      const updatedEligibleUsers = [...eligibleUsers, ...ineligibleUsers];
      const userIds = updatedEligibleUsers.map((u) => u._id);

      // Update the cohort's eligible users in one API call
      await axios.put(
        `${apiUrl}/cohorts/${selectedCohort._id}/eligible-users`,
        { userIds },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Update local state
      setEligibleUsers(updatedEligibleUsers);
      setIneligibleUsers([]);

      toast.success(
        `Successfully added all ${ineligibleUsers.length} users to the cohort!`
      );
    } catch (error) {
      console.error("Error adding all users:", error);

      // ✅ Handle eligibility conflicts (409) - already eligible in related cohorts
      if (
        error.response?.status === 409 &&
        error.response?.data?.conflictsByCohort
      ) {
        setConflictData({
          type: "eligibility",
          conflictsByCohort: error.response.data.conflictsByCohort,
          totalConflicts: error.response.data.totalConflicts,
          hint: error.response.data.hint,
          attemptedAction: "add all users",
        });
        setConflictDialogOpen(true);
      }
      // ✅ Handle enrollment conflicts (409) - already enrolled in related cohorts
      else if (
        error.response?.status === 409 &&
        error.response?.data?.conflicts
      ) {
        // Convert old format to new format for consistency
        const conflictsByCohort = {};
        error.response.data.conflicts.forEach((conflict) => {
          if (!conflictsByCohort[conflict.enrolledInCohort]) {
            conflictsByCohort[conflict.enrolledInCohort] = {
              cohortTitle: conflict.enrolledInCohort,
              cohortId: conflict.enrolledInCohortId,
              users: [],
            };
          }
          conflictsByCohort[conflict.enrolledInCohort].users.push({
            userName: conflict.userName,
            userEmail: conflict.userEmail,
            rollNumber: conflict.rollNumber,
            status: "enrolled",
          });
        });

        setConflictData({
          type: "enrollment",
          conflictsByCohort: Object.values(conflictsByCohort),
          totalConflicts: error.response.data.conflicts.length,
          hint: "Users can only be enrolled in one cohort from related cohorts (original + clones).",
          attemptedAction: "add all users",
        });
        setConflictDialogOpen(true);
      } else {
        toast.error(
          error.response?.data?.message ||
            "Failed to add users. Please try again."
        );
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  // Remove all users from cohort with preview
  const handleRemoveAllUsers = async () => {
    if (!selectedCohort || eligibleUsers.length === 0) return;

    try {
      setLoadingUsers(true);

      // 📋 Preview what data will be deleted for all users
      const previewResponse = await axios.put(
        `${apiUrl}/cohorts/${selectedCohort._id}/eligible-users?preview=true`,
        { userIds: [] }, // Empty array = remove all
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Show preview dialog
      if (previewResponse.data.preview) {
        setRemovingUser(null);
        setRemovalPreviewData(previewResponse.data);
        setIsRemovingAll(true);
        setRemovalPreviewOpen(true);
        setLoadingUsers(false);
      }
    } catch (error) {
      console.error("Error previewing removal of all users:", error);
      setLoadingUsers(false);
      toast.error("Failed to preview user removal");
    }
  };

  // Close user management dialog
  const handleCloseUserManagement = () => {
    setUserManagementOpen(false);
    setIneligibleUsers([]);
    setEligibleUsers([]);
    setFilterDepartment("");
    setFilterSection("");
    setFilterGraduatingYear("");
    setSearchQuery("");
    setEligibleSearchQuery("");

    // Refresh cohorts to show updated counts
    fetchCohorts();
  };

  // Update eligible users and close dialog
  const handleUpdateEligibleUsers = () => {
    handleCloseUserManagement();
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
      if (now >= examEnd) {
        return { text: "Exam Ended", color: "warning" };
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
                            Eligible Users: {cohort.eligibleUsersCount || 0}
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
                          onClick={() => handleOpenUserManagement(cohort)}
                          startIcon={<PeopleIcon />}
                          sx={{ mr: 1 }}
                        >
                          Manage Users
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
                              Eligible Users: {cohort.eligibleUsersCount || 0}
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
                            onClick={() => handleOpenUserManagement(cohort)}
                            startIcon={<PeopleIcon />}
                            sx={{ mr: 1 }}
                          >
                            Manage Users
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
                    user, but it can only be opened between the times below. When
                    the exam ends the cohort becomes inactive and anyone still
                    inside is returned to their dashboard.
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
            disabled={loading || loadingDeletionImpact}
          >
            {loading
              ? "Deleting..."
              : deletionImpact?.isLastCohort
              ? "Delete Everything"
              : "Delete Cohort"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Management Dialog */}
      <Dialog
        open={userManagementOpen}
        onClose={handleCloseUserManagement}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { height: "90vh" },
        }}
      >
        <DialogTitle>
          Manage Users: {selectedCohort?.title}
          <IconButton
            aria-label="close"
            onClick={handleCloseUserManagement}
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

        <DialogContent
          dividers
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            height: "80vh",
            overflow: "auto",
          }}
        >
          {/* Bulk import by roll number. Resolving is read-only, so the admin
              sees who exists and who is missing before anything is added. */}
          {selectedCohort && (
            <Box sx={{ flexShrink: 0 }}>
              <RollNumberCsvImport
                cohortId={selectedCohort._id}
                currentEligibleIds={eligibleUsers.map((u) => u._id)}
                onUsersAdded={async () => {
                  const refreshed = await fetchEligibleUsers(selectedCohort._id);
                  await fetchFilteredUsers(refreshed);
                }}
              />
            </Box>
          )}

          {/* Filters Section */}
          <Paper sx={{ p: 2, flexShrink: 0 }}>
            <Typography variant="h6" gutterBottom>
              Filters & Search
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={filterDepartment}
                    label="Department"
                    onChange={(e) => setFilterDepartment(e.target.value)}
                  >
                    <MenuItem value="">All Departments</MenuItem>
                    <MenuItem value="CSE">CSE</MenuItem>
                    <MenuItem value="CSC">CSC</MenuItem>
                    <MenuItem value="CSD">CSD</MenuItem>
                    <MenuItem value="CSM">CSM</MenuItem>
                    <MenuItem value="CSIT">CSIT</MenuItem>
                    <MenuItem value="IT">IT</MenuItem>
                    <MenuItem value="ECE">ECE</MenuItem>
                    <MenuItem value="EEE">EEE</MenuItem>
                    <MenuItem value="MECH">MECH</MenuItem>
                    <MenuItem value="AERO">AERO</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Section</InputLabel>
                  <Select
                    value={filterSection}
                    label="Section"
                    onChange={(e) => setFilterSection(e.target.value)}
                  >
                    <MenuItem value="">All Sections</MenuItem>
                    {["A", "B", "C", "D", "E", "F", "G", "H"].map((section) => (
                      <MenuItem key={section} value={section}>
                        {section}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={filterGraduatingYear}
                    label="Year"
                    onChange={(e) => setFilterGraduatingYear(e.target.value)}
                  >
                    <MenuItem value="">All Years</MenuItem>
                    <MenuItem value="2025">2025</MenuItem>
                    <MenuItem value="2026">2026</MenuItem>
                    <MenuItem value="2027">2027</MenuItem>
                    <MenuItem value="2028">2028</MenuItem>
                    <MenuItem value="2029">2029</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search by Email"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  placeholder="Enter email address..."
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleApplyFilters}
                    disabled={loading_users}
                    fullWidth
                  >
                    Apply
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleClearFilters}
                    disabled={loading_users}
                    fullWidth
                  >
                    Clear
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Two Lists */}
          <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
            {/* Ineligible Users List */}
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  p: 2,
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="h6" color="error">
                    Ineligible Users ({ineligibleUsers.length})
                  </Typography>
                  {ineligibleUsers.length > 0 && !loading_users && (
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={handleAddAllUsers}
                      disabled={loading_users}
                    >
                      Add All
                    </Button>
                  )}
                </Box>

                {loading_users ? (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <CircularProgress />
                  </Box>
                ) : ineligibleUsers.length === 0 ? (
                  <Alert severity="info" sx={{ flex: 1 }}>
                    No ineligible users found with current filters.
                  </Alert>
                ) : (
                  <Box
                    sx={{
                      flex: 1,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      minHeight: 0,
                    }}
                  >
                    <TableContainer
                      sx={{ flex: 1, maxHeight: "50vh", overflow: "auto" }}
                    >
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Dept</TableCell>
                            <TableCell>Sec</TableCell>
                            <TableCell>Year</TableCell>
                            <TableCell>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {ineligibleUsers.map((user) => (
                            <TableRow key={user._id}>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>{user.department}</TableCell>
                              <TableCell>{user.section}</TableCell>
                              <TableCell>{user.graduatingYear}</TableCell>
                              <TableCell>
                                <Tooltip title="Add to cohort">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleAddUserToCohort(user)}
                                  >
                                    <AddIcon />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Eligible Users List */}
            <Grid item xs={12} md={6}>
              <Paper
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  p: 2,
                  overflow: "hidden",
                  border: (theme) =>
                    `1px solid ${
                      theme.palette.mode === "dark"
                        ? "rgba(46, 125, 50, 0.3)"
                        : "rgba(46, 125, 50, 0.2)"
                    }`,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="h6" color="success.main">
                    Eligible Users ({eligibleUsers.length})
                  </Typography>
                  {eligibleUsers.length > 0 && (
                    <Button
                      size="small"
                      onClick={handleRemoveAllUsers}
                      color="error"
                      variant="outlined"
                    >
                      Remove All
                    </Button>
                  )}
                </Box>

                {/* Search within eligible users */}
                {eligibleUsers.length > 0 && (
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search eligible users by name or email..."
                    value={eligibleSearchQuery}
                    onChange={(e) => setEligibleSearchQuery(e.target.value)}
                    sx={{ mb: 1, flexShrink: 0 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}

                {loading_users ? (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <CircularProgress />
                  </Box>
                ) : eligibleUsers.length === 0 ? (
                  <Alert severity="info" sx={{ flex: 1 }}>
                    No users are currently eligible for this cohort.
                  </Alert>
                ) : (
                  <Box
                    sx={{
                      flex: 1,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                      minHeight: 0,
                    }}
                  >
                    {(() => {
                      const filteredEligible = eligibleSearchQuery.trim()
                        ? eligibleUsers.filter(
                            (u) =>
                              u.name
                                .toLowerCase()
                                .includes(
                                  eligibleSearchQuery.toLowerCase()
                                ) ||
                              u.email
                                .toLowerCase()
                                .includes(
                                  eligibleSearchQuery.toLowerCase()
                                )
                          )
                        : eligibleUsers;

                      if (filteredEligible.length === 0) {
                        return (
                          <Alert severity="info" sx={{ flex: 1 }}>
                            No eligible users match your search.
                          </Alert>
                        );
                      }

                      return (
                        <>
                          {eligibleSearchQuery.trim() && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mb: 0.5 }}
                            >
                              Showing {filteredEligible.length} of{" "}
                              {eligibleUsers.length} eligible users
                            </Typography>
                          )}
                          <TableContainer
                            sx={{
                              flex: 1,
                              maxHeight: "50vh",
                              overflow: "auto",
                            }}
                          >
                            <Table size="small" stickyHeader>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Name</TableCell>
                                  <TableCell>Email</TableCell>
                                  <TableCell>Dept</TableCell>
                                  <TableCell>Sec</TableCell>
                                  <TableCell>Year</TableCell>
                                  <TableCell>Action</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {filteredEligible.map((user) => (
                                  <TableRow key={user._id}>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.department}</TableCell>
                                    <TableCell>{user.section}</TableCell>
                                    <TableCell>
                                      {user.graduatingYear}
                                    </TableCell>
                                    <TableCell>
                                      <Tooltip title="Remove from cohort">
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() =>
                                            handleRemoveUserFromCohort(user)
                                          }
                                        >
                                          <RemoveIcon />
                                        </IconButton>
                                      </Tooltip>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </>
                      );
                    })()}
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseUserManagement} color="inherit">
            Close
          </Button>
          <Button
            onClick={handleUpdateEligibleUsers}
            color="primary"
            variant="contained"
            disabled={loading_users}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Conflict Dialog for Eligibility/Enrollment Issues */}
      <Dialog
        open={conflictDialogOpen}
        onClose={() => setConflictDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="span" color="error">
            ⚠️ Cannot {conflictData?.attemptedAction || "add users"}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {conflictData && (
            <Box>
              <Alert severity="error" sx={{ mb: 3 }}>
                <strong>{conflictData.totalConflicts}</strong> user(s) are
                already{" "}
                {conflictData.type === "eligibility"
                  ? "eligible in"
                  : "enrolled in"}{" "}
                related cohort(s).
              </Alert>

              {conflictData.conflictsByCohort.map((cohortConflict, index) => (
                <Box key={index} sx={{ mb: 3 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: "bold", mb: 1 }}
                  >
                    {cohortConflict.cohortTitle}
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ mb: 2 }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <strong>Name</strong>
                          </TableCell>
                          <TableCell>
                            <strong>Email</strong>
                          </TableCell>
                          <TableCell>
                            <strong>Roll Number</strong>
                          </TableCell>
                          {conflictData.type === "enrollment" && (
                            <TableCell>
                              <strong>Status</strong>
                            </TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cohortConflict.users.map((user, userIndex) => (
                          <TableRow key={userIndex}>
                            <TableCell>{user.userName}</TableCell>
                            <TableCell>{user.userEmail}</TableCell>
                            <TableCell>{user.rollNumber || "N/A"}</TableCell>
                            {conflictData.type === "enrollment" && (
                              <TableCell>
                                <Chip
                                  label={user.status}
                                  color="warning"
                                  size="small"
                                />
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}

              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Hint:</strong> {conflictData.hint}
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConflictDialogOpen(false)}
            variant="contained"
            color="primary"
          >
            OK, I Understand
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Removal Preview Dialog */}
      <Dialog
        open={removalPreviewOpen}
        onClose={() => !loading_users && setRemovalPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" component="span" color="error">
            ⚠️ Confirm User Removal
          </Typography>
        </DialogTitle>
        <DialogContent>
          {removalPreviewData && (
            <Box>
              {isRemovingAll ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  You are about to remove{" "}
                  <strong>{removalPreviewData.usersToRemove}</strong> user(s)
                  from this cohort.
                </Alert>
              ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  You are about to remove <strong>{removingUser?.name}</strong>{" "}
                  from this cohort.
                </Alert>
              )}

              {removalPreviewData.totalDataToDelete && (
                <>
                  {(removalPreviewData.totalDataToDelete.submissions > 0 ||
                    removalPreviewData.totalDataToDelete.notes > 0 ||
                    removalPreviewData.totalDataToDelete.reports > 0 ||
                    removalPreviewData.totalDataToDelete.userProgress > 0) && (
                    <>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: "bold", mb: 2 }}
                      >
                        The following data will be{" "}
                        <strong style={{ color: theme.palette.error.main }}>
                          permanently deleted
                        </strong>
                        :
                      </Typography>

                      <TableContainer
                        component={Paper}
                        variant="outlined"
                        sx={{ mb: 2 }}
                      >
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>
                                <strong>Data Type</strong>
                              </TableCell>
                              <TableCell align="right">
                                <strong>Count</strong>
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            <TableRow>
                              <TableCell>Submissions</TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={
                                    removalPreviewData.totalDataToDelete
                                      .submissions
                                  }
                                  color={
                                    removalPreviewData.totalDataToDelete
                                      .submissions > 0
                                      ? "error"
                                      : "default"
                                  }
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Notes</TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={
                                    removalPreviewData.totalDataToDelete.notes
                                  }
                                  color={
                                    removalPreviewData.totalDataToDelete.notes >
                                    0
                                      ? "error"
                                      : "default"
                                  }
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Reports</TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={
                                    removalPreviewData.totalDataToDelete.reports
                                  }
                                  color={
                                    removalPreviewData.totalDataToDelete
                                      .reports > 0
                                      ? "error"
                                      : "default"
                                  }
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>Progress Records</TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={
                                    removalPreviewData.totalDataToDelete
                                      .userProgress
                                  }
                                  color={
                                    removalPreviewData.totalDataToDelete
                                      .userProgress > 0
                                      ? "error"
                                      : "default"
                                  }
                                  size="small"
                                />
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Alert severity="error" sx={{ mb: 2 }}>
                        <strong>Warning:</strong> This action cannot be undone.
                        All user data for this cohort will be permanently
                        deleted.
                      </Alert>
                    </>
                  )}

                  {removalPreviewData.totalDataToDelete.submissions === 0 &&
                    removalPreviewData.totalDataToDelete.notes === 0 &&
                    removalPreviewData.totalDataToDelete.reports === 0 &&
                    removalPreviewData.totalDataToDelete.userProgress === 0 && (
                      <Alert severity="info">
                        No user data will be deleted. The user has no
                        submissions, notes, or progress in this cohort.
                      </Alert>
                    )}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRemovalPreviewOpen(false);
              setRemovingUser(null);
              setRemovalPreviewData(null);
              setIsRemovingAll(false);
            }}
            disabled={loading_users}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmRemoveUser}
            color="error"
            variant="contained"
            disabled={loading_users}
            startIcon={
              loading_users ? (
                <CircularProgress size={20} />
              ) : (
                <DeleteForeverIcon />
              )
            }
          >
            {loading_users
              ? "Removing..."
              : isRemovingAll
              ? "Remove All Users"
              : "Remove User"}
          </Button>
        </DialogActions>
      </Dialog>

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
