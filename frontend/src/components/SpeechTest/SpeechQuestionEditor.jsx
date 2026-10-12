import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { toast } from "react-toastify";
import FillBlankFields from "./FillBlankFields";
import McqOptionsEditor from "./McqOptionsEditor";
import {
  ACCENTS,
  GENDERS,
  cancelSpeech,
  findVoice,
  isSpeechSupported,
  speak,
} from "../../utils/browserSpeech";

const PLACEHOLDERS = {
  READING: "A sentence the student reads aloud, e.g. The weather is beautiful today.",
  REPEAT: "The sentence the student will hear, e.g. I would like a glass of water.",
  JUMBLED: "The correct sentence. Students see its words scrambled, e.g. The cat sat on the mat.",
  QUESTION_ANSWER: "The question, e.g. What do you usually do on weekends?",
  STORYTELLING: "The topic, e.g. Tell a story about a memorable holiday.",
  FILL_BLANKS: "The sentence, with the gap marked by underscores, e.g. He ______ (watch) a film right now.",
  MCQ: "The question, e.g. Where will the meeting be held?",
  EMAIL_WRITING: "The situation, e.g. Write an email to your HR requesting two days of leave next week.",
};

const LABELS = {
  READING: "Sentence to read aloud",
  REPEAT: "Sentence to be spoken to the student",
  JUMBLED: "Correct sentence",
  QUESTION_ANSWER: "Question",
  STORYTELLING: "Story topic",
  FILL_BLANKS: "Sentence with a blank",
  MCQ: "Question",
  EMAIL_WRITING: "Email task",
};

/**
 * Editor for a single question. Which fields appear depends on the section type:
 *   REPEAT         sentence and accent. The student's browser speaks it; nothing is stored.
 *   JUMBLED        sentence and how the student answers (on screen or by speaking)
 *   FILL_BLANKS    sentence with a gap, the correct answer and other accepted answers
 *   MCQ            question and its 2 to 6 options, one or two of them correct
 *   others         just the text
 */
const SpeechQuestionEditor = ({ index, type, question, locked, onChange, onRemove }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [playing, setPlaying] = useState(false);
  const [match, setMatch] = useState(null);

  // Stop any preview when the editor goes away.
  useEffect(() => () => cancelSpeech(), []);

  // Show which voice this device would use, so the teacher knows what to expect.
  useEffect(() => {
    if (type !== "REPEAT" || !isSpeechSupported()) return undefined;
    let cancelled = false;
    findVoice(question.accent, question.gender).then((result) => {
      if (!cancelled) setMatch(result);
    });
    return () => {
      cancelled = true;
    };
  }, [type, question.accent, question.gender]);

  const preview = async () => {
    const text = question.text.trim();
    if (!text) {
      toast.error("Enter the sentence first");
      return;
    }
    setPlaying(true);
    try {
      await speak(text, { accent: question.accent, gender: question.gender });
    } catch (error) {
      toast.error(error.message || "Could not play the sentence");
    } finally {
      setPlaying(false);
    }
  };

  const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)";

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: "12px",
        border: `1px solid ${border}`,
        bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Question {index + 1}
        </Typography>
        {!locked && (
          <Tooltip title="Remove question">
            <IconButton size="small" onClick={onRemove} aria-label={`Remove question ${index + 1}`}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <TextField
        label={LABELS[type]}
        placeholder={PLACEHOLDERS[type]}
        value={question.text}
        onChange={(e) => onChange({ text: e.target.value })}
        multiline
        minRows={["QUESTION_ANSWER", "STORYTELLING", "EMAIL_WRITING"].includes(type) ? 2 : 1}
        maxRows={6}
        fullWidth
        size="small"
        disabled={locked}
        inputProps={{ maxLength: 1000 }}
      />

      {type === "REPEAT" && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 150 }} disabled={locked}>
              <InputLabel>Voice</InputLabel>
              <Select
                label="Voice"
                value={question.gender}
                onChange={(e) => onChange({ gender: e.target.value })}
              >
                {GENDERS.map((gender) => (
                  <MenuItem key={gender.id} value={gender.id}>
                    {gender.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }} disabled={locked}>
              <InputLabel>Accent</InputLabel>
              <Select
                label="Accent"
                value={question.accent}
                onChange={(e) => onChange({ accent: e.target.value })}
              >
                {ACCENTS.map((accent) => (
                  <MenuItem key={accent.id} value={accent.id}>
                    {accent.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              startIcon={<VolumeUpIcon />}
              onClick={preview}
              disabled={playing || !question.text.trim() || !isSpeechSupported()}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: "10px" }}
            >
              {playing ? "Playing…" : "Preview"}
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 1.5, py: 0 }}>
            The student's browser reads this sentence aloud and the text stays hidden. Voices come from the
            student's device, so the closest match is used.
            {match?.voice && (
              <>
                {" "}
                On this device: <strong>{match.voice.name}</strong>
                {!match.genderMatched && ` (no ${question.gender} voice found, pitch is adjusted instead)`}.
              </>
            )}
          </Alert>
        </Box>
      )}

      {type === "FILL_BLANKS" && <FillBlankFields question={question} locked={locked} onChange={onChange} />}

      {type === "MCQ" && (
        <McqOptionsEditor
          options={question.options || []}
          locked={locked}
          onChange={(options) => onChange({ options })}
        />
      )}

      {type === "EMAIL_WRITING" && (
        <Alert severity="info" sx={{ mt: 1.5, py: 0 }}>
          Students type the email in a text box (up to 5000 characters). It is rated on relevance, structure, tone,
          grammar, vocabulary, coherence and completeness.
        </Alert>
      )}

      {type === "JUMBLED" && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            How does the student answer?
          </Typography>
          <RadioGroup
            row
            value={question.jumbledMode}
            onChange={(e) => onChange({ jumbledMode: e.target.value })}
          >
            <FormControlLabel
              value="ui"
              control={<Radio size="small" disabled={locked} />}
              label="Arrange words on screen"
            />
            <FormControlLabel
              value="audio"
              control={<Radio size="small" disabled={locked} />}
              label="Speak the sentence (audio)"
            />
          </RadioGroup>
        </Box>
      )}
    </Box>
  );
};

export default SpeechQuestionEditor;
