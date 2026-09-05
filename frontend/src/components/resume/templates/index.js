import ClassicTemplate from "./ClassicTemplate";

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
