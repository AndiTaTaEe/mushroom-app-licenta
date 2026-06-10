import { useEffect, useState } from "react";
// import services
import { sensorService } from "../services/sensorService";
import { PastReadings } from "../types/index";

// hook to subscribe to historical sensor data updates from Firebase Realtime Database
export const useHistoricalData = () => {
  const [readings, setReadings] = useState<PastReadings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // fetching the historical data from Firebase
  useEffect(() => {
    //creating a query to fetch the last 250 readings from the Firebase, so we have enough for 7 days of data readings
    setLoading(true);
    setError(null);
    const unsubscribe = sensorService.subscribeToHistoricalData(
      (data) => {
        setReadings(data);
        setLoading(false);
      },
      (error) => {
        console.error("Historical data error: ", error);
        setError("Failed to load historical data. Please try again later.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return {readings, loading, error};
};
