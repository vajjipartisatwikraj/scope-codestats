import React from "react";
import { fieldsToMap } from "../../../utils/resume";
import RichText from "./RichText";
import "./resumePaper.css";

/**
 * Classic template body: the HTML counterpart of the reference LaTeX document.
 *
 * It lays out content at real (unscaled) pixel sizes with plain elements and the classes of
 * resumePaper.css. The paper, margins, zoom and pagination belong to PaperPage and the preview.
 * Sizes, colours and spacing come from the template definition, as inline styles.
 *
 *   template     the template definition from /resumes/templates
 *   fields       [{ key, value, fontSize }]
 *   fontFamily   the CSS family of the font the student picked (the template's is the fallback)
 *   links        false renders links as plain text (thumbnails must not be tab stops)
 *
 * Word export: it reads the computed styles of this DOM and remaps the elements marked
 * data-resume-row="split" and "inline" (and their data-resume-cell children) into tables, because
 * Word's HTML engine has no flexbox. Keep those attributes when changing the markup.
 */

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

function Section({ title, typography, spacing, children }) {
  const { colors, sectionFontSize } = typography;
  return (
    <div style={{ marginTop: spacing.sectionTop }}>
      <div
        className="rbp-heading"
        style={{
          fontSize: sectionFontSize,
          color: colors.section,
          borderBottom: `1px solid ${colors.rule}`,
          paddingBottom: spacing.headingRule,
          marginBottom: spacing.sectionBottom,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

// Placeholder keeps the layout visible before anything is typed
function Empty({ children }) {
  return <div className="rbp-empty">{children}</div>;
}

function Link({ href, color, interactive, children }) {
  if (interactive && hasText(href)) {
    return (
      <a
        className="rbp-link"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color }}
      >
        {children}
      </a>
    );
  }
  return <span style={{ color }}>{children}</span>;
}

function SplitRow({ left, right, style }) {
  return (
    <div data-resume-row="split" className="rbp-row" style={style}>
      <div data-resume-cell="left" className="rbp-cell">
        {left}
      </div>
      {right ? (
        <div data-resume-cell="right" data-side="right" className="rbp-cell">
          {right}
        </div>
      ) : null}
    </div>
  );
}

function Bullets({ points, fontSize, spacing }) {
  const list = (Array.isArray(points) ? points : []).filter(hasText);
  if (list.length === 0) return null;

  return (
    <ul
      className="rbp-bullets"
      style={{ marginTop: spacing.bulletTop, fontSize }}
    >
      {list.map((point, index) => (
        <li key={index} style={{ marginBottom: spacing.bulletGap }}>
          <RichText text={point} />
        </li>
      ))}
    </ul>
  );
}

const Separator = ({ color }) => (
  <span className="rbp-sep" style={color ? { color } : undefined}>
    |
  </span>
);

export default function ClassicTemplate({ template, fields, fontFamily, links = true }) {
  const values = fieldsToMap(fields);
  const typography = template.typography;
  const { colors, baseFontSize, lineHeight } = typography;
  const spacing = { ...DEFAULT_SPACING, ...(typography.spacing || {}) };

  const sizeOf = (key, fallback = baseFontSize) => values[key]?.fontSize || fallback;
  const valueOf = (key) => values[key]?.value;
  const sectionProps = { typography, spacing };
  const gap = (index, size) => (index ? size : 0);

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

  const nameFilled = hasText(valueOf("fullName"));

  return (
    <div
      className="rbp"
      style={{
        // The user's chosen font wins; the template family is the fallback
        fontFamily: fontFamily || typography.fontFamily,
        fontSize: baseFontSize,
        lineHeight: lineHeight || 1.3,
        color: colors.text,
      }}
    >
      {/* ==================== HEADER ==================== */}
      <div className="rbp-center">
        <div
          className="rbp-name"
          data-empty={nameFilled ? "false" : "true"}
          style={{
            fontSize: sizeOf("fullName", 23),
            color: nameFilled ? colors.text : undefined,
          }}
        >
          {nameFilled ? valueOf("fullName") : "Your Name"}
        </div>

        <div
          data-resume-row="inline"
          className="rbp-contact"
          style={{ marginTop: spacing.contactTop, fontSize: sizeOf("contact") }}
        >
          {contactItems.length === 0 ? (
            <Empty>Location | Phone | Email | LinkedIn | GitHub</Empty>
          ) : (
            contactItems.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span>|</span>}
                {hasText(item.url) ? (
                  <Link href={item.url} color={colors.link} interactive={links}>
                    {item.text}
                  </Link>
                ) : (
                  <span>{item.text}</span>
                )}
              </React.Fragment>
            ))
          )}
        </div>
      </div>

      {/* ==================== OVERVIEW ==================== */}
      <Section title="Overview" {...sectionProps}>
        {hasText(valueOf("overview")) ? (
          <div className="rbp-overview" style={{ fontSize: sizeOf("overview") }}>
            <RichText text={valueOf("overview")} />
          </div>
        ) : (
          <Empty>Add a short professional summary.</Empty>
        )}
      </Section>

      {/* ==================== EDUCATION ==================== */}
      <Section title="Education" {...sectionProps}>
        {educationItems.length === 0 ? (
          <Empty>Add your education history.</Empty>
        ) : (
          educationItems.map((item, index) => (
            <div
              key={index}
              style={{
                fontSize: sizeOf("education"),
                marginTop: gap(index, spacing.entryGap),
              }}
            >
              <SplitRow
                left={<span className="rbp-bold">{item.institution}</span>}
                right={<span className="rbp-bold">{item.dateRange}</span>}
              />
              <SplitRow
                left={<span style={{ color: colors.muted }}>{item.degree}</span>}
                right={<span style={{ color: colors.muted }}>{item.score}</span>}
              />
            </div>
          ))
        )}
      </Section>

      {/* ==================== SKILLS ==================== */}
      <Section title="Skills" {...sectionProps}>
        {skillItems.length === 0 ? (
          <Empty>Add skill groups, for example Languages: Java, Python.</Empty>
        ) : (
          skillItems.map((item, index) => (
            <div
              key={index}
              style={{
                fontSize: sizeOf("skills"),
                marginTop: gap(index, spacing.entryGap),
              }}
            >
              {hasText(item.category) && (
                <span className="rbp-bold">{item.category}: </span>
              )}
              <RichText text={item.items} />
            </div>
          ))
        )}
      </Section>

      {/* ==================== EXPERIENCE ==================== */}
      <Section title="Experience" {...sectionProps}>
        {experienceItems.length === 0 ? (
          <Empty>Add internships, roles or leadership positions.</Empty>
        ) : (
          experienceItems.map((item, index) => (
            <div
              key={index}
              style={{
                fontSize: sizeOf("experience"),
                marginTop: gap(index, spacing.experienceGap),
              }}
            >
              <SplitRow
                left={
                  <>
                    <span className="rbp-bold">{item.organization}</span>
                    {hasText(item.role) && (
                      <>
                        <Separator color={colors.muted} />
                        <span style={{ color: colors.muted, fontSize: "0.94em" }}>
                          {item.role}
                        </span>
                      </>
                    )}
                  </>
                }
                right={<span className="rbp-bold">{item.dateRange}</span>}
              />
              <Bullets
                points={item.points}
                fontSize={sizeOf("experience")}
                spacing={spacing}
              />
            </div>
          ))
        )}
      </Section>

      {/* ==================== PROJECTS ==================== */}
      <Section title="Projects" {...sectionProps}>
        {projectItems.length === 0 ? (
          <Empty>Add your projects with a short set of bullet points.</Empty>
        ) : (
          projectItems.map((item, index) => (
            <div
              key={index}
              style={{
                fontSize: sizeOf("projects"),
                marginTop: gap(index, spacing.projectGap),
              }}
            >
              <SplitRow
                left={<span className="rbp-bold">{item.title}</span>}
                right={
                  hasText(item.liveUrl) || hasText(item.githubUrl) ? (
                    <>
                      {hasText(item.liveUrl) && (
                        <Link href={item.liveUrl} color={colors.link} interactive={links}>
                          Live
                        </Link>
                      )}
                      {hasText(item.liveUrl) && hasText(item.githubUrl) && <Separator />}
                      {hasText(item.githubUrl) && (
                        <Link href={item.githubUrl} color={colors.link} interactive={links}>
                          GitHub
                        </Link>
                      )}
                    </>
                  ) : null
                }
              />
              {hasText(item.techStack) && (
                <div className="rbp-italic" style={{ color: colors.muted }}>
                  {item.techStack}
                </div>
              )}
              <Bullets
                points={item.points}
                fontSize={sizeOf("projects")}
                spacing={spacing}
              />
            </div>
          ))
        )}
      </Section>

      {/* ==================== CERTIFICATIONS ==================== */}
      <Section title="Certifications" {...sectionProps}>
        {certificationItems.length === 0 ? (
          <Empty>Add certifications with their issuer and date.</Empty>
        ) : (
          certificationItems.map((item, index) => (
            <div
              key={index}
              style={{
                fontSize: sizeOf("certifications"),
                marginTop: gap(index, spacing.entryGap),
              }}
            >
              <SplitRow
                left={
                  <>
                    <span className="rbp-bold">{item.name}</span>
                    {hasText(item.issuer) && (
                      <>
                        <Separator color={colors.muted} />
                        <span style={{ color: colors.muted }}>{item.issuer}</span>
                      </>
                    )}
                    {hasText(item.credentialUrl) && (
                      <>
                        <Separator color={colors.muted} />
                        <Link
                          href={item.credentialUrl}
                          color={colors.link}
                          interactive={links}
                        >
                          Credential
                        </Link>
                      </>
                    )}
                  </>
                }
                right={<span>{item.issuedDate}</span>}
              />
            </div>
          ))
        )}
      </Section>
    </div>
  );
}
