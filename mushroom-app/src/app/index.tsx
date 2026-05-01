import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// imports for push notification implementation
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

// firebase imports for sending push notification token to the database
import { ref, set } from "firebase/database";
import { db } from "../config/firebaseConfig";

// firebase imports for authentication
import { signOut } from "firebase/auth";
import { auth } from "../config/firebaseConfig";

// to do - slightly important - forgot my password flow for the auth screen, not a priority right now, but it would be a nice addition in the future
// to do - not important - settings screen for customizing alert thresholds, chart preferences, and app themes

// handler for determining how my app handles incoming notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// function to handle error during push notification registration
function handleRegistrationError(errorMessage: string) {
  alert(errorMessage);
  throw new Error(errorMessage);
}

async function registerForPushNotificationsAsync() {
  // checking if the OS of the physical device is android
  // if it is, we need to create a notification channel for the push notifications to work properly on android devices
  // this is required because since android 8.0, every single notification must belong to a channel, otherwise the phone will block it silently
  // on ios, the channel is created automatically by the system
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }
  // checking if the app is running on a physical device
  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync(); // checking if the app already has permissions to send notifications
    let finalStatus = existingStatus;
    // if the app doesnt have permissions, we need to ask the user for permissions to send notifications
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    // if the user didnt give permissions, we need to handle the error and stop registration process
    if (finalStatus !== "granted") {
      handleRegistrationError(
        "Permission not granted to get push token for push notification!",
      );
      return;
    }
    // if we have permissions => get the push token
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    if (!projectId) {
      handleRegistrationError(
        "Project ID not found in Expo Constants. Please ensure it's set in app.json or eas.json.",
      );
    }
    // fetching the push token
    try {
      const pushTokenString = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log("Push token obtained successfully: ", pushTokenString);
      return pushTokenString;
    } catch (error: unknown) {
      handleRegistrationError(
        `Failed to get push token: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    handleRegistrationError("Must use physical device for Push Notifications");
  }
}

export default function App() {
  const router = useRouter(); // used for navigation between screens
  const [expoPushToken, setExpoPushToken] = useState("");

  // function to register for push notifications and get the token
  useEffect(() => {
    console.log("Checking for push notification permissions...");

    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          setExpoPushToken(token);
          console.log("Push notification token obtained:", token);

          // saving the token to Firebase Realtime db into 'admin' folder
          const tokenRef = ref(db, "admin/push_token");
          set(tokenRef, token)
            .then(() =>
              console.log(
                "Push token saved to Firebase Realtime DB in 'admin/push_token'",
              ),
            )
            .catch((error) =>
              console.error(
                "FIREBASE_ERROR: Couldn't save the token in 'admin/push_token': ",
                error,
              ),
            );
        } else {
          console.log("Token undefined. Are you on a physical phone?");
        }
      })
      .catch((error) =>
        console.error(
          "Failed to run registration for push notifications: ",
          error,
        ),
      );
  }, []);

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

  // function to handle user logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User logged out successfully");
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header Section */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={{ position: "absolute", top: -80, right: 20 }}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={28} color="EF4444" />
        </TouchableOpacity>

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
