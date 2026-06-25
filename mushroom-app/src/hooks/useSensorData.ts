import { useState, useEffect } from "react";
import { sensorService } from "../services/sensorService";
import { SensorData } from "../types/index";

export const DEFAULT_SENSOR_DATA: SensorData = {
  temperature_c: 0,
  humidity_percent: 0,
  light_lux: 0,
  soil_moisture_percent: 0,
  co2_ppm: 0,
  vpd_kpa: 0,
  cpu_temp_c: 0,
  last_updated: undefined,
};

// hook to subscribe to live sensor data updates from Firebase Realtime Database
export const useSensorData = () => {
  const [sensorData, setSensorData] = useState<SensorData>(DEFAULT_SENSOR_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // fetching sensor data from Firebase Realtime Database
  useEffect(() => {
    setLoading(true);
    setError(null);
    // listen for real-time updates
    const unsubscribe = sensorService.subscribeToLiveData(
      (data) => {
        setSensorData(data);
        setLastUpdated(data.last_updated || null);
        setLoading(false);
      },
      (error) => {
        console.error("Sensor data error: ", error);
        setError("Failed to load sensor data. Please try again later.");
        setLoading(false);
      },
    );
    // cleanup function to unsubscribe from listener when component unmounts
    return () => unsubscribe();
  }, []);

  return {sensorData, loading, error, lastUpdated};
};
