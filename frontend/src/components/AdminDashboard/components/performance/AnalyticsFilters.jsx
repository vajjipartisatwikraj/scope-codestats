import React from "react";
import { Box, Button, FormControl, IconButton, InputLabel, MenuItem, Select, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import { Refresh as RefreshIcon } from "@mui/icons-material";
import { Panel } from "./Panel";
import { PERIODS } from "./performanceFormat";

const ALL = "";

const Dropdown = ({ label, value, onChange, children, disabled }) => (
  <FormControl size="small" sx={{ minWidth: 150 }} disabled={disabled}>
    <InputLabel shrink>{label}</InputLabel>
    <Select label={label} value={value} displayEmpty notched onChange={(event) => onChange(event.target.value)}>
      <MenuItem value={ALL}>All</MenuItem>
      {children}
    </Select>
  </FormControl>
);

/**
 * The filters of the Performance screen: department, graduating year, section and the
 * period the changes are measured over.
 *
 * @param {object} options from /filters: departments, graduatingYears, sections
 * @param {{department, graduatingYear, section, days}} value
 * @param {(patch: object) => void} onChange
 */
const AnalyticsFilters = ({ options, value, onChange, onReset, onRefresh, refreshing }) => {
  const hasFilter = Boolean(value.department || value.graduatingYear || value.section);
  const optionsReady = Boolean(options);

  return (
    <Panel>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        <Dropdown label="Department" value={value.department} disabled={!optionsReady} onChange={(department) => onChange({ department })}>
          {(options?.departments || []).map((d) => (
            <MenuItem key={d.value} value={d.value}>{`${d.value} (${d.count})`}</MenuItem>
          ))}
        </Dropdown>

        <Dropdown label="Graduating year" value={value.graduatingYear} disabled={!optionsReady} onChange={(graduatingYear) => onChange({ graduatingYear })}>
          {(options?.graduatingYears || []).map((y) => (
            <MenuItem key={y.value} value={y.value}>{`${y.label} (${y.count})`}</MenuItem>
          ))}
        </Dropdown>

        <Dropdown label="Section" value={value.section} disabled={!optionsReady} onChange={(section) => onChange({ section })}>
          {(options?.sections || []).map((s) => (
            <MenuItem key={s.value} value={s.value}>{`${s.value} (${s.count})`}</MenuItem>
          ))}
        </Dropdown>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Period
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={value.days}
            onChange={(_event, days) => days && onChange({ days })}
            aria-label="Period"
          >
            {PERIODS.map((period) => (
              <ToggleButton key={period.days} value={period.days} sx={{ px: 1.5, textTransform: "none" }}>
                {period.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
          {hasFilter && (
            <Button size="small" onClick={onReset} sx={{ textTransform: "none" }}>
              Clear filters
            </Button>
          )}
          <Tooltip title="Reload">
            <span>
              <IconButton onClick={onRefresh} disabled={refreshing} aria-label="Reload analytics">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Panel>
  );
};

export default AnalyticsFilters;
