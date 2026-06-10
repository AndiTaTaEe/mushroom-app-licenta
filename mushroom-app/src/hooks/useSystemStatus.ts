import { useState, useEffect } from "react";
import { THRESHOLDS } from "../constants/theme";

interface SystemStatus {
  isOnline: boolean;
  timeAgoText: string;
}

// hook to calculate system status (online/offline) based on the last updated timestamp of the sensor data and the current time
export const useSystemStatus = (lastUpdated: number | null) => {
  const [now, setNow] = useState(Date.now());
  const [status, setStatus] = useState<SystemStatus>({
    isOnline: false,
    timeAgoText: "Waiting for data...",
  });

  // effect to update the current time every 10 seconds so "last updated" can be calculated in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000); // update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // calculate status based on lastUpdated and current time
  useEffect(() => {
    if (!lastUpdated) {
        setStatus({
            isOnline: false,
            timeAgoText: "Waiting for data...",
        });
        return;
    }

    const isOnline = now - lastUpdated <= THRESHOLDS.OFFLINE_TIMEOUT_MS;
    const diffInSeconds = Math.max(0, Math.floor((now - lastUpdated) / 1000));
    let timeAgoText = "Waiting for data...";
    if (diffInSeconds < 60) {
      timeAgoText = `Updated ${diffInSeconds} s ago`;
    } else if (diffInSeconds < 3600) {
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      timeAgoText = `Updated ${diffInMinutes} m ago`;
    } else if (diffInSeconds < 86400) {
      const diffInHours = Math.floor(diffInSeconds / 3600);
      timeAgoText = `Updated ${diffInHours} h ago`;
    } else {
      const diffInDays = Math.floor(diffInSeconds / 86400);
      timeAgoText = `Updated ${diffInDays} d ago`;
    }
    setStatus({ isOnline, timeAgoText});
  }, [lastUpdated, now]);
  return status;
};
