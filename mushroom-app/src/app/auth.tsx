import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// imports for firebase authentication
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../config/firebaseConfig";

// import for preferences context
import { usePreferences } from "../context/preferences_context";

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true); // state to toggle between login and signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // state to show loading indicator during auth
  const [showPassword, setShowPassword] = useState(false); // state to toggle password visibility
  const { isDarkMode, theme } = usePreferences(); // getting the user's theme preference

  // function to handle auth logic for login and signup
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }

    // checker to ensure that the password is strong enough during signup
    if (!isLogin) {
      // passwordRegex means - the password must contain at least one lowercase char, one uppercase char, one digit and one special char and it must be at least 8 chars long
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
      if (!passwordRegex.test(password)) {
        Alert.alert(
          "Weak password",
          "Your password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one digit, and one special character.",
        );
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        // login logic
        await signInWithEmailAndPassword(auth, email, password);
        console.log("User logged in successfully");
        router.replace("/"); // navigate to the main screen after successful login
      } else {
        // signup logic
        await createUserWithEmailAndPassword(auth, email, password);
        console.log("User signed up successfully");
        router.replace("/");
      }
    } catch (error: any) {
      console.error("Auth error: ", error);
      Alert.alert("Auth failed", error.message);
    } finally {
      // we want to stop loading indicator
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* header section */}
        <View style={styles.headerContainer}>
          <MaterialCommunityIcons name="mushroom" size={60} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>MushroomMonitor</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            {isLogin
              ? "Welcome back to your farm."
              : "Create your farmer account to get started."}
          </Text>
        </View>

        {/* input form section*/}
        <View style={styles.formContainer}>
          {/* email input */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.card }]}>
            <MaterialCommunityIcons
              name="email-outline"
              size={24}
              color={theme.icon}
              style={styles.inputIcon}
            />

            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Email address"
              placeholderTextColor={theme.subtext}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          {/* password input */}
          <View style={[styles.inputWrapper, { backgroundColor: theme.card }]}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={24}
              color={theme.icon}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Password"
              placeholderTextColor={theme.subtext}
              secureTextEntry={!showPassword} // toggle password visibility
              value={password}
              onChangeText={setPassword}
            />
            {/* eye icon to toggle password visibility */}
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={{ padding: 4 }}
            >
              <MaterialCommunityIcons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={24}
                color={theme.icon}
              />
            </TouchableOpacity>
          </View>

          {/* forgot password button - only shown on login screen */}
          {isLogin && (
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={() => router.push("/forgot_password")}
            >
              <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {/* main auth button */}
          <TouchableOpacity
            style={styles.mainButton}
            activeOpacity={0.8}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.mainButtonText}>
              {loading ? "Please wait..." : isLogin ? "Login" : "Sign up"}
            </Text>
          </TouchableOpacity>

          {/* toggle login/signup button */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setIsLogin(!isLogin)}
          >
            <Text style={[styles.toggleText, { color: theme.subtext }]}>
              {/* if the user is on the login screen, we want to show "Don't have
              an account? Sign up" and if the user is on the signup screen, we
              want to show "Already have an account? Login" */}
              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}
              <Text style={[styles.toggleTextBold, { color: theme.primary }]}>
                {isLogin ? "Sign up" : "Login"}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  headerContainer: { alignItems: "center", marginBottom: 40 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginTop: 16,
    letterSpacing: 0.5,
  },
  subtitle: { fontSize: 16, marginTop: 8 },
  formContainer: { width: "100%" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 60,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16 },
  mainButton: {
    backgroundColor: "#10B981",
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  mainButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  toggleButton: { marginTop: 24, alignItems: "center" },
  toggleText: { fontSize: 15 },
  toggleTextBold: { fontWeight: "bold" },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginBottom: 16,
    marginRight: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
