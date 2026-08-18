import React, { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Grid,
  Paper,
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
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { toast } from "react-toastify";
import axios from "../../utils/axiosConfig";
import { apiUrl } from "../../config/apiConfig";
import parseRollNumberCsv from "../../utils/parseRollNumberCsv";

/** One headline number in the result strip. */
const StatTile = ({ label, value, color }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        textAlign: "center",
        borderColor: color ? `${color}66` : undefined,
        bgcolor: color
          ? isDark
            ? `${color}1A`
            : `${color}0D`
          : "transparent",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 800, color: color || "inherit" }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Paper>
  );
};

/**
 * CSV roll-number import for the Manage Users dialog.
 *
 * Parses the file in the browser, asks the server to resolve the roll numbers
 * against real accounts, then reports who can be added, who is already eligible
 * and how many roll numbers have no account at all. Adding is a separate,
 * explicit step, so an admin can review the mismatches first.
 */
const RollNumberCsvImport = ({ cohortId, onUsersAdded, currentEligibleIds = [] }) => {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [result, setResult] = useState(null);
  const [showMissing, setShowMissing] = useState(false);
  const [showFound, setShowFound] = useState(false);

  const resetResult = () => {
    setResult(null);
    setShowMissing(false);
    setShowFound(false);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-uploading the same file
    if (!file) return;

    setFileName(file.name);
    resetResult();
    setParsing(true);

    try {
      const text = await file.text();
      const parsed = parseRollNumberCsv(text);

      if (parsed.rollNumbers.length === 0) {
        toast.error("No roll numbers found in that file");
        return;
      }

      const { data } = await axios.post(
        `${apiUrl}/cohorts/${cohortId}/eligible-users/resolve-rolls`,
        { rollNumbers: parsed.rollNumbers }
      );

      setResult({ ...data, parsed });

      if (data.summary.usersNotFound > 0) {
        toast.warn(
          `${data.summary.usersFound} student(s) found, ${data.summary.usersNotFound} roll number(s) have no account`
        );
      } else {
        toast.success(`All ${data.summary.usersFound} student(s) found`);
      }
    } catch (error) {
      console.error("Roll number import failed:", error);
      toast.error(
        error.response?.data?.message || "Could not read that file"
      );
    } finally {
      setParsing(false);
    }
  };

  /** Adds every resolved-but-not-yet-eligible user to the cohort. */
  const handleAddAll = async () => {
    const toAdd = (result?.matchedUsers || []).filter((u) => !u.alreadyEligible);
    if (toAdd.length === 0) return;

    setAdding(true);
    try {
      // The eligibility endpoint replaces the whole list, so the additions are
      // merged onto the current one rather than sent on their own.
      const merged = [
        ...new Set([...currentEligibleIds, ...toAdd.map((u) => u._id)]),
      ];

      await axios.put(`${apiUrl}/cohorts/${cohortId}/eligible-users`, {
        userIds: merged,
      });

      toast.success(`Added ${toAdd.length} student(s) to the cohort`);
      resetResult();
      setFileName("");
      onUsersAdded?.();
    } catch (error) {
      console.error("Failed to add users from CSV:", error);
      toast.error(
        error.response?.data?.message || "Failed to add the students"
      );
    } finally {
      setAdding(false);
    }
  };

  const copyMissing = async () => {
    try {
      await navigator.clipboard.writeText(
        (result?.notFoundRollNumbers || []).join("\n")
      );
      toast.success("Missing roll numbers copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const summary = result?.summary;
  const foundUsers = result?.matchedUsers || [];
  const missing = result?.notFoundRollNumbers || [];

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Import students from CSV
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload a .csv with one roll number per line. Matching ignores case, and
            a header row is skipped automatically.
          </Typography>
        </Box>

        <input
          type="file"
          accept=".csv,.txt"
          ref={fileInputRef}
          onChange={handleFile}
          style={{ display: "none" }}
        />

        <Button
          variant="contained"
          startIcon={parsing ? <CircularProgress size={18} /> : <UploadFileIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={parsing}
        >
          {parsing ? "Checking…" : "Upload CSV"}
        </Button>
      </Box>

      {fileName && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          File: {fileName}
          {result?.parsed?.skippedHeader ? " (header row skipped)" : ""}
        </Typography>
      )}

      {summary && (
        <>
          <Divider sx={{ my: 2 }} />

          <Grid container spacing={1.5}>
            <Grid item xs={6} sm={3}>
              <StatTile label="Roll numbers read" value={summary.uniqueProvided} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatTile
                label="Students found"
                value={summary.usersFound}
                color="#2e7d32"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatTile
                label="Not on platform"
                value={summary.usersNotFound}
                color="#c62828"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <StatTile
                label="Already in cohort"
                value={summary.alreadyEligible}
                color="#0288d1"
              />
            </Grid>
          </Grid>

          {(summary.duplicatesInFile > 0 || summary.blankRows > 0) && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              Ignored {summary.duplicatesInFile} duplicate
              {summary.duplicatesInFile === 1 ? "" : "s"} and {summary.blankRows} blank
              row{summary.blankRows === 1 ? "" : "s"}.
            </Typography>
          )}

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              alignItems: "center",
              mt: 2,
            }}
          >
            <Button
              variant="contained"
              color="success"
              startIcon={
                adding ? <CircularProgress size={18} /> : <PersonAddIcon />
              }
              onClick={handleAddAll}
              disabled={adding || summary.readyToAdd === 0}
            >
              {summary.readyToAdd === 0
                ? "Nothing new to add"
                : `Add ${summary.readyToAdd} student${
                    summary.readyToAdd === 1 ? "" : "s"
                  }`}
            </Button>

            {summary.usersFound > 0 && (
              <Button size="small" onClick={() => setShowFound((v) => !v)}>
                {showFound ? "Hide" : "Show"} matched students
              </Button>
            )}

            {missing.length > 0 && (
              <>
                <Button
                  size="small"
                  color="error"
                  onClick={() => setShowMissing((v) => !v)}
                >
                  {showMissing ? "Hide" : "Show"} {missing.length} missing
                </Button>
                <Tooltip title="Copy missing roll numbers">
                  <Button size="small" onClick={copyMissing} startIcon={<ContentCopyIcon />}>
                    Copy
                  </Button>
                </Tooltip>
              </>
            )}
          </Box>

          <Collapse in={showFound}>
            <TableContainer sx={{ mt: 2, maxHeight: 260 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Roll Number</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Dept</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {foundUsers.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell>{user.rollNumber}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.department || "—"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={user.alreadyEligible ? "Already in cohort" : "Will be added"}
                          color={user.alreadyEligible ? "info" : "success"}
                          variant={user.alreadyEligible ? "outlined" : "filled"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Collapse>

          <Collapse in={showMissing}>
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {missing.length} roll number{missing.length === 1 ? "" : "s"} have no
                account on the platform
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 0.75,
                  maxHeight: 160,
                  overflow: "auto",
                }}
              >
                {missing.map((roll) => (
                  <Chip key={roll} label={roll} size="small" variant="outlined" />
                ))}
              </Box>
            </Alert>
          </Collapse>
        </>
      )}
    </Paper>
  );
};

export default RollNumberCsvImport;
