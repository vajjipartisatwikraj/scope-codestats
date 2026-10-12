import React from "react";
import { Alert, Box, Typography } from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import RoundButton from "./RoundButton";
import SetupButton from "./SetupButton";
import useSpeakerCheck, { SPEAKER_PHRASE } from "./useSpeakerCheck";
import useSurface from "./useSurface";

/**
 * Step 2 of the pre-test flow: the student plays a short sentence and confirms
 * they can hear it. Like the audio check, it is plain content on the page.
 */
const SpeakerCheckStep = ({ onBack, onContinue }) => {
  const { muted } = useSurface();
  const { supported, playing, played, heard, error, canContinue, play, confirm } = useSpeakerCheck();

  const caption = playing ? "Playing…" : played ? "Tap to play again" : "Tap to play";

  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        maxWidth: 620,
        width: "100%",
        mx: "auto",
        px: { xs: 2, md: 4 },
        py: { xs: 4, md: 5 },
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      <Typography component="h2" sx={{ fontWeight: 700, fontSize: "1.7rem" }}>
        Test your speaker
      </Typography>
      <Typography sx={{ color: muted, mt: 0.75, fontSize: "1rem" }}>
        Play the sound and raise your volume until you can hear it clearly.
      </Typography>

      {supported ? (
        <>
          <Box sx={{ mt: 5 }}>
            <RoundButton
              icon={PlayArrowRoundedIcon}
              activeIcon={VolumeUpRoundedIcon}
              active={playing}
              disabled={playing}
              label="Play test sound"
              onClick={play}
            />
            <Typography sx={{ color: muted, mt: 2, fontSize: "0.95rem" }} role="status">
              {caption}
            </Typography>
            <Typography sx={{ color: muted, mt: 0.5, fontSize: "0.9rem" }}>
              You should hear: “{SPEAKER_PHRASE}”
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2.5, textAlign: "left" }}>
              {error}
            </Alert>
          )}

          {played && !playing && (
            <Box sx={{ mt: 4 }}>
              <Typography sx={{ fontWeight: 600, mb: 1.5 }}>Could you hear it clearly?</Typography>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, flexWrap: "wrap" }}>
                <SetupButton onClick={() => confirm(true)} sx={heard === true ? { bgcolor: "#2e7d32", "&:hover": { bgcolor: "#27692b" } } : undefined}>
                  {heard === true ? "Heard it" : "Yes, I heard it"}
                </SetupButton>
                <SetupButton variant="secondary" onClick={() => confirm(false)}>
                  No, I could not
                </SetupButton>
              </Box>
            </Box>
          )}

          {heard === false && (
            <Alert severity="warning" sx={{ mt: 2.5, textAlign: "left" }}>
              Turn up your device volume, make sure it is not muted and that the right speakers or headphones are
              selected, then play the sound again.
            </Alert>
          )}
        </>
      ) : (
        <Alert severity="warning" sx={{ mt: 4, textAlign: "left" }}>
          This browser cannot play the test sound. Please make sure your volume is up, or switch to a recent version of
          Chrome or Edge. You can continue.
        </Alert>
      )}

      {/* Navigation */}
      <Box sx={{ mt: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
        <SetupButton variant="secondary" onClick={onBack}>
          Back
        </SetupButton>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {!canContinue && (
            <Typography variant="body2" sx={{ color: muted, display: { xs: "none", sm: "block" } }}>
              Play the sound and confirm to continue
            </Typography>
          )}
          <SetupButton onClick={onContinue} disabled={!canContinue}>
            Continue
          </SetupButton>
        </Box>
      </Box>
    </Box>
  );
};

export default SpeakerCheckStep;
