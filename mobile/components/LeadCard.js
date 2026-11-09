import { View, Text, StyleSheet } from "react-native";

export default function LeadCard({ lead, index }) {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>
        {lead.full_name || "Unnamed Lead"}
        {index === 0 ? " (LATEST)" : ""}
      </Text>

      <Text>Email: {lead.email || "Not provided"}</Text>
      <Text>Phone: {lead.phone_number || "Not provided"}</Text>
      <Text>
        Submitted:{" "}
        {lead.created_at
          ? new Date(lead.created_at).toLocaleString()
          : "Unknown"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: "cyan",
    marginVertical: 9,
    borderWidth: 1,
    borderColor: "black",
    borderRadius: 29,
  },
  name: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
});