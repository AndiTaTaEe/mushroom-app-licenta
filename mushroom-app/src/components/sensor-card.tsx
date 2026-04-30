import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export interface SensorCardProps {
  title: string;
  value: string | number;
  unit: string;
  iconName: string;
  iconColor: string;
}

export const SensorCard = ({
  title,
  value,
  unit,
  iconName,
  iconColor,
}: SensorCardProps) => (
  <View style={styles.card}>
    <View style={styles.iconContainer}>
      <MaterialCommunityIcons
        name={iconName as any}
        size={32}
        color={iconColor}
      />
    </View>
    <View style={styles.dataContainer}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardUnit}>{unit}</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  dataContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    color: "#64748B",
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
    color: "#0F172A",
  },
  cardUnit: {
    fontSize: 18,
    fontWeight: "600",
    color: "#94A3B8",
    marginLeft: 4,
  },
});
