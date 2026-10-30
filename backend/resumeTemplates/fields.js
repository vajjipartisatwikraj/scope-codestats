/**
 * The fields a resume can hold, defined once for every template.
 *
 * A template is a single HTML file (see index.js). It does not declare its own form: the editor shows
 * exactly the fields whose placeholders appear in the template's HTML, and takes their labels, types
 * and limits from this list. So a template only has to use the placeholders it wants, for example
 * {{fullName}} or {{#education}} ... {{institution}} ... {{/education}}, and the right inputs appear.
 *
 * Field types:
 *   text       a single line
 *   url        a single line that must be a web, mail or phone link (anything else is dropped)
 *   multiline  a paragraph; line breaks are kept, **bold**, *italic* and `code` are understood
 *   bullets    a list of strings, one per bullet
 *   repeater   repeatable entries, each described by `subFields`
 *
 * Placeholders must stay generic: they are hints for every user, not sample data for one person.
 */

const SECTIONS = [
  {
    key: "personal",
    title: "Personal details",
    fixed: true,
    fields: [
      {
        key: "fullName",
        label: "Full name",
        type: "text",
        placeholder: "Your full name",
        maxLength: 80,
      },
      {
        key: "contact",
        label: "Contact line",
        helperText: "Shown under your name. Add a link to make an item clickable.",
        type: "repeater",
        itemLabel: "Item",
        addLabel: "Add contact item",
        maxItems: 8,
        defaultItems: 1,
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
            type: "url",
            placeholder: "https://linkedin.com/in/username",
            maxLength: 300,
          },
        ],
      },
    ],
  },
  {
    key: "overview",
    title: "Overview",
    fields: [
      {
        key: "overview",
        label: "Overview",
        type: "multiline",
        helperText: "Press Enter for a new line. Use the buttons for bold and italic.",
        placeholder:
          "A short summary of who you are, what you build, and the strengths you want read first.",
        maxLength: 1200,
      },
    ],
  },
  {
    key: "education",
    title: "Education",
    fields: [
      {
        key: "education",
        label: "Education",
        type: "repeater",
        itemLabel: "Education",
        addLabel: "Add education",
        maxItems: 6,
        defaultItems: 1,
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
    ],
  },
  {
    key: "skills",
    title: "Skills",
    fields: [
      {
        key: "skills",
        label: "Skills",
        type: "repeater",
        itemLabel: "Skill group",
        addLabel: "Add skill group",
        maxItems: 10,
        defaultItems: 1,
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
    ],
  },
  {
    key: "experience",
    title: "Experience",
    fields: [
      {
        key: "experience",
        label: "Experience",
        type: "repeater",
        itemLabel: "Role",
        addLabel: "Add experience",
        maxItems: 8,
        defaultItems: 1,
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
    ],
  },
  {
    key: "projects",
    title: "Projects",
    fields: [
      {
        key: "projects",
        label: "Projects",
        type: "repeater",
        itemLabel: "Project",
        addLabel: "Add project",
        maxItems: 8,
        defaultItems: 1,
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
            type: "url",
            placeholder: "https://your-project.com",
            maxLength: 300,
          },
          {
            key: "githubUrl",
            label: "GitHub link (optional)",
            type: "url",
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
    ],
  },
  {
    key: "certifications",
    title: "Certifications",
    fields: [
      {
        key: "certifications",
        label: "Certifications",
        type: "repeater",
        itemLabel: "Certification",
        addLabel: "Add certification",
        maxItems: 8,
        defaultItems: 1,
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
            type: "url",
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
  },
  {
    key: "achievements",
    title: "Achievements",
    fields: [
      {
        key: "achievements",
        label: "Achievements",
        type: "repeater",
        itemLabel: "Achievement",
        addLabel: "Add achievement",
        maxItems: 8,
        defaultItems: 1,
        subFields: [
          {
            key: "title",
            label: "Achievement",
            type: "text",
            placeholder: "Award, rank, hackathon win or scholarship",
            maxLength: 160,
          },
          {
            key: "issuer",
            label: "Event or organization",
            type: "text",
            placeholder: "Where or from whom you earned it",
            maxLength: 120,
          },
          {
            key: "date",
            label: "Date",
            type: "text",
            placeholder: "Mar 2025",
            maxLength: 60,
          },
          {
            key: "link",
            label: "Link (optional)",
            type: "url",
            placeholder: "Link to proof or the announcement",
            maxLength: 300,
          },
          {
            key: "points",
            label: "Details",
            type: "bullets",
            placeholder: "What you did, and what made it stand out.",
            maxItems: 4,
            maxLength: 400,
          },
        ],
      },
    ],
  },
];

/** Every top-level field definition, by key */const FIELDS = SECTIONS.flatMap((section) => section.fields);

/** The sections whose heading the student can rename and whose page break they can set */
const TITLED_SECTIONS = SECTIONS.filter((section) => !section.fixed);

module.exports = { SECTIONS, FIELDS, TITLED_SECTIONS };
