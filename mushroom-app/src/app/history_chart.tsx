import { limitToLast, onValue, query, ref, get } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { G, Rect, Text as SvgText } from "react-native-svg";
import { db } from "../config/firebaseConfig";

// imports for exporting the historical data to a CSV file
import {File, Paths} from "expo-file-system";
import * as Sharing from "expo-sharing";
import {Alert} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// defining the screen width for the chart, to make it responsive
const screenWidth = Dimensions.get("window").width;

interface PastReadings {
  temperature_c: number;
  humidity: number;
  light_level: number;
  soil_moisture_level: number;
  co2_ppm: number;
  vpd: number;
  timestamp: string;
}

// custom tooltip component for the charts
interface TooltipState {
  x: number;
  y: number;
  value: number;
  visible: boolean;
}

export default function HistoryChartScreen() {
  const [loading, setLoading] = useState(true);

  // states to hold the historical data for temperature and humidity
  const [labels, setLabels] = useState<string[]>([]);
  const [temperatureData, setTemperatureData] = useState<number[]>([]);
  const [humidityData, setHumidityData] = useState<number[]>([]);
  const [lightLevelData, setLightLevelData] = useState<number[]>([]);
  const [soilMoistureData, setSoilMoistureData] = useState<number[]>([]);
  const [co2Data, setCo2Data] = useState<number[]>([]);
  const [vpdData, setVpdData] = useState<number[]>([]);

  // state for tooltip visibility and content
  const [tempTooltip, setTempTooltip] = useState<TooltipState>({
    x: 0,
    y: 0,
    value: 0,
    visible: false,
  });

  const [humTooltip, setHumTooltip] = useState<TooltipState>({
    x: 0,
    y: 0,
    value: 0,
    visible: false,
  });

  const [lightTooltip, setLightTooltip] = useState<TooltipState>({
    x: 0,
    y: 0,
    value: 0,
    visible: false,
  });

  const [soilTooltip, setSoilTooltip] = useState<TooltipState>({
    x: 0,
    y: 0,
    value: 0,
    visible: false,
  });

  const [co2Tooltip, setCo2Tooltip] = useState<TooltipState>({
    x: 0,
    y: 0,
    value: 0,
    visible: false,
  });

  const [vpdTooltip, setVpdTooltip] = useState<TooltipState>({
    x: 0,
    y: 0,
    value: 0,
    visible: false,
  });

  useEffect(() => {
    //creating a query to fetch only the last 7 readings from the "past_readings" node
    const historyRef = query(
      ref(db, "proiect-licenta/past_readings"),
      limitToLast(7),
    );

    const unsubscribe = onValue(
      historyRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // converting the data from an object to an array
          const readingsArray: PastReadings[] = Object.values(
            data,
          ) as PastReadings[];

          // extracting specific data into separate arrays for labels, temperature, and humidity
          const timeLabels = readingsArray.map((reading) => {
            const dateObj = new Date(reading.timestamp);
            // extracting only the hours and minutes from the timestamp
            return `${dateObj.getHours()}:${dateObj.getMinutes().toString().padStart(2, "0")}`;
          });

          const tempValues = readingsArray.map((reading) =>
            Number(reading.temperature_c.toFixed(1)),
          );
          const humidityValues = readingsArray.map((reading) =>
            Number(reading.humidity.toFixed(1)),
          );
          const lightlevelValues = readingsArray.map((reading) =>
            Number(reading.light_level.toFixed(1)),
          );
          const soilMoistureValues = readingsArray.map((reading) =>
            Number(reading.soil_moisture_level.toFixed(1)),
          );
          const co2Values = readingsArray.map((reading) =>
            Number(reading.co2_ppm.toFixed(1)),
          );
          const vpdValues = readingsArray.map((reading) =>
            Number(reading.vpd.toFixed(2)),
          );

          setLabels(timeLabels);
          setTemperatureData(tempValues);
          setHumidityData(humidityValues);
          setLightLevelData(lightlevelValues);
          setSoilMoistureData(soilMoistureValues);
          setCo2Data(co2Values);
          setVpdData(vpdValues);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching historical data: ", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // chart configuration - colors and styling
  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    strokeWidth: 3,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: "#10B981",
    },
  };

  // function for rendering the custom tooltip on the chart
  const renderTooltip = (tooltip: TooltipState, label: string) => {
    if (!tooltip.visible) return null;

    // check if the dot is too close to the top edge
    const isTooHigh = tooltip.y < 40;

    // if it's too high, position the tooltip below the dot instead of above
    const boxY = isTooHigh ? tooltip.y + 15 : tooltip.y - 35;

    // adjust the text position so it stays centered within the box
    const textY = isTooHigh ? tooltip.y + 31 : tooltip.y - 18;

    return (
      <G>
        {/* background rectangle for the tooltip */}
        <Rect
          x={tooltip.x - 25}
          y={boxY}
          width="50"
          height="24"
          fill="#0F172A"
          rx="6"
          ry="6"
        />
        {/* text displaying the value in the tooltip */}
        <SvgText
          x={tooltip.x}
          y={textY}
          fill="white"
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
        >
          {`${tooltip.value}${label}`}
        </SvgText>
      </G>
    );
  };

   // function for exporting the historical data to a CSV file 
    const exportToCSV = async () => {
      try {
      // adding a loading state 
      setLoading(true);

      // fetching up to 1000 past readings to include in the CSV export
      const dataRef = query(ref(db, "proiect-licenta/past_readings"), limitToLast(1000));
      const snapshot = await get(dataRef);

      if (!snapshot.exists()) {
        Alert.alert("No data to export", "There are no historical readings available to export.");
        return;
      }

      // creating the csv header row
      let csvString = "Timestamp,Temperature (C),Air Humidity (%),Light level (lux),Soil Humidity (%),CO2 (ppm),VPD (kPa)\n";

      // iterating through the created snapshot to build the rows
      snapshot.forEach((childSnapshot) => {
        const row = childSnapshot.val();
        
        // formatting the timestamp into a readable format; we create a fallback in case the timestamp is missing from the Firebase or invalid
        const dateStr = row.timestamp ? new Date(row.timestamp).toLocaleDateString() + " " + new Date(row.timestamp).toTimeString() : "Unknown Timestamp"; // the timestamp in firebase is stored as date + time, so we convert it accordingly
        csvString += `${dateStr},${row.temperature_c},${row.humidity},${row.light_level},${row.soil_moisture_level},${row.co2_ppm},${row.vpd}\n`;
      });

      // defining the file path for the CSV file
      const fileName = `Mushroom_Farm_Data_${new Date().getTime()}.csv`;
      const file = new File(Paths.document, fileName);

      // writing the CSV string to the file
      file.write(csvString);

      // sharing the file using the device's sharing options
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        // if sharing is available, we share the file
        await Sharing.shareAsync(file.uri, {
          mimeType: "text/csv",
          dialogTitle: "Export mushroom farm data",
          UTI: "public.comma-separated-values-text"
        });
      } else {
        Alert.alert("Error sharing file", "Sharing is not available on this device.");
      }

    } catch (error) {
      console.error("CSV export error: ", error);
      Alert.alert("Error exporting data", "An error occurred while exporting the data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Historical Sensor Data</Text>
          <Text style={styles.headerSubtitle}>
            Visualize past readings from your mushroom farm
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading historical data...</Text>
          </View>
        ) : temperatureData.length === 0 ? (
          <Text style={styles.noDataText}>No historical data available</Text>
        ) : (
          <View>
            {/* vpd values chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Past VPD values (kPa)</Text>
              <LineChart
                data={{
                  labels: labels,
                  datasets: [{ data: vpdData }],
                }}
                width={screenWidth - 60} // 20 padding on each side
                height={220}
                yAxisSuffix="kPa"
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#8B5CF6" },
                }}
                bezier // for smooth curves
                style={styles.chartStyle}
                onDataPointClick={(data) => {
                  setVpdTooltip({
                    x: data.x,
                    y: data.y,
                    value: data.value,
                    visible: true,
                  });
                  //hide the others tooltip for no overlapping
                  setTempTooltip((prev) => ({ ...prev, visible: false }));
                  setHumTooltip((prev) => ({ ...prev, visible: false }));
                  setLightTooltip((prev) => ({ ...prev, visible: false }));
                  setSoilTooltip((prev) => ({ ...prev, visible: false }));
                  setCo2Tooltip((prev) => ({ ...prev, visible: false }));  
                }}
                decorator={() => renderTooltip(vpdTooltip, "kPa")}
              />
            </View>
            {/* temperature chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Past Temperatures (°C)</Text>
              <LineChart
                data={{
                  labels: labels,
                  datasets: [{ data: temperatureData }],
                }}
                width={screenWidth - 60} // 20 padding on each side
                height={220}
                yAxisSuffix="°"
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#EF4444" },
                }}
                bezier // for smooth curves
                style={styles.chartStyle}
                onDataPointClick={(data) => {
                  setTempTooltip({
                    x: data.x,
                    y: data.y,
                    value: data.value,
                    visible: true,
                  });
                  //hide the others tooltip for no overlapping
                  setHumTooltip((prev) => ({ ...prev, visible: false }));
                  setLightTooltip((prev) => ({ ...prev, visible: false }));
                  setSoilTooltip((prev) => ({ ...prev, visible: false }));
                  setCo2Tooltip((prev) => ({ ...prev, visible: false }));
                  setVpdTooltip((prev) => ({ ...prev, visible: false }));
                }}
                decorator={() => renderTooltip(tempTooltip, "°C")}
              />
            </View>
            {/* humidity chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Past Air Humidity (%)</Text>
              <LineChart
                data={{
                  labels: labels,
                  datasets: [{ data: humidityData }],
                }}
                width={screenWidth - 60} // 20 padding on each side
                height={220}
                yAxisSuffix="%"
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#3B82F6" },
                }}
                bezier // for smooth curves
                style={styles.chartStyle}
                onDataPointClick={(data) => {
                  setHumTooltip({
                    x: data.x,
                    y: data.y,
                    value: data.value,
                    visible: true,
                  });
                  //hide the other tooltip for no overlapping
                  setVpdTooltip((prev) => ({ ...prev, visible: false }));
                  setTempTooltip((prev) => ({ ...prev, visible: false }));
                  setLightTooltip((prev) => ({ ...prev, visible: false }));
                  setSoilTooltip((prev) => ({ ...prev, visible: false }));
                  setCo2Tooltip((prev) => ({ ...prev, visible: false }));
                }}
                decorator={() => renderTooltip(humTooltip, "%")}
              />
            </View>
            {/* light level chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Past Light Levels (lux)</Text>
              <LineChart
                data={{
                  labels: labels,
                  datasets: [{ data: lightLevelData }],
                }}
                width={screenWidth - 60} // 20 padding on each side
                height={220}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#F59E0B" },
                }}
                bezier // for smooth curves
                style={styles.chartStyle}
                onDataPointClick={(data) => {
                  setLightTooltip({
                    x: data.x,
                    y: data.y,
                    value: data.value,
                    visible: true,
                  });
                  //hide the other tooltip for no overlapping
                  setVpdTooltip((prev) => ({ ...prev, visible: false }));
                  setTempTooltip((prev) => ({ ...prev, visible: false }));
                  setHumTooltip((prev) => ({ ...prev, visible: false }));
                  setSoilTooltip((prev) => ({ ...prev, visible: false }));
                  setCo2Tooltip((prev) => ({ ...prev, visible: false }));
                }}
                decorator={() => renderTooltip(lightTooltip, "lux")}
              />
            </View>
            {/* soil moisture chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>
                Past Soil Moisture Levels (%)
              </Text>
              <LineChart
                data={{
                  labels: labels,
                  datasets: [{ data: soilMoistureData }],
                }}
                width={screenWidth - 60} // 20 padding on each side
                height={220}
                yAxisSuffix="%"
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#10B981" },
                }}
                bezier // for smooth curves
                style={styles.chartStyle}
                onDataPointClick={(data) => {
                  setSoilTooltip({
                    x: data.x,
                    y: data.y,
                    value: data.value,
                    visible: true,
                  });
                  //hide the other tooltip for no overlapping
                  setVpdTooltip((prev) => ({ ...prev, visible: false }));
                  setTempTooltip((prev) => ({ ...prev, visible: false }));
                  setLightTooltip((prev) => ({ ...prev, visible: false }));
                  setHumTooltip((prev) => ({ ...prev, visible: false }));
                  setCo2Tooltip((prev) => ({ ...prev, visible: false }));
                }}
                decorator={() => renderTooltip(soilTooltip, "%")}
              />
            </View>
            {/* co2 levels chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Past CO2 Levels (ppm)</Text>
              <LineChart
                data={{
                  labels: labels,
                  datasets: [{ data: co2Data }],
                }}
                width={screenWidth - 60} // 20 padding on each side
                height={220}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#64748B" },
                }}
                bezier // for smooth curves
                style={styles.chartStyle}
                onDataPointClick={(data) => {
                  setCo2Tooltip({
                    x: data.x,
                    y: data.y,
                    value: data.value,
                    visible: true,
                  });
                  //hide the other tooltip for no overlapping
                  setVpdTooltip((prev) => ({ ...prev, visible: false }));
                  setTempTooltip((prev) => ({ ...prev, visible: false }));
                  setLightTooltip((prev) => ({ ...prev, visible: false }));
                  setHumTooltip((prev) => ({ ...prev, visible: false }));
                  setSoilTooltip((prev) => ({ ...prev, visible: false }));
                }}
                decorator={() => renderTooltip(co2Tooltip, "")}
              />
            </View>
            {/* export data to CSV button */}
            <TouchableOpacity style={styles.buttonExport} onPress={exportToCSV}>
              <MaterialCommunityIcons name="file-export-outline" size={24} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.buttonExportText}>
                Export Data to CSV
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 4,
  },
  loadingContainer: {
    marginTop: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 16,
  },
  noDataText: {
    textAlign: "center",
    marginTop: 50,
    color: "#64748B",
    fontSize: 16,
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
    marginLeft: 10,
  },
  chartStyle: {
    borderRadius: 16,
  },
  buttonExport: {
    backgroundColor: "#10B981",
    
    padding: 15,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  buttonExportText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  }
});
