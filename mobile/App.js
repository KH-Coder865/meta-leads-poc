import React, { useEffect, useState } from "react";
import { supabase } from "./supabase";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
} from "react-native";

const sampleLeads = [
  {
    id: "1",
    full_name: "Rahul Sharma",
    email: "rahul@example.com",
    phone_number: "+91 9876543210",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    full_name: "Priya Verma",
    email: "priya@example.com",
    phone_number: "+91 9876543211",
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    full_name: "Aarav Singh",
    email: "aarav@example.com",
    phone_number: "+91 9876543212",
    created_at: new Date().toISOString(),
  },
];

function LeadCard({ lead, index }) {
  const initials = (lead.full_name || "N")
    .split(" ")
    .map((word) => word[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.leadInfo}>
          <Text style={styles.leadName}>
            {lead.full_name || "Unnamed Lead"}
          </Text>

          <Text style={styles.leadEmail}>
            {lead.email || "No email provided"}
          </Text>
        </View>

        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>
            {index === 0 ? "LATEST" : "LEAD"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsRow}>
        <Text style={styles.detailLabel}>PHONE</Text>
        <Text style={styles.detailValue}>
          {lead.phone_number || "Not provided"}
        </Text>
      </View>

      <View style={styles.detailsRow}>
        <Text style={styles.detailLabel}>SUBMITTED</Text>
        <Text style={styles.detailValue}>
          {lead.created_at
            ? new Date(lead.created_at).toLocaleString()
            : "Unknown"}
        </Text>
      </View>
    </View>
  );
}

export default function App() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("CONNECTING");

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch existing leads
    const fetchLeads = async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching leads:", error.message);
        if (isMounted) {
          setConnectionStatus("ERROR");
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLeads(data || []);
        setLoading(false);
      }
    };

    fetchLeads();

    // 2. Subscribe to new lead INSERT events
    const channel = supabase
      .channel("live-leads")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leads",
        },
        (payload) => {
          console.log("New lead received:", payload.new);

          if (isMounted) {
            setLeads((previousLeads) => [
              payload.new,
              ...previousLeads.filter(
                (lead) => lead.id !== payload.new.id
              ),
            ]);
          }
        }
      )
      .subscribe((status, err) => {
  console.log("Supabase Realtime status:", status);

  if (err) {
    console.error("Realtime subscription error:", err);
  }

  if (isMounted) {
    if (status === "SUBSCRIBED") {
      setConnectionStatus("LIVE");
    } else if (
      status === "CHANNEL_ERROR" ||
      status === "TIMED_OUT" ||
      status === "CLOSED"
    ) {
      setConnectionStatus("ERROR");
    }
  }
});

    // 3. Clean up subscription
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#101827" />

      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>LEADFLOW</Text>
          <Text style={styles.heading}>Leads Dashboard</Text>
          <Text style={styles.subtitle}>
            Manage your Meta Instant Form leads
          </Text>
        </View>

        <View style={styles.liveIndicator}>
          <View
            style={[
              styles.liveDot,
              connectionStatus === "ERROR" && {
                backgroundColor: "#F87171",
              },
              connectionStatus === "CONNECTING" && {
                backgroundColor: "#FBBF24",
              },
            ]}
          />
          <Text
            style={[
              styles.liveText,
              connectionStatus === "ERROR" && {
                color: "#F87171",
              },
              connectionStatus === "CONNECTING" && {
                color: "#FBBF24",
              },
            ]}
          >
            {connectionStatus}
          </Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TOTAL LEADS</Text>
          <Text style={styles.statValue}>{leads.length}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>SOURCE</Text>
          <Text style={styles.sourceValue}>META ADS</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Leads</Text>
        <Text style={styles.leadCount}>
          {leads.length} records
        </Text>
      </View>

      {loading ? (
        <View style={{ padding: 25 }}>
          <Text style={{ color: "#94A3B8" }}>
            Loading leads...
          </Text>
        </View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <LeadCard lead={item} index={index} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text
              style={{
                color: "#94A3B8",
                textAlign: "center",
                marginTop: 30,
              }}
            >
              No leads received yet.
            </Text>
          }
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Powered by React Native + Supabase
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101827",
  },

  header: {
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  brand: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
    marginTop: 8,
  },

  subtitle: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 5,
  },

  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#12352E",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: "#34D399",
    marginRight: 7,
  },

  liveText: {
    color: "#34D399",
    fontSize: 11,
    fontWeight: "800",
  },

  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 28,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#1E293B",
    padding: 18,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#334155",
  },

  statLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },

  statValue: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 10,
  },

  sourceValue: {
    color: "#60A5FA",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 14,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
  },

  leadCount: {
    color: "#94A3B8",
    fontSize: 12,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  card: {
    backgroundColor: "#1E293B",
    borderRadius: 15,
    padding: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#334155",
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },

  leadInfo: {
    flex: 1,
    marginLeft: 12,
  },

  leadName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  leadEmail: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },

  newBadge: {
    backgroundColor: "#12352E",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },

  newBadgeText: {
    color: "#34D399",
    fontSize: 9,
    fontWeight: "800",
  },

  divider: {
    height: 1,
    backgroundColor: "#334155",
    marginVertical: 15,
  },

  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  detailLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "700",
  },

  detailValue: {
    color: "#CBD5E1",
    fontSize: 11,
  },

  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    alignItems: "center",
  },

  footerText: {
    color: "#64748B",
    fontSize: 11,
  },
});