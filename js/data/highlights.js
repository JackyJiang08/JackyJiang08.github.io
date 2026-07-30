// ============================================================
// Highlights data.
//
// To add a highlight: append an object
//   { date: "YYYY-MM", text: "...", link?: "..." }
// — the page renders and filters automatically (newest first;
// year filter chips are generated from the dates in this file).
//
// Optional extra field:
//   label: "..."  — display text for the date chip when a plain
//   "YYYY-MM" is too precise (e.g. "Spring 2026"). Sorting still
//   uses `date`.
// ============================================================

const HIGHLIGHTS = [
  {
    date: "2026-07",
    text: "Released an end-to-end music-streaming analytics codebase — churn/conversion models, A/B testing, survival analysis, and uplift targeting across 10 CI-tested notebooks.",
    link: "https://github.com/JackyJiang08/music-streaming-user-behavior-analytics",
  },
  {
    date: "2026-06",
    text: "Joined Pacific Financial Professional Association as a Quantitative Finance AI Intern — building a four-layer market-data pipeline powering a Merton/KMV structural credit-risk model.",
  },
  {
    date: "2026-03",
    label: "Spring 2026",
    text: "Steer2Adapt was accepted at the ICLR 2026 Workshop on Representational Alignment (Re-Align).",
    link: "https://arxiv.org/abs/2602.07276",
  },
  {
    date: "2026-03",
    text: "Built the AI Industry Monitor — a real-time market dashboard plus an LLM benchmarking arena simulating trading strategies across frontier models.",
    link: "https://github.com/JackyJiang08/AI-Monitor-Platform",
  },
  {
    date: "2026-02",
    text: "Joined ScribeAR at UIUC as an Undergraduate Research Assistant, shipping real-time speaker diarization for live classroom captioning.",
  },
];
