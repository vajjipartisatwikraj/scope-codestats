import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { Button, Page } from "../../ui";
import { SpeechPageHero } from "../shared";
import { adminApi, apiErrorMessage } from "../../../services/speechTestApi";
import useRemote from "../../../hooks/useRemote";
import FeedbackSummaryPanel from "./FeedbackSummaryPanel";
import "./speechLeaderboard.css";

const messageOf = (error) => apiErrorMessage(error, "Could not load the test");

/**
 * What students said about a test (route `/admin/communication-tests/:id/feedback`, teachers and
 * admins): how many answered, the average rating and its spread, the rating of each part and the
 * written suggestions. It used to sit above the results; it is a page of its own, opened from the
 * three-dot menu of the test's card.
 */
const SpeechTestFeedbackSummaryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data } = useRemote(() => adminApi.get(id), [id], true, messageOf);
  const title = data?.test?.title;

  return (
    <Page>
      <SpeechPageHero
        title="Student feedback"
        description={title ? `${title}. Ratings and suggestions sent after the test.` : "Ratings and suggestions sent after the test."}
        size="headline"
        actions={
          <Button variant="spotlight" size="sm" startIcon={<ArrowLeftIcon size={18} aria-hidden="true" />} onClick={() => navigate("/admin/communication-tests")}>
            Communication tests
          </Button>
        }
      />
      <div className="sxl-stack">
        <FeedbackSummaryPanel testId={id} />
      </div>
    </Page>
  );
};

export default SpeechTestFeedbackSummaryPage;
