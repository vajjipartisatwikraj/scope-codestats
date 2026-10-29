/**
 * DEPRECATED: User group details dialog (Material UI). Replaced by components/userGroupManagement/GroupDetails.jsx and no longer imported by the app.
 * Kept for reference until the Material UI screens are gone; delete it with the deprecated folder.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import GroupIcon from "@mui/icons-material/Group";
import { toast } from "react-toastify";
import StyledDialog from "../common/StyledDialog";
import RollNumberInput from "./deprecated_RollNumberInput";
import { apiErrorMessage, userGroupApi } from "../../services/userGroupApi";

/**
 * One user group: rename it, see which roll numbers have an account, which do not, and
 * which cohorts use it, and add more roll numbers. Cohorts that use the group receive
 * the new students right away.
 */
const UserGroupDetailsDialog = ({ open, groupId, onClose, onChanged }) => {
  const isDark = useTheme().palette.mode === "dark";
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [newRolls, setNewRolls] = useState([]);
  const [inputKey, setInputKey] = useState(0);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const data = await userGroupApi.get(groupId);
      setDetails(data);
      setName(data.group.name);
      setDescription(data.group.description || "");
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not load the user group"));
      onClose();
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    if (open) {
      setDetails(null);
      load();
    }
  }, [open, load]);

  const infoChanged =
    details && (name.trim() !== details.group.name || description.trim() !== (details.group.description || ""));

  const saveInfo = async () => {
    setSavingInfo(true);
    try {
      await userGroupApi.update(groupId, { name, description });
      toast.success("User group updated");
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not update the user group"));
    } finally {
      setSavingInfo(false);
    }
  };

  const addRolls = async () => {
    setAdding(true);
    try {
      const result = await userGroupApi.addMembers(groupId, newRolls);
      if (result.added === 0) {
        toast.info("Those roll numbers are already in the group");
      } else {
        toast.success(`Added ${result.added} roll number(s)`);
      }
      [...result.cohorts, ...(result.tests || [])].forEach((cohort) => {
        if (cohort.status === "synced" && cohort.usersAdded > 0) {
          toast.success(`${cohort.title}: ${cohort.usersAdded} student(s) added`);
        } else if (cohort.status !== "synced") {
          toast.warn(`${cohort.title}: ${cohort.message}`, { autoClose: 9000 });
        }
      });
      setNewRolls([]);
      setInputKey((key) => key + 1);
      await load();
      onChanged?.();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not add the roll numbers"));
    } finally {
      setAdding(false);
    }
  };

  const members = details?.members || [];
  const unmatched = details?.unmatchedRollNumbers || [];
  const cohorts = details?.cohorts || [];
  const tests = details?.tests || [];

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      darkMode={isDark}
      icon={<GroupIcon />}
      title={details?.group.name || "User group"}
      subtitle={details ? `${details.group.memberCount} roll numbers` : "Loading…"}
      maxWidth="md"
      actions={
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Close
        </Button>
      }
    >
      {loading && !details ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : details ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}>
            <TextField
              label="Name"
              size="small"
              value={name}
              onChange={(event) => setName(event.target.value)}
              inputProps={{ maxLength: 100 }}
              sx={{ flex: "1 1 220px" }}
            />
            <TextField
              label="Description"
              size="small"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              inputProps={{ maxLength: 500 }}
              sx={{ flex: "2 1 300px" }}
            />
            <Button
              variant="outlined"
              onClick={saveInfo}
              disabled={!infoChanged || !name.trim() || savingInfo}
              sx={{ textTransform: "none", height: 40 }}
            >
              Save
            </Button>
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
              Attached to {cohorts.length} cohort(s) and {tests.length} test(s)
            </Typography>
            {cohorts.length === 0 && tests.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Not attached yet. Use the "User groups" button of a cohort or a communication test.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                {cohorts.map((cohort) => (
                  <Chip key={cohort._id} size="small" label={cohort.title} variant="outlined" />
                ))}
                {tests.map((test) => (
                  <Chip
                    key={test._id}
                    size="small"
                    label={`${test.title} (test)`}
                    variant="outlined"
                    color="secondary"
                  />
                ))}
              </Box>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Add roll numbers
            </Typography>
            <RollNumberInput key={inputKey} onChange={setNewRolls} disabled={adding} />
            <Button
              variant="contained"
              onClick={addRolls}
              disabled={newRolls.length === 0 || adding}
              startIcon={adding ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ textTransform: "none", mt: 1.5 }}
            >
              Add to group
            </Button>
            {cohorts.length + tests.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                Cohorts and tests that use this group give the new students access right away.
              </Typography>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Students with an account ({members.length})
            </Typography>
            {members.length === 0 ? (
              <Alert severity="warning">
                None of the roll numbers in this group has an account yet.
              </Alert>
            ) : (
              <TableContainer sx={{ maxHeight: 300, border: 1, borderColor: "divider", borderRadius: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Roll number</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Email</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member._id} hover>
                        <TableCell>{member.rollNumber}</TableCell>
                        <TableCell>{member.name}</TableCell>
                        <TableCell>{member.department}</TableCell>
                        <TableCell>{member.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          {unmatched.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
                No account yet ({unmatched.length})
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                These students get access once they register and the cohort or test is synced.
              </Typography>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", maxHeight: 120, overflowY: "auto" }}>
                {unmatched.map((roll) => (
                  <Chip key={roll} size="small" label={roll} color="warning" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      ) : null}
    </StyledDialog>
  );
};

export default UserGroupDetailsDialog;
