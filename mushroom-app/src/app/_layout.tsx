import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { ActivityIndicator, View, AppState, StyleSheet, Text, TouchableOpacity } from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";

// import for biometric authentication
import * as LocalAuthentication from "expo-local-authentication";

// imports for firebase
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../config/firebaseConfig";

// imports for themes (dark/light mode)
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";

// import for preferences context
import { PreferencesProvider, usePreferences } from "../context/preferences_context";

// main layout component of the app
// accepting the user as a prop so we know the user's autentication state
// if the user is logged in -> we show the main app with the bottom tab navigator and the screens + biometric authentication
// if the user is not logged in -> we show the auth screen, handled by routing guard logic
function RootLayoutNav({user} : {user: User | null}) {
  const { isDarkMode, theme } = usePreferences(); // getting the user's dark mode preference from the context

  // security states
  const [isUnlocked, setIsUnlocked] = useState(false); // state to track if the app is unlocked (after biometric authentication)
  const appState = useRef(AppState.currentState); // tracking the currentState of the app 

  // function to allow biometric authentication when the app is opened or comes back from the background
  const authenticateUser = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync(); // if the device has biometric hardware
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();  // if the user has set up biometrics
    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock to access the Mushroom app",
        fallbackLabel: "Use Passcode",
      });
      if (result.success) {
        setIsUnlocked(true);
      }
    } else {
      // if the device doesn't support biometrics, unlock the app
      setIsUnlocked(true);
    }
  };

  // trigger scan immediately when the user opens the app (only if logged in)
  useEffect(() => {
    if (user) {
      authenticateUser();
    } else {
      setIsUnlocked(true); // if the user is not logged in, we can consider the app "unlocked" since they will be on the auth screen
    }
  }, [user]);

  // trigger biometric auth again when the app comes back from the background
  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      // if the app comes back to the foreground and the user is logged in, we want to trigger biometric authentication again
      if(appState.current.match(/inactive|backgroun/) && nextAppState === "active") {
        if (user) {
          setIsUnlocked(false); // lock the app when it goes to the background
          authenticateUser(); // trigger biometric authentication when the app comes back from the background
        }
      }
      appState.current = nextAppState;
    });

    // cleanup the event listener 
    return () => {
      subscription.remove();
    }
  }, [user]);

  // lock screen UI - shown when the app is locked and waiting for biometric authentication
  if (user && !isUnlocked) {
    return (
      <View style={[styles.lockContainer, {backgroundColor: theme.background || "#0F172A"}]}>
        <MaterialCommunityIcons name="fingerprint" size={80} color="10B981" />
        <Text style={[styles.title, {color: theme.text || "#F8FAFC"}]}>
          Farm Secured
        </Text>
        <Text style={[styles.subtitle, {color: theme.subtext || "94A3B8"}]}>
          Authenticate to access your mushroom farm data
        </Text>
        <TouchableOpacity
          onPress={authenticateUser}
          style={styles.authButton}
        >
          <Text style={styles.unlockText}>Unlock</Text>
        </TouchableOpacity>
      </View>
    );
  }
  // if the user is not logged in, we show the auth screen, handled by routing guard logic in the RootLayout component
  return (
    <ThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
       <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="live_data" />
        <Stack.Screen name="history_chart" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="forgot_password" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="alerts" />
      </Stack>
      </ThemeProvider>
  );
}

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true); // state to track if the auth state is being initialized
  const [user, setUser] = useState<User | null>(null); // for storing the current user and its data
  const router = useRouter();
  const segments = useSegments();

  // listener for Firebase Auth state changes - this will allow us to keep track of the user's authentication state and navigate accordingly
  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) setInitializing(false); // we want to set initializing to false after we get the initial auth state
    });
    return subscriber; // unsubscribe on unmount
  }, [initializing]);

  // routing guard logic
  useEffect(() => {
    if (initializing) return;

    // screens that unauthenticated users can access (auth screen and forgot_password)
    const publicScreens = ["auth", "forgot_password"];

    // check if the user is currently on the public screens
    const inAuthGroup = publicScreens.includes(String(segments[0]));

    if (!user && !inAuthGroup) {
      // if the user is not logged in and trying to access a secure screen -> navigate the user to the auth screen
      router.replace("/auth" as never);
    } else if (user && inAuthGroup) {
      // if the user is logged in and trying to access the auth screen -> navigate the user to the main screen
      router.replace("/");
    }
  }, [user, initializing, segments]);

  // show a loading indicator while Firebase checks the user's status
  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F8FAFC",
        }}
      >
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // if the user is logged in -> show the main app
  // if the user is not logged in -> show the auth screen, handled by routing guard logic
  return (
    <PreferencesProvider>
      <RootLayoutNav user={user} />
    </PreferencesProvider>
  );
}

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20
  },
  subtitle: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 40,
    marginHorizontal: 40,
    textAlign: "center"
  },
  authButton: {
    backgroundColor: "#10B981",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10
  },
  unlockText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold"
  }
});
