import {
  ref,
  onValue,
  update,
  query,
  limitToLast,
  get,
} from "firebase/database";
import { db } from "../config/firebaseConfig";
import { FIREBASE_PATHS, THRESHOLDS } from "../constants/theme";
import { SensorData, PastReadings, FarmSettings } from "../types/index";

export const sensorService = {
  // subscribe to live sensor data
  subscribeToLiveData: (
    callback: (data: SensorData) => void,
    errorCallback?: (error: Error) => void,
  ) => {
    try {
      // listening to changes in the current_readings node
      const sensorRef = ref(db, FIREBASE_PATHS.CURRENT_READINGS);
      // returning the unsubscribe function to stop listening when the compontent unmounts
      return onValue(
        sensorRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            // validating the data to make sure it has all the required fields befor calling callback
            // important to avoid errors if the data in the database has an unexpected structure
            if (isValidSensorData(data)) {
              callback(data);
            }
          }
        },
        (error) => {
          console.error("Error fetching live sensor data:", error);
          // calling the error callback if provided to handle the error in the UI
          errorCallback?.(error);
        },
      );
    } catch (error) {
      console.error("Error setting up live data subscription:", error);
      errorCallback?.(error as Error);
      return () => {}; // return an empty unsubscribe function in case of error
    }
  },

  // subscribe to historical data
  subscribeToHistoricalData: (
    callback: (data: PastReadings[]) => void,
    errorCallback?: (error: Error) => void,
  ) => {
    try {
      // listening to changes in the past_readings node, but only getting the last 250 readings to avoid performance issues
      const historyRef = query(
        ref(db, FIREBASE_PATHS.PAST_READINGS),
        limitToLast(THRESHOLDS.MAX_HISTORICAL_READINGS),
      ); // get last 250 readings
      return onValue(
        historyRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const readings = Object.values(data) as PastReadings[];
            callback(readings);
          }
        },
        (error) => {
          console.error("Error fetching historical sensor data:", error);
          errorCallback?.(error);
        },
      );
    } catch (error) {
      console.error("Error setting up historical data subscription:", error);
      errorCallback?.(error as Error);
      return () => {};
    }
  },

  // fetch historical data once without subscribing to changes - useful for exporting data to CSV functionality
  fetchHistoricalData: async (
    limit: number = THRESHOLDS.MAX_EXPORT_READINGS,
  ): Promise<PastReadings[]> => {
    try {
      const dataRef = query(
        ref(db, FIREBASE_PATHS.PAST_READINGS),
        limitToLast(limit),
      );
      const snapshot = await get(dataRef);
      if (!snapshot.exists()) {
        return []; // return empty array if no data
      }
      return Object.values(snapshot.val()) as PastReadings[];
    } catch (error) {
      console.error("Error fetching historical data to export in CSV: ", error);
      throw error; // rethrow the error to be handled by the caller
    }
  },

  // update farm settings
  updateFarmSettings: async (
    settings: Partial<FarmSettings>,
  ): Promise<void> => {
    try {
      // listening to changes in the farm_settings node
      const settingsRef = ref(db, FIREBASE_PATHS.FARM_SETTINGS);
      // updating the settings with the new values provided in the settings
      await update(settingsRef, settings);
      console.log("Farm settings updated successfully");
    } catch (error) {
      console.error("Error updating farm settings: ", error);
      throw error;
    }
  },

  // saving the push token to the database - called from the index.tsx file after obtaining the token from EXPO notifications API
  savePushToken: async (token: string): Promise<void> => {
    try {
      const tokenRef = ref(db, FIREBASE_PATHS.PUSH_TOKENS);
      await update(tokenRef, { token });
      console.log(
        "Push token saved to Firebase Realtime DB in 'admin/push_token'",
      );
    } catch (error) {
      console.error("Error saving push token to Firebase Realtime DB: ", error);
      throw error;
    }
  },
};

function isValidSensorData(data: any): data is SensorData {
  return (
    typeof data === "object" &&
    data !== null &&
    "temperature_c" in data &&
    "humidity_percent" in data &&
    "light_lux" in data &&
    "soil_moisture_percent" in data &&
    "co2_ppm" in data &&
    "vpd_kpa" in data
  );
}
