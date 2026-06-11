import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  StyleSheet,
  Text,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// import for preferences context and constants
import { usePreferences } from "../context/preferences_context";
import { COLORS } from "../constants/theme";

export default function LiveCameraScreen() {
  const { isDarkMode, theme } = usePreferences();

  // state to track the current time to force image refresh and loading state
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);

  // ngrok url for the live camera feed, this will be the url of the Rpi's image server
  const NGROK_BASE_URL =
    "https://surfacing-playpen-aversion.ngrok-free.dev/live_view.jpg";

  useEffect(() => {
    // interval to update the current time every 5 seconds
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
      setIsLoading(true);
    }, 5000);

    // if the component unmounts, clear the interval to prevent memory leaks
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Live Farm Feed
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
            Real-time camera stream
          </Text>
        </View>

        <View style={styles.feedContainer}>
          <View
            style={[
              styles.cameraWrapper,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            )}
            <Image
              // ?t= param forces the fresh download
              source={{ uri: `${NGROK_BASE_URL}?t=${currentTime}` }}
              style={styles.cameraFeed}
              resizeMode="cover"
              onLoadEnd={() => setIsLoading(false)}
            />
          </View>

          <View style={styles.statusContainer}>
            <View style={styles.liveIndicator} />
            <Text style={[styles.statusText, { color: theme.subtext }]}>
              Connection Secure (Direct to Edge)
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    width: "100%",
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: "700",
    marginBottom: 4,
  },
  feedContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "400",
  },
  cameraWrapper: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    marginBottom: 24,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  cameraFeed: {
    width: "100%",
    height: "100%",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
