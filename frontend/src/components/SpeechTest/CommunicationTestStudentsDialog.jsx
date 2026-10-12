import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputBase,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import SearchIcon from "@mui/icons-material/Search";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import { toast } from "react-toastify";
import StyledDialog from "../common/StyledDialog";
import RollNumberCsvImport from "../cohort/RollNumberCsvImport";
import { adminApi, apiErrorMessage } from "../../services/speechTestApi";

/**
 * Manage who may take a test. Adds students by roll number (CSV upload or
 * pasted list) using the same importer as cohort management, and removes them
 * one by one.
 */
const CommunicationTestStudentsDialog = ({ open, testId, onClose, onChanged }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [removingAll, setRemovingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.eligibleUsers(testId);
      setUsers(data.users || []);
      onChanged?.(data.totalCount ?? (data.users || []).length);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not load the student list"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const remove = async (ids) => {
    const removing = new Set(ids);
    const keep = users.filter((u) => !removing.has(u._id)).map((u) => u._id);
    try {
      await adminApi.saveEligibleUsers(testId, keep);
      toast.success(ids.length === 1 ? "Student removed" : "Students removed");
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not update the list"));
    }
  };

  const removeAll = async () => {
    setRemovingAll(true);
    await remove(users.map((u) => u._id));
    setRemovingAll(false);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(term) ||
        u.rollNumber?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
    );
  }, [users, search]);

  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      darkMode={isDark}
      icon={<GroupIcon />}
      title="Eligible students"
      subtitle="Only these students can see and take the test."
      maxWidth="md"
      actions={
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Done
        </Button>
      }
    >
      <RollNumberCsvImport
        resolveUrl={adminApi.resolveRollsUrl(testId)}
        saveUrl={adminApi.eligibleUsersUrl(testId)}
        entityLabel="test"
        allowPaste
        currentEligibleIds={users.map((u) => u._id)}
        onUsersAdded={load}
      />

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 1.5, flexWrap: "wrap" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Current list ({users.length})
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 0.25,
              borderRadius: "8px",
              border: `1px solid ${border}`,
            }}
          >
            <SearchIcon sx={{ fontSize: 18, opacity: 0.6 }} />
            <InputBase
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ fontSize: "0.875rem" }}
              inputProps={{ "aria-label": "Search eligible students" }}
            />
          </Box>
          <Button
            color="error"
            size="small"
            disabled={users.length === 0 || removingAll}
            onClick={removeAll}
            sx={{ textTransform: "none" }}
          >
            Remove all
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : users.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
          No students yet. Upload a CSV or paste roll numbers above.
        </Typography>
      ) : (
        <TableContainer sx={{ maxHeight: 340, border: `1px solid ${border}`, borderRadius: "10px" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Roll Number</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Dept</TableCell>
                <TableCell>Section</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user._id} hover>
                  <TableCell>{user.rollNumber}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.department || "—"}</TableCell>
                  <TableCell>{user.section || "—"}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Remove from test">
                      <IconButton size="small" onClick={() => remove([user._id])} aria-label={`Remove ${user.name}`}>
                        <PersonRemoveIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </StyledDialog>
  );
};

export default CommunicationTestStudentsDialog;
