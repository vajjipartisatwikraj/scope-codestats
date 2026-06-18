import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Alert,
  Box,
  Chip,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";

const SharedContentWarningDialog = ({
  open,
  onClose,
  onConfirm,
  onCancel, // NEW: Called when user clicks Cancel
  action, // 'create_module', 'edit_module', 'delete_module', 'create_question', 'edit_question', 'delete_question'
  affectedCohorts,
  details, // Additional context (module title, question title, etc.)
  loading = false,
}) => {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    if (onClose) {
      onClose();
    }
  };
  const getActionInfo = () => {
    switch (action) {
      case "create_module":
        return {
          title: "Add Module to All Related Cohorts",
          description: `This module will be added to ALL ${
            affectedCohorts?.length || 0
          } related cohort(s)`,
          warning: "The module will be visible in all cohorts immediately.",
          color: "info",
          icon: <InfoIcon />,
        };
      case "edit_module":
        return {
          title: "Edit Module Across All Cohorts",
          description: `This will update the module in ALL ${
            affectedCohorts?.length || 0
          } related cohort(s)`,
          warning: "Changes will affect all cohorts immediately.",
          color: "warning",
          icon: <WarningIcon />,
        };
      case "delete_module":
        return {
          title: "Delete Module from All Cohorts",
          description: `This will permanently delete the module from ALL ${
            affectedCohorts?.length || 0
          } cohort(s)`,
          warning: `This will also delete ${
            details?.questionCount || 0
          } questions. This action cannot be undone!`,
          color: "error",
          icon: <ErrorIcon />,
        };
      case "create_question":
        return {
          title: "Add Question to All Related Cohorts",
          description: `This question will be added to ALL ${
            affectedCohorts?.length || 0
          } related cohort(s)`,
          warning: "The question will be visible in all cohorts immediately.",
          color: "info",
          icon: <InfoIcon />,
        };
      case "bulk_create_questions":
        return {
          title: "Bulk Upload Questions to All Related Cohorts",
          description: `${details?.questionCount || 0} question(s) will be added to module "${details?.moduleName || "Module"}" across ALL ${
            affectedCohorts?.length || 0
          } related cohort(s)`,
          warning: "All questions will be visible in all cohorts immediately.",
          color: "info",
          icon: <InfoIcon />,
        };
      case "edit_question":
        return {
          title: "Edit Question Across All Cohorts",
          description: `This will update the question in ALL ${
            affectedCohorts?.length || 0
          } related cohort(s)`,
          warning: "Changes will affect all cohorts immediately.",
          color: "warning",
          icon: <WarningIcon />,
        };
      case "delete_question":
        return {
          title: "Delete Question from All Cohorts",
          description: `This will permanently delete the question from ALL ${
            affectedCohorts?.length || 0
          } related cohort(s)`,
          warning:
            "Existing submissions will be preserved for historical records.",
          color: "error",
          icon: <ErrorIcon />,
        };
      default:
        return {
          title: "Shared Content Warning",
          description: "This action will affect multiple cohorts",
          warning: "Please review the affected cohorts below.",
          color: "warning",
          icon: <WarningIcon />,
        };
    }
  };

  const actionInfo = getActionInfo();

  if (!affectedCohorts || affectedCohorts.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          {actionInfo.icon}
          <Typography variant="h6" component="span">
            {actionInfo.title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" gutterBottom>
          {actionInfo.description}
        </Typography>

        <Alert severity={actionInfo.color} sx={{ mt: 2, mb: 2 }}>
          <Typography variant="body2">{actionInfo.warning}</Typography>
        </Alert>

        <Box sx={{ mt: 3, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography variant="subtitle2">Affected Cohorts:</Typography>
            <Chip
              label={`${affectedCohorts.length} cohort${
                affectedCohorts.length !== 1 ? "s" : ""
              }`}
              size="small"
              color={actionInfo.color}
            />
          </Box>

          <List
            dense
            sx={{
              maxHeight: 200,
              overflow: "auto",
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            {affectedCohorts.map((cohort, index) => (
              <ListItem key={cohort._id || index}>
                <ListItemText
                  primary={cohort.title}
                  secondary={`ID: ${cohort._id}`}
                  primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {details?.moduleName && (
          <Typography variant="caption" color="text.secondary">
            Module: <strong>{details.moduleName}</strong>
          </Typography>
        )}
        {details?.questionTitle && (
          <Typography variant="caption" color="text.secondary">
            Question: <strong>{details.questionTitle}</strong>
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel} color="inherit" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={actionInfo.color}
          disabled={loading}
        >
          {loading ? "Processing..." : "Proceed"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SharedContentWarningDialog;
