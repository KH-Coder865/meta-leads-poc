import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import LeadCard from "./components/LeadCard";

import {
  SafeAreaView,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";

export default function App() {
  const [lds, setLds] = useState([]);
  const [ldg, setLdg] = useState(true);
  const [sts, setSts] = useState("CONNECTING");

  useEffect(() => {
    let mnt = true;

    // Fetch existing leads
    const fLds = async () => {
      const { data: dt, error: err } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (err) {
        console.error("Fetch error:", err.message);

        if (mnt) {
          setSts("ERROR");
          setLdg(false);
        }
        return;
      }

      if (mnt) {
        setLds(dt || []);
        setLdg(false);
      }
    };

    fLds();

    // Subscribe to new lead events
    const ch = supabase
      .channel("live-leads")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leads",
        },
        (pl) => {
          console.log("New lead received:", pl.new);

          if (mnt) {
            setLds((prv) => [
              pl.new,
              ...prv.filter((ld) => ld.id !== pl.new.id),
            ]);
          }
        }
      )
      .subscribe((st, er) => {
        console.log("Realtime status:", st);

        if (er) {
          console.error("Realtime error:", er);
        }

        if (mnt) {
          if (st === "SUBSCRIBED") {
            setSts("LIVE");
          } else if (
            st === "CHANNEL_ERROR" ||
            st === "TIMED_OUT" ||
            st === "CLOSED"
          ) {
            setSts("ERROR");
          }
        }
      });

    // Cleanup subscription
    return () => {
      mnt = false;
      supabase.removeChannel(ch);
    };
  }, []);

  return (
    <SafeAreaView style={{marginTop:34, flex: 1, padding: 16, backgroundColor: "pink" }}>
      <Text style={{ fontSize: 28, fontWeight: "bold" }}>
        Meta Leads Dashboard
      </Text>

      <Text style={{ color: "blue", fontWeight: "bold" }}>Connection: {sts}</Text>
      <Text style={{ color: "green", fontWeight: "bold" }}>Total Leads: {lds.length}</Text>

      {ldg ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={lds}
          keyExtractor={(it) => it.id}
          renderItem={({ item: it, index: ix }) => (
            <LeadCard lead={it} index={ix} />
          )}
          ListEmptyComponent={<Text>No leads received yet.</Text>}
        />
      )}
    </SafeAreaView>
  );
}