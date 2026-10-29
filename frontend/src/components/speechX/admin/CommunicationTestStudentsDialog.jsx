import React from "react";
import AttachedUserGroupsDialog from "../../userGroupManagement/AttachedUserGroupsDialog";
import { testUserGroupApi } from "../../../services/userGroupApi";

/**
 * Who may take a test: the user groups attached to it. Create and fill groups on the
 * User Groups page; attach them here.
 *
 * A thin wrapper around the shared AttachedUserGroupsDialog (components/userGroups/), which other
 * screens use too and which is not part of this area.
 *
 * `onChanged(count)` receives the number of eligible students after every change.
 */
const CommunicationTestStudentsDialog = ({ open, testId, onClose, onChanged }) => {
  const handleChanged = async () => {
    if (!onChanged) return;
    try {
      const data = await testUserGroupApi.list(testId);
      onChanged(data.totalEligibleUsers);
    } catch {
      // The dialog already shows its own errors; the count refreshes next time.
    }
  };

  return (
    <AttachedUserGroupsDialog
      open={open}
      target={testId ? { _id: testId } : null}
      api={testUserGroupApi}
      entityLabel="test"
      onClose={onClose}
      onChanged={handleChanged}
    />
  );
};

export default CommunicationTestStudentsDialog;
