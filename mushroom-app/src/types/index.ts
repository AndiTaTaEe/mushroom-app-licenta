export interface SensorData {
    temperature_c: number;
    humidity_percent: number;
    light_lux: number;
    soil_moisture_percent: number;
    co2_ppm: number;
    vpd_kpa: number;
    last_updated?: number;
}

export interface FarmSettings {
    temperature_c: { min: number; max: number };
    humidity_percent: { min: number; max: number };
    light_lux: { min: number; max: number };
    soil_moisture_percent: { min: number; max: number };
    co2_ppm: { min: number; max: number };
    vpd_kpa: { min: number; max: number };
}

// structure of an alert item in the database
export interface AlertItem {
    id: string;
    timestamp: number;
    message: string;
    type: "critical" | "warning" | "info";
    parameter: string;
}

export interface PastReadings extends SensorData {
     timestamp: string; // ISO string format
}

// tooltip state for charts
export interface TooltipState {
    x: number;
    y: number;
    value: number;
    visible: boolean;
}

// api response wrapper for error handling
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    isLoading: boolean;
}