window.TRINETRA_CONFIG = {
  AQI_SOURCES: ["supabase", "mock"],
  SUPABASE_URL: "https://your-project-ref.supabase.co",
  SUPABASE_ANON_KEY: "your-supabase-anon-public-key",
  SUPABASE_READINGS_TABLE: "readings",
  SUPABASE_STATIONS_TABLE: "stations",
  GEMINI_API_KEY: "",
  LIVE_REFRESH_MS: 60000,
  DEFAULT_ORIGIN: [19.0748, 72.8856],
  AQI_BREAKPOINTS: [
    { upTo: 50, label: "Good", color: "#4CAF50" },
    { upTo: 100, label: "Moderate", color: "#FFC107" },
    { upTo: 150, label: "Poor", color: "#FF9800" },
    { upTo: 200, label: "Unhealthy", color: "#F44336" },
    { upTo: Infinity, label: "Severe", color: "#7B1FA2" }
  ]
};