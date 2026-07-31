// ============================================================
// Highlights data — a factual log, one line per entry.
//
// To add a highlight, append an object:
//   Join entries:
//     { date: "YYYY-MM", role: "Data Analyst Intern",
//       org: "DP World", orgLink?: "https://…", orgNote?: " at UIUC" }
//     → rendered as "[YYYY-MM] Joined <org link> as a <bold role>."
//   Other entries (releases, papers, programs):
//     { date: "YYYY-MM", text: "…", link?: "https://…", linkText?: "…" }
//     → linkText marks the only words that become the link.
//
// Ordering: entries are sorted newest-first by date; the sort is
// STABLE, so entries sharing a date render in ARRAY ORDER — put
// the more recent one first (e.g. Goldman Sachs above Brattle in
// 2025-05). The page shows the 10 most recent; the News Archive
// modal shows everything grouped by year.
// ============================================================

const HIGHLIGHTS = [
  {
    date: "2026-08",
    text: "Released Market-Based Credit Rating, a KMV/Merton structural pipeline for banks.",
    link: "https://jackyjiang08.github.io/market-based-credit-rating/",
    linkText: "Market-Based Credit Rating",
  },
  {
    date: "2026-07",
    text: "Open-sourced CUDA-NPP-Edge-Detection, GPU-accelerated edge detection with CUDA NPP.",
    link: "https://github.com/JackyJiang08/CUDA-NPP-Edge-Detection",
    linkText: "CUDA-NPP-Edge-Detection",
  },
  {
    date: "2026-07",
    text: "Released Music-Streaming Analytics, covering 50K users and 1.5M streaming events.",
    link: "https://github.com/JackyJiang08/music-streaming-user-behavior-analytics",
    linkText: "Music-Streaming Analytics",
  },
  {
    date: "2026-06",
    role: "Quantitative Finance AI Intern",
    org: "Pacific Financial Professional Association",
    orgLink: "https://www.pfpa-financial.com/",
  },
  {
    date: "2026-04",
    text: "Launched the first official website for the MYOW DIY Club.",
    link: "https://myow-club-website.vercel.app/",
    linkText: "MYOW DIY Club",
  },
  {
    date: "2026-03",
    text: "Steer2Adapt accepted at the ICLR 2026 Workshop on Representational Alignment (Re-Align).",
    link: "https://arxiv.org/abs/2602.07276",
    linkText: "Steer2Adapt",
  },
  {
    date: "2026-03",
    text: "Launched AI Monitor Platform, a real-time AI-industry dashboard and LLM benchmarking arena.",
    link: "https://aimonitor-nine.vercel.app/",
    linkText: "AI Monitor Platform",
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
    date: "2025-07",
    text: "Built a Multi-Agent AI Platform with LangChain and n8n to automate everyday workflows.",
  },
  {
    date: "2025-06",
    role: "Operations & Analytics Intern",
    org: "Walt Disney Company",
    orgLink: "https://thewaltdisneycompany.com/",
  },
  {
    date: "2025-05",
    text: "Selected for the Goldman Sachs 2025 Virtual Insight Series.",
  },
  {
    date: "2025-05",
    text: "Selected for The Brattle Group Sophomore Consulting Exploratory Program.",
  },
  {
    date: "2024-07",
    text: "Completed Credit Card Fraud Modeling & Fraud-Strategy Development.",
  },
  {
    date: "2024-05",
    role: "Data Analyst Intern",
    org: "DP World",
    orgLink: "https://www.dpworld.com/en",
  },
];
