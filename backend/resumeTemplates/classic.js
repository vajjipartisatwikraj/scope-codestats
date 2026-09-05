/**
 * Classic resume template.
 *
 * Ported from a LaTeX article layout (10pt, a4paper, geometry top/bottom 0.28in
 * and left/right 0.36in, blue section headings with a rule underneath).
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

// sectionblue RGB(25,55,109) and lightgrey RGB(80,80,80)
const SECTION_BLUE = "#19376D";
const LIGHT_GREY = "#505050";

// A4 at 96 DPI. LaTeX margins converted from inches: 0.28in -> 27px, 0.36in -> 35px
const PAGE = {
  width: 794,
  height: 1123,
  margin: { top: 27, right: 35, bottom: 27, left: 35 },
  maxPages: 2,
};

module.exports = {
  id: "classic",
  name: "Classic",

  page: PAGE,

  typography: {
    /**
     * Fallback only. The font actually used comes from the user's choice in
     * backend/resumeFonts, which guarantees the preview, the PDF and the Word
     * export all render the same family.
     */
    fontFamily: "'Nekst', 'Century Gothic', Arial, sans-serif",

    // 10pt base at 96 DPI
    baseFontSize: 13,
    sectionFontSize: 15,
    // Bounds for every per-field font size the user can set
    minFontSize: 6,
    maxFontSize: 48,
    // Shared by the preview and the PDF so both paginate the same way
    lineHeight: 1.3,

    /**
     * Vertical rhythm in CSS pixels. The preview applies these directly and the
     * PDF converts them to points, so a change here moves both together and the
     * page count stays honest.
     */
    spacing: {
      sectionTop: 9,
      sectionBottom: 4,
      headingRule: 2,
      contactTop: 6,
      entryGap: 3,
      experienceGap: 5,
      projectGap: 6,
      bulletTop: 1,
      bulletGap: 1,
    },

    colors: {
      text: "#000000",
      section: SECTION_BLUE,
      muted: LIGHT_GREY,
      link: SECTION_BLUE,
      rule: "rgba(25, 55, 109, 0.35)",
    },
  },

  fields: [
    {
      key: "fullName",
      label: "Full Name",
      type: "text",
      placeholder: "Your full name",
      defaultFontSize: 23,
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
      defaultFontSize: 13,
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
      label: "Overview",
      section: "Overview",
      type: "multiline",
      helperText: "Wrap text in **stars** for bold and `backticks` for code.",
      placeholder:
        "A short summary of who you are, what you build, and the strengths you want read first.",
      defaultFontSize: 13,
      maxLength: 1200,
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
      defaultFontSize: 13,
      subFields: [
        {
          key: "institution",
          label: "Institution",
          type: "text",
          placeholder: "College or university name",
          maxLength: 120,
        },
        {
          key: "dateRange",
          label: "Dates",
          type: "text",
          placeholder: "Aug 2022 - Present",
          maxLength: 60,
        },
        {
          key: "degree",
          label: "Degree / Stream",
          type: "text",
          placeholder: "Degree and branch",
          maxLength: 140,
        },
        {
          key: "score",
          label: "Score",
          type: "text",
          placeholder: "CGPA or percentage",
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
      defaultFontSize: 13,
      subFields: [
        {
          key: "category",
          label: "Category",
          type: "text",
          placeholder: "Languages, Frameworks, Tools",
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
      label: "Experience",
      section: "Experience",
      type: "repeater",
      itemLabel: "Role",
      addLabel: "Add experience",
      maxItems: 8,
      defaultItems: 1,
      defaultFontSize: 13,
      subFields: [
        {
          key: "organization",
          label: "Organization",
          type: "text",
          placeholder: "Company or organization name",
          maxLength: 120,
        },
        {
          key: "role",
          label: "Role",
          type: "text",
          placeholder: "Your job title",
          maxLength: 120,
        },
        {
          key: "dateRange",
          label: "Dates",
          type: "text",
          placeholder: "Jan 2025 - Mar 2025",
          maxLength: 60,
        },
        {
          key: "points",
          label: "Bullet points",
          type: "bullets",
          placeholder: "What you did, and the result it produced.",
          maxItems: 6,
          maxLength: 600,
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
      defaultFontSize: 13,
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
          maxLength: 600,
        },
      ],
    },
    {
      key: "certifications",
      label: "Certifications",
      section: "Certifications",
      type: "repeater",
      itemLabel: "Certification",
      addLabel: "Add certification",
      maxItems: 8,
      defaultItems: 1,
      defaultFontSize: 13,
      subFields: [
        {
          key: "name",
          label: "Certification",
          type: "text",
          placeholder: "Certification name",
          maxLength: 180,
        },
        {
          key: "issuer",
          label: "Issuer",
          type: "text",
          placeholder: "Issuing organization",
          maxLength: 120,
        },
        {
          key: "credentialUrl",
          label: "Credential link (optional)",
          type: "text",
          placeholder: "Link to the credential",
          maxLength: 300,
        },
        {
          key: "issuedDate",
          label: "Issued",
          type: "text",
          placeholder: "Issued Jan 2025",
          maxLength: 60,
        },
      ],
    },
  ],
};
