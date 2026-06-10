import { limitToLast, onValue, query, ref, get } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StatusBar,
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
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// import services
import { sensorService } from "../services/sensorService";

// import for preferences context, types and constants
import { usePreferences } from "../context/preferences_context";
import {
  COLORS,
  THRESHOLDS,
  FIREBASE_PATHS,
  SENSOR_COLORS,
  TIME_UNITS,
} from "../constants/theme";
import { PastReadings, TooltipState} from "../types/index";

// defining the screen width for the chart, to make it responsive
const screenWidth = Dimensions.get("window").width;

export default function HistoryChartScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // states for the active time filters and massive raw array
  const [timeRange, setTimeRange] = useState<"1H" | "24H" | "7D">("1H"); // default to 1 hour
  const [rawReadings, setRawReadings] = useState<PastReadings[]>([]);

  // states to hold the historical data for temperature and humidity
  const [labels, setLabels] = useState<string[]>([]);
  const [temperatureData, setTemperatureData] = useState<number[]>([]);
  const [humidityData, setHumidityData] = useState<number[]>([]);
  const [lightLevelData, setLightLevelData] = useState<number[]>([]);
  const [soilMoistureData, setSoilMoistureData] = useState<number[]>([]);
  const [co2Data, setCo2Data] = useState<number[]>([]);
  const [vpdData, setVpdData] = useState<number[]>([]);

  const { isFahrenheit, isDarkMode, theme } = usePreferences(); // getting the user's temperature unit preference and theme from the context

  // state to manage the visibility and content of the tooltips
  // we have one tooltip for each parameter we want to display
  type TooltipKeys =
    | "temperature"
    | "humidity"
    | "light"
    | "soil"
    | "co2"
    | "vpd";
  // default state for all tooltips
  const defaultTooltipState: TooltipState = {
    x: 0,
    y: 0,
    value: 0,
    visible: false,
  };

  // initialiazing the tooltips state with default state for each parameter, we will update when the user clicks on a data point in the chart
  const [tooltips, setTooltips] = useState<Record<TooltipKeys, TooltipState>>({
    temperature: { ...defaultTooltipState },
    humidity: { ...defaultTooltipState },
    light: { ...defaultTooltipState },
    soil: { ...defaultTooltipState },
    co2: { ...defaultTooltipState },
    vpd: { ...defaultTooltipState },
  });

  // helper function to hide all the tooltips
  const hideAllTooltips = () => {
    setTooltips(
      (prev) =>
        Object.fromEntries(
          // iterate thorugh all the tooltips and set their visible to false
          // Object.entries returns an array of [k, v] pairs, so we can map through it and update the visible propery for each tooltip
          (Object.entries(prev) as [TooltipKeys, TooltipState][]).map(
            ([key, state]) => [key, { ...state, visible: false }],
          ),
        ) as Record<TooltipKeys, TooltipState>,
    );
  };

  // helper function to set a specific tooltip as active and hide the others
  const setActiveTooltip = (
    key: TooltipKeys,
    data: { x: number; y: number; value: number },
  ) => {
    // we set the clicked tooltip as visible
    setTooltips((prev) => {
      const updatedTooltip = { ...prev };

      // set the active tooltip
      updatedTooltip[key] = {
        x: data.x,
        y: data.y,
        value: data.value,
        visible: true,
      };
      // hide other tooltips
      (Object.keys(updatedTooltip) as TooltipKeys[])
        .filter((k) => k !== key)
        .forEach((k) => {
          updatedTooltip[k] = { ...updatedTooltip[k], visible: false };
        });
      return updatedTooltip;
    });
  };

  // fetching the historical data from Firebase
  useEffect(() => {
    //creating a query to fetch the last 250 readings from the Firebase, so we have enough for 7 days of data readings
    setLoading(true);
    setError(null);
    const unsubscribe = sensorService.subscribeToHistoricalData(
      (data) => {
        setRawReadings(data);
        setLoading(false);
      }, 
      (error) => {
        console.error("Historical data error: ", error);
        setError("Failed to load historical data. Please try again later.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // logic for filtering the raw readings based on the selected time range
  // runs every time the rawReadings or timeRange state changes, so we can update the displayed data accordingly
  useEffect(() => {
    if (rawReadings.length === 0) return; // if there are no readings, we wont filter anythings
    hideAllTooltips(); // hide any visible tooltips when the range changes (1h, 24h, 7d) to avoid showing tooltips for the wrong data points
    const now = Date.now();
    let cutoffTime = now;

    // define how far back we want to go based on the selected time range
    if (timeRange === "1H") {
      cutoffTime = now - TIME_UNITS.HOUR_MS; // 1 hour in ms
    } else if (timeRange === "24H") {
      cutoffTime = now - TIME_UNITS.DAY_MS; // 24 hrs in ms
    } else if (timeRange === "7D") {
      cutoffTime = now - TIME_UNITS.WEEK_MS; // 7 days in ms
    }

    // filtering out the readings that are older than the cutoff time
    let filteredReadings = rawReadings.filter((reading) => {
      const readingTime = new Date(reading.timestamp).getTime();
      return readingTime >= cutoffTime;
    });

    // logic for adjusting the resolution based on the selected time range
    let MAX_CHART_POINTS: number = THRESHOLDS.MAX_CHART_POINTS_1H; // default for 1h
    if (timeRange === "24H") MAX_CHART_POINTS = THRESHOLDS.MAX_CHART_POINTS_24H; // 1 point per hour
    if (timeRange === "7D") MAX_CHART_POINTS = THRESHOLDS.MAX_CHART_POINTS_7D; // 2 points per day

    // if we have more readings than the max points for the chart, we reduce the number of points by taking every nth point, where n is the total number of readings divided by the max points
    // this way we can show a representative sample of the data without overcrowding the chart
    if (filteredReadings.length > MAX_CHART_POINTS) {
      const step = Math.ceil(filteredReadings.length / MAX_CHART_POINTS);
      filteredReadings = filteredReadings.filter(
        (_, index) =>
          index % step === 0 || index === filteredReadings.length - 1,
      ); // ensure the last point is included
    }

    // extracting specific data points for the charts and formatting the labels based on the timestamp of each reading
    const timeLabels = filteredReadings.map((reading, index) => {
      // determine if we have room to show the label
      let shouldShowLabel = true;
      if (timeRange === "24H") {
        // 24 points max, show every 4th label
        shouldShowLabel = index % 4 === 0;
      } else if (timeRange === "7D") {
        // 14 points max, show every 2nd label
        shouldShowLabel = index % 2 === 0;
      }

      if (!shouldShowLabel) return ""; // if we have too many points, return an empty string for the label to avoid clutter

      // creating a date object from the timestamp to format the label accordingly
      const dateObj = new Date(reading.timestamp);
      // if the time range is 7 days, we show the date and time on the labels, otherwise we show only the time
      if (timeRange === "7D") {
        return `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
      }
      return `${dateObj.getHours()}:${dateObj.getMinutes().toString().padStart(2, "0")}`;
    });
    setLabels(timeLabels);

    // mapping the filtered readings to extract the specific parameters we want to display for each chart
    const tempValues = filteredReadings.map((reading) =>
      Number(reading.temperature_c.toFixed(1)),
    );
    const humidityValues = filteredReadings.map((reading) =>
      Number(reading.humidity_percent.toFixed(1)),
    );
    const lightlevelValues = filteredReadings.map((reading) =>
      Number(reading.light_lux.toFixed(1)),
    );
    const soilMoistureValues = filteredReadings.map((reading) =>
      Number(reading.soil_moisture_percent.toFixed(1)),
    );
    const co2Values = filteredReadings.map((reading) =>
      Number(reading.co2_ppm.toFixed(1)),
    );
    const vpdValues = filteredReadings.map((reading) =>
      Number(reading.vpd_kpa.toFixed(2)),
    );

    setTemperatureData(tempValues);
    setHumidityData(humidityValues);
    setLightLevelData(lightlevelValues);
    setSoilMoistureData(soilMoistureValues);
    setCo2Data(co2Values);
    setVpdData(vpdValues);
  }, [rawReadings, timeRange]); // we run this effect every time the rawReadings or timeRange state changes

  // if the user preference is set to fahrenheit, we convert the temperature data from celsius to fahrenheit before displaying it on the chart
  const displayTemperatureData = isFahrenheit
    ? temperatureData.map((tempC) => Number(((tempC * 9) / 5 + 32).toFixed(1)))
    : temperatureData;
  const tempUnit = isFahrenheit ? "°F" : "°C";

  // chart configuration - colors and styling
  const chartConfig = {
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => {
      // convert hex color to rgba for dynamic theme colors
      const rgb = parseInt(theme.subtext.slice(1), 16);
      const r = (rgb >> 16) & 255;
      const g = (rgb >> 8) & 255;
      const b = rgb & 255;
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    },
    strokeWidth: 3,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: COLORS.primary,
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
      const exportData = await sensorService.fetchHistoricalData(THRESHOLDS.MAX_EXPORT_READINGS);

      if (exportData.length === 0) {
        Alert.alert(
          "No data to export",
          "There are no historical readings available to export.",
        );
        return;
      }

      const tempCsvUnit = isFahrenheit ? "F" : "C";

      // creating the csv header row
      let csvString = `Timestamp,Temperature (${tempCsvUnit}),Air Humidity (%),Light level (lux),Soil Humidity (%),CO2 (ppm),VPD (kPa)\n`;

      // iterating through the created snapshot to build the rows
      exportData.forEach((row) => {
        // formatting the timestamp into a readable format; we create a fallback in case the timestamp is missing from the Firebase or invalid
        const dateStr = row.timestamp
          ? new Date(row.timestamp).toLocaleDateString() +
            " " +
            new Date(row.timestamp).toTimeString()
          : "Unknown Timestamp"; // the timestamp in firebase is stored as date + time, so we convert it accordingly

        // convert the raw firebase temp to fahrenheit if the user preference is set to fahrenheit, otherwise keep it in celsius
        const exportTemp = isFahrenheit
          ? ((row.temperature_c * 9) / 5 + 32).toFixed(1)
          : row.temperature_c;
        csvString += `${dateStr},${exportTemp},${row.humidity_percent},${row.light_lux},${row.soil_moisture_percent},${row.co2_ppm},${row.vpd_kpa}\n`;
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
          UTI: "public.comma-separated-values-text",
        });
      } else {
        Alert.alert(
          "Error sharing file",
          "Sharing is not available on this device.",
        );
      }
    } catch (error) {
      console.error("CSV export error: ", error);
      Alert.alert(
        "Error exporting data",
        "An error occurred while exporting the data. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Historical Sensor Data
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
            Visualize past readings from your mushroom farm
          </Text>
        </View>

        {/* time range filter buttons */}
        <View style={styles.filterRow}>
          {["1H", "24H", "7D"].map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.filterPill,
                timeRange === range
                  ? {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    }
                  : {
                      backgroundColor: "transparent",
                      borderColor: theme.border,
                    },
              ]}
              onPress={() => setTimeRange(range as "1H" | "24H" | "7D")}
            >
              <Text
                style={{
                  color: timeRange === range ? "white" : theme.text,
                  fontWeight: timeRange === range ? "bold" : "600",
                }}
              >
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.subtext }]}>
              Loading historical data...
            </Text>
          </View>
        ) : temperatureData.length === 0 ? (
          <Text style={[styles.noDataText, { color: theme.subtext }]}>
            No historical data available
          </Text>
        ) : (
          <View>
            {/* vpd values chart */}
            <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>
                Past VPD values (kPa)
              </Text>
              <LineChart
                data={{
                  labels: labels,
                  datasets: [{ data: vpdData }],
                }}
                width={screenWidth - 60} // 20 padding on each side
                height={256}
                yAxisSuffix="kPa"
                verticalLabelRotation={30}
                xLabelsOffset={10}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#8B5CF6" },
                }}
                bezier // for smooth curves
                style={styles.chartStyle} // adding extra right padding to make room for the tooltip
                onDataPointClick={(data) => {
                  setActiveTooltip("vpd", data);
                }}
                decorator={() => renderTooltip(tooltips.vpd, "kPa")}
              />
            </View>
            {/* temperature chart */}
            <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>
                Past Temperatures ({tempUnit})
              </Text>
              <LineChart
                data={{
                  labels: labels,
                  datasets: [{ data: displayTemperatureData }],
                }}
                width={screenWidth - 60} // 20 padding on each side
                height={220}
                yAxisSuffix="°"
                verticalLabelRotation={30}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#EF4444" },
                }}
                bezier // for smooth curves
                style={styles.chartStyle}
                onDataPointClick={(data) => {
                  setActiveTooltip("temperature", data);
                }}
                decorator={() => renderTooltip(tooltips.temperature, tempUnit)}
              />
            </View>
            {/* humidity chart */}
            <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>
                Past Air Humidity (%)
              </Text>
              <LineChart
                data={{
                  labels: labels,
                  datasets: [{ data: humidityData }],
                }}
                width={screenWidth - 60} // 20 padding on each side
                height={220}
                yAxisSuffix="%"
                verticalLabelRotation={30}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#3B82F6" },
                }}
                bezier // for smooth curves
                style={styles.chartStyle}
                onDataPointClick={(data) => {
                  setActiveTooltip("humidity", data);
                }}
                decorator={() => renderTooltip(tooltips.humidity, "%")}
              />
            </View>
            {/* light level chart */}
            <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>
                Past Light Levels (lux)
              </Text>
              <LineChart
                data={{
                  labels: labels,
                  datasets: [{ data: lightLevelData }],
                }}
                width={screenWidth - 60} // 20 padding on each side
                height={220}
                verticalLabelRotation={30}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#F59E0B" },
                }}
                bezier // for smooth curves
                style={styles.chartStyle}
                onDataPointClick={(data) => {
                  setActiveTooltip("light", data);
                }}
                decorator={() => renderTooltip(tooltips.light, "lx")}
              />
            </View>
            {/* soil moisture chart */}
            <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>
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
                verticalLabelRotation={30}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#10B981" },
                }}
                bezier // for smooth curves
                style={styles.chartStyle}
                onDataPointClick={(data) => {
                  setActiveTooltip("soil", data);
                }}
                decorator={() => renderTooltip(tooltips.soil, "%")}
              />
            </View>
            {/* co2 levels chart */}
            <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.chartTitle, { color: theme.text }]}>
                Past CO2 Levels (ppm)
              </Text>
              <LineChart
                data={{
                  labels: labels,
                  datasets: [{ data: co2Data }],
                }}
                width={screenWidth - 60} // 20 padding on each side
                height={220}
                verticalLabelRotation={30}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#64748B" },
                }}
                bezier // for smooth curves
                style={styles.chartStyle}
                onDataPointClick={(data) => {
                  setActiveTooltip("co2", data);
                }}
                decorator={() => renderTooltip(tooltips.co2, "ppm")}
              />
            </View>
            {/* export data to CSV button */}
            <TouchableOpacity style={styles.buttonExport} onPress={exportToCSV}>
              <MaterialCommunityIcons
                name="file-export-outline"
                size={24}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.buttonExportText}>Export Data to CSV</Text>
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
  },
  headerSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
  },
  loadingContainer: {
    marginTop: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  noDataText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
  },
  chartCard: {
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
    marginBottom: 10,
    marginLeft: 10,
  },
  chartStyle: {
    borderRadius: 16,
  },
  buttonExport: {
    backgroundColor: COLORS.primary,
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
  },
});
