import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { Button, Page } from "../../ui";
import { SpeechPageHero } from "../shared";
import { useAuth } from "../../../contexts/AuthContext";
import { isAdminOrTeacher } from "../../../utils/userHelpers";
import SpeechTestLeaderboard from "./SpeechTestLeaderboard";
import FeedbackSummaryPanel from "./FeedbackSummaryPanel";
import useSpeechLeaderboard from "./useSpeechLeaderboard";
import useExportResults from "./useExportResults";
import "./speechLeaderboard.css";

/** Route wrapper: `/speech-tests/:id/leaderboard` and `/admin/communication-tests/:id/results`. */
const SpeechTestLeaderboardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const staff = Boolean(isAdminOrTeacher(user));
  const currentUserId = user?._id || user?.id || null;
  const data = useSpeechLeaderboard(id, staff);
  const { exporting, exportResults } = useExportResults(id, data.meta?.title);

  const base = staff
    ? "Every student's section scores and final score. Students still taking the test are marked in progress."
    : "Rankings of students who have finished this test. Higher scores rank first; ties go to the faster student.";

  return (
    <Page>
      <SpeechPageHero
        title={staff ? "Test results" : "VocalQ leaderboard"}
        actions={
          <>
            <Button variant="spotlight" size="sm" startIcon={<ArrowLeftIcon size={18} aria-hidden="true" />} onClick={() => navigate(staff ? "/admin/communication-tests" : "/speech-tests")}>
              {staff ? "Communication tests" : "VocalQ"}
            </Button>
            {staff ? (
              <Button
                variant="primary"
                size="sm"
                loading={exporting}
                disabled={data.loading || !data.meta}
                startIcon={<DownloadSimpleIcon size={18} aria-hidden="true" />}
                onClick={exportResults}
              >
                {exporting ? "Preparing\u2026" : "Export to Excel"}
              </Button>
            ) : null}
          </>
        }
        description={data.meta?.title ? `${data.meta.title}. ${base}` : base}
        size="headline"
      />

      <div className="sxl-stack">
        {staff ? <FeedbackSummaryPanel testId={id} /> : null}

        <SpeechTestLeaderboard testId={id} isAdmin={staff} currentUserId={currentUserId} data={data} />
      </div>
    </Page>
  );
};

export default SpeechTestLeaderboardPage;
