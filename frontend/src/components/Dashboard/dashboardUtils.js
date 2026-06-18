// Shared constants and utility functions for Dashboard components

export const platforms = [
  {
    name: "LeetCode",
    key: "leetcode",
    logo: "https://assets.leetcode.com/static_assets/public/icons/favicon-192x192.png",
    color: "#FFA116",
  },
  {
    name: "CodeChef",
    key: "codechef",
    logo: "https://cdn.codechef.com/images/cc-logo.svg",
    color: "#5B4638",
  },
  {
    name: "HackerRank",
    key: "hackerrank",
    logo: "https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/160_Hackerrank_logo_logos-512.png",
    color: "#00AB6C",
  },
  {
    name: "CodeForces",
    key: "codeforces",
    logo: "https://cdn.iconscout.com/icon/free/png-256/free-codeforces-3628695-3029920.png",
    color: "#1F8ACB",
  },
  {
    name: "GitHub",
    key: "github",
    logo: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
    color: "#333333",
  },
  {
    name: "CodeStats",
    key: "scopecodestats",
    logo: "/scope-logo.png",
    color: "#4503fc",
  },
];

// Format date for tooltip display
export const formatTooltipDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const year = date.getFullYear();

  // Add ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
  const suffix = (day) => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  };

  return `${day}${suffix(day)} ${month} ${year}`;
};

// iPhone-style Liquid Glass styling functions
export const getLiquidGlassStyle = (darkMode) => ({
  background: darkMode
    ? `
      linear-gradient(135deg, 
        rgba(0, 0, 0, 0.95) 0%, 
        rgba(0, 0, 0, 0.9) 25%,
        rgba(5, 5, 5, 0.92) 50%,
        rgba(0, 0, 0, 0.88) 75%,
        rgba(0, 0, 0, 0.95) 100%
      )
    `
    : `
      linear-gradient(135deg, 
        rgba(255, 255, 255, 0.95) 0%, 
        rgba(250, 250, 250, 0.9) 25%,
        rgba(245, 245, 245, 0.92) 50%,
        rgba(240, 240, 240, 0.88) 75%,
        rgba(255, 255, 255, 0.95) 100%
      )
    `,
  backdropFilter: "blur(60px) saturate(120%)",
  WebkitBackdropFilter: "blur(60px) saturate(120%)",
  borderRadius: "20px",
  boxShadow: darkMode
    ? `
      0 20px 60px rgba(0, 0, 0, 0.8),
      0 10px 30px rgba(0, 0, 0, 0.6),
      0 4px 16px rgba(0, 0, 0, 0.4),
      inset 0 2px 4px rgba(255, 255, 255, 0.15),
      inset 0 -1px 2px rgba(0, 0, 0, 0.1)
    `
    : `
      0 20px 60px rgba(0, 0, 0, 0.15),
      0 10px 30px rgba(0, 0, 0, 0.1),
      0 4px 16px rgba(0, 0, 0, 0.08),
      inset 0 2px 4px rgba(255, 255, 255, 0.8),
      inset 0 -1px 2px rgba(0, 0, 0, 0.05)
    `,
  border: `1px solid ${darkMode ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.15)"}`,
  color: darkMode ? "rgba(255, 255, 255, 0.95)" : "rgba(0, 0, 0, 0.9)",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "1px",
    background: darkMode
      ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)"
      : "linear-gradient(90deg, transparent, rgba(0,0,0,0.15), transparent)",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: "1px",
    left: "15%",
    right: "15%",
    height: "0.5px",
    background: darkMode
      ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)"
      : "linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)",
    filter: "blur(0.5px)",
  },
});

export const getInnerGlassStyle = (darkMode) => ({
  background: darkMode
    ? `
      linear-gradient(135deg, 
        rgba(0, 0, 0, 0.8) 0%,
        rgba(10, 10, 10, 0.9) 30%,
        rgba(0, 0, 0, 0.85) 70%,
        rgba(5, 5, 5, 0.9) 100%
      )
    `
    : `
      linear-gradient(135deg, 
        rgba(240, 240, 240, 0.8) 0%,
        rgba(250, 250, 250, 0.9) 30%,
        rgba(245, 245, 245, 0.85) 70%,
        rgba(255, 255, 255, 0.9) 100%
      )
    `,
  backdropFilter: "blur(40px) saturate(110%)",
  WebkitBackdropFilter: "blur(40px) saturate(110%)",
  borderRadius: "16px",
  border: `1px solid ${darkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"}`,
  boxShadow: darkMode
    ? `
      0 12px 32px rgba(0, 0, 0, 0.6),
      0 6px 16px rgba(0, 0, 0, 0.4),
      inset 0 1px 2px rgba(255, 255, 255, 0.1),
      inset 0 -1px 1px rgba(0, 0, 0, 0.1)
    `
    : `
      0 12px 32px rgba(0, 0, 0, 0.1),
      0 6px 16px rgba(0, 0, 0, 0.08),
      inset 0 2px 3px rgba(255, 255, 255, 0.8),
      inset 0 -1px 1px rgba(0, 0, 0, 0.02)
    `,
  position: "relative",
  overflow: "hidden",
  transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: "15%",
    right: "15%",
    height: "1px",
    background: darkMode
      ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)"
      : "linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)",
  },
  "&:hover": {
    transform: "translateY(-4px) scale(1.005)",
    boxShadow: darkMode
      ? `
        0 18px 48px rgba(0, 0, 0, 0.7),
        0 8px 24px rgba(0, 0, 0, 0.5),
        inset 0 2px 3px rgba(255, 255, 255, 0.15),
        inset 0 -1px 1px rgba(0, 0, 0, 0.1)
      `
      : `
        0 18px 48px rgba(0, 0, 0, 0.15),
        0 8px 24px rgba(0, 0, 0, 0.1),
        inset 0 3px 4px rgba(255, 255, 255, 0.9),
        inset 0 -1px 1px rgba(0, 0, 0, 0.02)
      `,
  },
});

export const getButtonGlassStyle = (darkMode, isPrimary = false) => ({
  background: isPrimary
    ? "linear-gradient(145deg, #0088cc 0%, #005580 100%)"
    : darkMode
      ? `
        linear-gradient(135deg, 
          rgba(0, 0, 0, 0.6) 0%,
          rgba(15, 15, 15, 0.8) 50%,
          rgba(0, 0, 0, 0.7) 100%
        )
      `
      : `
        linear-gradient(135deg, 
          rgba(240, 240, 240, 0.8) 0%,
          rgba(250, 250, 250, 0.9) 50%,
          rgba(255, 255, 255, 0.8) 100%
        )
      `,
  backdropFilter: "blur(20px) saturate(110%)",
  WebkitBackdropFilter: "blur(20px) saturate(110%)",
  border: isPrimary
    ? "1px solid rgba(0, 136, 204, 0.3)"
    : `1px solid ${darkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"}`,
  borderRadius: "12px",
  color: isPrimary
    ? "white"
    : darkMode
      ? "rgba(255, 255, 255, 0.9)"
      : "rgba(0, 0, 0, 0.85)",
  boxShadow: isPrimary
    ? "0 4px 20px rgba(0, 136, 204, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)"
    : darkMode
      ? `
        0 4px 16px rgba(0, 0, 0, 0.4),
        0 2px 8px rgba(0, 0, 0, 0.3),
        inset 0 1px 1px rgba(255, 255, 255, 0.1)
      `
      : `
        0 4px 16px rgba(0, 0, 0, 0.1),
        0 2px 8px rgba(0, 0, 0, 0.08),
        inset 0 1px 2px rgba(255, 255, 255, 0.8)
      `,
  fontWeight: 600,
  position: "relative",
  overflow: "hidden",
  transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: "15%",
    right: "15%",
    height: "1px",
    background: darkMode
      ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)"
      : "linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)",
  },
  "&:hover": {
    transform: "translateY(-2px) scale(1.05)",
    background: isPrimary
      ? "linear-gradient(145deg, #0077bb 0%, #004470 100%)"
      : darkMode
        ? `
          linear-gradient(135deg, 
            rgba(0, 0, 0, 0.7) 0%,
            rgba(20, 20, 20, 0.9) 50%,
            rgba(0, 0, 0, 0.8) 100%
          )
        `
        : `
          linear-gradient(135deg, 
            rgba(230, 230, 230, 0.9) 0%,
            rgba(240, 240, 240, 0.95) 50%,
            rgba(250, 250, 250, 0.9) 100%
          )
        `,
    boxShadow: isPrimary
      ? "0 6px 24px rgba(0, 136, 204, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)"
      : darkMode
        ? `
          0 6px 20px rgba(0, 0, 0, 0.5),
          0 3px 12px rgba(0, 0, 0, 0.4),
          inset 0 2px 2px rgba(255, 255, 255, 0.15)
        `
        : `
          0 6px 20px rgba(0, 0, 0, 0.15),
          0 3px 12px rgba(0, 0, 0, 0.1),
          inset 0 2px 3px rgba(255, 255, 255, 0.9)
        `,
  },
});
