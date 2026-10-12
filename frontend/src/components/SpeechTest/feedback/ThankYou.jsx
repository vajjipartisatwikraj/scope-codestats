import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import useSurface from "../setup/useSurface";
import Reveal from "../setup/Reveal";
import SetupButton from "../setup/SetupButton";
import AnimatedCheck from "./AnimatedCheck";

const AUTO_CLOSE_MS = 2600;

/** Shown in place of the form once feedback is sent. Leaves on its own after a moment. */
const ThankYou = ({ onDone }) => {
  const { muted } = useSurface();

  useEffect(() => {
    const timer = setTimeout(onDone, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <Box
      sx={{
        p: { xs: 3, md: 3.5 },
        minHeight: 320,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 0.5,
      }}
    >
      <AnimatedCheck size={56} />
      <Reveal y={8} delay={0.3}>
        <Typography component="h2" sx={{ mt: 2, fontWeight: 700, fontSize: "1.3rem" }}>
          Thank you
        </Typography>
        <Typography sx={{ color: muted, fontSize: "0.9rem", mt: 0.5 }}>
          Your feedback has been sent. It helps us improve the test.
        </Typography>
        <SetupButton onClick={onDone} sx={{ mt: 3, fontWeight: 700, px: 3 }}>
          Back to the test
        </SetupButton>
      </Reveal>
    </Box>
  );
};

export default ThankYou;
