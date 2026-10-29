/**
 * DEPRECATED. The previous attached user groups dialog (Material UI). It is replaced by
 * ../userGroupManagement/AttachedUserGroupsDialog.jsx (a drawer on the shared kit, same props) and is kept
 * here only for reference. Nothing imports it. Delete it together with the rest of this folder.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import SyncIcon from "@mui/icons-material/Sync";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { Link as RouterLink } from "react-router-dom";
import { toast } from "react-toastify";
import StyledDialog from "../common/StyledDialog";
import { apiErrorMessage, userGroupApi } from "../../services/userGroupApi";

/** The students a 409 (clone conflict) names, grouped by the other cohort. */
const ConflictAlert = ({ conflict }) => (
  <Alert severity="error" sx={{ mb: 2 }}>
    <AlertTitle>{conflict.message}</AlertTitle>
    {conflict.conflictsByCohort?.map((entry) => (
      <Box key={entry.cohortId} sx={{ mt: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {entry.cohortTitle} ({entry.users.length})
        </Typography>
        <Typography variant="caption" component="div">
          {entry.users
            .slice(0, 8)
            .map((u) => u.rollNumber || u.userName)
            .join(", ")}
          {entry.users.length > 8 ? `, and ${entry.users.length - 8} more` : ""}
        </Typography>
      </Box>
    ))}
    {conflict.hint && (
      <Typography variant="caption" component="div" sx={{ mt: 1 }}>
        {conflict.hint}
      </Typography>
    )}
  </Alert>
);

/**
 * The user groups attached to one cohort or communication test. Their students are the
 * eligible students. Attaching adds the group's students; detaching removes the ones no
 * other attached group covers, so it shows who (and, for a cohort, what data would be
 * deleted) and asks first.
 *
 * @param {object} target       { _id, title } of the cohort or test
 * @param {object} api          { list, attach, detach, sync }, see services/userGroupApi.js
 * @param {string} entityLabel  "cohort" or "test", for the wording
 */
const AttachedUserGroupsDialog = ({
  open,
  target,
  api,
  entityLabel = "cohort",
  onClose,
  onChanged,
}) => {
  const isDark = useTheme().palette.mode === "dark";
  const targetId = target?._id;

  const [attached, setAttached] = useState([]);
  const [totalEligible, setTotalEligible] = useState(0);
  const [title, setTitle] = useState("");
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [detachPreview, setDetachPreview] = useState(null); // { group, preview }

  const load = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const [forCohort, all] = await Promise.all([
        api.list(targetId),
        userGroupApi.list(),
      ]);
      setAttached(forCohort.userGroups || []);
      setTotalEligible(forCohort.totalEligibleUsers || 0);
      setTitle(forCohort.title || "");
      setAllGroups(all.userGroups || []);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not load the user groups"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  useEffect(() => {
    if (open) {
      setConflict(null);
      setSelectedId("");
      setDetachPreview(null);
      load();
    }
  }, [open, load]);

  const available = useMemo(() => {
    const attachedIds = new Set(attached.map((g) => g._id));
    return allGroups.filter((g) => !attachedIds.has(g._id));
  }, [allGroups, attached]);

  /** Shared error handling: show clone conflicts in the dialog, everything else as a toast. */
  const fail = (error, fallback) => {
    if (error?.response?.status === 409 && error.response.data?.conflictsByCohort) {
      setConflict(error.response.data);
    } else {
      toast.error(apiErrorMessage(error, fallback));
    }
  };

  const changed = async () => {
    await load();
    onChanged?.();
  };

  const attach = async () => {
    setBusy(true);
    setConflict(null);
    try {
      const result = await api.attach(targetId, selectedId);
      toast.success(`${result.message}. ${result.usersAdded} student(s) added`);
      setSelectedId("");
      await changed();
    } catch (error) {
      fail(error, "Could not attach the user group");
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    setConflict(null);
    try {
      const result = await api.sync(targetId);
      toast.success(result.message);
      await changed();
    } catch (error) {
      fail(error, "Could not sync the user groups");
    } finally {
      setBusy(false);
    }
  };

  /** Detach step 1: ask the server what would be deleted. */
  const startDetach = async (group) => {
    setBusy(true);
    setConflict(null);
    try {
      const preview = await api.detach(targetId, group._id, { preview: true });
      if (preview.usersToRemove === 0) {
        await finishDetach(group);
      } else {
        setDetachPreview({ group, preview });
      }
    } catch (error) {
      fail(error, "Could not check what detaching would remove");
    } finally {
      setBusy(false);
    }
  };

  /** Detach step 2: do it. */
  const finishDetach = async (group) => {
    setBusy(true);
    try {
      const result = await api.detach(targetId, group._id);
      toast.success(
        result.usersRemoved > 0
          ? `"${group.name}" detached. ${result.usersRemoved} student(s) removed`
          : `"${group.name}" detached`
      );
      setDetachPreview(null);
      await changed();
    } catch (error) {
      fail(error, "Could not detach the user group");
    } finally {
      setBusy(false);
    }
  };

  // Only cohorts delete student data when a group is detached; tests keep the attempts.
  const totals = detachPreview?.preview.totalDataToDelete;

  return (
    <>
      <StyledDialog
        open={open}
        onClose={busy ? undefined : onClose}
        darkMode={isDark}
        icon={<GroupsIcon />}
        title="User groups"
        subtitle={
          target ? `${target.title || title} · ${totalEligible} eligible student(s)` : ""
        }
        maxWidth="sm"
        actions={
          <Button onClick={onClose} disabled={busy} sx={{ textTransform: "none" }}>
            Done
          </Button>
        }
      >
        {conflict && <ConflictAlert conflict={conflict} />}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {entityLabel === "test"
            ? "Students in the attached groups can see and take this test."
            : "Students in the attached groups can open and enroll in this cohort."}
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5, mb: 3, alignItems: "center" }}>
          <FormControl size="small" fullWidth disabled={busy || loading || available.length === 0}>
            <InputLabel>
              {available.length === 0 && !loading ? "No groups to attach" : "Attach a user group"}
            </InputLabel>
            <Select
              label={
                available.length === 0 && !loading ? "No groups to attach" : "Attach a user group"
              }
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {available.map((group) => (
                <MenuItem key={group._id} value={group._id}>
                  {group.name} ({group.memberCount})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <LinkIcon />}
            onClick={attach}
            disabled={!selectedId || busy}
            sx={{ textTransform: "none", whiteSpace: "nowrap" }}
          >
            Attach
          </Button>
        </Box>

        {allGroups.length === 0 && !loading && (
          <Alert severity="info" sx={{ mb: 2 }}>
            There are no user groups yet.{" "}
            <RouterLink to="/admin/user-groups" onClick={onClose}>
              Create one
            </RouterLink>
            .
          </Alert>
        )}

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Attached groups ({attached.length})
          </Typography>
          {attached.length > 0 && (
            <Tooltip title="Add students who joined the groups or registered since they were attached">
              <span>
                <Button
                  size="small"
                  startIcon={<SyncIcon />}
                  onClick={sync}
                  disabled={busy}
                  sx={{ textTransform: "none" }}
                >
                  Sync
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>

        {loading && attached.length === 0 ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={26} />
          </Box>
        ) : attached.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No user groups attached.
            {entityLabel === "cohort" ? " This cohort can be deleted." : ""}
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {attached.map((group) => (
              <Paper
                key={group._id}
                variant="outlined"
                sx={{ p: 1.25, display: "flex", alignItems: "center", gap: 1.5 }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {group.name}
                  </Typography>
                  {group.description && (
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {group.description}
                    </Typography>
                  )}
                </Box>
                <Chip size="small" label={`${group.memberCount} roll numbers`} />
                <Tooltip title={`Detach from this ${entityLabel}`}>
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => startDetach(group)}
                      disabled={busy}
                    >
                      <LinkOffIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Paper>
            ))}
          </Box>
        )}
      </StyledDialog>

      <StyledDialog
        open={Boolean(detachPreview)}
        onClose={busy ? undefined : () => setDetachPreview(null)}
        darkMode={isDark}
        icon={<WarningAmberIcon />}
        accent="#d32f2f"
        title="Detach user group"
        subtitle={detachPreview?.group.name}
        maxWidth="sm"
        actions={
          <>
            <Button
              onClick={() => setDetachPreview(null)}
              disabled={busy}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => finishDetach(detachPreview.group)}
              disabled={busy}
              sx={{ textTransform: "none" }}
            >
              {totals ? "Detach and delete their data" : "Detach"}
            </Button>
          </>
        }
      >
        {detachPreview && (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {detachPreview.preview.message} {detachPreview.preview.warning}
            </Alert>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
              <Chip label={`${detachPreview.preview.usersToRemove} students`} />
              {totals && (
                <>
                  <Chip label={`${totals.submissions} submissions`} />
                  <Chip label={`${totals.notes} notes`} />
                  <Chip label={`${totals.reports} reports`} />
                  <Chip label={`${totals.userProgress} progress records`} />
                </>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" component="div">
              Students: {" "}
              {detachPreview.preview.userDetails
                .slice(0, 12)
                .map((u) => u.rollNumber)
                .join(", ")}
              {detachPreview.preview.userDetails.length > 12
                ? `, and ${detachPreview.preview.userDetails.length - 12} more`
                : ""}
            </Typography>
          </>
        )}
      </StyledDialog>
    </>
  );
};

export default AttachedUserGroupsDialog;
