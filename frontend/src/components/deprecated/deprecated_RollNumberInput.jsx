/**
 * DEPRECATED: Roll number input (Material UI). Replaced by components/userGroupManagement/RollNumberInput.jsx and no longer imported by the app.
 * Kept for reference until the Material UI screens are gone; delete it with the deprecated folder.
 */
import React, { useMemo, useRef, useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { toast } from "react-toastify";
import parseRollNumberCsv from "../../utils/parseRollNumberCsv";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

/**
 * Roll numbers from a CSV/text file or typed in. The text box is the single source of
 * truth: choosing a file puts its contents there, so the admin can fix a typo before
 * saving. The parsed list is reported through `onChange`. To clear it, change the
 * component's `key`.
 *
 * @param {(rollNumbers: string[]) => void} onChange
 * @param {boolean} [disabled]
 */
const RollNumberInput = ({ onChange, disabled = false }) => {
  const fileInputRef = useRef(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");

  const parsed = useMemo(() => parseRollNumberCsv(text), [text]);

  const update = (value) => {
    setText(value);
    onChange(parseRollNumberCsv(value).rollNumbers);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("That file is too large. Roll number lists are normally a few KB.");
      return;
    }
    try {
      update(await file.text());
      setFileName(file.name);
    } catch {
      toast.error("Could not read that file");
    }
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          sx={{ textTransform: "none" }}
        >
          Upload CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt,text/csv,text/plain"
          hidden
          onChange={handleFile}
        />
        <Typography variant="body2" color="text.secondary">
          {fileName || "One roll number per line, or comma separated"}
        </Typography>
      </Box>

      <TextField
        value={text}
        onChange={(event) => update(event.target.value)}
        placeholder={"21A91A0501\n21A91A0502"}
        multiline
        minRows={4}
        maxRows={10}
        fullWidth
        disabled={disabled}
        label="Roll numbers"
      />

      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block" }}>
        {parsed.rollNumbers.length} roll number(s)
        {parsed.duplicates > 0 ? `, ${parsed.duplicates} duplicate(s) ignored` : ""}
        {parsed.skippedHeader ? ", header row skipped" : ""}
      </Typography>
    </Box>
  );
};

export default RollNumberInput;
