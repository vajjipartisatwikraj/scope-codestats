import React, { useMemo, useState } from "react";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { HandshakeIcon } from "@phosphor-icons/react/dist/csr/Handshake";
import { useParams } from "react-router-dom";
import { AdminTop, Button, Card, EmptyState, Notice, Page, SelectField, Skeleton, StatGrid, StatTile, pluralize } from "../../ui";
import { useAuth } from "../../../contexts/AuthContext";
import useAutoHideScrollbars from "../../../hooks/useAutoHideScrollbars";
import useRemote from "../../../hooks/useRemote";
import { adminApi, apiErrorMessage } from "../../../services/speechTestApi";
import { SpeechTestLeaderboard } from "../leaderboard";
import useExportResults from "../leaderboard/useExportResults";
import StudentsDialog from "./StudentsDialog";
import { finishedEntries, listsOf } from "./progressModel";
import "../leaderboard/speechLeaderboard.css";
import "./progress.css";

const LIST_PATH = "/admin/communication-tests";
const messageOf = (error) => apiErrorMessage(error, "Could not load the progress");

const optionsOf = (first, items) => [{ value: "all", label: first }, ...(items || []).map((item) => ({ value: String(item._id), label: item.name }))];

/**
 * Progress of a communication test (route `/admin/communication-tests/:id/progress`, teachers and
 * admins), opened by the Progress button of the test's card.
 *
 *   the top      path "/ Communication tests / Test name", the mentorship dropdown (All, CRT, E-Cell ...)
 *                and, for an admin, a mentor dropdown, then "Export to Excel"
 *   the tiles    not yet started, in progress, finished and the average score, each with how many
 *                students it covers; pressing one opens the list of those students in a dialog
 *   the ranking  the leaderboard of the finished students in view, ranked among themselves
 *
 * A teacher sees only the students they mentor (All means all of their mentorships). An admin sees
 * everybody on All, or one mentorship, or one mentor. The export covers the same students and, for
 * one mentorship, adds a sheet that compares its mentors with bar charts.
 */
const SpeechTestProgressPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const admin = user?.userType === "admin";
  // Scrollbars show only while something is being scrolled
  useAutoHideScrollbars();

  const [mentorship, setMentorship] = useState("all");
  const [mentor, setMentor] = useState("all");
  const [open, setOpen] = useState(null); // which tile's list is showing: "all", "notStarted", "inProgress" or "finished"

  const filters = useMemo(() => (admin ? { mentorship, mentor } : { mentorship }), [admin, mentorship, mentor]);
  const { data, loading, error, reload } = useRemote((signal) => adminApi.progress(id, filters, { signal }), [id, filters], true, messageOf);
  const { exporting, exportResults } = useExportResults(id, data?.test?.title, filters);

  const lists = useMemo(() => (data ? listsOf(data) : null), [data]);
  const board = useMemo(
    () => ({ loading: false, refreshing: loading, error: "", meta: data?.test || null, entries: finishedEntries(data?.entries), reload }),
    [data, loading, reload]
  );

  const chooseMentorship = (value) => {
    setMentorship(value);
    setMentor("all");
  };

  const stats = data?.stats;
  const notAMentor = data && !admin && data.filters.mentorships.length === 0;

  let body;
  if (loading && !data) {
    body = (
      <div className="sxp-loading" role="status" aria-busy="true" aria-label="Loading the progress">
        <div className="ui-stats">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} height={120} radius="var(--ds-radius-xl)" />
          ))}
        </div>
        <Skeleton height={320} radius="var(--ds-radius-xl)" />
      </div>
    );
  } else if (!data) {
    body = (
      <Notice
        tone="danger"
        title="We could not load the progress"
        action={
          <Button variant="ghost" size="sm" onClick={reload}>
            Retry
          </Button>
        }
      >
        {error || "Try again in a moment."}
      </Notice>
    );
  } else if (notAMentor) {
    body = (
      <Card>
        <EmptyState icon={<HandshakeIcon size={28} aria-hidden="true" />} title="You are not a mentor yet" text="When an admin chooses you for a mentorship, the progress of your students appears here." />
      </Card>
    );
  } else {
    const total = pluralize(stats.total, "student");
    body = (
      <>
        <StatGrid label="Progress of the students">
          <StatTile label="Not yet started" value={stats.notStarted} context={`of ${total}`} onClick={() => setOpen("notStarted")} />
          <StatTile label="In progress" value={stats.inProgress} context={`of ${total}`} onClick={() => setOpen("inProgress")} />
          <StatTile label="Finished" value={stats.finished} context={`of ${total}`} onClick={() => setOpen("finished")} />
          <StatTile
            label="Average score"
            tone="spotlight"
            value={stats.averageScore === null ? "\u2014" : stats.averageScore}
            context={stats.topScore === null ? "Scores appear as students finish" : `Top score ${stats.topScore}`}
            onClick={() => setOpen("all")}
          />
        </StatGrid>

        <SpeechTestLeaderboard testId={id} isAdmin={false} currentUserId={null} data={board} />
      </>
    );
  }

  return (
    <Page className="sxp">
      <AdminTop
        crumbs={[{ label: "Communication tests", to: LIST_PATH }, { label: data?.test?.title || "Test" }]}
        title="Progress"
        count={stats ? pluralize(stats.total, "student") : undefined}
        description="How the students you mentor are doing in this test."
        actions={
          <Button variant="primary" loading={exporting} disabled={!data || notAMentor} startIcon={<DownloadSimpleIcon size={18} aria-hidden="true" />} onClick={exportResults}>
            {exporting ? "Preparing\u2026" : "Export to Excel"}
          </Button>
        }
        label="Choose whose progress to show"
        filters={
          <>
            <SelectField variant="pill" aria-label="Mentorship" value={mentorship} onChange={(event) => chooseMentorship(event.target.value)} options={optionsOf(admin ? "All mentorships" : "All my students", data?.filters.mentorships)} />
            {admin ? <SelectField variant="pill" aria-label="Mentor" value={mentor} onChange={(event) => setMentor(event.target.value)} options={optionsOf("All mentors", data?.filters.mentors)} /> : null}
          </>
        }
      />

      <div className="sxp-body">{body}</div>

      <StudentsDialog list={open && lists ? lists[open] : null} onClose={() => setOpen(null)} />
    </Page>
  );
};

export default SpeechTestProgressPage;
