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

// firebase imports for forgot password flow
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebaseConfig";

export default function ForgotPassScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false); // showing loading indicator during password reset process

  // function to handle password reset
  const handleForgotPassword = async () => {
    // if email is empty -> alert the user to enter their email
    if (!email) {
      Alert.alert(
        "Missing email",
        "Please enter your email address to reset your password",
      );
      return;
    }
    setLoading(true);
    try {
      // sending password reset email using Firebase Auth function
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "Password reset email sent",
        "Check your inbox (and spam folder) for instructions to reset your password.",
        [
          {
            text: "Back to Login",
            onPress: () => router.back(), // navigate automatically back to the login screen
          },
        ],
      );
    } catch (error: any) {
      console.error("Password reset error: ", error);

      // handling specific error cases (user not found, invalid email) to provide feedback to the user
      if (error.code === "auth/user-not-found") {
        Alert.alert(
          "User not found",
          "No account found with this email. Please check the email address or sign up for a new account.",
        );
      } else if (error.code === "auth/invalid-email") {
        Alert.alert(
          "Invalid email",
          "The email address you entered is not valid. Please check the format and try again.",
        );
      } else {
        Alert.alert(
          "Error",
          "An error occurred while trying to reset the password. Please try again later.",
        );
      }
    } finally {
      setLoading(false); // stop loading indicator after the process is complete
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* back button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <MaterialCommunityIcons name="arrow-left" size={28} color="#0F172A" />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.headerContainer}>
          <MaterialCommunityIcons name="lock-reset" size={60} color="10B981" />
          <Text style={styles.title}> Reset password </Text>
          <Text style={styles.subtitle}>
            Enter your email address and we'll send you instructions to reset
            your password.
          </Text>
        </View>

        <View style={styles.formContainer}>
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
          <TouchableOpacity
            style={styles.mainButton}
            activeOpacity={0.8}
            onPress={handleForgotPassword}
            disabled={loading}
          >
            <Text style={styles.mainButtonText}>
              {loading ? "Sending..." : "Send reset link"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  keyboardView: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  headerContainer: { alignItems: "center", marginBottom: 40 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  formContainer: { width: "100%" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 24,
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
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  mainButtonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
});
