/**
 * The frame every email of the platform shares, and the small pieces to put in it.
 *
 * The look follows DESIGN.md, reduced to what mail apps render reliably: square corners, one electric
 * blue band that looks the same in light and dark mode, flat sections separated by 1px rules (no
 * boxes inside boxes), one small-radius button, and one typeface, Plus Jakarta Sans. Mail apps that
 * block web fonts (Gmail and Outlook among them) show the closest sans they have instead.
 *
 * An email cannot read the app's tokens, so the values below are copied from the DESIGN.md tables
 * (Daylight in the inline styles, Midnight in the dark-scheme block). Change them there first.
 *
 *   renderEmail({ preheader, title, subtitle, content, cta, reference })  -> html
 *   toPlainText(...)                                                                -> text
 *
 * Pieces for `content` (each returns HTML): paragraph, section, rows, list.
 * Everything a person or an admin typed goes through `esc` first.
 */
const { brand, logos, supportEmail, whatsappLink } = require("../../config/email");

// Daylight (DESIGN.md, Theme mapping) and the accent
const C = {
  canvas: "#F1F2F7",
  surface: "#FFFFFF",
  line: "#E3E5EE",
  text: "#11131C",
  muted: "#4B5066",
  accent: "#0585E0",
  accentInk: "#035FA0",
  onAccent: "#FFFFFF",
  onAccentSoft: "#E6F3FD", // a tint of white on the blue, not grey
  whatsapp: "#0B7A5A", // the ink of the help button: a deep WhatsApp green, 5.3:1 on white
  bannerLine: "#4FA9EA", // white at 30% over the accent, as a solid colour so every mail app draws it
};
/** A background Gmail's forced dark mode leaves alone: it only recolours plain background colours */
const lock = (color) => `background-color:${color};background-image:linear-gradient(${color},${color});`;
const FONT = "'Plus Jakarta Sans',Helvetica,Arial,sans-serif";
const FONT_URL = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap";

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

/** "19 Nov 2026, 11:35 am IST" */
const istStamp = (date = new Date()) =>
  `${date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })} IST`;

/** The first name for "Hi ...", skipping a title such as Dr. or Prof. */
const firstName = (name) => {
  const words = String(name || "").trim().split(/\s+/).filter((word) => word && !/^(dr|prof|mr|mrs|ms|mx|er)\.?$/i.test(word));
  return words[0] || "there";
};

// ---- pieces -------------------------------------------------------------------------------------
const paragraph = (html) =>
  `<p class="t-text" style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.65;font-weight:400;color:${C.text};">${html}</p>`;

/** A titled block: a hairline above it, the title, then `inner` (HTML) */
const section = (title, inner) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0;"><tr>
    <td class="t-line" style="border-top:1px solid ${C.line};padding:22px 0 0;">
      <p class="t-text" style="margin:0 0 6px;font-family:${FONT};font-size:15px;line-height:1.4;font-weight:700;color:${C.text};">${esc(title)}</p>
      ${inner}
    </td>
  </tr></table>`;

/** Label at the left, value at the right, a hairline between rows */
const rows = (items) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${items
    .map((item, index) => {
      const rule = index > 0 ? `border-top:1px solid ${C.line};` : "";
      const cls = index > 0 ? " t-line" : "";
      return `<tr>
        <td class="t-text${cls}" valign="top" style="padding:11px 0;${rule}font-family:${FONT};font-size:14px;line-height:1.5;font-weight:400;color:${C.text};">${esc(item.label)}</td>
        <td class="t-text${cls}" valign="top" align="right" style="padding:11px 0 11px 16px;${rule}font-family:${FONT};font-size:14px;line-height:1.5;font-weight:600;color:${C.text};word-break:break-all;">${esc(item.value)}</td>
      </tr>`;
    })
    .join("")}</table>`;

/**
 * Short statements one under the other, each with a bullet and no rule between them (an item is HTML).
 * The bullet is a character in the same font and line height as the text, in the text colour (dark in
 * Daylight, white in Midnight), so it sits on the first line of its item whatever the font does.
 */
const list = (items) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:2px 0 0;">${items
    .map(
      (item) => `<tr>
        <td class="t-text" width="18" valign="top" style="width:18px;padding:4px 0;font-family:${FONT};font-size:14px;line-height:1.6;font-weight:700;color:${C.text};">&bull;</td>
        <td class="t-text" valign="top" style="padding:4px 0;font-family:${FONT};font-size:14px;line-height:1.6;font-weight:400;color:${C.text};">${item}</td>
      </tr>`
    )
    .join("")}</table>`;
// ---- the frame ----------------------------------------------------------------------------------
function ctaButton(cta) {
  if (!cta || !cta.url) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 6px;"><tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
      <td align="center" bgcolor="${C.accent}" style="${lock(C.accent)}border-radius:8px;">
        <a href="${esc(cta.url)}" target="_blank" style="display:inline-block;padding:13px 28px;font-family:${FONT};font-size:14px;line-height:1;font-weight:600;color:${C.onAccent};text-decoration:none;border-radius:8px;">${esc(cta.label)}</a>
      </td>
    </tr></table>
  </td></tr></table>`;
}

/** The secondary button of the contact section, centred: outlined, so the blue button stays the one main action */
function whatsappButton(whatsapp) {
  if (!whatsapp || !whatsapp.url) return "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;"><tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
      <td align="center" class="wa-btn" style="border:1px solid ${C.whatsapp};border-radius:8px;">
        <a class="wa-link" href="${esc(whatsapp.url)}" target="_blank" style="display:inline-block;padding:11px 22px;font-family:${FONT};font-size:14px;line-height:1;font-weight:600;color:${C.whatsapp};text-decoration:none;border-radius:8px;">${esc(whatsapp.label || "Message us on WhatsApp")}</a>
      </td>
    </tr></table>
  </td></tr></table>`;
}
/**
 * The contact section every email ends with, the same in all of them: the club's address, the
 * reference to quote, and the WhatsApp button (SUPPORT_EMAIL and SUPPORT_WHATSAPP, config/email.js).
 */
function helpSection(reference) {
  const url = whatsappLink(`Hi, I need help with ${brand.platform}.${reference ? ` Reference: ${reference}` : ""}`);
  return {
    title: "Facing some issues?",
    text: "Tell us what is going wrong and we will help you out.",
    whatsapp: url ? { url, label: "Message us on WhatsApp" } : null,
  };
}
/**
 * @param {object} email
 * @param {string} email.preheader  the grey line next to the subject in an inbox
 * @param {string} email.title      the big line in the banner
 * @param {string} email.subtitle   the small line under it (sentence case)
 * @param {string} email.content    HTML from the pieces above
 * @param {{label: string, url: string}} [email.cta]
 * @param {string} [email.reference]  an id the person can quote to support
 * @param {string} [email.sentAt]     when it was sent, for the last line of the footer
 */
function renderEmail({ preheader = "", title, subtitle = "", content, cta, reference, sentAt }) {
  const logo = logos();
  const help = helpSection(reference);
  const contact = supportEmail();
  // Gmail folds a footer that repeats from an earlier email into a "..." link; a last line that is
  // different every time (the reference and the minute of sending) keeps the whole email on show
  const sentLine = [reference ? `Reference ${reference}` : "", sentAt || ""].filter(Boolean).join(", ");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(title)}</title>
<link href="${FONT_URL}" rel="stylesheet">
<style>
  @import url('${FONT_URL}');
  @media only screen and (max-width: 620px) {
    .outer { padding: 0 0 24px !important; }
    .container { width: 100% !important; border: 0 !important; }
    .pad { padding-left: 20px !important; padding-right: 20px !important; }
    .banner-title { font-size: 22px !important; }
  }
  /* The blue band is left out on purpose: it stays the same in both schemes */
  @media (prefers-color-scheme: dark) {
    .bg-canvas { background-color: #040405 !important; }
    .bg-card { background-color: #0D0D0F !important; }
    .t-text { color: #F1F3FB !important; }
    .t-muted { color: #A9ADC9 !important; }
    .t-line { border-color: #26262B !important; }
    .t-link { color: #66BFFF !important; }
    .wa-btn { border-color: #4ADE9A !important; }
    .wa-link { color: #4ADE9A !important; }
    .box-card { border-color: #26262B !important; }
    .chip { background-color: transparent !important; background-image: none !important; padding: 0 !important; }
    .logo-light { display: none !important; }
    .logo-dark { display: block !important; }
  }
</style>
</head>
<body class="bg-canvas" style="margin:0;padding:0;background-color:${C.canvas};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${esc(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.canvas}" class="bg-canvas" style="background-color:${C.canvas};">
<tr><td align="center" class="outer" style="padding:28px 0 40px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container box-card" style="width:100%;max-width:600px;border:1px solid ${C.line};">
    <!-- Banner -->
    <tr><td bgcolor="${C.accent}" class="pad" style="${lock(C.accent)}padding:26px 32px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td valign="middle" bgcolor="#FFFFFF" style="${lock("#FFFFFF")}border-radius:6px;padding:7px 8px;"><img src="${esc(logo.banner)}" width="25" height="28" alt="" style="display:block;border:0;width:25px;height:28px;"></td>
        <td valign="middle" style="padding-left:12px;font-family:${FONT};font-size:22px;line-height:1;font-weight:700;letter-spacing:-0.01em;color:${C.onAccent};">${esc(brand.platform)}</td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;"><tr><td height="1" style="height:1px;line-height:1px;font-size:1px;background-color:${C.bannerLine};margin:0;">&nbsp;</td></tr></table>
      <h1 class="banner-title" style="margin:22px 0 8px;font-family:${FONT};font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:${C.onAccent};">${esc(title)}</h1>
      ${subtitle ? `<p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.5;font-weight:500;color:${C.onAccentSoft};">${esc(subtitle)}</p>` : ""}
    </td></tr>
    <!-- Body -->
    <tr><td bgcolor="${C.surface}" class="bg-card pad" style="background-color:${C.surface};padding:32px 32px 8px;">
      ${content}
      ${ctaButton(cta)}
    </td></tr>
    <!-- Support -->
    <tr><td bgcolor="${C.surface}" class="bg-card pad" style="background-color:${C.surface};padding:0 32px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;"><tr>
        <td class="t-line" style="border-top:1px solid ${C.line};padding:22px 0 0;">
          <p class="t-text" style="margin:0 0 4px;font-family:${FONT};font-size:14px;line-height:1.5;font-weight:700;color:${C.text};">${esc(help.title)}</p>
          <p class="t-muted" style="margin:0;font-family:${FONT};font-size:13px;line-height:1.65;font-weight:400;color:${C.muted};">${esc(help.text)} ${help.whatsapp ? "Message us on WhatsApp or write to" : "Write to"} <a class="t-link" href="mailto:${esc(contact)}" style="color:${C.accentInk};font-weight:600;text-decoration:underline;">${esc(contact)}</a>${reference ? `, quoting reference <span class="t-text" style="font-weight:600;color:${C.text};">${esc(reference)}</span>` : ""}.</p>
          ${whatsappButton(help.whatsapp)}
        </td>
      </tr></table>
    </td></tr>
    <!-- Footer -->
    <tr><td align="center" bgcolor="${C.surface}" class="bg-card pad t-line" style="background-color:${C.surface};border-top:1px solid ${C.line};padding:24px 32px 28px;text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 14px;"><tr>
        <td align="center" bgcolor="#FFFFFF" class="chip" style="${lock("#FFFFFF")}border-radius:6px;padding:8px 14px;">
          <img src="${esc(logo.clubLight)}" width="96" alt="${esc(brand.club)}" class="logo-light" style="display:block;border:0;width:96px;height:auto;">
          <img src="${esc(logo.clubDark)}" width="96" alt="" class="logo-dark" style="display:none;border:0;width:96px;height:auto;">
        </td>
      </tr></table>
      <p class="t-text" style="margin:0 0 2px;font-family:${FONT};font-size:12px;line-height:1.6;font-weight:600;color:${C.text};">${esc(brand.club)}, ${esc(brand.institution)}</p>
      <p class="t-muted" style="margin:0 0 10px;font-family:${FONT};font-size:12px;line-height:1.6;font-weight:400;color:${C.muted};">${esc(brand.address)}</p>
      <p class="t-muted" style="margin:0 0 6px;font-family:${FONT};font-size:11px;line-height:1.6;font-weight:400;color:${C.muted};">This is an automated message about your ${esc(brand.platform)} account. You can reply to it if you need help.</p>
      ${sentLine ? `<p class="t-muted" style="margin:0;font-family:${FONT};font-size:11px;line-height:1.6;font-weight:400;color:${C.muted};">${esc(sentLine)}</p>` : ""}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** The same message as plain text, for mail apps that show no HTML */
function toPlainText({ title, subtitle, lines = [], cta, reference }) {
  const contact = supportEmail();
  const help = helpSection(reference);
  return [
    `${brand.platform}`,
    "",
    title,
    subtitle || "",
    "",
    ...lines,
    "",
    cta && cta.url ? `${cta.label}: ${cta.url}` : "",
    "",
    `${help.title}${/[.?!]$/.test(help.title) ? "" : "."} ${help.text} ${help.whatsapp ? "Message us on WhatsApp or write to" : "Write to"} ${contact}${reference ? `, quoting reference ${reference}` : ""}.`,
    help.whatsapp && help.whatsapp.url ? `WhatsApp: ${help.whatsapp.url}` : "",
    "",
    `${brand.club}, ${brand.institution}`,
    brand.address,
  ]
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n");
}

module.exports = { renderEmail, toPlainText, esc, firstName, istStamp, paragraph, section, rows, list };
