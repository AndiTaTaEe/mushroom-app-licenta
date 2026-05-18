import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import React, {useState} from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput, 
    TouchableOpacity,
    View
} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";

// firebase database imports
import {ref, update} from "firebase/database";
import {db} from "../config/firebaseConfig";

export default function SettingsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // grouping all 12 inputs (2 min/max for each of the 6 sensor parameters) into a single object 
    const [thresholds, setThresholds] = useState({
        tempMin: "15.0", tempMax: "30.0",
        humidityMin: "80.0", humidityMax: "90.0",
        vpdMin: "0.2", vpdMax: "0.4",
        co2Min: "500.0", co2Max: "1000.0",
        lightMin: "500.0", lightMax: "1000.0",
        soilMin: "80.0", soilMax: "90.0"
    });

    // handler for updating the thresholds in the object when the user changes the value in the input field
    const handleInputChange = (key: string, value: string) => {
        setThresholds(prev => ({...prev, [key]: value}));
    };

    const handleSaveSettings = async () => {
        setLoading(true);
        try{
            // structuring the thresholds object to match the structure of the db
            const newThresholds = {
                temperature_c: {
                    min: parseFloat(thresholds.tempMin),
                    max: parseFloat(thresholds.tempMax)
                },
                humidity_percent: {
                    min: parseFloat(thresholds.humidityMin),
                    max: parseFloat(thresholds.humidityMax)
                },
                vpd_kpa: {
                    min: parseFloat(thresholds.vpdMin),
                    max: parseFloat(thresholds.vpdMax)
                },
                co2_ppm: {
                    min: parseFloat(thresholds.co2Min),
                    max: parseFloat(thresholds.co2Max)
                },
                light_lux: {
                    min: parseFloat(thresholds.lightMin),
                    max: parseFloat(thresholds.lightMax)
                },
                soil_moisture_percent: {
                    min: parseFloat(thresholds.soilMin),
                    max: parseFloat(thresholds.soilMax)
                }
            };

            // pointing to the location in the db where the thresholds are stored and updated
            const settingsRef = ref(db, "proiect-licenta/farm_settings");

            // update the database
            await update(settingsRef, newThresholds);
            Alert.alert("Success", "Thresholds updated successfully. The Raspberry Pi will apply these immediately.");
        } catch (error) {
            console.error("Failed to save settings: ", error);
            Alert.alert("Error", "Couldn't connect to the database. Please try again.");
        } finally {
            setLoading(false);
        }
    };


    // helper function to render each parameter row with its label, icon, unit, and min/max inputs in a consistent way
    const renderTargetRow = (label: string, minKey: keyof typeof thresholds, maxKey: keyof typeof thresholds, icon:keyof typeof MaterialCommunityIcons.glyphMap, unit: string) => (
        <View style={styles.targetRow}>
            <View style={styles.targetLabelContainer}>
                <MaterialCommunityIcons name={icon} size={20} color="#64748B" style={{marginRight: 8}} />
                <Text style={styles.targetLabel}>{label} ({unit})</Text>
            </View>
            <View style={styles.inputsContainer}>
                <TextInput
                    style={styles.numberInput}
                    keyboardType="numeric"
                    value={thresholds[minKey]}
                    onChangeText={(value) => handleInputChange(minKey, value)}
                    placeholder="Min"
                />
                <Text style={styles.toText}>to</Text>
                <TextInput
                    style={styles.numberInput}
                    keyboardType="numeric"
                    value={thresholds[maxKey]}
                    onChangeText={(value) => handleInputChange(maxKey, value)}
                    placeholder="Max"
                />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            {/*header section*/}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mushroom Farm Settings</Text>
                {/*for spacing the title*/}
                <View style={{width: 28}} /> 
                
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/*thresholds card*/}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="home-thermometer-outline" size={24} color="#10B981" />
                            <Text style={styles.cardTitle}> Farm Thresholds</Text>
                        </View>
                        <Text style={styles.cardSubtitle}>
                            Set the optimal ranges for your mushroom farm parameters. The Raspberry Pi will monitor these and alert you if any parameter goes out of range.
                        </Text>
                        {/*rendering each parameter row using the renderTargetRow function for consistency and cleaner code*/}
                        {renderTargetRow("Temp", "tempMin", "tempMax", "thermometer", "°C")}
                        {renderTargetRow("Humidity", "humidityMin", "humidityMax", "air-humidifier", "%")}
                        {renderTargetRow("VPD", "vpdMin", "vpdMax", "chart-line-variant", "kPa")}
                        {renderTargetRow("CO2", "co2Min", "co2Max", "molecule-co2", "ppm")}
                        {renderTargetRow("Light", "lightMin", "lightMax", "lightbulb", "lux")}
                        {renderTargetRow("Moisture", "soilMin", "soilMax", "water-percent", "%")}

                        <TouchableOpacity
                            style={styles.saveButton}
                            activeOpacity={0.8}
                            onPress={handleSaveSettings}
                            disabled={loading}
                        >
                            <MaterialCommunityIcons name="cloud-upload-outline" size={20} color="white" style={{marginRight: 8}} />
                            <Text style={styles.saveButtonText}>
                                {loading ? "Syncing to Cloud" : "Save Thresholds" }
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/*app preferences card for future implementations*/}
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="cog-outline" size={24} color="#10B981" />
                            <Text style={styles.cardTitle}> App Preferences </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", marginLeft: 10 },
  cardSubtitle: { fontSize: 14, color: "#64748B", marginBottom: 20, lineHeight: 20 },
  
  targetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  targetLabelContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
  targetLabel: { fontSize: 15, fontWeight: "600", color: "#334155" },
  inputsContainer: { flexDirection: "row", alignItems: "center" },
  numberInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    width: 60,
    height: 40,
    textAlign: "center",
    color: "#0F172A",
    fontWeight: "600",
  },
  toText: { marginHorizontal: 8, color: "#94A3B8", fontWeight: "500" },
  
  saveButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  
  secondaryButton: {
    backgroundColor: "#F1F5F9",
    flexDirection: "row",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  secondaryButtonText: { color: "#0F172A", fontSize: 15, fontWeight: "600" },
});