import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { TrophyIcon } from "@phosphor-icons/react/dist/csr/Trophy";
import { Button, Page, StatGrid, StatTile } from "../../ui";
import { Reveal, SpeechPageHero, formatClock, formatScore } from "../shared";
import { useAuth } from "../../../contexts/AuthContext";
import { isAdminOrTeacher } from "../../../utils/userHelpers";
import SpeechTestLeaderboard from "./SpeechTestLeaderboard";
import FeedbackSummaryPanel from "./FeedbackSummaryPanel";
import useSpeechLeaderboard from "./useSpeechLeaderboard";
import { summaryOf } from "./resultsModel";
import "./speechLeaderboard.css";

/** The figures above the results: three tiles, the first is the one spotlight tile. */
const SummaryTiles = ({ entries, staff, currentUserId }) => {
  const { started, finished, inProgress, average, top, mine } = summaryOf(entries, currentUserId);
  let tiles;

  if (staff) {
    tiles = [
      <StatTile key="finished" tone="spotlight" size="m" label="Finished" value={finished} context={`of ${started} student${started === 1 ? "" : "s"} who started`} />,
      <StatTile key="average" size="m" label="Average score" value={formatScore(average)} context={top !== null ? `Top score ${formatScore(top)}` : "No finished attempts yet"} />,
      <StatTile key="progress" size="m" label="In progress" value={inProgress} context="Still taking the test" />,
    ];
  } else if (mine && mine.status === "completed") {
    tiles = [
      <StatTile key="rank" tone="spotlight" size="m" label="Your rank" value={mine.rank} context={`of ${finished} student${finished === 1 ? "" : "s"} ranked`} />,
      <StatTile key="score" size="m" label="Your score" value={formatScore(mine.finalScore)} context={top !== null ? `Top score ${formatScore(top)}` : undefined} />,
      <StatTile key="time" size="m" label="Time in sections" value={mine.totalTimeUsedSeconds ? formatClock(mine.totalTimeUsedSeconds) : "\u2013"} context="Faster wins a tie" />,
    ];
  } else {
    tiles = [
      <StatTile key="ranked" tone="spotlight" size="m" label="Students ranked" value={finished} context="Higher scores rank first" />,
      <StatTile key="top" size="m" label="Top score" value={formatScore(top)} context="Ties go to the faster student" />,
    ];
  }

  return (
    <Reveal>
      <StatGrid label="Results at a glance" className="sxl-stats">
        {tiles}
      </StatGrid>
    </Reveal>
  );
};

/** Route wrapper: `/speech-tests/:id/leaderboard` and `/admin/communication-tests/:id/results`. */
const SpeechTestLeaderboardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const staff = Boolean(isAdminOrTeacher(user));
  const currentUserId = user?._id || user?.id || null;
  const data = useSpeechLeaderboard(id, staff);

  const base = staff
    ? "Every student's section scores and final score. Students still taking the test are marked in progress."
    : "Rankings of students who have finished this test. Higher scores rank first; ties go to the faster student.";

  return (
    <Page>
      <div className="sxl-back">
        <Button variant="ghost" size="sm" startIcon={<ArrowLeftIcon size={18} aria-hidden="true" />} onClick={() => navigate(staff ? "/admin/communication-tests" : "/speech-tests")}>
          {staff ? "Communication tests" : "Speech tests"}
        </Button>
      </div>

      <SpeechPageHero
        title={staff ? "Test results" : "Speech test leaderboard"}
        icon={TrophyIcon}
        description={data.meta?.title ? `${data.meta.title}. ${base}` : base}
        size={staff ? "headline" : "display"}
      />

      <div className="sxl-stack">
        {!data.loading && data.meta ? <SummaryTiles entries={data.entries} staff={staff} currentUserId={currentUserId} /> : null}

        {staff ? <FeedbackSummaryPanel testId={id} /> : null}

        <SpeechTestLeaderboard testId={id} isAdmin={staff} currentUserId={currentUserId} data={data} />
      </div>
    </Page>
  );
};

export default SpeechTestLeaderboardPage;
