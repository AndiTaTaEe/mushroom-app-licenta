import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

// to do - important - research how to implement push notifications for real-time alerts on critical sensor readings (e.g., high CO2 levels, low soil moisture) using Firebase Cloud Messaging or Expo Notifications API
// to do - important - implement user authentication with Firebase Authentication to allow users to securely access their data and settings across devices
// to do - not important - settings screen for customizing alert thresholds, chart preferences, and app themes

export default function App() {
  const router = useRouter(); // used for navigation between screens

  //function to handle the button to LiveData screen
  const handleLiveDataPress = () => {
    //navigating to LiveData screen
    console.log("Navigating to Live Data screen...");
    router.push("/live_data");
  };

  //function to handle the button to History screen
  const handleHistoryPress = () => {
    console.log("Navigating to History screen...");
    router.push("/history_chart");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header Section */}
      <View style={styles.headerContainer}>
        <MaterialCommunityIcons
          name="mushroom"
          size={40}
          color="#10B981"
          style={styles.icon}
        />
        <Text style={styles.title}>MushroomMonitor</Text>
      </View>

      {/* buttons section */}
      <View style={styles.buttonContainer}>
        {/* live data */}
        <TouchableOpacity
          style={[styles.button, styles.liveButton]}
          activeOpacity={0.8}
          onPress={handleLiveDataPress}
        >
          <MaterialCommunityIcons
            name="access-point"
            size={32}
            color="#FFFFFF"
          />
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonTitle}>Live Data</Text>
            <Text style={styles.buttonSubtitle}>Real-time sensor readings</Text>
          </View>
        </TouchableOpacity>

        {/* history chart */}
        <TouchableOpacity
          style={[styles.button, styles.historyButton]}
          activeOpacity={0.8}
          onPress={handleHistoryPress}
        >
          <MaterialCommunityIcons
            name="chart-bell-curve-cumulative"
            size={32}
            color="#FFFFFF"
          />
          <View style={styles.buttonTextContainer}>
            <Text style={styles.buttonTitle}>History Charts</Text>
            <Text style={styles.buttonSubtitle}>Past data visualization</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 60,
    paddingHorizontal: 20,
  },
  icon: {
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    gap: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
  },
  liveButton: {
    backgroundColor: "#10B981",
  },
  historyButton: {
    backgroundColor: "#3B82F6",
  },
  buttonTextContainer: {
    marginLeft: 20,
  },
  buttonTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  buttonSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
  },
});
