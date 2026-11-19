import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCapIcon } from "@phosphor-icons/react/dist/csr/GraduationCap";
import { HourglassMediumIcon } from "@phosphor-icons/react/dist/csr/HourglassMedium";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowsClockwise";
import { SignOutIcon } from "@phosphor-icons/react/dist/csr/SignOut";
import { toast } from "react-toastify";
import brand from "../brand";
import { useAuth } from "../contexts/AuthContext";
import { getDashboardPath, isPendingTeacher } from "../utils/userHelpers";
import { apiErrorMessage, teacherRequestApi } from "../services/teacherRequestApi";
import { Badge, Button, Notice, Skeleton, TextField, formatDateTime } from "./ui";
import "./teacherAccess.css";

const POLL_MS = 20000;

/**
 * Where someone who signed in from the teacher sign-in page waits for teacher access
 * (DESIGN.md and design/screens.md, section 4: two columns, the brand panel in accent on the left,
 * the card on the canvas on the right; below 900px the panel is a band).
 * Students never get here (PrivateRoute only shows it to pending teachers).
 *
 * Asks for access, shows the state of the request and what happens next, and moves on by itself once
 * an admin approves: the same JWT keeps working, only the stored role changes.
 */
const TeacherAccess = () => {
  const { user, logout, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null); // { eligibleToRequest, request }
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
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
    toast.success("Welcome aboard! Your teacher access is active.");
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
        if (!quiet) toast.error(apiErrorMessage(error, "We couldn't load your request. Please refresh the page."));
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

  const checkNow = async () => {
    setChecking(true);
    await load();
    setChecking(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await teacherRequestApi.submit(note);
      toast.success("Request sent. We'll email you once it has been reviewed.");
      setNote("");
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "We couldn't send your request. Please try again."));
      await load({ quiet: true });
    } finally {
      setSubmitting(false);
    }
  };

  const retryAt = request?.status === "rejected" ? new Date(request.canRequestAgainAt) : null;
  const mustWait = Boolean(retryAt && retryAt > new Date());
  const canAsk = !loading && status?.eligibleToRequest && (!request || (request.status === "rejected" && !mustWait));
  const declined = request?.status === "rejected";

  let badge = null;
  let title = "Request teacher access";
  let lead = "Share your department and designation, and we will confirm your details faster.";
  if (isPending) {
    badge = (
      <Badge tone="info" icon={<HourglassMediumIcon size={14} weight="bold" aria-hidden="true" />}>
        Under review
      </Badge>
    );
    title = "Request submitted";
    lead = "Thank you for applying. We are reviewing your details and will email you as soon as your access is ready.";
  } else if (declined) {
    badge = <Badge tone="warning">Not approved</Badge>;
    title = mustWait ? "We could not approve your request" : "Send a new request";
    lead = mustWait ? `You can send a new request after ${formatDateTime(retryAt)}.` : "Update your details below and we will take another look.";
  }

  return (
    <div className="ta">
      <aside className="ta__panel">
        <div className="ta__brand">
          <img className="ta__logo" src={brand.shared.authIcon} alt="" width="36" height="36" />
          <span className="ta__brand-name">{brand.platform.name}</span>
        </div>
        <div className="ta__pitch">
          <GraduationCapIcon size={40} weight="duotone" aria-hidden="true" className="ta__pitch-icon" />
          <h2 className="ta__pitch-title">Teach on {brand.platform.name}</h2>
          <p className="ta__pitch-text">Create cohorts, schedule tests and follow how every student is progressing.</p>
        </div>
      </aside>

      <main className="ta__main">
        <div className="ta__content">
          {loading ? (
            <div className="ta__loading" aria-busy="true" aria-label="Loading your request">
              <Skeleton width={120} height={24} radius={999} />
              <Skeleton width="80%" height={32} />
              <Skeleton width="100%" height={16} />
              <Skeleton width="100%" height={88} radius={14} />
            </div>
          ) : (
            <>
              {badge ? <div className="ta__badge">{badge}</div> : null}
              <h1 className="ta__title">{title}</h1>
              <p className="ta__lead">{lead}</p>

              {declined && request.rejectionReason ? (
                <Notice tone="warning" title={`Reviewed on ${formatDateTime(request.reviewedAt)}`} className="ta__notice">
                  {request.rejectionReason}
                </Notice>
              ) : null}

              {isPending ? (
                <>
                  <dl className="ta__facts">
                    <div>
                      <dt>Submitted</dt>
                      <dd>{formatDateTime(request.createdAt)}</dd>
                    </div>
                    {request.note ? (
                      <div>
                        <dt>Your details</dt>
                        <dd>{request.note}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <Button variant="secondary" fullWidth loading={checking} startIcon={<ArrowsClockwiseIcon size={18} weight="bold" aria-hidden="true" />} onClick={checkNow}>
                    Refresh status
                  </Button>
                </>
              ) : null}

              {canAsk ? (
                <form className="ta__form" onSubmit={submit}>
                  <TextField
                    label="Department and designation"
                    hint="Optional. For example, Assistant Professor, CSE."
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={500}
                    multiline
                    rows={3}
                    disabled={submitting}
                  />
                  <Button type="submit" variant="primary" fullWidth loading={submitting}>
                    Request access
                  </Button>
                </form>
              ) : null}
            </>
          )}

          <div className="ta__account">
            <p className="ta__account-text">
              Signed in as <strong>{user?.email}</strong>
            </p>
            <Button variant="ghost" size="sm" startIcon={<SignOutIcon size={18} weight="bold" aria-hidden="true" />} onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherAccess;
