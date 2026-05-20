import { onValue, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SensorCard } from "../components/sensor-card";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { db } from "../config/firebaseConfig";

// import for preferences context
import { usePreferences } from "../context/preferences_context";

export default function LiveDataScreen() {
  const [loading, setLoading] = useState(true);

  const { isFahrenheit, isDarkMode, theme } = usePreferences(); // getting the user's temperature unit preference and theme from the context

  // state to hold the system's last updated timestamp and the current time to calculate how long ago the data was updated
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const [sensorData, setSensorData] = useState({
    temperature_c: "--",
    humidity: "--",
    light_level: "--",
    soil_moisture_level: "--",
    co2_ppm: "--",
    vpd: "--",
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
    const sensorRef = ref(db, "proiect-licenta/current_readings"); // current_readings is the root node where sensor data is stored

    // listen for real-time updates
    const unsubscribe = onValue(
      sensorRef,
      (snapshot) => {
        const data = snapshot.val();

        if (data) {
          setSensorData({
            temperature_c: data.temperature_c?.toFixed(1) || "--",
            humidity: data.humidity?.toFixed(1) || "--",
            light_level: data.light_level?.toFixed(1) || "--",
            soil_moisture_level: data.soil_moisture_level?.toFixed(1) || "--",
            co2_ppm: data.co2_ppm?.toFixed(0) || "--",
            vpd: data.vpd?.toFixed(2) || "--",
          });

          // capture the timestamp from the Pi - fallback to current time if missing
          setLastUpdated(data.last_updated || Date.now());
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching sensor data: ", error);
        setLoading(false);
      },
    );

    // cleanup function to unsubscribe from listener when component unmounts
    return () => unsubscribe();
  }, []);

  // converting temperature to fahrenheit if the user preference is set to fahrenheit
  let displayTemp = sensorData.temperature_c;
  let tempUnit = "°C";
  if (sensorData.temperature_c !== "--") {
    const rawTempC = parseFloat(sensorData.temperature_c);
    if (isFahrenheit) {
      displayTemp = ((rawTempC * 9) / 5 + 32).toFixed(1);
      tempUnit = "°F";
    }
  }

  // system status calculation logic
  // check if the difference between now and the last updated timestamp is greater than 5 minutes (300000 ms)
  const isOffline = lastUpdated ? (now - lastUpdated) > 300000 : true; // if lastUpdates is null - consider it offline
  let timeAgoText = "Waiting for data...";
  if (lastUpdated) {
    const diffInSeconds = Math.max(0,Math.floor((now - lastUpdated) / 1000));
    if (diffInSeconds < 60) {
      timeAgoText = `Updated ${diffInSeconds} s ago`;
    } else {
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      timeAgoText = `Updated ${diffInMinutes} m ago`;
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Live Sensor Data
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
            Real-time readings from your mushroom farm
          </Text>
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
                color={isOffline ? "#EF4444" : "#10B981"}
              />
              <Text
                style={[
                  styles.healthStatusText,
                  { color: isOffline ? "#EF4444" : "#10B981" },
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
              value={sensorData.vpd}
              unit="kPa"
              iconName="chart-line-variant"
              iconColor="#8B5CF6"
              theme={theme}
            />
            <SensorCard
              title="Temperature"
              value={displayTemp}
              unit={tempUnit}
              iconName="thermometer"
              iconColor="#EF4444"
              theme={theme}
            />
            <SensorCard
              title="Air Humidity"
              value={sensorData.humidity}
              unit="%"
              iconName="air-humidifier"
              iconColor="#3B82F6"
              theme={theme}
            />
            <SensorCard
              title="Light"
              value={sensorData.light_level}
              unit="lx"
              iconName="lightbulb"
              iconColor="#F59E0B"
              theme={theme}
            />
            <SensorCard
              title="Soil Moisture"
              value={sensorData.soil_moisture_level}
              unit="%"
              iconName="water-percent"
              iconColor="#10B981"
              theme={theme}
            />
            <SensorCard
              title="CO2 Level"
              value={sensorData.co2_ppm}
              unit="ppm"
              iconName="molecule-co2"
              iconColor="#64748B"
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
