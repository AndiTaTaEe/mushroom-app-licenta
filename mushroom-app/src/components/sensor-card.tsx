import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../context/preferences_context";

export interface SensorCardProps {
  title: string;
  value: string | number;
  unit: string;
  iconName: string;
  iconColor: string;
  theme?: typeof Colors.light;
}

export const SensorCard = ({
  title,
  value,
  unit,
  iconName,
  iconColor,
  theme,
}: SensorCardProps) => {
  const defaultTheme = theme || Colors.light;
  
  return (
    <View style={[styles.card, { backgroundColor: defaultTheme.card }]}>
      <View style={[styles.iconContainer, { backgroundColor: defaultTheme.background }]}>
        <MaterialCommunityIcons
          name={iconName as any}
          size={32}
          color={iconColor}
        />
      </View>
      <View style={styles.dataContainer}>
        <Text style={[styles.cardTitle, { color: defaultTheme.subtext }]}>{title}</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.cardValue, { color: defaultTheme.text }]}>{value}</Text>
          <Text style={[styles.cardUnit, { color: defaultTheme.subtext }]}>{unit}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  dataContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: "bold",
  },
  cardUnit: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 4,
  },
});
