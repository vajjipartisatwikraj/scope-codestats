import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { getDashboardPath, isPendingTeacher } from "../utils/userHelpers";
import { apiErrorMessage, teacherRequestApi } from "../services/teacherRequestApi";

const POLL_MS = 20000;

const formatDate = (value) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

/**
 * Where someone who signed in from the teacher sign-in page waits for teacher access.
 * Students never get here (PrivateRoute only shows it to pending teachers).
 *
 * Asks for access, shows the state of the request, and moves on by itself once an admin
 * approves: the same JWT keeps working, only the stored role changes.
 */
const TeacherAccess = () => {
  const { user, logout, refreshUserData } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState(null); // { eligibleToRequest, request }
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const leaving = useRef(false);

  // The context creates a new refreshUserData on every render; keep the latest one in a
  // ref so the loading and polling effects below do not restart because of it.
  const refreshRef = useRef(refreshUserData);
  refreshRef.current = refreshUserData;

  /** Approved: reload the user (now a teacher) and open the teacher dashboard. */
  const moveOn = useCallback(async () => {
    if (leaving.current) return;
    leaving.current = true;
    const fresh = await refreshRef.current();
    if (isPendingTeacher(fresh)) {
      // The user record could not be reloaded; try again on the next check.
      leaving.current = false;
      return;
    }
    toast.success("Your teacher access was approved");
    navigate(getDashboardPath(fresh), { replace: true });
  }, [navigate]);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      try {
        const data = await teacherRequestApi.mine();
        setStatus(data);
        if (data.request?.status === "approved") await moveOn();
        else if (!data.eligibleToRequest) {
          // No longer a pending teacher (for example already staff): the user record is stale
          const fresh = await refreshRef.current();
          if (!isPendingTeacher(fresh)) navigate(getDashboardPath(fresh), { replace: true });
        }
      } catch (error) {
        if (!quiet) toast.error(apiErrorMessage(error, "Could not load your request"));
      } finally {
        setLoading(false);
      }
    },
    [moveOn, navigate]
  );

  useEffect(() => {
    load();
  }, [load]);

  // While waiting, check again regularly and when the tab regains focus.
  const request = status?.request;
  const isPending = request?.status === "pending";
  useEffect(() => {
    if (!isPending) return undefined;
    const timer = setInterval(() => load({ quiet: true }), POLL_MS);
    const onFocus = () => load({ quiet: true });
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [isPending, load]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await teacherRequestApi.submit(note);
      toast.success("Request sent to the admins");
      setNote("");
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not send your request"));
      await load({ quiet: true });
    } finally {
      setSubmitting(false);
    }
  };

  const retryAt = request?.status === "rejected" ? new Date(request.canRequestAgainAt) : null;
  const mustWait = retryAt && retryAt > new Date();
  const canAsk = !loading && status?.eligibleToRequest && (!request || (request.status === "rejected" && !mustWait));

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#0585E0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Paper elevation={0} sx={{ width: "100%", maxWidth: 520, p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          {isPending ? (
            <HourglassTopIcon color="primary" sx={{ fontSize: 34 }} />
          ) : (
            <SchoolOutlinedIcon color="primary" sx={{ fontSize: 34 }} />
          )}
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {isPending ? "Waiting for approval" : "Request teacher access"}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Signed in as <b>{user?.email}</b>
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : isPending ? (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Your request was sent on {formatDate(request.createdAt)}. An admin will review it. You
              get teacher access as soon as it is approved, and this page updates by itself.
            </Alert>
            {request.note && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                <b>Your note:</b> {request.note}
              </Typography>
            )}
            <Button variant="outlined" onClick={() => load()} sx={{ textTransform: "none", mr: 1 }}>
              Check status
            </Button>
          </>
        ) : (
          <>
            {request?.status === "rejected" && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Your last request was declined on {formatDate(request.reviewedAt)}
                {request.rejectionReason ? `: ${request.rejectionReason}` : "."}
                {mustWait ? ` You can ask again after ${formatDate(retryAt)}.` : ""}
              </Alert>
            )}
            {canAsk && (
              <>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  An admin reviews every request. Add your department and designation so they can
                  recognise you.
                </Typography>
                <TextField
                  label="Department / designation (optional)"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  inputProps={{ maxLength: 500 }}
                  multiline
                  minRows={2}
                  fullWidth
                  disabled={submitting}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={submit}
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
                  sx={{ textTransform: "none", mr: 1 }}
                >
                  Request teacher access
                </Button>
              </>
            )}
          </>
        )}

        <Button onClick={logout} color="inherit" sx={{ textTransform: "none", mt: loading ? 0 : 1 }}>
          Sign out
        </Button>
      </Paper>
    </Box>
  );
};

export default TeacherAccess;
