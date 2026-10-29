import React from "react";
import { Grid, TextField, Typography } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import SetupCard from "../setup/SetupCard";
import useSurface from "../setup/useSurface";

/** Title, description, instructions and schedule of a test. */
const TestDetailsForm = ({ form, onChange }) => {
  const { muted } = useSurface();

  return (
    <SetupCard sx={{ height: "auto", p: { xs: 2.5, md: 3 } }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Title"
            value={form.title}
            onChange={(e) => onChange("title", e.target.value)}
            fullWidth
            required
            size="small"
            inputProps={{ maxLength: 150 }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => onChange("description", e.target.value)}
            fullWidth
            multiline
            minRows={2}
            size="small"
            inputProps={{ maxLength: 2000 }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Instructions for students"
            value={form.instructions}
            onChange={(e) => onChange("instructions", e.target.value)}
            fullWidth
            multiline
            minRows={3}
            size="small"
            helperText="Shown before the test starts. Example: use a quiet room and a headset."
            inputProps={{ maxLength: 3000 }}
          />
        </Grid>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid item xs={12} sm={6}>
            <DateTimePicker
              label="Start time"
              value={form.startTime}
              onChange={(value) => onChange("startTime", value)}
              slotProps={{ textField: { fullWidth: true, size: "small", required: true } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DateTimePicker
              label="End time"
              value={form.endTime}
              minDateTime={form.startTime || undefined}
              onChange={(value) => onChange("endTime", value)}
              slotProps={{ textField: { fullWidth: true, size: "small", required: true } }}
            />
          </Grid>
        </LocalizationProvider>
      </Grid>
      <Typography sx={{ color: muted, fontSize: "0.82rem", mt: 1.5 }}>
        Students can start any time between the start and end time. A section that is still running at the end time
        is submitted automatically.
      </Typography>
    </SetupCard>
  );
};

export default TestDetailsForm;
