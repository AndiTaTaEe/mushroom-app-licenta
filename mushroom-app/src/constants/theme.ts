// color pallette
export const COLORS = {
    primary: "#10B981",
    critical: "#EF4444",
    warning: "#F59E04",
    info: "#3B82F6",
    accent: "#8B5CF6",
    neutral: "#64748B",
} as const;

// thresholds and limits
export const THRESHOLDS = {
    OFFLINE_TIMEOUT_MS: 300000, // 5 mins without data is considered offline
    MAX_ALERTS_DISPLAY: 30, // max number of alerts to fetch and display
    MAX_CHART_POINTS_1H: 10,
    MAX_CHART_POINTS_24H: 24,
    MAX_CHART_POINTS_7D: 14,
    MAX_HISTORICAL_READINGS: 250, // max number of historical readings to fetch for the history chart
    MAX_EXPORT_READINGS: 1000, // max number of readings to export in CSV
} as const;

// firebase paths - used for all database calls
export const FIREBASE_PATHS = {
    CURRENT_READINGS: "proiect-licenta/current_readings",
    PAST_READINGS: "proiect-licenta/past_readings",
    ALERTS: "proiect-licenta/alerts",
    FARM_SETTINGS: "proiect-licenta/farm_settings",
    PUSH_TOKENS: "admin/push_token",
} as const;

// sensor chart colors and configs
export const SENSOR_COLORS = {
    temperature: "#EF4444",
    humidity: "#3B82F6",
    light: "#F59E0B",
    soil: "#10B981",
    co2: "#64748B",
    vpd: "#8B5CF6",
} as const;

// time formatting constants
export const TIME_UNITS = {
    HOUR_MS: 60 * 60 * 1000,
    DAY_MS: 24 * 60 * 60 * 1000,
    WEEK_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

// theme objects for light/dark mode
export interface Theme {
    background: string;
    card: string;
    text: string;
    subtext: string;
    icon: string;
    primary: string;
    border: string;
}

export const LIGHT_THEME: Theme = {
    background: "#F8FAFC",
    card: "#FFFFFF",
    text: "#0F172A",
    subtext: "#64748B",
    border: "#F1F5F9",
    icon: "#64748B",
    primary: "#10B981",
} as const;

export const DARK_THEME: Theme = {
    background: "#0F172A",
    card: "#1E293B",
    text: "#F8FAFC",
    subtext: "#94A3B8",
    border: "#334155",
    icon: "#94A3B8",
    primary: "#10B981",
} as const;

// helper function to get the correct theme based on the dark mode preference
export const getTheme = (isDarkMode: boolean): Theme => {
    return isDarkMode ? DARK_THEME : LIGHT_THEME;
}