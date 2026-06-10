import { ref, onValue, update, query, limitToLast } from "firebase/database";
import { db } from "../config/firebaseConfig";
import { FIREBASE_PATHS, THRESHOLDS } from "../constants/theme";
import { AlertItem } from "../types/index";

export const alertService = {
  subscribeToAlerts: (
    callback: (data: AlertItem[]) => void,
    errorCallback?: (error: Error) => void,
  ) => {
    try {
      const alertsRef = query(
        ref(db, FIREBASE_PATHS.ALERTS),
        limitToLast(THRESHOLDS.MAX_ALERTS_DISPLAY),
      );
      return onValue(
        alertsRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            // converting the object of objects returned by firebase into an array of objects and sorting it by timestamp in descending order (newest first)
            const alertsArray: AlertItem[] = Object.keys(data).map((key) => ({
              id: key,
              ...data[key],
            }));
            // sort by timestamp in descending order (newest first)
            alertsArray.sort((a, b) => b.timestamp - a.timestamp);
            callback(alertsArray);
          } else {
            callback([]); // if there are no alerts, return an empty array
          }
        },
        (error) => {
          console.error("Error fetching alerts:", error);
          errorCallback?.(error);
        },
      );
    } catch (error) {
      console.error("Error setting up alerts subscription:", error);
      errorCallback?.(error as Error);
      return () => {}; // return an empty unsubscribe function in case of error
    }
  },
};
