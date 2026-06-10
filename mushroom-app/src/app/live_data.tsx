import { useRouter } from "expo-router";
import { onValue, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SensorCard } from "../components/sensor-card";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { db } from "../config/firebaseConfig";

// import sensor service
import { sensorService} from "../services/sensorService";

// import for preferences context, constants and types
import { usePreferences } from "../context/preferences_context";
import {COLORS, THRESHOLDS, FIREBASE_PATHS, SENSOR_COLORS} from "../constants/theme";
import {SensorData} from "../types/index";

export default function LiveDataScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { isFahrenheit, isDarkMode, theme } = usePreferences(); // getting the user's temperature unit preference and theme from the context

  // state to hold the system's last updated timestamp and the current time to calculate how long ago the data was updated
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const [sensorData, setSensorData] = useState<SensorData>({
    temperature_c: 0,
    humidity_percent: 0,
    light_lux: 0,
    soil_moisture_percent: 0,
    co2_ppm: 0,
    vpd_kpa: 0,
  });

  // effect to update the current time every 10 seconds so "last updated" can be calculated in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 10000); // update every 10 seconds
    return () => clearInterval(interval);
  }, []);

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
      }
    );
    // cleanup function to unsubscribe from listener when component unmounts
    return () => unsubscribe();
  }, []);

  // converting temperature to fahrenheit if the user preference is set to fahrenheit
  const displayTemp = sensorData.temperature_c ? isFahrenheit ? ((sensorData.temperature_c * 9) / 5 + 32).toFixed(1) : sensorData.temperature_c.toFixed(1) : "--";

  const tempUnit = isFahrenheit ? "°F" : "°C";

  // system status calculation logic
  // check if the difference between now and the last updated timestamp is greater than 5 minutes (300000 ms)
  const isOffline = lastUpdated ? now - lastUpdated > THRESHOLDS.OFFLINE_TIMEOUT_MS : true; // if lastUpdates is null - consider it offline
  let timeAgoText = "Waiting for data...";
  if (lastUpdated) {
    const diffInSeconds = Math.max(0, Math.floor((now - lastUpdated) / 1000));
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
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          {/* header section with title and subtitle */}
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Live Sensor Data
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
              Real-time readings from your mushroom farm
            </Text>
          </View>

          {/* event log navigation button */}
          <TouchableOpacity
            style={[styles.alertButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push("/alerts")}
          >
            <MaterialCommunityIcons
              name="bell-outline"
              size={24}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>

        {/* system status indicator */}
        {!loading && (
          <View
            style={[
              styles.healthBanner,
              {
                backgroundColor: isOffline
                  ? "rgba(239, 68, 68, 0.1)"
                  : "rgba(16, 185, 129, 0.1)",
              },
            ]}
          >
            <View style={styles.healthBannerHeader}>
              <MaterialCommunityIcons
                name={isOffline ? "wifi-strength-off-outline" : "wifi-check"}
                size={20}
                color={isOffline ? COLORS.critical : COLORS.primary}
              />
              <Text
                style={[
                  styles.healthStatusText,
                  { color: isOffline ? COLORS.critical : COLORS.primary },
                ]}
              >
                {isOffline ? "System Offline" : "System Online"}
              </Text>
            </View>
            <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>
              {timeAgoText}
            </Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.subtext }]}>
              Loading sensor data...
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {/* rendering sensor cards with sensor data */}
            <SensorCard
              title="VPD Level"
              value={sensorData.vpd_kpa.toFixed(2) || "--"}
              unit="kPa"
              iconName="chart-line-variant"
              iconColor={SENSOR_COLORS.vpd}
              theme={theme}
            />
            <SensorCard
              title="Temperature"
              value={displayTemp}
              unit={tempUnit}
              iconName="thermometer"
              iconColor={SENSOR_COLORS.temperature}
              theme={theme}
            />
            <SensorCard
              title="Air Humidity"
              value={sensorData.humidity_percent?.toFixed(1) || "--"}
              unit="%"
              iconName="air-humidifier"
              iconColor={SENSOR_COLORS.humidity}
              theme={theme}
            />
            <SensorCard
              title="Light"
              value={sensorData.light_lux?.toFixed(1) || "--"}
              unit="lx"
              iconName="lightbulb"
              iconColor={SENSOR_COLORS.light}
              theme={theme}
            />
            <SensorCard
              title="Soil Moisture"
              value={sensorData.soil_moisture_percent?.toFixed(1) || "--"}
              unit="%"
              iconName="water-percent"
              iconColor={SENSOR_COLORS.soil}
              theme={theme}
            />
            <SensorCard
              title="CO2 Level"
              value={sensorData.co2_ppm?.toFixed(1) || "--"}
              unit="ppm"
              iconName="molecule-co2"
              iconColor={SENSOR_COLORS.co2}
              theme={theme}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  alertButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  healthBanner: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  healthBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  healthStatusText: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 6,
  },
  loadingContainer: {
    marginTop: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  grid: {
    gap: 16,
  },
});
