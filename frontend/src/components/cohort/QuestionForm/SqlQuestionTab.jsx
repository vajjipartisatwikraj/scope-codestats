import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Divider,
  Alert,
  AlertTitle,
  Chip,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import StorageIcon from "@mui/icons-material/Storage";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { makeSqlTestcase } from "./constants";

/**
 * SQL question authoring.
 *
 * SQL questions are graded by the external SQLJudge engine, which stores the
 * seed data and expected output in its own private bucket. This tab therefore
 * captures the schema, the reference solution and one seed per testcase, and
 * the engine derives the expected rows.
 *
 * Two staged actions come before publishing:
 *   Generate Outputs  - execute the solution against every seed, show results
 *   Validate Testcases- optional re-check of the generated rows
 *
 * Publishing is handled by the form's Submit button and stays disabled until
 * outputs have been generated, so an author can only publish reviewed output.
 */
const SqlQuestionTab = ({
  formData,
  darkMode,
  onSqlMetaChange,
  onGenerateOutputs,
  onValidateTestcases,
  generating = false,
  validating = false,
  generated = null,
  validation = null,
  engineError = null,
}) => {
  const theme = useTheme();
  // Derive the mode from the active theme so the tab is correct even when it is
  // rendered without an explicit darkMode prop.
  const isDark = darkMode ?? theme.palette.mode === "dark";

  const sqlMeta = formData.sqlMeta || {};
  const testcases = sqlMeta.testcases || [];
  const [expanded, setExpanded] = useState(() => new Set([0]));

  const visibleCount = testcases.filter((tc) => tc.visible).length;
  const hiddenCount = testcases.length - visibleCount;

  const generatedById = useMemo(() => {
    const map = new Map();
    (generated?.testcases || []).forEach((tc) => map.set(tc.id, tc));
    return map;
  }, [generated]);

  const mismatchById = useMemo(() => {
    const map = new Map();
    (validation?.testcases || []).forEach((tc) => map.set(tc.id, tc));
    return map;
  }, [validation]);

  // Theme-derived surfaces: correct in both modes and consistent with the rest
  // of the dialog.
  const surface = theme.palette.background.paper;
  const subtleBorder = theme.palette.divider;
  const headerSurface = isDark
    ? "rgba(255,255,255,0.04)"
    : "rgba(0,0,0,0.03)";
  const codeSurface = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const monospace = '"Consolas", "Monaco", "Courier New", monospace';

  const update = (patch) => onSqlMetaChange({ ...sqlMeta, ...patch });

  const updateTestcase = (index, patch) => {
    const next = testcases.map((tc, i) => (i === index ? { ...tc, ...patch } : tc));
    update({ testcases: next });
  };

  const addTestcase = () => {
    update({ testcases: [...testcases, makeSqlTestcase(testcases.length, { visible: false })] });
    setExpanded((prev) => new Set([...prev, testcases.length]));
  };

  const removeTestcase = (index) => {
    update({ testcases: testcases.filter((_, i) => i !== index) });
  };

  const toggleExpanded = (index) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const sqlField = (label, value, onChange, { rows = 6, placeholder = "" } = {}) => (
    <TextField
      label={label}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
      multiline
      rows={rows}
      placeholder={placeholder}
      InputProps={{
        sx: {
          fontFamily: monospace,
          fontSize: "0.85rem",
          backgroundColor: codeSurface,
        },
      }}
      sx={{ mb: 2 }}
    />
  );

  /** Renders a generated or expected result set as a real table. */
  const ResultTable = ({ result }) => {
    if (!result) return null;
    const columns = result.columns || [];
    const rows = result.rows || [];

    if (columns.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No columns returned.
        </Typography>
      );
    }

    return (
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          maxHeight: 240,
          borderColor: subtleBorder,
          backgroundColor: surface,
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {columns.map((column, i) => (
                <TableCell
                  key={`${column}-${i}`}
                  sx={{
                    fontWeight: 700,
                    fontFamily: monospace,
                    fontSize: "0.78rem",
                    color: theme.palette.text.primary,
                    backgroundColor: isDark ? "#1c1c1c" : "#f5f7fa",
                  }}
                >
                  {column}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <Typography variant="caption" color="text.secondary">
                    0 rows
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, r) => (
                <TableRow key={r}>
                  {columns.map((_, c) => (
                    <TableCell
                      key={c}
                      sx={{ fontFamily: monospace, fontSize: "0.78rem" }}
                    >
                      {row[c] === null || row[c] === undefined ? (
                        <em style={{ opacity: 0.6 }}>NULL</em>
                      ) : (
                        String(row[c])
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>How SQL questions are stored</AlertTitle>
        Seed data and expected output are held by the SQL execution engine, not in
        this database. Generate the outputs first, review them, then submit to
        publish the question.
      </Alert>

      {engineError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {engineError}
        </Alert>
      )}

      {/* ── engine identity ───────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: surface, borderColor: subtleBorder }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <StorageIcon fontSize="small" /> Engine identity
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField
            label="Question ID"
            value={sqlMeta.judgeQuestionId || ""}
            onChange={(e) => update({ judgeQuestionId: e.target.value.trim() })}
            placeholder="department-average-salary"
            helperText="Unique id in the SQL engine. Letters, digits, dot, dash, underscore."
            sx={{ flex: "1 1 320px" }}
          />
          <TextField
            label="Version"
            type="number"
            value={sqlMeta.judgeVersion ?? 1}
            onChange={(e) => update({ judgeVersion: Number(e.target.value) || 1 })}
            inputProps={{ min: 1 }}
            helperText="Bump to publish a new revision."
            sx={{ flex: "0 0 160px" }}
          />
        </Box>
        <FormControlLabel
          sx={{ mt: 1 }}
          control={
            <Switch
              checked={Boolean(sqlMeta.overwrite)}
              onChange={(e) => update({ overwrite: e.target.checked })}
            />
          }
          label="Overwrite this version if it already exists"
        />
      </Paper>

      {/* ── schema and solution ───────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: surface, borderColor: subtleBorder }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
          Schema and reference solution
        </Typography>
        {sqlField("schema.sql — table definitions, no data", sqlMeta.schemaSql, (v) =>
          update({ schemaSql: v })
        )}
        {sqlField(
          "solution.sql — reference query, never shown to students",
          sqlMeta.solutionSql,
          (v) => update({ solutionSql: v })
        )}
        {sqlField(
          "Starting query shown in the student editor",
          sqlMeta.boilerplateSql,
          (v) => update({ boilerplateSql: v }),
          { rows: 3 }
        )}
      </Paper>

      {/* ── testcases ─────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: surface, borderColor: subtleBorder }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Testcases
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip size="small" color="success" variant="outlined" label={`${visibleCount} visible`} />
            <Chip size="small" color="default" variant="outlined" label={`${hiddenCount} hidden`} />
            <Button size="small" startIcon={<AddIcon />} onClick={addTestcase}>
              Add
            </Button>
          </Box>
        </Box>

        {visibleCount === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            At least one testcase must be visible. Students need a worked example.
          </Alert>
        )}

        {testcases.map((testcase, index) => {
          const generatedResult = generatedById.get(testcase.id);
          const mismatch = mismatchById.get(testcase.id);
          const isOpen = expanded.has(index);

          return (
            <Box
              key={index}
              sx={{
                border: `1px solid ${subtleBorder}`,
                borderRadius: 1,
                mb: 2,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.5,
                  py: 1,
                  backgroundColor: headerSurface,
                  cursor: "pointer",
                }}
                onClick={() => toggleExpanded(index)}
              >
                <Typography sx={{ fontFamily: monospace, fontWeight: 700, fontSize: "0.85rem" }}>
                  {testcase.id}
                </Typography>

                <Chip
                  size="small"
                  variant={testcase.visible ? "filled" : "outlined"}
                  color={testcase.visible ? "success" : "default"}
                  icon={testcase.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                  label={testcase.visible ? "Visible" : "Hidden"}
                />

                {generatedResult && (
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${generatedResult.expected?.rows?.length ?? 0} row(s) generated`}
                  />
                )}
                {mismatch && !mismatch.match && (
                  <Chip size="small" color="error" label="Mismatch" />
                )}

                <Box sx={{ flexGrow: 1 }} />

                <Tooltip title={testcase.visible ? "Make hidden" : "Make visible"}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTestcase(index, { visible: !testcase.visible });
                    }}
                  >
                    {testcase.visible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Remove testcase">
                  <IconButton
                    size="small"
                    color="error"
                    disabled={testcases.length <= 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTestcase(index);
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              {isOpen && (
                <Box sx={{ p: 2 }}>
                  <TextField
                    label="Testcase id"
                    value={testcase.id}
                    onChange={(e) => updateTestcase(index, { id: e.target.value.trim() })}
                    size="small"
                    sx={{ mb: 2, width: 220 }}
                  />
                  {sqlField("seed.sql — rows inserted for this testcase", testcase.seedSql, (v) =>
                    updateTestcase(index, { seedSql: v })
                  )}

                  {generatedResult ? (
                    <>
                      <Divider sx={{ mb: 1.5 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 1 }}>
                        Generated expected output
                      </Typography>
                      <ResultTable result={generatedResult.expected} />
                      {mismatch && !mismatch.match && (
                        <Alert severity="error" sx={{ mt: 1.5 }}>
                          {mismatch.mismatch?.message || "Does not match the reference solution output."}
                        </Alert>
                      )}
                    </>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Run Generate Outputs to see what the reference solution returns for this seed.
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Paper>

      {/* ── actions ───────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2, backgroundColor: surface, borderColor: subtleBorder }}>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
          <Button
            variant="contained"
            startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
            onClick={onGenerateOutputs}
            disabled={generating || validating}
          >
            {generating ? "Generating…" : "Generate Outputs"}
          </Button>

          <Button
            variant="outlined"
            startIcon={validating ? <CircularProgress size={16} /> : <FactCheckIcon />}
            onClick={onValidateTestcases}
            disabled={generating || validating || !generated}
          >
            {validating ? "Validating…" : "Validate Testcases"}
          </Button>

          {generated && (
            <Chip
              size="small"
              color="success"
              label={`Outputs generated · columns: ${
                (generated.outputColumns || []).join(", ") || "none"
              }`}
            />
          )}
          {validation && (
            <Chip
              size="small"
              color={validation.valid ? "success" : "error"}
              label={validation.valid ? "Testcases validated" : "Validation found mismatches"}
            />
          )}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
          Validation is optional: publishing regenerates the expected output from
          the reference solution, so what the engine grades against always comes
          from the solution itself.
        </Typography>

        {!generated && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Generate the outputs before submitting. Publishing is blocked until you
            have reviewed what the reference solution returns.
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default SqlQuestionTab;
