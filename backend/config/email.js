/**
 * What the emails the platform sends say about who sends them and where to get help.
 *
 *   SUPPORT_EMAIL   where a student writes when an email looks wrong (default: MAIL_TO, then the
 *                   SCOPE Club address). It is also the reply-to of every automated email.
 *   SUPPORT_WHATSAPP  the WhatsApp number of the help button, with or without the + and spaces
 *   FRONTEND_URL    the address of the web app, for the button of an email
 *
 * Read when asked, so a test can change process.env.
 */

const brand = {
  platform: "CodeStats",
  club: "SCOPE Club",
  institution: "MLR Institute of Technology",
  address: "Dundigal, Hyderabad, Telangana",
};

/**
 * The logos every email shows, as public addresses (mail apps load them from the web, so nothing is
 * attached). Hashed file names change when the app is rebuilt, so each can be set in the environment:
 *   EMAIL_LOGO_URL, EMAIL_CLUB_LOGO_LIGHT_URL, EMAIL_CLUB_LOGO_DARK_URL
 */
const logos = () => ({
  banner: process.env.EMAIL_LOGO_URL || "https://scope.mlrit.ac.in/assets/logo-CDjvtbaU.png",
  clubLight: process.env.EMAIL_CLUB_LOGO_LIGHT_URL || "https://scope.mlrit.ac.in/assets/club-logo-light-DJAcwMqJ.png",
  clubDark: process.env.EMAIL_CLUB_LOGO_DARK_URL || "https://scope.mlrit.ac.in/assets/club-logo-dark-CBYCm8Ab.png",
});
const supportEmail = () => process.env.SUPPORT_EMAIL || process.env.MAIL_TO || "scopeclub@mlrinstitutions.ac.in";

/**
 * The "message us on WhatsApp" link, or null when no number is set. `text` fills the message box so
 * the person only has to press send.
 */
const whatsappLink = (text = "") => {
  const number = String(process.env.SUPPORT_WHATSAPP || "").replace(/\D/g, "");
  if (number.length < 8) return null;
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};
/** The web app's address without a trailing slash */
const appUrl = () => String(process.env.FRONTEND_URL || "").replace(/\/+$/, "");

module.exports = { brand, logos, supportEmail, whatsappLink, appUrl };
