/**
 * DEPRECATED: Teacher requests (Material UI). Replaced by components/teacherRequests/ and no longer imported by the app.
 * Kept for reference until the Material UI screens are gone; delete it with the deprecated folder.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import { toast } from "react-toastify";
import StyledDialog from "../common/StyledDialog";
import {
  apiErrorMessage,
  teacherRequestAdminApi,
  TEACHER_REQUESTS_CHANGED,
} from "../../services/teacherRequestApi";

const TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const formatDate = (value) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

/** The person a row is about: picture, name and email. */
const PersonCell = ({ user }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
    <Avatar src={user.profilePicture || undefined} sx={{ width: 36, height: 36 }}>
      {user.name?.[0]}
    </Avatar>
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {user.name}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {user.email}
      </Typography>
    </Box>
  </Box>
);

/** What happened to a request that is no longer pending. */
const DecisionCell = ({ request }) => (
  <>
    <Chip
      size="small"
      label={request.status}
      color={request.status === "approved" ? "success" : "error"}
      sx={{ textTransform: "capitalize", mb: 0.5 }}
    />
    <Typography variant="caption" color="text.secondary" component="div">
      {formatDate(request.reviewedAt)}
      {request.reviewedBy ? ` by ${request.reviewedBy.name}` : ""}
    </Typography>
    {request.rejectionReason && (
      <Typography variant="caption" color="text.secondary" component="div">
        {request.rejectionReason}
      </Typography>
    )}
  </>
);

/**
 * Teacher access requests (admins only). Approving turns the person into a teacher;
 * their existing login keeps working and picks up the new role on its own.
 */
const TeacherRequests = () => {
  const isDark = useTheme().palette.mode === "dark";
  const [tab, setTab] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(null); // { request, action: "approve" | "reject" }
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await teacherRequestAdminApi.list(tab);
      setRequests(data.requests || []);
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not load the requests"));
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const closeDialog = () => {
    if (busy) return;
    setDeciding(null);
    setReason("");
  };

  const confirm = async () => {
    const { request, action } = deciding;
    setBusy(true);
    try {
      if (action === "approve") {
        await teacherRequestAdminApi.approve(request._id);
        toast.success(`${request.user.name} now has teacher access`);
      } else {
        await teacherRequestAdminApi.reject(request._id, reason);
        toast.success("Request rejected");
      }
      setDeciding(null);
      setReason("");
      window.dispatchEvent(new Event(TEACHER_REQUESTS_CHANGED));
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not save the decision"));
      // Someone else may have decided already; show what is true now.
      if (error?.response?.status === 409 || error?.response?.status === 404) {
        setDeciding(null);
        setReason("");
        window.dispatchEvent(new Event(TEACHER_REQUESTS_CHANGED));
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const approving = deciding?.action === "approve";

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
          <SchoolOutlinedIcon /> Teacher Requests
        </Typography>
        <Typography variant="body2" color="text.secondary">
          People who signed in from the teacher page and asked for teacher access. Approve only
          people you recognise: teachers can see and manage student data.
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
        {TABS.map((item) => (
          <Tab key={item.value} value={item.value} label={item.label} sx={{ textTransform: "none" }} />
        ))}
      </Tabs>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Person</TableCell>
              <TableCell>Note</TableCell>
              <TableCell>Requested</TableCell>
              <TableCell>{tab === "pending" ? "Actions" : "Decision"}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 5, color: "text.secondary" }}>
                  {tab === "pending" ? "No requests are waiting." : `No ${tab} requests.`}
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request._id} hover>
                  <TableCell>
                    <PersonCell user={request.user} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280, color: "text.secondary" }}>{request.note || "—"}</TableCell>
                  <TableCell>{formatDate(request.createdAt)}</TableCell>
                  <TableCell>
                    {request.status === "pending" ? (
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CheckIcon />}
                          onClick={() => setDeciding({ request, action: "approve" })}
                          sx={{ textTransform: "none" }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          startIcon={<CloseIcon />}
                          onClick={() => setDeciding({ request, action: "reject" })}
                          sx={{ textTransform: "none" }}
                        >
                          Reject
                        </Button>
                      </Box>
                    ) : (
                      <DecisionCell request={request} />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <StyledDialog
        open={Boolean(deciding)}
        onClose={closeDialog}
        darkMode={isDark}
        icon={approving ? <CheckIcon /> : <CloseIcon />}
        accent={approving ? "#0088cc" : "#d32f2f"}
        title={approving ? "Give teacher access" : "Reject request"}
        subtitle={deciding?.request.user.email}
        maxWidth="xs"
        actions={
          <>
            <Button onClick={closeDialog} disabled={busy} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color={approving ? "primary" : "error"}
              onClick={confirm}
              disabled={busy}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
              sx={{ textTransform: "none" }}
            >
              {approving ? "Approve" : "Reject"}
            </Button>
          </>
        }
      >
        {approving ? (
          <Typography variant="body2">
            {deciding?.request.user.name} becomes a teacher: they can manage cohorts, tests and see
            student data. They get access automatically, with no new sign-in.
          </Typography>
        ) : (
          <TextField
            label="Reason (optional, the person sees it)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            inputProps={{ maxLength: 500 }}
            multiline
            minRows={2}
            fullWidth
            disabled={busy}
          />
        )}
      </StyledDialog>
    </Container>
  );
};

export default TeacherRequests;
