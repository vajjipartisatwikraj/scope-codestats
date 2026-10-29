/**
 * DEPRECATED: Create user group dialog (Material UI). Replaced by components/userGroupManagement/CreateGroupDrawer.jsx and no longer imported by the app.
 * Kept for reference until the Material UI screens are gone; delete it with the deprecated folder.
 */
import React, { useState } from "react";
import { Box, Button, CircularProgress, TextField, useTheme } from "@mui/material";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import { toast } from "react-toastify";
import StyledDialog from "../common/StyledDialog";
import RollNumberInput from "./deprecated_RollNumberInput";
import { apiErrorMessage, userGroupApi } from "../../services/userGroupApi";

/** Name a new user group and give it its roll numbers (CSV upload or pasted). */
const CreateUserGroupDialog = ({ open, onClose, onCreated }) => {
  const isDark = useTheme().palette.mode === "dark";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rollNumbers, setRollNumbers] = useState([]);
  const [saving, setSaving] = useState(false);

  const canSave = name.trim() && rollNumbers.length > 0 && !saving;

  const handleClose = () => {
    if (saving) return;
    setName("");
    setDescription("");
    setRollNumbers([]);
    onClose();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { group } = await userGroupApi.create({ name, description, rollNumbers });
      toast.success(`User group "${group.name}" created with ${group.memberCount} roll numbers`);
      onCreated?.(group);
      setName("");
      setDescription("");
      setRollNumbers([]);
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Could not create the user group"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      darkMode={isDark}
      icon={<GroupAddIcon />}
      title="Create user group"
      subtitle="A named list of roll numbers you can attach to cohorts."
      maxWidth="sm"
      actions={
        <>
          <Button onClick={handleClose} disabled={saving} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!canSave}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: "none" }}
          >
            Create group
          </Button>
        </>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Group name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          inputProps={{ maxLength: 100 }}
          required
          fullWidth
          autoFocus
        />
        <TextField
          label="Description (optional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          inputProps={{ maxLength: 500 }}
          fullWidth
        />
        {open && <RollNumberInput onChange={setRollNumbers} disabled={saving} />}
      </Box>
    </StyledDialog>
  );
};

export default CreateUserGroupDialog;
