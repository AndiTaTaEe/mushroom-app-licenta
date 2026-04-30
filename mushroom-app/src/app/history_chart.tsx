import { limitToLast, onValue, query, ref } from "firebase/database";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { G, Rect, Text as SvgText } from "react-native-svg";
import { db } from "../config/firebaseConfig";

// defining the screen width for the chart, to make it responsive
const screenWidth = Dimensions.get("window").width;

interface PastReadings {
  temperature_c: number;
  humidity: number;
  light_level: number;
  soil_moisture_level: number;
  co2_ppm: number;
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

          setLabels(timeLabels);
          setTemperatureData(tempValues);
          setHumidityData(humidityValues);
          setLightLevelData(lightlevelValues);
          setSoilMoistureData(soilMoistureValues);
          setCo2Data(co2Values);
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
                  setTempTooltip((prev) => ({ ...prev, visible: false }));
                  setLightTooltip((prev) => ({ ...prev, visible: false }));
                  setHumTooltip((prev) => ({ ...prev, visible: false }));
                  setSoilTooltip((prev) => ({ ...prev, visible: false }));
                }}
                decorator={() => renderTooltip(co2Tooltip, "")}
              />
            </View>
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
});
