import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Typography,
  Paper,
  Button,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Divider,
  useTheme,
} from "@mui/material";
import {
  Save as SaveIcon,
  Close as CloseIcon,
  Code as CodeIcon,
  Preview as PreviewIcon,
  CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";
import axios from "axios";
import { apiUrl } from "../../config/apiConfig";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext";
import QuestionForm from "./QuestionForm";
import CohortStats from "./CohortStats";
import CohortDetailLeft from "./CohortDetailLeft";
import CohortDetailRight from "./CohortDetailRight";
import CohortProgress from "./CohortProgress";
import SharedContentWarningDialog from "./SharedContentWarningDialog";
import BulkQuestionUpload from "./BulkQuestionUpload";

// Tab panel component
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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const CohortDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [cohort, setCohort] = useState(null);
  const [modules, setModules] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [openModuleDialog, setOpenModuleDialog] = useState(false);
  const [moduleFormData, setModuleFormData] = useState({
    title: "",
    description: "",
    order: 0,
    videoResource: "",
    documentationUrl: "",
    resources: [],
  });
  const [isEditingModule, setIsEditingModule] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [openQuestionDialog, setOpenQuestionDialog] = useState(false);
  const [questionFormData, setQuestionFormData] = useState({
    title: "",
    description: "",
    type: "programming",
    difficultyLevel: "medium",
    marks: 10,
    options: [],
    languages: [
      {
        name: "java",
        version: "15.0.2",
        boilerplateCode:
          "public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}",
        solutionCode: "",
      },
    ],
    defaultLanguage: "java",
    testCases: [],
    examples: [],
    constraints: {
      timeLimit: 1000,
      memoryLimit: 256,
    },
    hints: [],
    tags: [],
    companies: [],
    editorial: "",
  });
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentModuleId, setCurrentModuleId] = useState(null);
  const [questionsVersion, setQuestionsVersion] = useState(0);

  // State for tracking which right panel is active
  const [showProgress, setShowProgress] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Add state for showFeedback
  const [showFeedback, setShowFeedback] = useState(false);

  // State for HTML editor preview mode in module dialog
  const [previewMode, setPreviewMode] = useState(false);

  // State for module dialog mode: 'form' or 'bulk'
  const [moduleDialogMode, setModuleDialogMode] = useState("form");
  const [bulkUploading, setBulkUploading] = useState(false);

  // State for shared content warning dialog
  const [warningDialog, setWarningDialog] = useState({
    open: false,
    action: null,
    affectedCohorts: [],
    details: {},
    onConfirm: null,
    loading: false,
  });

  // Check if user is admin or teacher
  useEffect(() => {
    if (user && (user.userType === "admin" || user.userType === "teacher")) {
      setIsAdmin(true);
    }
  }, [user]);

  // Check if user can edit/modify content (only admin, not teacher)
  const canEdit = user && user.userType === "admin";

  // Fetch cohort details on component mount
  // Only re-fetch if id or token changes, not when isAdmin changes
  useEffect(() => {
    fetchCohortDetails();
  }, [id, token]);

  // Fetch cohort details
  const fetchCohortDetails = async () => {
    setLoading(true);
    try {
      // Check admin status directly from user object to avoid dependency on isAdmin state
      const isUserAdmin =
        user && (user.userType === "admin" || user.userType === "teacher");
      const endpoint = isUserAdmin
        ? `${apiUrl}/cohorts/admin/${id}`
        : `${apiUrl}/cohorts/${id}`;

      // Add a more reliable cache buster with both timestamp and random value
      const timestamp = new Date().getTime();
      const cacheBuster = `${timestamp}-${Math.random()
        .toString(36)
        .substring(2, 15)}`;

      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: {
          _t: cacheBuster,
        },
        // Force no caching
        cache: false,
      });

      setCohort(response.data);

      if (
        !isUserAdmin &&
        response.data.eligibleUsers?.includes(user.id) &&
        (!response.data.userProgress ||
          response.data.userProgress.status === "applied")
      ) {
        autoEnroll();
      }

      if (response.data.modules && response.data.modules.length > 0) {
        setModules(response.data.modules);
        // Set the first module as selected if none is selected
        if (!currentModuleId && response.data.modules.length > 0) {
          setCurrentModuleId(response.data.modules[0]._id);
        }
        setLoading(false);
      } else {
        fetchModules();
      }

      // Get cohort feedback if the user is enrolled
      if (!isUserAdmin && response.data.userProgress) {
        try {
          const feedbackResponse = await axios.get(
            `${apiUrl}/cohorts/${id}/feedback`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (feedbackResponse.data) {
            // Update cohort with feedback data
            setCohort((prevCohort) => ({
              ...prevCohort,
              feedbacks: feedbackResponse.data.feedbacks,
              averageRating: feedbackResponse.data.averageRating,
            }));
          }
        } catch (feedbackError) {
          console.error("Error fetching cohort feedback:", feedbackError);
          // Non-critical error, don't show toast
        }
      }
    } catch (error) {
      console.error("Error fetching cohort details:", error);
      const errorResponse = error.response?.data;

      if (error.response) {
        if (error.response.status === 404) {
          if (errorResponse?.reason === "not_found") {
            toast.error(`Cohort not found. It may have been deleted.`);
            navigate(isAdmin ? "/admin" : "/cohorts");
            return;
          }
        } else if (error.response.status === 403) {
          if (errorResponse?.reason === "not_eligible") {
            toast.error(`You're not eligible to view this cohort.`);
            navigate("/cohorts");
            return;
          } else if (errorResponse?.reason === "not_active") {
            toast.error(`This cohort is currently inactive.`);
            navigate("/cohorts");
            return;
          } else if (errorResponse?.reason === "draft_mode") {
            if (!isAdmin) {
              toast.error(`This cohort is not yet published.`);
              navigate("/cohorts");
              return;
            }
          }
        }
      }

      if (error.response && error.response.status === 404) {
        try {
          const fallbackEndpoint = isAdmin
            ? `http://localhost:5000/api/cohorts/admin/${id}`
            : `http://localhost:5000/api/cohorts/${id}`;

          const fallbackResponse = await axios.get(fallbackEndpoint, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            params: { _t: new Date().getTime() },
          });

          setCohort(fallbackResponse.data);

          if (
            fallbackResponse.data.modules &&
            fallbackResponse.data.modules.length > 0
          ) {
            setModules(fallbackResponse.data.modules);
            if (!currentModuleId && fallbackResponse.data.modules.length > 0) {
              setCurrentModuleId(fallbackResponse.data.modules[0]._id);
            }
            setLoading(false);
          } else {
            fetchModules(true); // pass true to use fallback URL
          }
        } catch (fallbackError) {
          console.error("Fallback attempt also failed:", fallbackError);

          const fallbackErrorResponse = fallbackError.response?.data;
          if (fallbackError.response) {
            if (fallbackError.response.status === 403) {
              if (fallbackErrorResponse?.reason === "not_eligible") {
                toast.error(`You're not eligible to view this cohort.`);
              } else if (fallbackErrorResponse?.reason === "not_active") {
                toast.error(`This cohort is currently inactive.`);
              } else if (fallbackErrorResponse?.reason === "draft_mode") {
                toast.error(`This cohort is not yet published.`);
              } else {
                toast.error("Access denied to this cohort");
              }
            } else {
              toast.error("Failed to fetch cohort details");
            }
          } else {
            toast.error("Failed to fetch cohort details");
          }

          navigate(isAdmin ? "/admin" : "/cohorts");
        }
      } else {
        toast.error("Failed to fetch cohort details");
        navigate(isAdmin ? "/admin" : "/cohorts");
      }

      setLoading(false);
    }
  };

  // Auto-enroll the user in the cohort if eligible
  const autoEnroll = async () => {
    try {
      await axios.post(
        `${apiUrl}/cohorts/${id}/enroll`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      fetchCohortDetails();

      toast.success("You have been enrolled in this cohort!");
    } catch (error) {
      console.error("Error enrolling in cohort:", error);
    }
  };

  // Fetch modules for this cohort
  const fetchModules = async (useFallback = false) => {
    try {
      if (cohort && cohort.modules && cohort.modules.length > 0) {
        setModules(cohort.modules);
        if (!currentModuleId && cohort.modules.length > 0) {
          setCurrentModuleId(cohort.modules[0]._id);
        }
        return;
      }

      const endpoint = useFallback
        ? `http://localhost:5000/api/cohorts/${id}/modules`
        : `${apiUrl}/cohorts/${id}/modules`;

      // Add cache buster
      const timestamp = new Date().getTime();
      const cacheBuster = `${timestamp}-${Math.random()
        .toString(36)
        .substring(2, 15)}`;

      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        params: {
          _t: cacheBuster,
        },
        cache: false,
      });

      if (response.data && response.data.modules) {
        setModules(response.data.modules);
        if (!currentModuleId && response.data.modules.length > 0) {
          setCurrentModuleId(response.data.modules[0]._id);
        }
      } else {
        setModules([]);
      }
    } catch (error) {
      console.error("Error fetching modules:", error);
      const errorResponse = error.response?.data;

      if (error.response) {
        if (error.response.status === 404) {
          if (errorResponse?.reason === "not_found") {
            toast.error(`Cohort not found. It may have been deleted.`);
            navigate(isAdmin ? "/admin" : "/cohorts");
            return;
          }
        } else if (error.response.status === 403) {
          if (errorResponse?.reason === "not_eligible") {
            toast.error(`You're not eligible to view this cohort.`);
            navigate("/cohorts");
            return;
          } else if (errorResponse?.reason === "not_active") {
            toast.error(`This cohort is currently inactive.`);
            navigate("/cohorts");
            return;
          } else if (errorResponse?.reason === "draft_mode") {
            if (!isAdmin) {
              toast.error(`This cohort is not yet published.`);
              navigate("/cohorts");
              return;
            }
          }
        }
      }

      if (!useFallback && error.response && error.response.status === 404) {
        fetchModules(true);
      } else {
        if (error.response && error.response.status !== 404) {
          toast.error("Failed to fetch modules");
        }
        setModules([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);

    // Reset other view states
    setShowProgress(false);
    setShowStats(newValue === 1);
  };

  // Handle clicking on a module
  const handleModuleClick = (module) => {
    setCurrentModuleId(module._id);

    // Fetch module details if the selected module isn't in the local array
    if (modules.length > 0 && !modules.find((m) => m._id === module._id)) {
      fetchModules();
    }

    // Close other views when selecting a module
    setShowProgress(false);
    setShowStats(false);
    setShowFeedback(false); // Close feedback panel when module is clicked
  };

  // Handle Progress button click
  const handleProgressClick = () => {
    setShowProgress(!showProgress);
    setShowStats(false);
    setShowFeedback(false);
  };

  // Handle Stats button click (admin only)
  const handleStatsClick = () => {
    setShowStats(!showStats);
    setShowProgress(false);
    setShowFeedback(false);
  };

  // Handle solving a question
  const handleSolveQuestion = (question) => {
    if (!currentModuleId) return;

    // Open the question in a new tab
    window.open(
      `/cohorts/${cohort._id}/modules/${currentModuleId}/questions/${question._id}`,
      "_blank"
    );
  };

  // Open the create module dialog
  const handleOpenModuleDialog = () => {
    setIsEditingModule(false);
    setModuleDialogMode("form");
    setModuleFormData({
      title: "",
      description: "",
      order: modules.length,
      videoResource: "",
      documentationUrl: "",
      resources: [],
    });
    setOpenModuleDialog(true);
  };

  // Open the edit module dialog
  const handleEditModule = (module) => {
    setIsEditingModule(true);
    setModuleFormData({
      title: module.title,
      description: module.description,
      order: module.order || 0,
      videoResource: module.videoResource || "",
      documentationUrl: module.documentationUrl || "",
      resources: module.resources || [],
    });
    setSelectedModule(module);
    setOpenModuleDialog(true);
  };

  // Close the module dialog
  const handleCloseModuleDialog = () => {
    setOpenModuleDialog(false);
    setPreviewMode(false); // Reset preview mode when closing
    setModuleDialogMode("form"); // Reset dialog mode
  };

  const reportBulkUploadError = (error) => {
    const data = error.response?.data || {};
    const nestedErrors = data.validationErrors || data.errors || [];
    const rawErrors =
      data.code === "BULK_VALIDATION_FAILED" &&
      (data.file || data.questionIndex || data.issues)
        ? [data]
        : nestedErrors;
    const formatIssue = (issue) => {
      if (typeof issue === "string") return issue;
      if (issue?.path && issue?.message) {
        return `${issue.path}: ${issue.message}`;
      }
      return issue?.message || issue?.reason || JSON.stringify(issue);
    };
    const formatEntry = (entry, inheritedFile) => {
      if (typeof entry === "string") return [entry];
      if (!entry || typeof entry !== "object") return [String(entry)];

      const file =
        entry.file || entry.fileName || entry.source || entry.name || inheritedFile;
      if (Array.isArray(entry.questions)) {
        return entry.questions.flatMap((question) =>
          formatEntry(question, file)
        );
      }

      const questionNumber =
        entry.questionIndex ??
        entry.questionNumber ??
        entry.question ??
        (Number.isInteger(entry.index) ? entry.index + 1 : null);
      const issues = entry.issues || entry.errors || entry.issue || entry.reason || entry.error;
      const issueText = Array.isArray(issues)
        ? issues.map(formatIssue).join(", ")
        : issues
        ? formatIssue(issues)
        : "Validation failed";
      return [
        [
          file && `File: ${file}`,
          questionNumber != null && `Question: ${questionNumber}`,
          entry.title && `Title: ${entry.title}`,
          `Issues: ${issueText}`,
        ]
          .filter(Boolean)
          .join(" | "),
      ];
    };

    const details = Array.isArray(rawErrors)
      ? rawErrors.flatMap((entry) => formatEntry(entry)).join("\n")
      : "";
    toast.error(
      [data.message || error.message || "Failed to upload questions", details]
        .filter(Boolean)
        .join("\n"),
      { style: { whiteSpace: "pre-line" } }
    );
  };

  // Handle an atomic bulk question upload for either upload dialog.
  const handleBulkQuestionUpload = async (
    payload,
    targetModuleId,
    dialogSource = "module"
  ) => {
    const files = payload?.files;
    const totalCount = Array.isArray(files)
      ? files.reduce(
          (total, file) =>
            total + (Array.isArray(file.questions) ? file.questions.length : 0),
          0
        )
      : 0;

    if (!targetModuleId || !Array.isArray(files) || totalCount === 0) {
      toast.error("No valid bulk upload batch or target module was provided");
      return;
    }

    setBulkUploading(true);
    try {
      const endpoint = `${apiUrl}/cohorts/${id}/modules/${targetModuleId}/questions/bulk`;
      const requestConfig = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      const previewResponse = await axios.post(
        `${endpoint}?preview=true`,
        payload,
        requestConfig
      );

      const userConfirmed = await new Promise((resolve) => {
        setWarningDialog({
          open: true,
          action: "bulk_create_questions",
          affectedCohorts: previewResponse.data.affectedCohorts,
          details: {
            questionCount: totalCount,
            moduleName: previewResponse.data.module?.title || "Module",
          },
          loading: false,
          onConfirm: async () => {
            setWarningDialog((prev) => ({ ...prev, loading: true }));
            try {
              const response = await axios.post(endpoint, payload, requestConfig);
              const created = response.data.created;
              const failed = response.data.failed || 0;
              if (
                response.data.success === false ||
                failed > 0 ||
                (Number.isFinite(created) && created !== totalCount)
              ) {
                const atomicError = new Error(
                  "Atomic bulk upload did not create the complete batch"
                );
                atomicError.response = { data: response.data };
                throw atomicError;
              }

              setWarningDialog({
                open: false,
                action: null,
                affectedCohorts: [],
                details: {},
                onConfirm: null,
                onCancel: null,
                loading: false,
              });
              toast.success(
                `${totalCount} question(s) uploaded successfully across ${
                  response.data.affectedCohorts?.length || 0
                } cohort(s)`
              );
              resolve(true);
            } catch (error) {
              setWarningDialog({
                open: false,
                action: null,
                affectedCohorts: [],
                details: {},
                onConfirm: null,
                onCancel: null,
                loading: false,
              });
              reportBulkUploadError(error);
              resolve(false);
            }
          },
          onCancel: () => resolve(false),
        });
      });

      if (!userConfirmed) {
        setWarningDialog({
          open: false,
          action: null,
          affectedCohorts: [],
          details: {},
          onConfirm: null,
          onCancel: null,
          loading: false,
        });
        return;
      }

      await fetchCohortDetails();
      setQuestionsVersion((version) => version + 1);
      if (dialogSource === "question") handleCloseQuestionDialog();
      else handleCloseModuleDialog();
    } catch (error) {
      console.error("Error in bulk question upload:", error);
      reportBulkUploadError(error);
    } finally {
      setBulkUploading(false);
    }
  };

  // Save a module
  const handleSaveModule = async (moduleData) => {
    setLoading(true);
    try {
      let response;
      let endpoint;

      if (isEditingModule) {
        // Update an existing module
        endpoint = `${apiUrl}/cohorts/${id}/modules/${selectedModule._id}`;

        // First, get preview data to show warning
        const previewResponse = await axios.put(
          `${endpoint}?preview=true`,
          moduleData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        // Show warning dialog and wait for confirmation
        const userConfirmed = await new Promise((resolve) => {
          setWarningDialog({
            open: true,
            action: "edit_module",
            affectedCohorts: previewResponse.data.affectedCohorts,
            details: { moduleName: moduleData.title },
            loading: false,
            onConfirm: async () => {
              setWarningDialog((prev) => ({ ...prev, loading: true }));
              try {
                // Proceed with actual update
                response = await axios.put(endpoint, moduleData, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                });
                setWarningDialog({
                  open: false,
                  action: null,
                  affectedCohorts: [],
                  details: {},
                  onConfirm: null,
                  onCancel: null,
                  loading: false,
                });
                resolve(true);
              } catch (err) {
                setWarningDialog({
                  open: false,
                  action: null,
                  affectedCohorts: [],
                  details: {},
                  onConfirm: null,
                  onCancel: null,
                  loading: false,
                });
                toast.error(
                  err.response?.data?.message || "Failed to update module"
                );
                resolve(false);
              }
            },
            onCancel: () => {
              resolve(false);
            },
          });
        });

        // If user cancelled, stop here
        if (!userConfirmed) {
          setWarningDialog({
            open: false,
            action: null,
            affectedCohorts: [],
            details: {},
            onConfirm: null,
            onCancel: null,
            loading: false,
          });
          setLoading(false);
          return;
        }

        toast.success(
          `Module updated across ${
            response.data.affectedCohorts?.length || 0
          } cohort(s)`
        );
      } else {
        // Create a new module
        endpoint = `${apiUrl}/cohorts/${id}/modules`;

        // First, get preview data to show warning
        const previewResponse = await axios.post(
          `${endpoint}?preview=true`,
          moduleData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        // Show warning dialog and wait for confirmation
        const userConfirmed = await new Promise((resolve) => {
          setWarningDialog({
            open: true,
            action: "create_module",
            affectedCohorts: previewResponse.data.affectedCohorts,
            details: { moduleName: moduleData.title },
            loading: false,
            onConfirm: async () => {
              setWarningDialog((prev) => ({ ...prev, loading: true }));
              try {
                // Proceed with actual creation
                response = await axios.post(endpoint, moduleData, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                });
                setWarningDialog({
                  open: false,
                  action: null,
                  affectedCohorts: [],
                  details: {},
                  onConfirm: null,
                  onCancel: null,
                  loading: false,
                });
                resolve(true);
              } catch (err) {
                setWarningDialog({
                  open: false,
                  action: null,
                  affectedCohorts: [],
                  details: {},
                  onConfirm: null,
                  onCancel: null,
                  loading: false,
                });
                toast.error(
                  err.response?.data?.message || "Failed to create module"
                );
                resolve(false);
              }
            },
            onCancel: () => {
              resolve(false);
            },
          });
        });

        // If user cancelled, stop here
        if (!userConfirmed) {
          setWarningDialog({
            open: false,
            action: null,
            affectedCohorts: [],
            details: {},
            onConfirm: null,
            onCancel: null,
            loading: false,
          });
          setLoading(false);
          return;
        }

        toast.success(
          `Module created and added to ${
            response.data.affectedCohorts?.length || 0
          } cohort(s)`
        );
      }

      // Refresh the cohort details to get updated modules from the API
      await fetchCohortDetails();

      // Close the dialog
      handleCloseModuleDialog();
    } catch (error) {
      console.error("Error saving module:", error);
      toast.error(error.response?.data?.message || "Failed to save module");
    } finally {
      setLoading(false);
    }
  };

  // Delete a module
  const handleDeleteModule = async (moduleId) => {
    setLoading(true);
    try {
      const endpoint = `${apiUrl}/cohorts/${id}/modules/${moduleId}`;

      // First, get preview data to show warning
      const previewResponse = await axios.delete(`${endpoint}?preview=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Show warning dialog and wait for confirmation
      const userConfirmed = await new Promise((resolve) => {
        setWarningDialog({
          open: true,
          action: "delete_module",
          affectedCohorts: previewResponse.data.affectedCohorts,
          details: {
            moduleName: previewResponse.data.module.title,
            questionCount: previewResponse.data.module.questionCount,
          },
          loading: false,
          onConfirm: async () => {
            setWarningDialog((prev) => ({ ...prev, loading: true }));
            try {
              // Proceed with actual deletion
              await axios.delete(endpoint, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              });
              setWarningDialog({
                open: false,
                action: null,
                affectedCohorts: [],
                details: {},
                onConfirm: null,
                onCancel: null,
                loading: false,
              });
              resolve(true);
            } catch (err) {
              setWarningDialog({
                open: false,
                action: null,
                affectedCohorts: [],
                details: {},
                onConfirm: null,
                onCancel: null,
                loading: false,
              });
              toast.error(
                err.response?.data?.message || "Failed to delete module"
              );
              resolve(false);
            }
          },
          onCancel: () => {
            resolve(false);
          },
        });
      });

      // If user cancelled, stop here
      if (!userConfirmed) {
        setWarningDialog({
          open: false,
          action: null,
          affectedCohorts: [],
          details: {},
          onConfirm: null,
          onCancel: null,
          loading: false,
        });
        setLoading(false);
        return;
      }

      toast.success("Module deleted successfully from all related cohorts");

      // Refresh the cohort details (which also updates modules)
      await fetchCohortDetails();
    } catch (error) {
      console.error("Error deleting module:", error);
      toast.error(error.response?.data?.message || "Failed to delete module");
    } finally {
      setLoading(false);
    }
  };

  // Open the create question dialog
  const handleOpenQuestionDialog = (module) => {
    setIsEditingQuestion(false);
    setQuestionFormData({
      title: "",
      description: "",
      type: "programming",
      difficultyLevel: "medium",
      marks: 10,
      options: [],
      languages: [
        {
          name: "java",
          version: "15.0.2",
          boilerplateCode:
            "public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}",
          solutionCode: "",
        },
      ],
      defaultLanguage: "java",
      testCases: [],
      examples: [],
      constraints: {
        timeLimit: 1000,
        memoryLimit: 256,
      },
      hints: [],
      tags: [],
      companies: [],
    });
    setSelectedModule(module);
    setOpenQuestionDialog(true);
  };

  // Open the edit question dialog
  const handleEditQuestion = async (module, question) => {
    setLoading(true);
    try {
      // Fetch complete question data directly from backend instead of using potentially incomplete data
      const endpoint = `${apiUrl}/cohorts/${id}/modules/${module._id}/questions/${question._id}/edit`;
      const response = await axios.get(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const completeQuestionData = response.data;

      setIsEditingQuestion(true);
      // Use the complete question data for the form
      setQuestionFormData({
        title: completeQuestionData.title || "",
        description: completeQuestionData.description || "",
        type: completeQuestionData.type || "programming",
        difficultyLevel: completeQuestionData.difficultyLevel || "medium",
        marks: completeQuestionData.marks || 10,
        options: completeQuestionData.options || [],
        languages: completeQuestionData.languages || [
          {
            name: "java",
            version: "15.0.2",
            boilerplateCode:
              "public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}",
            solutionCode: "",
          },
        ],
        defaultLanguage: completeQuestionData.defaultLanguage || "java",
        testCases: completeQuestionData.testCases || [],
        examples: completeQuestionData.examples || [],
        constraints: completeQuestionData.constraints
          ? {
              timeLimit: completeQuestionData.constraints.timeLimit || 1000,
              memoryLimit: completeQuestionData.constraints.memoryLimit || 256,
            }
          : {
              timeLimit: 1000,
              memoryLimit: 256,
            },
        hints: completeQuestionData.hints || [],
        tags: completeQuestionData.tags || [],
        companies: completeQuestionData.companies || [],
        editorial: completeQuestionData.editorial || "",
        encryptedEditor: completeQuestionData.encryptedEditor ?? false,
        encryptionSettings: {
          allowPlainTextPaste:
            completeQuestionData.encryptionSettings?.allowPlainTextPaste ??
            false,
        },
        fillInTheBlank: completeQuestionData.fillInTheBlank ?? false,
      });

      setSelectedModule(module);
      setSelectedQuestion(completeQuestionData);
      setOpenQuestionDialog(true);
    } catch (error) {
      console.error("Error fetching complete question data:", error);
      toast.error("Error loading question data. Please try again.");

      // Fallback to using the existing data if fetch fails
      setIsEditingQuestion(true);
      setQuestionFormData({
        title: question.title || "",
        description: question.description || "",
        type: question.type || "programming",
        difficultyLevel: question.difficultyLevel || "medium",
        marks: question.marks || 10,
        options: question.options || [],
        languages: question.languages || [
          {
            name: "java",
            version: "15.0.2",
            boilerplateCode:
              "public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}",
            solutionCode: "",
          },
        ],
        defaultLanguage: question.defaultLanguage || "java",
        testCases: question.testCases || [],
        examples: question.examples || [],
        constraints: question.constraints
          ? {
              timeLimit: question.constraints.timeLimit || 1000,
              memoryLimit: question.constraints.memoryLimit || 256,
            }
          : {
              timeLimit: 1000,
              memoryLimit: 256,
            },
        hints: question.hints || [],
        tags: question.tags || [],
        companies: question.companies || [],
        editorial: question.editorial || "",
        encryptedEditor: question.encryptedEditor ?? false,
        encryptionSettings: {
          allowPlainTextPaste:
            question.encryptionSettings?.allowPlainTextPaste ?? false,
        },
      });
      setSelectedModule(module);
      setSelectedQuestion(question);
      setOpenQuestionDialog(true);
    } finally {
      setLoading(false);
    }
  };

  // Close the question dialog
  const handleCloseQuestionDialog = () => {
    setOpenQuestionDialog(false);
    setQuestionFormData({});
    setIsEditingQuestion(false);
    setSelectedModule(null);
    setSelectedQuestion(null);
  };

  // Save a question
  const handleSaveQuestion = async (questionData) => {
    setLoading(true);
    try {
      let response;
      const payload = {
        ...questionData,
        module: selectedModule._id,
      };

      let endpoint;

      if (isEditingQuestion) {
        // Update an existing question
        endpoint = `${apiUrl}/cohorts/${id}/modules/${selectedModule._id}/questions/${selectedQuestion._id}`;

        // First, get preview data to show warning
        try {
          const previewResponse = await axios.put(
            `${endpoint}?preview=true`,
            payload,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          // Show warning dialog and wait for confirmation
          const userConfirmed = await new Promise((resolve) => {
            setWarningDialog({
              open: true,
              action: "edit_question",
              affectedCohorts: previewResponse.data.affectedCohorts,
              details: { questionTitle: questionData.title },
              loading: false,
              onConfirm: async () => {
                setWarningDialog((prev) => ({ ...prev, loading: true }));
                try {
                  // Proceed with actual update
                  response = await axios.put(endpoint, payload, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                  });
                  setWarningDialog({
                    open: false,
                    action: null,
                    affectedCohorts: [],
                    details: {},
                    onConfirm: null,
                    onCancel: null,
                    loading: false,
                  });
                  resolve(true);
                } catch (err) {
                  setWarningDialog({
                    open: false,
                    action: null,
                    affectedCohorts: [],
                    details: {},
                    onConfirm: null,
                    onCancel: null,
                    loading: false,
                  });
                  toast.error(
                    err.response?.data?.message || "Failed to update question"
                  );
                  resolve(false);
                }
              },
              onCancel: () => {
                resolve(false);
              },
            });
          });

          // If user cancelled, stop here
          if (!userConfirmed) {
            setWarningDialog({
              open: false,
              action: null,
              affectedCohorts: [],
              details: {},
              onConfirm: null,
              onCancel: null,
              loading: false,
            });
            setLoading(false);
            return;
          }

          toast.success(
            `Question updated across ${
              response.data.affectedCohorts?.length || 0
            } cohort(s)`
          );
        } catch (previewError) {
          console.error("Preview error:", previewError);
          throw previewError;
        }
      } else {
        // Create a new question
        endpoint = `${apiUrl}/cohorts/${id}/modules/${selectedModule._id}/questions`;

        // First, get preview data to show warning
        try {
          const previewResponse = await axios.post(
            `${endpoint}?preview=true`,
            payload,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          // Show warning dialog and wait for confirmation
          const userConfirmed = await new Promise((resolve) => {
            setWarningDialog({
              open: true,
              action: "create_question",
              affectedCohorts: previewResponse.data.affectedCohorts,
              details: { questionTitle: questionData.title },
              loading: false,
              onConfirm: async () => {
                setWarningDialog((prev) => ({ ...prev, loading: true }));
                try {
                  // Proceed with actual creation
                  response = await axios.post(endpoint, payload, {
                    headers: {
                      Authorization: `Bearer ${token}`,
                      "Content-Type": "application/json",
                    },
                  });
                  setWarningDialog({
                    open: false,
                    action: null,
                    affectedCohorts: [],
                    details: {},
                    onConfirm: null,
                    onCancel: null,
                    loading: false,
                  });
                  resolve(true);
                } catch (err) {
                  setWarningDialog({
                    open: false,
                    action: null,
                    affectedCohorts: [],
                    details: {},
                    onConfirm: null,
                    onCancel: null,
                    loading: false,
                  });
                  toast.error(
                    err.response?.data?.message || "Failed to create question"
                  );
                  resolve(false);
                }
              },
              onCancel: () => {
                resolve(false);
              },
            });
          });

          // If user cancelled, stop here
          if (!userConfirmed) {
            setWarningDialog({
              open: false,
              action: null,
              affectedCohorts: [],
              details: {},
              onConfirm: null,
              onCancel: null,
              loading: false,
            });
            setLoading(false);
            return;
          }

          toast.success(
            `Question created and added to ${
              response.data.affectedCohorts?.length || 0
            } cohort(s)`
          );
        } catch (previewError) {
          console.error("Preview error:", previewError);
          throw previewError;
        }
      }

      // Refresh the entire cohort details for complete update
      fetchCohortDetails();
      setQuestionsVersion((v) => v + 1);

      // Close the dialog
      handleCloseQuestionDialog();
    } catch (error) {
      console.error("Error saving question:", error);

      if (error.response?.data?.message) {
        toast.error(`Failed to save question: ${error.response.data.message}`);
      } else {
        toast.error("Failed to save question. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Navigate back to the cohorts list
  const handleBack = () => {
    navigate(isAdmin ? "/admin" : "/cohorts");
  };

  // Publish or unpublish a cohort
  const handleToggleDraftStatus = async () => {
    setLoading(true);
    try {
      await axios.put(
        `${apiUrl}/cohorts/${id}`,
        {
          isDraft: !cohort.isDraft,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success(
        cohort.isDraft
          ? "Cohort published successfully"
          : "Cohort unpublished successfully"
      );

      // Refresh the cohort details
      fetchCohortDetails();
    } catch (error) {
      console.error("Error updating cohort:", error);
      toast.error("Failed to update cohort");
    } finally {
      setLoading(false);
    }
  };

  // Modify where currentModule is defined in CohortDetail.jsx (right before return statement)
  // Make sure currentModule is correctly set based on currentModuleId and is never null
  // when modules are available
  const currentModule = currentModuleId
    ? modules.find((m) => m._id === currentModuleId)
    : modules.length > 0
    ? modules[0]
    : null;

  // Delete a question
  const handleDeleteQuestion = async (module, question) => {
    setLoading(true);
    try {
      const endpoint = `${apiUrl}/cohorts/${id}/modules/${module._id}/questions/${question._id}`;

      // First, get preview data to show warning
      const previewResponse = await axios.delete(`${endpoint}?preview=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Show warning dialog and wait for confirmation
      const confirmed = await new Promise((resolve) => {
        setWarningDialog({
          open: true,
          action: "delete_question",
          affectedCohorts: previewResponse.data.affectedCohorts,
          details: {
            questionTitle: question.title,
            questionCount: 1,
          },
          loading: false,
          onConfirm: async () => {
            setWarningDialog((prev) => ({ ...prev, loading: true }));
            try {
              // Proceed with actual deletion
              const response = await axios.delete(endpoint, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              });

              setWarningDialog({
                open: false,
                action: null,
                affectedCohorts: [],
                details: {},
                onConfirm: null,
                onCancel: null,
                loading: false,
              });

              toast.success(
                `Question deleted from ${
                  response.data.affectedCohorts?.length || 0
                } cohort(s)`
              );

              // Refresh the entire cohort details for complete update
              fetchCohortDetails();
              setQuestionsVersion((v) => v + 1);

              resolve(true);
            } catch (err) {
              setWarningDialog({
                open: false,
                action: null,
                affectedCohorts: [],
                details: {},
                onConfirm: null,
                onCancel: null,
                loading: false,
              });
              console.error("Error deleting question:", err);
              toast.error(
                err.response?.data?.message || "Failed to delete question"
              );
              resolve(false);
            }
          },
          onCancel: () => {
            resolve(false);
          },
        });
      });

      // If user cancelled in dialog, just close
      if (!confirmed) {
        setWarningDialog({
          open: false,
          action: null,
          affectedCohorts: [],
          details: {},
          onConfirm: null,
          onCancel: null,
          loading: false,
        });
      }
    } catch (error) {
      console.error("Error fetching delete preview:", error);
      toast.error(error.response?.data?.message || "Failed to delete question");
    } finally {
      setLoading(false);
    }
  };

  // Add handler for feedback button click
  const handleFeedbackClick = () => {
    setShowFeedback(!showFeedback);
    setShowProgress(false);
    setShowStats(false);
    // Removed setCurrentModuleId(null) to preserve module selection
  };

  return (
    <Box
      sx={{
        bgcolor: "transparent",
        height: "calc(100vh - 64px)", // Account for navbar height (64px)
        color: "white",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        maxHeight: "calc(100vh - 64px)",
      }}
    >
      {loading && !cohort ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <CircularProgress />
        </Box>
      ) : cohort ? (
        <Box
          sx={{
            height: "100%",
            backgroundColor:
              theme.palette.mode === "dark"
                ? "black !important"
                : "transparent !important",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flex: 1,
          }}
        >
          {/* Use Flexbox for simpler layout */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: { xs: 1, md: 2 },
              overflow: "hidden",
              p: { xs: 1, md: 2 },
              height: "100%",
              flex: 1,
            }}
          >
            {/* Left panel - Cohort info and module list */}
            <Box
              sx={{
                flexBasis: { xs: "100%", md: "380px" },
                flexShrink: 0,
                overflow: "hidden",
                backgroundColor: "transparent",
                height: "100%",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CohortDetailLeft
                cohort={cohort}
                modules={modules}
                userProgress={cohort.userProgress}
                handleModuleClick={handleModuleClick}
                currentModuleId={currentModuleId}
                onProgressClick={handleProgressClick}
                showProgress={showProgress}
                isAdmin={isAdmin}
                onStatsClick={isAdmin ? handleStatsClick : undefined}
                showStats={showStats}
                handleEditModule={canEdit ? handleEditModule : undefined}
                handleDeleteModule={canEdit ? handleDeleteModule : undefined}
                handleOpenModuleDialog={
                  canEdit ? handleOpenModuleDialog : undefined
                }
                handleBack={handleBack}
                handleToggleDraftStatus={handleToggleDraftStatus}
                onFeedbackClick={handleFeedbackClick}
                showFeedback={showFeedback}
              />
            </Box>

            {/* Right panel - Various content based on selection */}
            <Box
              sx={{
                flex: 1,
                overflow: "hidden",
                backgroundColor: "transparent",
                height: "100%",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {showProgress ? (
                <Box
                  sx={{
                    height: "100%",
                    width: "100%",
                    bgcolor:
                      theme.palette.mode === "dark" ? "#000000" : "#FFFFFF",
                    color:
                      theme.palette.mode === "dark" ? "#FFFFFF" : "#0F0F0F",
                    borderRadius: { xs: 0, md: "10px" },
                    boxShadow:
                      theme.palette.mode === "dark"
                        ? "0 4px 15px rgba(0,0,0,0.15)"
                        : "0 4px 12px rgba(15, 15, 15, 0.06)",
                    border:
                      theme.palette.mode === "light"
                        ? "1px solid rgba(15, 15, 15, 0.08)"
                        : "none",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "auto",
                  }}
                >
                  <CohortProgress
                    cohort={cohort}
                    userProgress={cohort.userProgress}
                    isAdmin={isAdmin}
                    populatedModules={modules}
                  />
                </Box>
              ) : showStats && isAdmin ? (
                <Box
                  sx={{
                    height: "100%",
                    width: "100%",
                    bgcolor:
                      theme.palette.mode === "dark" ? "#000000" : "#FFFFFF",
                    color:
                      theme.palette.mode === "dark" ? "#FFFFFF" : "#0F0F0F",
                    borderRadius: { xs: 0, md: "10px" },
                    boxShadow:
                      theme.palette.mode === "dark"
                        ? "0 4px 15px rgba(0,0,0,0.15)"
                        : "0 4px 12px rgba(15, 15, 15, 0.06)",
                    border:
                      theme.palette.mode === "light"
                        ? "1px solid rgba(15, 15, 15, 0.08)"
                        : "none",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "auto",
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{ mb: 3, fontWeight: 600, p: 2 }}
                  >
                    Cohort Statistics
                  </Typography>
                  <CohortStats cohortId={id} token={token} />
                </Box>
              ) : currentModule ? (
                <CohortDetailRight
                  module={currentModule}
                  userProgress={cohort.userProgress}
                  handleSolveQuestion={handleSolveQuestion}
                  isAdmin={isAdmin}
                  handleEditQuestion={canEdit ? handleEditQuestion : undefined}
                  handleOpenQuestionDialog={
                    canEdit ? handleOpenQuestionDialog : undefined
                  }
                  handleDeleteQuestion={
                    canEdit ? handleDeleteQuestion : undefined
                  }
                  showFeedback={showFeedback}
                  cohortId={cohort._id}
                  questionsVersion={questionsVersion}
                />
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                    borderRadius: "10px",
                    backgroundColor:
                      theme.palette.mode === "dark" ? "#0E1117" : "#ffffff",
                    boxShadow:
                      theme.palette.mode === "light"
                        ? "0 4px 12px rgba(15, 15, 15, 0.06)"
                        : "none",
                    border:
                      theme.palette.mode === "light"
                        ? "1px solid rgba(15, 15, 15, 0.08)"
                        : "none",
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      color:
                        theme.palette.mode === "dark"
                          ? "rgba(255,255,255,0.7)"
                          : "rgba(15,15,15,0.7)",
                    }}
                  >
                    {isAdmin
                      ? "Select a module or add a new one to get started"
                      : "Select a module to view its questions"}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      ) : (
        <Alert severity="error">
          Cohort not found or you don't have permission to view it.
        </Alert>
      )}

      {/* Module dialog */}
      {isAdmin && (
        <Dialog
          open={openModuleDialog}
          onClose={handleCloseModuleDialog}
          maxWidth={moduleDialogMode === "bulk" ? "lg" : "md"}
          fullWidth
        >
          <DialogTitle
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 6 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {isEditingModule ? "Edit Module" : moduleDialogMode === "bulk" ? "Bulk Upload Questions" : "Create Module"}
            </Box>
            {!isEditingModule && (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant={moduleDialogMode === "form" ? "contained" : "outlined"}
                  onClick={() => setModuleDialogMode("form")}
                  sx={{ textTransform: "none", minWidth: 110 }}
                >
                  Create Module
                </Button>
                <Button
                  size="small"
                  variant={moduleDialogMode === "bulk" ? "contained" : "outlined"}
                  onClick={() => setModuleDialogMode("bulk")}
                  sx={{ textTransform: "none", minWidth: 145 }}
                  startIcon={<CloudUploadIcon />}
                >
                  Upload as JSON
                </Button>
              </Box>
            )}
            <IconButton
              aria-label="close"
              onClick={handleCloseModuleDialog}
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
            {moduleDialogMode === "bulk" && !isEditingModule ? (
              <Box>
                {/* Module selector for bulk upload */}
                {modules.length === 0 ? (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    No modules exist yet. Please create a module first using the
                    "Create Module" tab, then come back to bulk upload questions.
                  </Alert>
                ) : (
                  <>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Select Target Module
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Choose which module should receive the bulk uploaded questions.
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {modules.map((mod) => (
                          <Button
                            key={mod._id}
                            variant={
                              currentModuleId === mod._id
                                ? "contained"
                                : "outlined"
                            }
                            size="small"
                            onClick={() => setCurrentModuleId(mod._id)}
                            sx={{ textTransform: "none" }}
                          >
                            {mod.title}
                          </Button>
                        ))}
                      </Box>
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    {currentModuleId ? (
                      <BulkQuestionUpload
                        onUpload={(payload) =>
                          handleBulkQuestionUpload(payload, currentModuleId)
                        }
                        onCancel={handleCloseModuleDialog}
                        loading={bulkUploading}
                      />
                    ) : (
                      <Alert severity="info">
                        Please select a module above to upload questions to.
                      </Alert>
                    )}
                  </>
                )}
              </Box>
            ) : (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Title"
                  name="title"
                  value={moduleFormData.title}
                  onChange={(e) =>
                    setModuleFormData({
                      ...moduleFormData,
                      title: e.target.value,
                    })
                  }
                  fullWidth
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Description"
                  name="description"
                  value={moduleFormData.description}
                  onChange={(e) =>
                    setModuleFormData({
                      ...moduleFormData,
                      description: e.target.value,
                    })
                  }
                  multiline
                  rows={4}
                  fullWidth
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Order"
                  name="order"
                  type="number"
                  value={moduleFormData.order}
                  onChange={(e) =>
                    setModuleFormData({
                      ...moduleFormData,
                      order: parseInt(e.target.value),
                    })
                  }
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Video Resource URL"
                  name="videoResource"
                  value={moduleFormData.videoResource}
                  onChange={(e) =>
                    setModuleFormData({
                      ...moduleFormData,
                      videoResource: e.target.value,
                    })
                  }
                  fullWidth
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Documentation/Notes (HTML)
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Provide detailed documentation or notes in HTML format. This
                  will be displayed to students.
                </Typography>

                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                  <Button
                    variant={!previewMode ? "contained" : "outlined"}
                    startIcon={<CodeIcon />}
                    onClick={() => setPreviewMode(false)}
                    size="small"
                  >
                    Edit HTML
                  </Button>
                  <Button
                    variant={previewMode ? "contained" : "outlined"}
                    startIcon={<PreviewIcon />}
                    onClick={() => setPreviewMode(true)}
                    size="small"
                    disabled={!moduleFormData.documentationUrl}
                  >
                    Preview
                  </Button>
                </Box>

                {!previewMode ? (
                  <TextField
                    fullWidth
                    multiline
                    rows={12}
                    name="documentationUrl"
                    value={moduleFormData.documentationUrl}
                    onChange={(e) =>
                      setModuleFormData({
                        ...moduleFormData,
                        documentationUrl: e.target.value,
                      })
                    }
                    placeholder={`Enter HTML content for documentation. Example:

<h2>Module Overview</h2>
<p>This module covers <strong>fundamental concepts</strong>.</p>

<h3>Key Topics:</h3>
<ul>
  <li>Topic 1</li>
  <li>Topic 2</li>
  <li>Topic 3</li>
</ul>

<h3>Code Example:</h3>
<pre><code>function example() {
    console.log("Hello World");
}</code></pre>`}
                    sx={{
                      fontFamily:
                        '"Fira Code", "Consolas", "Monaco", monospace',
                      fontSize: "0.9rem",
                      "& textarea": {
                        fontFamily:
                          '"Fira Code", "Consolas", "Monaco", monospace',
                      },
                    }}
                  />
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 3,
                      minHeight: "400px",
                      maxHeight: "600px",
                      overflow: "auto",
                      bgcolor: "background.paper",
                    }}
                  >
                    <Box
                      className="documentation-preview"
                      sx={{
                        "& h1, & h2, & h3, & h4": {
                          marginTop: 2,
                          marginBottom: 1,
                          fontWeight: 600,
                        },
                        "& p": {
                          marginBottom: 1,
                          lineHeight: 1.6,
                        },
                        "& pre": {
                          backgroundColor: "rgba(0,0,0,0.05)",
                          padding: 2,
                          borderRadius: 1,
                          overflow: "auto",
                          fontSize: "0.9rem",
                        },
                        "& code": {
                          fontFamily:
                            '"Fira Code", "Consolas", "Monaco", monospace',
                          backgroundColor: "rgba(0,0,0,0.05)",
                          padding: "2px 6px",
                          borderRadius: "3px",
                        },
                        "& pre code": {
                          backgroundColor: "transparent",
                          padding: 0,
                        },
                        "& ul, & ol": {
                          paddingLeft: 3,
                          marginBottom: 1,
                        },
                        "& table": {
                          borderCollapse: "collapse",
                          width: "100%",
                          marginBottom: 2,
                        },
                        "& th, & td": {
                          border: "1px solid",
                          borderColor: "divider",
                          padding: 1,
                        },
                        "& th": {
                          backgroundColor: "action.hover",
                          fontWeight: 600,
                        },
                        "& img": {
                          maxWidth: "100%",
                          height: "auto",
                          marginBottom: 1,
                        },
                      }}
                      dangerouslySetInnerHTML={{
                        __html: moduleFormData.documentationUrl,
                      }}
                    />
                  </Paper>
                )}
              </Grid>
            </Grid>
            )}
          </DialogContent>

          {(moduleDialogMode === "form" || isEditingModule) && (
          <DialogActions>
            <Button onClick={handleCloseModuleDialog} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={() => handleSaveModule(moduleFormData)}
              color="primary"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={loading}
            >
              {loading
                ? "Saving..."
                : isEditingModule
                ? "Update Module"
                : "Create Module"}
            </Button>
          </DialogActions>
          )}
        </Dialog>
      )}

      {/* Question Form Dialog */}
      <Dialog
        open={openQuestionDialog}
        onClose={handleCloseQuestionDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {isEditingQuestion ? "Edit Question" : "Add Question"}
          <IconButton
            aria-label="close"
            onClick={handleCloseQuestionDialog}
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
        <DialogContent>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <QuestionForm
              key={`question-form-${selectedQuestion?._id || "new"}`}
              initialData={questionFormData}
              onSave={handleSaveQuestion}
              onCancel={handleCloseQuestionDialog}
              moduleId={selectedModule?._id}
              isEdit={isEditingQuestion}
              onBulkUpload={(payload) =>
                handleBulkQuestionUpload(
                  payload,
                  selectedModule?._id,
                  "question"
                )
              }
              bulkUploading={bulkUploading}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Shared Content Warning Dialog */}
      <SharedContentWarningDialog
        open={warningDialog.open}
        onClose={() =>
          setWarningDialog({
            open: false,
            action: null,
            affectedCohorts: [],
            details: {},
            onConfirm: null,
            onCancel: null,
            loading: false,
          })
        }
        onConfirm={warningDialog.onConfirm}
        onCancel={warningDialog.onCancel}
        action={warningDialog.action}
        affectedCohorts={warningDialog.affectedCohorts}
        details={warningDialog.details}
        loading={warningDialog.loading}
      />
    </Box>
  );
};

export default CohortDetail;
