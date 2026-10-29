/**
 * DEPRECATED. The previous resume template registry (Material UI). It is replaced by ../resumeBuilder/templates/index.js
 * and is kept here only for reference. Nothing imports it. Delete it together with the rest of this
 * folder.
 */
import ClassicTemplate from "./deprecated_ClassicTemplate";

/**
 * Maps a backend template id (see backend/resumeTemplates) to the component
 * that draws it. Register new templates here.
 */
const templateComponents = {
  classic: ClassicTemplate,
};

export const getTemplateComponent = (templateId) =>
  templateComponents[templateId] || ClassicTemplate;

export default templateComponents;
