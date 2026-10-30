/**
 * A made-up person, used only to draw the template previews (the gallery of the New resume dialog).
 * It is never stored and never shown on a student's own resume.
 */
module.exports = {
  fullName: "Ananya Rao",
  contact: [
    { text: "+91 98765 43210", url: "tel:+919876543210" },
    { text: "ananya.rao@example.com", url: "mailto:ananya.rao@example.com" },
    { text: "LinkedIn", url: "https://linkedin.com/in/ananya-rao" },
    { text: "GitHub", url: "https://github.com/ananya-rao" },
    { text: "Hyderabad, India", url: "" },
  ],
  overview:
    "Final-year Computer Science student who builds reliable web products end to end, from API design to a clean interface. Solves problems daily on competitive programming platforms and enjoys turning rough ideas into shipped features.",
  education: [
    {
      institution: "MLR Institute of Technology",
      dateRange: "Aug 2022 - Present",
      degree: "B.Tech - Computer Science and Engineering",
      score: "CGPA: 8.9",
    },
    {
      institution: "Narayana Junior College",
      dateRange: "Jun 2020 - Apr 2022",
      degree: "Intermediate - MPC",
      score: "Percentage: 97.2",
    },
  ],
  skills: [
    { category: "Languages", items: "JavaScript, Java, Python, SQL, C++" },
    { category: "Frameworks", items: "React, Node.js, Express, Spring Boot" },
    { category: "Tools", items: "Git, Docker, MongoDB, PostgreSQL, Postman" },
  ],
  experience: [
    {
      organization: "Northwind Labs",
      role: "Software Engineering Intern",
      dateRange: "May 2025 - Jul 2025",
      points: [
        "Built a reporting dashboard in React and Node.js that cut weekly manual reporting by **6 hours**.",
        "Wrote REST endpoints and unit tests that raised coverage of the billing service from 48% to 82%.",
      ],
    },
    {
      organization: "SCOPE Club",
      role: "Technical Lead",
      dateRange: "Jan 2024 - Present",
      points: [
        "Led a team of 8 students to ship the club's coding assessment platform, used by 1,000+ students.",
        "Ran weekly problem-solving sessions and mentored 30 juniors through their first contests.",
      ],
    },
  ],
  projects: [
    {
      title: "CodeStats Tracker",
      techStack: "React, Node.js, MongoDB",
      liveUrl: "https://example.com/codestats",
      githubUrl: "https://github.com/ananya-rao/codestats",
      points: [
        "Aggregates problem-solving activity from five platforms into one score and a college leaderboard.",
        "Cached platform responses to keep page loads under **300 ms** for 1,000 users.",
      ],
    },
    {
      title: "Campus Connect",
      techStack: "Java, Spring Boot, PostgreSQL",
      liveUrl: "",
      githubUrl: "https://github.com/ananya-rao/campus-connect",
      points: ["A placement portal where students apply to drives and track every round in one place."],
    },
  ],
  certifications: [
    {
      name: "AWS Certified Cloud Practitioner",
      issuer: "Amazon Web Services",
      credentialUrl: "https://example.com/credential/aws",
      issuedDate: "Issued Mar 2025",
    },
    {
      name: "Data Structures and Algorithms",
      issuer: "NPTEL",
      credentialUrl: "",
      issuedDate: "Issued Nov 2024",
    },
  ],
  achievements: [
    {
      title: "Winner, Smart India Hackathon (Software Edition)",
      issuer: "Ministry of Education",
      date: "Dec 2024",
      link: "",
      points: ["Led a team of 6 to build a crop-advisory app that placed first among 40 teams in the college round."],
    },
    {
      title: "Top 1% on LeetCode, contest rating 2000+",
      issuer: "LeetCode",
      date: "2025",
      link: "https://leetcode.com/u/ananya-rao/",
      points: [],
    },
  ],
  titles: {},
  breaks: {},
};
