import React from "react";
import { Box, Typography } from "@mui/material";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import useSurface from "../../setup/useSurface";
import Reveal from "../../setup/Reveal";
import { formatDateTime } from "../../speechTestMeta";

/** The latest written suggestions, newest first, scrolling inside a fixed height. */
const CommentList = ({ comments }) => {
  const { divider, muted } = useSurface();

  if (comments.length === 0) {
    return <Typography sx={{ color: muted, fontSize: "0.85rem" }}>No written suggestions yet.</Typography>;
  }

  return (
    <Box sx={{ maxHeight: 250, overflowY: "auto", pr: 1 }}>
      {comments.map((item, i) => (
        <Reveal
          key={item.id}
          y={6}
          duration={0.35}
          delay={Math.min(i, 8) * 0.04}
          sx={{ py: 1.25, borderTop: i ? `1px solid ${divider}` : "none" }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.4, flexWrap: "wrap" }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.82rem" }}>{item.name}</Typography>
            {item.rollNumber && (
              <Typography sx={{ color: muted, fontSize: "0.72rem" }}>{item.rollNumber}</Typography>
            )}
            <Box sx={{ display: "flex", alignItems: "center", color: "#f5b942", ml: "auto" }}>
              <StarRoundedIcon sx={{ fontSize: 15 }} />
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 700 }}>{item.rating}</Typography>
            </Box>
          </Box>
          <Typography sx={{ fontSize: "0.85rem", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {item.comment}
          </Typography>
          <Typography sx={{ color: muted, fontSize: "0.7rem", mt: 0.4 }}>{formatDateTime(item.createdAt)}</Typography>
        </Reveal>
      ))}
    </Box>
  );
};

export default CommentList;
