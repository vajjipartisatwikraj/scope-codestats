import React from "react";
import { Box } from "@mui/material";
import { fieldsToMap } from "../../../utils/resume";
import RichText from "./RichText";

/**
 * Classic template body - the HTML counterpart of the reference LaTeX document.
 *
 * ResumePreview owns the paper, margins, zoom and pagination; this component
 * only lays out content at real (unscaled) pixel sizes.
 */

// Long content must wrap onto new lines rather than being clipped by the page
const WRAP = {
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

const hasText = (value) => Boolean(String(value ?? "").trim());

// Drops repeater entries the user has left completely blank
const filledItems = (items, keys) =>
  (Array.isArray(items) ? items : []).filter((item) =>
    keys.some((key) =>
      Array.isArray(item?.[key]) ? item[key].some(hasText) : hasText(item?.[key]),
    ),
  );

// Kept in sync with resumeDocDefinition.js, which reads the same block
const DEFAULT_SPACING = {
  sectionTop: 9,
  sectionBottom: 4,
  headingRule: 2,
  contactTop: 6,
  entryGap: 3,
  experienceGap: 5,
  projectGap: 6,
  bulletTop: 1,
  bulletGap: 1,
};

const ClassicTemplate = ({ template, fields, fontFamily }) => {
  const values = fieldsToMap(fields);
  const { colors, sectionFontSize, baseFontSize, lineHeight } = template.typography;
  const spacing = { ...DEFAULT_SPACING, ...(template.typography.spacing || {}) };

  const sizeOf = (key, fallback = baseFontSize) => values[key]?.fontSize || fallback;
  const valueOf = (key) => values[key]?.value;

  // \titleformat{\section}{\large\bfseries\color{sectionblue}}{}{0em}{}[\titlerule]
  const Section = ({ title, children }) => (
    <Box sx={{ mt: `${spacing.sectionTop}px` }}>
      <Box
        sx={{
          fontSize: `${sectionFontSize}px`,
          fontWeight: 700,
          color: colors.section,
          borderBottom: `1px solid ${colors.rule}`,
          pb: `${spacing.headingRule}px`,
          mb: `${spacing.sectionBottom}px`,
        }}
      >
        {title}
      </Box>
      {children}
    </Box>
  );

  // Placeholder keeps the layout visible before anything is typed
  const Empty = ({ children }) => (
    <Box sx={{ color: "#b0b0b0", fontStyle: "italic", ...WRAP }}>{children}</Box>
  );

  const Link = ({ href, children }) =>
    hasText(href) ? (
      <Box
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        sx={{ color: colors.link, textDecoration: "underline" }}
      >
        {children}
      </Box>
    ) : (
      <Box component="span" sx={{ color: colors.link }}>
        {children}
      </Box>
    );

  // Left content with a right-aligned column, as \hfill does in LaTeX.
  // The data attributes let the Word export remap these onto tables, since
  // Word's HTML engine does not support flexbox.
  const SplitRow = ({ left, right, sx }) => (
    <Box
      data-resume-row="split"
      sx={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: "12px",
        ...sx,
      }}
    >
      <Box data-resume-cell="left" sx={{ minWidth: 0, ...WRAP }}>
        {left}
      </Box>
      {right ? (
        <Box
          data-resume-cell="right"
          sx={{ flexShrink: 0, textAlign: "right", ...WRAP }}
        >
          {right}
        </Box>
      ) : null}
    </Box>
  );

  const Bullets = ({ points, fontSize }) => {
    const list = (Array.isArray(points) ? points : []).filter(hasText);
    if (list.length === 0) return null;

    return (
      <Box
        component="ul"
        sx={{
          m: 0,
          mt: `${spacing.bulletTop}px`,
          // \setlist[itemize]{leftmargin=1.1em}
          pl: "1.1em",
          fontSize: `${fontSize}px`,
          // Tailwind's preflight strips list markers globally, so the resume
          // restores them itself rather than depending on global CSS
          listStyleType: "disc",
          listStylePosition: "outside",
          "& li": { display: "list-item", mb: `${spacing.bulletGap}px`, ...WRAP },
        }}
      >
        {list.map((point, index) => (
          <li key={index}>
            <RichText text={point} />
          </li>
        ))}
      </Box>
    );
  };

  const contactItems = filledItems(valueOf("contact"), ["text"]);
  const educationItems = filledItems(valueOf("education"), [
    "institution",
    "degree",
    "score",
    "dateRange",
  ]);
  const skillItems = filledItems(valueOf("skills"), ["category", "items"]);
  const experienceItems = filledItems(valueOf("experience"), [
    "organization",
    "role",
    "points",
  ]);
  const projectItems = filledItems(valueOf("projects"), ["title", "techStack", "points"]);
  const certificationItems = filledItems(valueOf("certifications"), ["name", "issuer"]);

  return (
    <Box
      sx={{
        // The user's chosen font wins; the template family is the fallback
        fontFamily: fontFamily || template.typography.fontFamily,
        fontSize: `${baseFontSize}px`,
        lineHeight: lineHeight || 1.3,
        color: colors.text,
        bgcolor: "transparent",
        maxWidth: "100%",
        ...WRAP,
      }}
    >
      {/* ==================== HEADER ==================== */}
      <Box sx={{ textAlign: "center" }}>
        <Box
          sx={{
            fontSize: `${sizeOf("fullName", 23)}px`,
            fontWeight: 700,
            lineHeight: 1.2,
            color: hasText(valueOf("fullName")) ? colors.text : "#b0b0b0",
            ...WRAP,
          }}
        >
          {hasText(valueOf("fullName")) ? valueOf("fullName") : "Your Name"}
        </Box>

        <Box
          data-resume-row="inline"
          sx={{
            mt: `${spacing.contactTop}px`,
            fontSize: `${sizeOf("contact")}px`,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            columnGap: "8px",
            ...WRAP,
          }}
        >
          {contactItems.length === 0 ? (
            <Empty>Location | Phone | Email | LinkedIn | GitHub</Empty>
          ) : (
            contactItems.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Box component="span">|</Box>}
                {hasText(item.url) ? (
                  <Link href={item.url}>{item.text}</Link>
                ) : (
                  <Box component="span">{item.text}</Box>
                )}
              </React.Fragment>
            ))
          )}
        </Box>
      </Box>

      {/* ==================== OVERVIEW ==================== */}
      <Section title="Overview">
        {hasText(valueOf("overview")) ? (
          <Box sx={{ fontSize: `${sizeOf("overview")}px`, textAlign: "justify", ...WRAP }}>
            <RichText text={valueOf("overview")} />
          </Box>
        ) : (
          <Empty>Add a short professional summary.</Empty>
        )}
      </Section>

      {/* ==================== EDUCATION ==================== */}
      <Section title="Education">
        {educationItems.length === 0 ? (
          <Empty>Add your education history.</Empty>
        ) : (
          educationItems.map((item, index) => (
            <Box key={index} sx={{ fontSize: `${sizeOf("education")}px`, mt: index ? `${spacing.entryGap}px` : 0 }}>
              <SplitRow
                left={<Box component="span" sx={{ fontWeight: 700 }}>{item.institution}</Box>}
                right={<Box component="span" sx={{ fontWeight: 700 }}>{item.dateRange}</Box>}
              />
              <SplitRow
                left={<Box component="span" sx={{ color: colors.muted }}>{item.degree}</Box>}
                right={<Box component="span" sx={{ color: colors.muted }}>{item.score}</Box>}
              />
            </Box>
          ))
        )}
      </Section>

      {/* ==================== SKILLS ==================== */}
      <Section title="Skills">
        {skillItems.length === 0 ? (
          <Empty>Add skill groups, for example Languages: Java, Python.</Empty>
        ) : (
          skillItems.map((item, index) => (
            <Box
              key={index}
              sx={{ fontSize: `${sizeOf("skills")}px`, mt: index ? `${spacing.entryGap}px` : 0, ...WRAP }}
            >
              {hasText(item.category) && (
                <Box component="span" sx={{ fontWeight: 700 }}>
                  {item.category}:{" "}
                </Box>
              )}
              <RichText text={item.items} />
            </Box>
          ))
        )}
      </Section>

      {/* ==================== EXPERIENCE ==================== */}
      <Section title="Experience">
        {experienceItems.length === 0 ? (
          <Empty>Add internships, roles or leadership positions.</Empty>
        ) : (
          experienceItems.map((item, index) => (
            <Box
              key={index}
              sx={{ fontSize: `${sizeOf("experience")}px`, mt: index ? `${spacing.experienceGap}px` : 0 }}
            >
              <SplitRow
                left={
                  <>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {item.organization}
                    </Box>
                    {hasText(item.role) && (
                      <>
                        <Box component="span" sx={{ color: colors.muted, mx: "6px" }}>
                          |
                        </Box>
                        <Box component="span" sx={{ color: colors.muted, fontSize: "0.94em" }}>
                          {item.role}
                        </Box>
                      </>
                    )}
                  </>
                }
                right={<Box component="span" sx={{ fontWeight: 700 }}>{item.dateRange}</Box>}
              />
              <Bullets points={item.points} fontSize={sizeOf("experience")} />
            </Box>
          ))
        )}
      </Section>

      {/* ==================== PROJECTS ==================== */}
      <Section title="Projects">
        {projectItems.length === 0 ? (
          <Empty>Add your projects with a short set of bullet points.</Empty>
        ) : (
          projectItems.map((item, index) => (
            <Box key={index} sx={{ fontSize: `${sizeOf("projects")}px`, mt: index ? `${spacing.projectGap}px` : 0 }}>
              <SplitRow
                left={<Box component="span" sx={{ fontWeight: 700 }}>{item.title}</Box>}
                right={
                  hasText(item.liveUrl) || hasText(item.githubUrl) ? (
                    <>
                      {hasText(item.liveUrl) && <Link href={item.liveUrl}>Live</Link>}
                      {hasText(item.liveUrl) && hasText(item.githubUrl) && (
                        <Box component="span" sx={{ mx: "6px" }}>
                          |
                        </Box>
                      )}
                      {hasText(item.githubUrl) && <Link href={item.githubUrl}>GitHub</Link>}
                    </>
                  ) : null
                }
              />
              {hasText(item.techStack) && (
                <Box sx={{ color: colors.muted, fontStyle: "italic", ...WRAP }}>
                  {item.techStack}
                </Box>
              )}
              <Bullets points={item.points} fontSize={sizeOf("projects")} />
            </Box>
          ))
        )}
      </Section>

      {/* ==================== CERTIFICATIONS ==================== */}
      <Section title="Certifications">
        {certificationItems.length === 0 ? (
          <Empty>Add certifications with their issuer and date.</Empty>
        ) : (
          certificationItems.map((item, index) => (
            <Box
              key={index}
              sx={{ fontSize: `${sizeOf("certifications")}px`, mt: index ? `${spacing.entryGap}px` : 0 }}
            >
              <SplitRow
                left={
                  <>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {item.name}
                    </Box>
                    {hasText(item.issuer) && (
                      <>
                        <Box component="span" sx={{ color: colors.muted, mx: "6px" }}>
                          |
                        </Box>
                        <Box component="span" sx={{ color: colors.muted }}>
                          {item.issuer}
                        </Box>
                      </>
                    )}
                    {hasText(item.credentialUrl) && (
                      <>
                        <Box component="span" sx={{ color: colors.muted, mx: "6px" }}>
                          |
                        </Box>
                        <Link href={item.credentialUrl}>Credential</Link>
                      </>
                    )}
                  </>
                }
                right={<Box component="span">{item.issuedDate}</Box>}
              />
            </Box>
          ))
        )}
      </Section>
    </Box>
  );
};

export default ClassicTemplate;
