import React, {useState, useEffect} from "react";
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {MaterialCommunityIcons} from "@expo/vector-icons";
import {useRouter} from "expo-router";

// firebase imports
import {limitToLast, onValue, query, ref} from "firebase/database";
import {db} from "../config/firebaseConfig";

// preferences imports
import { usePreferences} from "../context/preferences_context";

interface AlertItem {
    id: string;
    timestamp: number;
    message: string;
    type: "critical" | "warning" | "info";
    parameter: string;
}

export default function AlertsScreen() {
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const router = useRouter();
    const {isDarkMode, theme} = usePreferences();

    useEffect(() => {
        // create a query to fetch the last 30 alerts from the db
        const alertsRef = query(ref(db, "proiect-licenta/alerts"), limitToLast(30));

        const unsubscribe = onValue(alertsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // convert firebase object into an array and add the unique key as id
                const alertsArray = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                }));

                // sort by newest first
                alertsArray.sort((a,b) => b.timestamp - a.timestamp);
                setAlerts(alertsArray);
            } else {
                setAlerts([]); // no alerts in the db, set empty array
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching alerts: ", error);
            setLoading(false);
        }
    );
    return () => unsubscribe();// cleanup the listener on unmount
    }, []);

    // helper function to pick icons and colors based on the alert type and parameter
    const getAlertUI =(type: string, parameter: string) => {
        let color = theme.primary; 
        if (type === "critical") color = "#EF4444"; // red for critical
        if (type === "warning") color = "#F59E0B"; // orange for warning
        if (type === "info") color = "#3B82F6"; // blue for info
        let icon = "bell-outline";
        if (parameter === "vpd_value") icon = "chart-line-variant";
        if (parameter === "temperature_c") icon = "thermometer";
        if (parameter === "humidity_percent") icon = "air-humidifier";
        if (parameter === "light_lux") icon = "lightbulb";
        if (parameter === "soil_moisture_percent") icon = "water-percent";
        if (parameter === "co2_ppm") icon = "molecule-co2";
        if (parameter === "system") icon = "raspberry-pi";
        return {color, icon};
    };

    // format timestamp to a readable string
    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString(); // if the alert is from today - show time only, else show date and time
        const timeString = `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;

        if (isToday) return `Today at ${timeString}`;
        return `${date.getDate()}/${date.getMonth() + 1} at ${timeString}`;
    };

    // render individual alert card
    const renderAlert = ({item}: {item: AlertItem}) => {
        const {color, icon} = getAlertUI(item.type, item.parameter);
        return (
            <View style={[styles.alertCard, {backgroundColor: theme.card, borderLeftColor: color}]}>
                <View style={[styles.iconContainer, {backgroundColor: `${color}15`}]}>
                    <MaterialCommunityIcons name={icon as any} size={24} color={color} />
                </View>
                <View style={styles.alertContent}>
                    <Text style={[styles.alertMessage, {color: theme.text}]}>{item.message}</Text>
                    <Text style={[styles.alertTime, {color: theme.subtext}]}>{formatTimestamp(item.timestamp)}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.safeArea, {backgroundColor: theme.background}]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color={theme.icon} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, {color: theme.text}]}>Event Log</Text>
                {/* placeholder to balance the header */}
                <View style={{width: 28}} /> 
            </View>
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={{ color: theme.subtext, marginTop: 12}}> Loading event history... </Text>
                </View>
            ) : alerts.length === 0 ? (
                <View style={styles.centerContainer}>
                    <MaterialCommunityIcons name="check-circle-outline" size={64} color={theme.primary} />
                    <Text style={[styles.emptyText, {color: theme.text}]}>No events recorded</Text>
                    <Text style={{ color: theme.subtext, marginTop: 8}}>
                        No recent alerts or warnings have been triggered. Your mushroom farm is running smoothly!
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={alerts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderAlert}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                 />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  backButton: { padding: 4 },
  listContainer: { padding: 20, paddingBottom: 40 },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 100 },
  emptyText: { fontSize: 20, fontWeight: "bold", marginTop: 16 },
  
  alertCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  alertContent: { flex: 1, justifyContent: "center" },
  alertMessage: { fontSize: 15, fontWeight: "600", marginBottom: 4, lineHeight: 20 },
  alertTime: { fontSize: 12 },
});