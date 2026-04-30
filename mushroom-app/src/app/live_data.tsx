import { onValue, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SensorCard } from "../components/sensor-card";
import { db } from "../config/firebaseConfig";

export default function LiveDataScreen() {
  const [loading, setLoading] = useState(true);
  const [sensorData, setSensorData] = useState({
    temperature_c: "--",
    humidity: "--",
    light_level: "--",
    soil_moisture_level: "--",
    co2_ppm: "--",
    vpd: "--",
  });

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
            vpd: data.vpd?.toFixed(2) || "--"
          });
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Live Sensor Data</Text>
          <Text style={styles.headerSubtitle}>
            Real-time readings from your mushroom farm
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Loading sensor data...</Text>
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
            />
            <SensorCard
              title="Temperature"
              value={sensorData.temperature_c}
              unit="°C"
              iconName="thermometer"
              iconColor="#EF4444"
            />
            <SensorCard
              title="Air Humidity"
              value={sensorData.humidity}
              unit="%"
              iconName="air-humidifier"
              iconColor="#3B82F6"
            />
            <SensorCard
              title="Light"
              value={sensorData.light_level}
              unit="lx"
              iconName="lightbulb"
              iconColor="#F59E0B"
            />
            <SensorCard
              title="Soil Moisture"
              value={sensorData.soil_moisture_level}
              unit="%"
              iconName="water-percent"
              iconColor="#10B981"
            />
            <SensorCard
              title="CO2 Level"
              value={sensorData.co2_ppm}
              unit="ppm"
              iconName="molecule-co2"
              iconColor="#64748B"
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
    backgroundColor: "#F8FAFC",
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
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 4,
  },
  loadingContainer: {
    marginTop: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 16,
  },
  grid: {
    gap: 16,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  dataContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0F172A",
  },
  cardUnit: {
    fontSize: 18,
    fontWeight: "600",
    color: "#94A3B8",
    marginLeft: 4,
  },
});
