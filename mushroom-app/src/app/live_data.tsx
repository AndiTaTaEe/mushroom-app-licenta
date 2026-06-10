import { useRouter } from "expo-router";
import React from "react";
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

// import custom hooks
import {useSensorData} from "../hooks/useSensorData";
import {useSystemStatus} from "../hooks/useSystemStatus";
import {useTemperatureConversion} from "../hooks/useTemperatureConversion";

// import for preferences context, constants and types
import { usePreferences } from "../context/preferences_context";
import {COLORS, THRESHOLDS, SENSOR_COLORS} from "../constants/theme";
import {SensorData} from "../types/index";

export default function LiveDataScreen() {
  const router = useRouter();
  const { isFahrenheit, isDarkMode, theme } = usePreferences(); // getting the user's temperature unit preference and theme from the context

  // using custom hooks to get live sensor data, system status and temp conversion
  const {sensorData, loading, error, lastUpdated} = useSensorData();
  const {isOnline, timeAgoText} = useSystemStatus(lastUpdated);
  const {displayTemp, unit: tempUnit} = useTemperatureConversion(sensorData.temperature_c, isFahrenheit);

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.subtext }]}>
            Loading sensor data...
          </Text>
        </View>
      </SafeAreaView>
    );
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
          <View
            style={[
              styles.healthBanner,
              {
                backgroundColor: isOnline
                  ? "rgba(16, 185, 129, 0.1)"
                  : "rgba(239, 68, 68, 0.1)",
              },
            ]}
          >
            <View style={styles.healthBannerHeader}>
              <MaterialCommunityIcons
                name={isOnline ? "wifi-check" : "wifi-strength-off-outline"}
                size={20}
                color={isOnline ? COLORS.primary : COLORS.critical}
              />
              <Text
                style={[
                  styles.healthStatusText,
                  { color: isOnline ? COLORS.primary : COLORS.critical },
                ]}
              >
                {isOnline ? "System Online" : "System Offline"}
              </Text>
            </View>
            <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 4 }}>
              {timeAgoText}
            </Text>
          </View>

          {/* error message display if there's an error fetching sensor data */}
          {error && (
            <View style={[styles.errorBanner, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={20} color={COLORS.critical} />
              <Text style={{ color: COLORS.critical, marginLeft: 8 }}>
                {error}
              </Text>
            </View>
          )}

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
   errorBanner: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
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
