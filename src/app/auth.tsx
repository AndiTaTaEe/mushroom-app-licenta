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

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true); // state to toggle between login and signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // state to show loading indicator during auth
  const [showPassword, setShowPassword] = useState(false); // state to toggle password visibility

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* header section */}
        <View style={styles.headerContainer}>
          <MaterialCommunityIcons name="mushroom" size={60} color="#10B981" />
          <Text style={styles.title}>MushroomMonitor</Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? "Welcome back to your farm."
              : "Create your farmer account to get started."}
          </Text>
        </View>

        {/* input form section*/}
        <View style={styles.formContainer}>
          {/* email input */}
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons
              name="email-outline"
              size={24}
              color="#94A3B8"
              style={styles.inputIcon}
            />

            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          {/* password input */}
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={24}
              color="#94A3B8"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#94A3B8"
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
                color="#94A3B8"
              />
            </TouchableOpacity>
          </View>

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
            <Text style={styles.toggleText}>
              {/* if the user is on the login screen, we want to show "Don't have
              an account? Sign up" and if the user is on the signup screen, we
              want to show "Already have an account? Login" */}
              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}
              <Text style={styles.toggleTextBold}>
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
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  keyboardView: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  headerContainer: { alignItems: "center", marginBottom: 40 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 16,
    letterSpacing: 0.5,
  },
  subtitle: { fontSize: 16, color: "#64748B", marginTop: 8 },
  formContainer: { width: "100%" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
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
  input: { flex: 1, fontSize: 16, color: "#0F172A" },
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
  toggleText: { color: "#64748B", fontSize: 15 },
  toggleTextBold: { color: "#10B981", fontWeight: "bold" },
});
