const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const { sendMail } = require("../utils/mailer");

// Limit abuse: max 5 messages per 15 minutes per IP
const contactRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many messages sent. Please try again in a little while.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Escape HTML to prevent injection in the email body
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// POST /api/contact - send a "note" from the contact form to SCOPE Club
router.post(
  "/",
  contactRateLimit,
  [
    body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 120 }),
    body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
    body("company").optional({ nullable: true }).trim().isLength({ max: 160 }),
    body("topic").optional({ nullable: true }).trim().isLength({ max: 80 }),
    body("message").trim().notEmpty().withMessage("Message is required").isLength({ max: 5000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { name, email, company, topic, message } = req.body;

    const subject = `New CodeStats note${topic ? ` — ${topic}` : ""} from ${name}`;

    const text = [
      `New message from the CodeStats contact form`,
      ``,
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Institution: ${company}` : null,
      topic ? `Topic: ${topic}` : null,
      ``,
      `Message:`,
      message,
    ]
      .filter((line) => line !== null)
      .join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2 style="margin: 0 0 12px;">New CodeStats note</h2>
        <p style="margin: 0 0 4px;"><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p style="margin: 0 0 4px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${company ? `<p style="margin: 0 0 4px;"><strong>Institution:</strong> ${escapeHtml(company)}</p>` : ""}
        ${topic ? `<p style="margin: 0 0 4px;"><strong>Topic:</strong> ${escapeHtml(topic)}</p>` : ""}
        <p style="margin: 12px 0 4px;"><strong>Message:</strong></p>
        <p style="white-space: pre-wrap; margin: 0;">${escapeHtml(message)}</p>
      </div>
    `;

    try {
      await sendMail({ subject, text, html, replyTo: email });
      return res.json({ message: "Your message has been sent. We'll get back to you soon." });
    } catch (error) {
      console.error("Error sending contact email:", error.message);
      return res.status(500).json({
        message: "Sorry, we couldn't send your message right now. Please try again later.",
      });
    }
  }
);

module.exports = router;
