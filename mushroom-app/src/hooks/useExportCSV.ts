import { useState } from "react";
import { Alert } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

// import services and types
import { sensorService } from "../services/sensorService";
import { THRESHOLDS } from "../constants/theme";
import { PastReadings } from "../types";

interface ExportOptions {
  isFahrenheit: boolean;
  maxReadings?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// hook to export historical data to CSV and share it, with error handling and user feedback
export const useExportCSV = () => {
  const [isExporting, setIsExporting] = useState(false);

  // main function to handle the export process, including fetching data, building the CSV string, creating the file, and sharing it
  const exportToCSV = async (options: ExportOptions) => {
    const {
      isFahrenheit,
      maxReadings = THRESHOLDS.MAX_EXPORT_READINGS,
      onSuccess,
      onError,
    } = options;

    try {
      setIsExporting(true);
      // we fetch the historical data once without subscribing to changes, to get a snapshot of the data for export - this is more efficient than subscribing to changes for this use case
      const exportData = await sensorService.fetchHistoricalData(maxReadings);

      if (exportData.length === 0) {
        Alert.alert(
          "No data to export",
          "There are no historical readings available to export."
        );
        setIsExporting(false);
        return;
      }

      // build the CSV string from the data, with proper formatting and unit conversion if needed
      const csvString = buildCSVString(exportData, isFahrenheit);

      // create the file and share it using the device's sharing options
      await createAndShareFile(csvString);

      setIsExporting(false);
      onSuccess?.();
    } catch (error) {
      console.error("CSV export error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      Alert.alert(
        "Error exporting data",
        `An error occurred while exporting the data: ${errorMessage}`
      );

      setIsExporting(false);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  };

  return { isExporting, exportToCSV };
};

// function for building the CSV string from the historical data, with proper formatting and unit conversion if needed
function buildCSVString(data: PastReadings[], isFahrenheit: boolean): string {
  const tempCsvUnit = isFahrenheit ? "F" : "C";

  // csv header
  let csvString = `Timestamp,Temperature (${tempCsvUnit}),Air Humidity (%),Light level (lux),Soil Moisture (%),CO2 (ppm),VPD (kPa)\n`;

  data.forEach((row) => {
    // Format timestamp
    const dateStr = row.timestamp
      ? new Date(row.timestamp).toLocaleDateString() +
        " " +
        new Date(row.timestamp).toTimeString()
      : "Unknown Timestamp";

    // convert temperature if needed to fahrenheit and format all numbers to a fixed number of decimal places for better readability in the CSV
    const exportTemp = isFahrenheit
      ? ((row.temperature_c * 9) / 5 + 32).toFixed(1)
      : row.temperature_c.toFixed(1);

    csvString += `${dateStr},${exportTemp},${row.humidity_percent.toFixed(1)},${row.light_lux.toFixed(1)},${row.soil_moisture_percent.toFixed(1)},${row.co2_ppm.toFixed(0)},${row.vpd_kpa.toFixed(2)}\n`;
  });

  return csvString;
}

// function for creating the csv file and sharing it using the device's sharing options, with error handling
async function createAndShareFile(csvString: string): Promise<void> {
  try {
    // creating the file 
    const fileName = `Mushroom_Farm_Data_${new Date().getTime()}.csv`;
    const file = new File(Paths.document, fileName);

    file.write(csvString);

    // sharing the file using the device's sharing options, with error handling for cases where sharing is not available or fails
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: "text/csv",
        dialogTitle: "Export mushroom farm data",
        UTI: "public.comma-separated-values-text",
      });
    } else {
      throw new Error("Sharing is not available on this device");
    }
  } catch (error) {
    throw error;
  }
}