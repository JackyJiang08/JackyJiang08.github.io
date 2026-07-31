// ============================================================
// Highlights data — a factual log, one line per entry.
//
// To add a highlight, append an object:
//   Join entries:
//     { date: "YYYY-MM", role: "Data Analyst Intern",
//       org: "DP World", orgLink?: "https://…", orgNote?: " at UIUC" }
//     → rendered as "[YYYY-MM] Joined <org link> as a <bold role>."
//   Other entries (papers, milestones):
//     { date: "YYYY-MM", text: "…", link?: "https://…", linkText?: "…" }
//     → linkText marks the only words that become the link.
// The page shows the 5 most recent; the News Archive modal shows
// everything grouped by year — both update automatically.
// ============================================================

const HIGHLIGHTS = [
  {
    date: "2026-06",
    role: "Quantitative Finance AI Intern",
    org: "Pacific Financial Professional Association",
    orgLink: "https://www.pfpa-financial.com/",
  },
  {
    date: "2026-03",
    text: "Steer2Adapt accepted at the ICLR 2026 Workshop on Representational Alignment (Re-Align).",
    link: "https://arxiv.org/abs/2602.07276",
    linkText: "Steer2Adapt",
  },
  {
    date: "2026-02",
    role: "Undergraduate Research Assistant",
    org: "ScribeAR",
    orgLink: "https://scribear.illinois.edu/v/index.html",
    orgNote: " at UIUC",
  },
  {
    date: "2026-01",
    role: "Marketing Analytics & Strategy Intern",
    org: "Earnest Agriculture",
    orgLink: "https://www.earnest.ag/",
  },
  {
    date: "2025-09",
    role: "Undergraduate Research Assistant",
    org: "U Lab",
    orgLink: "https://github.com/ulab-uiuc",
  },
  {
    date: "2025-09",
    role: "Data Analyst Intern",
    org: "SeeU International",
    orgLink: "https://us.seeu-edu.com/",
  },
  {
    date: "2025-06",
    role: "Operations & Analytics Intern",
    org: "Walt Disney Company",
    orgLink: "https://thewaltdisneycompany.com/",
  },
  {
    date: "2024-05",
    role: "Data Analyst Intern",
    org: "DP World",
    orgLink: "https://www.dpworld.com/en",
  },
];
