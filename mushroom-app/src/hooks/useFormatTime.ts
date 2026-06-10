import { useCallback } from "react";

// hook to format timestamps into human-readable strings for alerts and chart tooltips, with logic to handle different formats based on how recent the timestamp is
export const useFormatTime = () => {
  const formatAlertTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString(); // if the alert is from today - show time only, else show date and time
    const timeString = `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;

    if (isToday) return `Today at ${timeString}`;
    return `${date.getDate()}/${date.getMonth() + 1} at ${timeString}`;
  }, []);

  const formatChartTime = useCallback((timestamp: string, format: "time" | "date" = "time") => {
    const dateObj = new Date(timestamp);
    if (format === "time") {
        return `${dateObj.getHours()}:${dateObj.getMinutes().toString().padStart(2, "0")}`;
    } else {
        return `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
    }
  }, []);

  return {formatAlertTime, formatChartTime};
};
