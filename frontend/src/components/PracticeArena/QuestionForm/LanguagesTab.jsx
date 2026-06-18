import React, { memo, useState } from "react";
import {
  Box,
  Typography,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  List,
  ListItem,
  IconButton,
  Chip,
  FormControlLabel,
  Radio,
  Switch,
  TextField,
  Grid,
  Paper,
  Divider,
  Tooltip,
  Collapse,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  Timer as TimerIcon,
  EmojiEvents as TrophyIcon,
  PlayArrow as PlayArrowIcon,
  EditNote as EditNoteIcon,
} from "@mui/icons-material";
import Editor from "@monaco-editor/react";
import EncryptedCodeEditor from "../../shared/EncryptedCodeEditor";
import { LANGUAGES, FILL_IN_BLANK_MARKERS } from "./constants";
import { parseFillInBlankRegions, validateFillInBlankMarkers } from "./utils";

const LanguagesTab = memo(
  ({
    formData,
    errors,
    availableRuntimes,
    isLoadingRuntimes,
    onLanguageSelect,
    onRemoveLanguage,
    onCodeChange,
    onSetDefaultLanguage,
    onInputChange,
  }) => {
    // Local state to track which languages have scoring tiers enabled
    const [scoringTiersEnabled, setScoringTiersEnabled] = useState({});
    const [tierSplits, setTierSplits] = useState({});
    const [markerValidation, setMarkerValidation] = useState({});

    // Check if Fill in the Blank mode is enabled
    const fillInBlankEnabled = formData.encryptedEditor || false;

    // Initialize scoring tiers enabled state when languages change
    React.useEffect(() => {
      const newScoringEnabled = {};
      const newTierSplits = {};

      formData.languages.forEach((lang, index) => {
        const key = `${lang.name}-${index}`;
        // Check if this language already has scoring tiers
        if (lang.scoringTiers && lang.scoringTiers.length > 0) {
          newScoringEnabled[key] = true;
          newTierSplits[key] = lang.scoringTiers.length;
        } else {
          newScoringEnabled[key] = false;
          newTierSplits[key] = 3; // Default split
        }
      });

      setScoringTiersEnabled(newScoringEnabled);
      setTierSplits(newTierSplits);
    }, [formData.languages.length]);

    const handleToggleScoringTiers = (index, languageName) => {
      const key = `${languageName}-${index}`;
      const newEnabled = !scoringTiersEnabled[key];

      setScoringTiersEnabled((prev) => ({
        ...prev,
        [key]: newEnabled,
      }));

      if (newEnabled) {
        // Initialize scoring tiers with default values based on question marks and time limit
        const splitCount = tierSplits[key] || 3;
        const timeLimit = formData.constraints?.timeLimit || 1000; // Get time limit from Basic Info
        const defaultTiers = generateDefaultTiers(
          splitCount,
          formData.marks,
          timeLimit
        );
        onCodeChange(index, "scoringTiers", defaultTiers);
        onCodeChange(index, "minimumPoints", 0); // Default to 0 points for fallback
      } else {
        // Remove scoring tiers
        onCodeChange(index, "scoringTiers", []);
        onCodeChange(index, "minimumPoints", undefined);
      }
    };

    const handleSplitChange = (index, languageName, splitValue) => {
      const key = `${languageName}-${index}`;
      setTierSplits((prev) => ({
        ...prev,
        [key]: splitValue,
      }));

      // Generate new tiers based on split value, using marks and time limit from Basic Info
      const timeLimit = formData.constraints?.timeLimit || 1000;
      const newTiers = generateDefaultTiers(
        splitValue,
        formData.marks,
        timeLimit
      );
      onCodeChange(index, "scoringTiers", newTiers);
    };

    const generateDefaultTiers = (count, maxMarks, timeLimit) => {
      const tiers = [];

      // Use the time limit from Basic Info tab to calculate tier intervals
      // Divide the total time limit into equal intervals based on tier count
      // Last tier should have exactly the time limit from Basic Info
      const timeInterval = Math.floor(timeLimit / count);

      // Calculate points distribution - highest tier gets max marks, decreasing gradually
      const pointsDecrement = Math.floor(maxMarks / (count + 1));

      for (let i = 0; i < count; i++) {
        // For the last tier, use the exact timeLimit to avoid rounding issues
        const maxTime = i === count - 1 ? timeLimit : timeInterval * (i + 1);

        tiers.push({
          maxTime: maxTime, // Progressive time intervals, last one equals timeLimit
          points: Math.max(1, maxMarks - i * pointsDecrement), // Progressive points decrease
        });
      }

      return tiers;
    };

    const handleTierChange = (langIndex, tierIndex, field, value) => {
      const updatedLanguages = [...formData.languages];
      const tiers = [...(updatedLanguages[langIndex].scoringTiers || [])];

      tiers[tierIndex] = {
        ...tiers[tierIndex],
        [field]: Number(value) || 0,
      };

      updatedLanguages[langIndex].scoringTiers = tiers;
      onCodeChange(langIndex, "scoringTiers", tiers);
    };

    const handleMinimumPointsChange = (index, value) => {
      onCodeChange(index, "minimumPoints", Number(value) || 0);
    };

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Supported Languages
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Add programming languages that this problem supports, with boilerplate
          and solution code.
        </Typography>

        {/* Encrypted Code Editor Toggle */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            my: 3,
            bgcolor: fillInBlankEnabled
              ? "rgba(76,175,80,0.05)"
              : "transparent",
            border: "1px solid",
            borderColor: fillInBlankEnabled ? "#4CAF50" : "divider",
            borderRadius: 2,
            transition: "all 0.3s ease",
          }}
        >
          <FormControlLabel
            control={
              <Switch
                checked={fillInBlankEnabled}
                onChange={(e) => {
                  const syntheticEvent = {
                    target: {
                      name: "encryptedEditor",
                      value: e.target.checked,
                    },
                  };
                  onInputChange(syntheticEvent);
                }}
                color="success"
              />
            }
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <EditNoteIcon
                  sx={{
                    color: fillInBlankEnabled ? "#4CAF50" : "text.secondary",
                  }}
                />
                <Box>
                  <Typography variant="body1" fontWeight={600}>
                    Enable Encrypted Code Editor
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Blocks copy/paste and drag-and-drop to prevent code plagiarism
                  </Typography>
                </Box>
              </Box>
            }
          />

          <Collapse in={fillInBlankEnabled}>
            <Alert severity="info" sx={{ mt: 2, borderRadius: 1 }}>
              <Typography variant="body2" fontWeight={600} gutterBottom>
                � Encryption Protection Enabled:
              </Typography>
              <Typography variant="body2" component="div">
                • <strong>Blocks Ctrl+V paste</strong> - Students cannot paste code from external sources
                <br />
                • <strong>Blocks drag-and-drop</strong> - Prevents dragging code from ChatGPT, websites, etc.
                <br />
                • <strong>Encrypted copy/paste</strong> - Students can only copy/paste within this editor using encryption
                <br />
                • <strong>Right-click menu</strong> - Custom encrypted copy/paste options replace default actions
                <br />
                <br />
                This helps prevent students from copying solutions from external sources like ChatGPT, Stack Overflow, or other websites.
              </Typography>
            </Alert>
          </Collapse>
        </Paper>

        {errors.languages && (
          <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
            {errors.languages}
          </Alert>
        )}

        {errors.defaultLanguage && (
          <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
            {errors.defaultLanguage}
          </Alert>
        )}

        {errors.languageCode && (
          <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
            {errors.languageCode}
          </Alert>
        )}

        {/* Add Language Selector */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Add Language</InputLabel>
            <Select
              label="Add Language"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  onLanguageSelect(e.target.value);
                }
              }}
              disabled={isLoadingRuntimes}
            >
              {LANGUAGES.map((lang) => (
                <MenuItem
                  key={lang.name}
                  value={lang.name}
                  disabled={formData.languages.some(
                    (l) => l.name === lang.name
                  )}
                >
                  {lang.displayName} ({lang.version})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            disabled={formData.languages.length >= LANGUAGES.length}
          >
            {formData.languages.length >= LANGUAGES.length
              ? "All languages added"
              : "Select language from dropdown above"}
          </Button>
        </Box>

        {/* Language List */}
        {formData.languages.length > 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Added Languages ({formData.languages.length})
            </Typography>

            <List>
              {formData.languages.map((language, index) => (
                <ListItem
                  key={`${language.name}-${index}`}
                  sx={{
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    mb: 2,
                    flexDirection: "column",
                    alignItems: "stretch",
                  }}
                >
                  {/* Language Header */}
                  <Box
                    sx={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Radio
                          checked={formData.defaultLanguage === language.name}
                          onChange={() => onSetDefaultLanguage(language.name)}
                          color="primary"
                        />
                      }
                      label={
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: "bold" }}
                          >
                            {LANGUAGES.find((l) => l.name === language.name)
                              ?.displayName || language.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={language.version}
                            variant="outlined"
                          />
                          {formData.defaultLanguage === language.name && (
                            <Chip
                              size="small"
                              label="Default"
                              color="primary"
                              icon={<StarIcon />}
                            />
                          )}
                        </Box>
                      }
                    />

                    <Box sx={{ ml: "auto" }}>
                      <IconButton
                        edge="end"
                        onClick={() => onRemoveLanguage(index)}
                        color="error"
                        disabled={formData.languages.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Boilerplate Code */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Boilerplate Code (shown to students):
                    </Typography>
                    <EncryptedCodeEditor
                      height="200px"
                      language={language.name === "cpp" ? "cpp" : language.name}
                      value={language.boilerplateCode}
                      onChange={(value) =>
                        onCodeChange(index, "boilerplateCode", value || "")
                      }
                      theme="vs-dark"
                      encryptionEnabled={fillInBlankEnabled}
                    />
                  </Box>

                  {/* Solution Code */}
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Solution Code (for test case validation):
                    </Typography>
                    <EncryptedCodeEditor
                      height="200px"
                      language={language.name === "cpp" ? "cpp" : language.name}
                      value={language.solutionCode}
                      onChange={(value) =>
                        onCodeChange(index, "solutionCode", value || "")
                      }
                      theme="vs-dark"
                      encryptionEnabled={fillInBlankEnabled}
                    />
                  </Box>

                  {/* Scoring Tiers Section */}
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <TrophyIcon color="primary" />
                        <Typography variant="subtitle2">
                          Performance-Based Scoring
                        </Typography>
                      </Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={
                              scoringTiersEnabled[
                                `${language.name}-${index}`
                              ] || false
                            }
                            onChange={() =>
                              handleToggleScoringTiers(index, language.name)
                            }
                            color="primary"
                          />
                        }
                        label="Enable Scoring Tiers"
                      />
                    </Box>

                    {scoringTiersEnabled[`${language.name}-${index}`] && (
                      <Paper
                        variant="outlined"
                        sx={{ p: 2, bgcolor: "background.default" }}
                      >
                        <Box sx={{ mb: 2 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Split Configuration</InputLabel>
                            <Select
                              value={
                                tierSplits[`${language.name}-${index}`] || 3
                              }
                              label="Split Configuration"
                              onChange={(e) =>
                                handleSplitChange(
                                  index,
                                  language.name,
                                  e.target.value
                                )
                              }
                            >
                              <MenuItem value={2}>Split by 2</MenuItem>
                              <MenuItem value={3}>Split by 3</MenuItem>
                              <MenuItem value={4}>Split by 4</MenuItem>
                              <MenuItem value={5}>Split by 5</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Configure time vs score tiers. Students will earn
                          points based on their solution's execution time.
                        </Typography>

                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          {(language.scoringTiers || []).map(
                            (tier, tierIndex) => (
                              <React.Fragment key={tierIndex}>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label={`Tier ${
                                      tierIndex + 1
                                    } - Max Time (ms)`}
                                    type="number"
                                    value={tier.maxTime || ""}
                                    onChange={(e) =>
                                      handleTierChange(
                                        index,
                                        tierIndex,
                                        "maxTime",
                                        e.target.value
                                      )
                                    }
                                    InputProps={{
                                      startAdornment: (
                                        <TimerIcon
                                          sx={{ mr: 1, color: "action.active" }}
                                        />
                                      ),
                                    }}
                                    helperText={`Maximum ${tier.maxTime}ms`}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label={`Tier ${tierIndex + 1} - Points`}
                                    type="number"
                                    value={tier.points || ""}
                                    onChange={(e) =>
                                      handleTierChange(
                                        index,
                                        tierIndex,
                                        "points",
                                        e.target.value
                                      )
                                    }
                                    InputProps={{
                                      startAdornment: (
                                        <TrophyIcon
                                          sx={{ mr: 1, color: "action.active" }}
                                        />
                                      ),
                                    }}
                                    helperText={`Award ${tier.points} points`}
                                    inputProps={{ max: formData.marks }}
                                  />
                                </Grid>
                              </React.Fragment>
                            )
                          )}
                        </Grid>

                        <Box sx={{ mt: 2 }}>
                          <TextField
                            size="small"
                            label="Minimum Points (fallback)"
                            type="number"
                            value={
                              language.minimumPoints !== undefined
                                ? language.minimumPoints
                                : 0
                            }
                            onChange={(e) =>
                              handleMinimumPointsChange(index, e.target.value)
                            }
                            helperText="Points awarded if execution time exceeds all tiers"
                            inputProps={{ min: 0, max: formData.marks }}
                            sx={{ maxWidth: 250 }}
                          />
                        </Box>

                        <Alert severity="info" sx={{ mt: 2 }}>
                          <Typography variant="caption">
                            <strong>Example:</strong> If execution time is{" "}
                            {language.scoringTiers?.[0]?.maxTime || 500}ms and
                            Tier 1 is ≤
                            {language.scoringTiers?.[0]?.maxTime || 500}ms ={" "}
                            {language.scoringTiers?.[0]?.points || 10}pts,
                            student gets{" "}
                            {language.scoringTiers?.[0]?.points || 10} points.
                          </Typography>
                        </Alert>
                      </Paper>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Box>
    );
  }
);

LanguagesTab.displayName = "LanguagesTab";

export default LanguagesTab;
