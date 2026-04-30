import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

// imports for firebase
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../config/firebaseConfig";

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

    // check if the user is currently on the auth screen
    const inAuthGroup = String(segments[0]) === "auth";

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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="live_data" />
      <Stack.Screen name="history_chart" />
      <Stack.Screen name="auth" />
    </Stack>
  );
}
