import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Container } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import { useAuth } from "../../contexts/AuthContext";
import { isAdminOrTeacher } from "../../utils/userHelpers";
import PageHero from "./PageHero";
import SpeechTestLeaderboard from "./SpeechTestLeaderboard";
import FeedbackSummaryPanel from "./feedback/admin/FeedbackSummaryPanel";

/** Route wrapper: `/speech-tests/:id/leaderboard` and `/admin/communication-tests/:id/results`. */
const SpeechTestLeaderboardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const staff = Boolean(isAdminOrTeacher(user));

  return (
    <Box sx={{ pb: 6 }}>
      <PageHero
        title={staff ? "Test Results" : "Speech Test Leaderboard"}
        icon={<LeaderboardIcon sx={{ fontSize: "1.7rem" }} />}
        description={
          staff
            ? "Every student's section scores and final score. Students still taking the test are marked in progress."
            : "Rankings of students who have finished this test. Higher scores rank first; ties go to the faster student."
        }
      />
      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 10 }, mt: 2 }}>
        <Box sx={{ maxWidth: 1400, mx: "auto" }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(staff ? "/admin/communication-tests" : "/speech-tests")}
            sx={{ textTransform: "none", mb: 2, color: "text.secondary" }}
          >
            {staff ? "Communication tests" : "Speech tests"}
          </Button>
          {staff && <FeedbackSummaryPanel testId={id} />}
          <SpeechTestLeaderboard testId={id} isAdmin={staff} currentUserId={user?._id || user?.id || null} />
        </Box>
      </Container>
    </Box>
  );
};

export default SpeechTestLeaderboardPage;
