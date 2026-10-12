/**
 * Skyline resume template.
 *
 * Inspired by a clean blue layout: bright blue section headings, a Resume
 * Objective, dates listed first in Education and Work History, skills with a
 * level, and an Accomplishments section.
 *
 * A template owns everything the editor and the preview need: page geometry,
 * typography, and the ordered list of fields. The edit panel is generated from
 * `fields`, so adding an entry here is enough to expose it in the UI.
 *
 * Field types:
 *   text      - single line
 *   multiline - paragraph, supports **bold** and `code`
 *   bullets   - list of strings, one per bullet
 *   repeater  - repeatable entries described by `subFields`
 *
 * Placeholders must stay generic. They are hints for every user, not sample
 * data for one person.
 */

const SECTION_BLUE = "#1E9BF0";
const MUTED_GREY = "#555555";

// A4 at 96 DPI. Margins: 0.45in -> 43px top/bottom, 0.55in -> 53px left/right
const PAGE = {
  width: 794,
  height: 1123,
  margin: { top: 43, right: 53, bottom: 43, left: 53 },
  maxPages: 2,
};

module.exports = {
  id: "skyline",
  name: "Skyline",

  page: PAGE,

  typography: {
    /**
     * Fallback only. The font actually used comes from the user's choice in
     * backend/resumeFonts, which guarantees the preview, the PDF and the Word
     * export all render the same family.
     */
    fontFamily: "'Verdana', 'DejaVu Sans', Arial, sans-serif",

    baseFontSize: 12,
    sectionFontSize: 14,
    // Bounds for every per-field font size the user can set
    minFontSize: 6,
    maxFontSize: 48,
    // Shared by the preview and the PDF so both paginate the same way
    lineHeight: 1.4,

    /**
     * Vertical rhythm in CSS pixels. The preview applies these directly and the
     * PDF converts them to points, so a change here moves both together and the
     * page count stays honest.
     */
    spacing: {
      sectionTop: 12,
      sectionBottom: 6,
      headingRule: 2,
      contactTop: 8,
      entryGap: 8,
      experienceGap: 10,
      projectGap: 8,
      bulletTop: 2,
      bulletGap: 2,
    },

    colors: {
      text: "#222222",
      section: SECTION_BLUE,
      muted: MUTED_GREY,
      link: SECTION_BLUE,
      rule: SECTION_BLUE,
    },
  },

  fields: [
    {
      key: "fullName",
      label: "Full Name",
      type: "text",
      placeholder: "Your full name",
      defaultFontSize: 24,
      maxLength: 80,
    },
    {
      key: "contact",
      label: "Contact Line",
      helperText: "Shown under your name, separated by |. Add a link to make it clickable.",
      type: "repeater",
      itemLabel: "Item",
      addLabel: "Add contact item",
      maxItems: 8,
      defaultItems: 1,
      defaultFontSize: 12,
      subFields: [
        {
          key: "text",
          label: "Label",
          type: "text",
          placeholder: "Phone, email, city or a link label",
          maxLength: 80,
        },
        {
          key: "url",
          label: "Link (optional)",
          type: "text",
          placeholder: "https://linkedin.com/in/username",
          maxLength: 300,
        },
      ],
    },
    {
      key: "overview",
      label: "Resume Objective",
      section: "Resume Objective",
      type: "multiline",
      helperText: "Wrap text in **stars** for bold and `backticks` for code.",
      placeholder:
        "A short summary of your experience, your strongest skills, and the role you are aiming for.",
      defaultFontSize: 12,
      maxLength: 1000,
    },
    {
      key: "education",
      label: "Education",
      section: "Education",
      type: "repeater",
      itemLabel: "Education",
      addLabel: "Add education",
      maxItems: 6,
      defaultItems: 1,
      defaultFontSize: 12,
      subFields: [
        {
          key: "dateRange",
          label: "Date",
          type: "text",
          placeholder: "MM/YYYY",
          maxLength: 60,
        },
        {
          key: "degree",
          label: "Degree / Stream",
          type: "text",
          placeholder: "Degree and field of study",
          maxLength: 140,
        },
        {
          key: "institution",
          label: "Institution",
          type: "text",
          placeholder: "School or university name",
          maxLength: 120,
        },
        {
          key: "score",
          label: "Location / Score",
          type: "text",
          placeholder: "City, State or CGPA",
          maxLength: 60,
        },
      ],
    },
    {
      key: "skills",
      label: "Skills",
      section: "Skills",
      type: "repeater",
      itemLabel: "Skill group",
      addLabel: "Add skill group",
      maxItems: 10,
      defaultItems: 1,
      defaultFontSize: 12,
      subFields: [
        {
          key: "category",
          label: "Category",
          type: "text",
          placeholder: "Calendar Coordination, Customer Service",
          maxLength: 80,
        },
        {
          key: "items",
          label: "Skills",
          type: "multiline",
          placeholder: "Comma separated list of skills in this group",
          maxLength: 500,
        },
      ],
    },
    {
      key: "experience",
      label: "Work History",
      section: "Work History",
      type: "repeater",
      itemLabel: "Role",
      addLabel: "Add work history",
      maxItems: 8,
      defaultItems: 1,
      defaultFontSize: 12,
      subFields: [
        {
          key: "dateRange",
          label: "Dates",
          type: "text",
          placeholder: "MM/YYYY to MM/YYYY",
          maxLength: 60,
        },
        {
          key: "role",
          label: "Job title",
          type: "text",
          placeholder: "Your job title",
          maxLength: 120,
        },
        {
          key: "organization",
          label: "Employer and location",
          type: "text",
          placeholder: "Company name, City, State",
          maxLength: 140,
        },
        {
          key: "points",
          label: "Bullet points",
          type: "bullets",
          placeholder: "What you did, and the result it produced.",
          maxItems: 6,
          maxLength: 300,
        },
      ],
    },
    {
      key: "projects",
      label: "Projects",
      section: "Projects",
      type: "repeater",
      itemLabel: "Project",
      addLabel: "Add project",
      maxItems: 8,
      defaultItems: 1,
      defaultFontSize: 12,
      subFields: [
        {
          key: "title",
          label: "Title",
          type: "text",
          placeholder: "Project name",
          maxLength: 140,
        },
        {
          key: "techStack",
          label: "Tech stack",
          type: "text",
          placeholder: "Languages and tools you used",
          maxLength: 200,
        },
        {
          key: "liveUrl",
          label: "Live link (optional)",
          type: "text",
          placeholder: "https://your-project.com",
          maxLength: 300,
        },
        {
          key: "githubUrl",
          label: "GitHub link (optional)",
          type: "text",
          placeholder: "https://github.com/username/repo",
          maxLength: 300,
        },
        {
          key: "points",
          label: "Bullet points",
          type: "bullets",
          placeholder: "What the project does, and what you built to make it work.",
          maxItems: 6,
          maxLength: 300,
        },
      ],
    },
    {
      key: "certifications",
      label: "Accomplishments",
      section: "Accomplishments",
      type: "repeater",
      itemLabel: "Accomplishment",
      addLabel: "Add accomplishment",
      maxItems: 8,
      defaultItems: 1,
      defaultFontSize: 12,
      subFields: [
        {
          key: "name",
          label: "Accomplishment",
          type: "text",
          placeholder: "An award, milestone or result you are proud of",
          maxLength: 180,
        },
        {
          key: "issuer",
          label: "Given by (optional)",
          type: "text",
          placeholder: "Organization or company",
          maxLength: 120,
        },
        {
          key: "credentialUrl",
          label: "Link (optional)",
          type: "text",
          placeholder: "Link to proof or details",
          maxLength: 300,
        },
        {
          key: "issuedDate",
          label: "Date",
          type: "text",
          placeholder: "2023",
          maxLength: 60,
        },
      ],
    },
  ],
};