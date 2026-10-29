/**
 * speechX/admin: the staff side of the communication (speech) tests, without Material UI.
 *
 *   CommunicationTestManagement   route /admin/communication-tests
 *   CommunicationTestEditor       routes /admin/communication-tests/new and /admin/communication-tests/:id/edit
 *
 *   import { CommunicationTestManagement, CommunicationTestEditor } from "./components/speechX/admin";
 *
 * The results page (/admin/communication-tests/:id/results) is a different area.
 */
import "./speechAdmin.css";

export { default as CommunicationTestManagement } from "./CommunicationTestManagement";
export { default as CommunicationTestEditor } from "./CommunicationTestEditor";
