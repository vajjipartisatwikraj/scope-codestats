/**
 * DEPRECATED: User groups page (Material UI). Replaced by components/userGroupManagement/ and no longer imported by the app.
 * Kept for reference until the Material UI screens are gone; delete it with the deprecated folder.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import GroupsIcon from "@mui/icons-material/Groups";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { toast } from "react-toastify";
import StyledDialog from "../common/StyledDialog";
import CreateUserGroupDialog from "./deprecated_CreateUserGroupDialog";
import UserGroupDetailsDialog from "./deprecated_UserGroupDetailsDialog";
import { apiErrorMessage, userGroupApi } from "../../services/userGroupApi";

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "");

/**
 * User groups (admins and teachers): named lists of roll numbers, uploaded as a CSV.
 * Attach a group to a cohort or a communication test (their "User groups" buttons) to
 * make its students eligible for it.
 */
const UserGroups = () => {
  const isDark = useTheme().palette.mode === "dark";
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewingId, setViewingId] = useState(null);
  const [deleting, setDeleting] = useState(null); // group being deleted
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteBlockedBy, setDeleteBlockedBy] = useState([]); // cohorts and tests that still use it

  const load = useCallback(async () => {
    try {
      const data = await userGroupApi.list();
      setGroups(data.userGroups || []);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not load the user groups"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(term) || (g.description || "").toLowerCase().includes(term)
    );
  }, [groups, search]);

  const closeDelete = () => {
    if (deleteBusy) return;
    setDeleting(null);
    setDeleteBlockedBy([]);
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await userGroupApi.remove(deleting._id);
      toast.success(`User group "${deleting.name}" deleted`);
      setDeleting(null);
      setDeleteBlockedBy([]);
      await load();
    } catch (error) {
      const { cohorts = [], tests = [] } = error?.response?.data || {};
      const blockedBy = [
        ...cohorts.map((c) => ({ ...c, kind: "cohort" })),
        ...tests.map((t) => ({ ...t, kind: "communication test" })),
      ];
      if (error?.response?.status === 409 && blockedBy.length) {
        setDeleteBlockedBy(blockedBy);
      } else {
        toast.error(apiErrorMessage(error, "Could not delete the user group"));
      }
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
            <GroupsIcon /> User Groups
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload a list of roll numbers once, then attach it to any cohort or communication
            test to make those students eligible.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          sx={{ textTransform: "none" }}
        >
          Create user group
        </Button>
      </Box>

      <TextField
        size="small"
        placeholder="Search user groups"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ mb: 2, width: { xs: "100%", sm: 320 } }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Roll numbers</TableCell>
              <TableCell align="right">Cohorts</TableCell>
              <TableCell align="right">Tests</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5, color: "text.secondary" }}>
                  {groups.length === 0
                    ? "No user groups yet. Create one to get started."
                    : "No user groups match your search."}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((group) => (
                <TableRow key={group._id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{group.name}</TableCell>
                  <TableCell sx={{ color: "text.secondary", maxWidth: 320 }}>
                    {group.description || "—"}
                  </TableCell>
                  <TableCell align="right">{group.memberCount}</TableCell>
                  <TableCell align="right">{group.cohortCount}</TableCell>
                  <TableCell align="right">{group.testCount}</TableCell>
                  <TableCell>{formatDate(group.createdAt)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View and add roll numbers">
                      <IconButton onClick={() => setViewingId(group._id)} size="small">
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => setDeleting(group)} size="small" color="error">
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <CreateUserGroupDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />

      <UserGroupDetailsDialog
        open={Boolean(viewingId)}
        groupId={viewingId}
        onClose={() => setViewingId(null)}
        onChanged={load}
      />

      <StyledDialog
        open={Boolean(deleting)}
        onClose={closeDelete}
        darkMode={isDark}
        icon={<DeleteOutlineIcon />}
        accent="#d32f2f"
        title="Delete user group"
        subtitle={deleting?.name}
        maxWidth="xs"
        actions={
          <>
            <Button onClick={closeDelete} disabled={deleteBusy} sx={{ textTransform: "none" }}>
              {deleteBlockedBy.length > 0 ? "Close" : "Cancel"}
            </Button>
            {deleteBlockedBy.length === 0 && (
              <Button
                color="error"
                variant="contained"
                onClick={confirmDelete}
                disabled={deleteBusy}
                sx={{ textTransform: "none" }}
              >
                Delete
              </Button>
            )}
          </>
        }
      >
        {deleteBlockedBy.length > 0 ? (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              This group is still attached to the items below. Detach it from each one first
              (the "User groups" button of the cohort or test), then delete it.
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 3 }}>
              {deleteBlockedBy.map((cohort) => (
                <li key={cohort._id}>
                  {cohort.title} ({cohort.kind})
                </li>
              ))}
            </Box>
          </Box>
        ) : (
          <Typography variant="body2">
            Delete "{deleting?.name}"? The roll number list is removed. Students keep their accounts.
          </Typography>
        )}
      </StyledDialog>
    </Container>
  );
};

export default UserGroups;
