import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";
import { Card, EmptyState, StatusBadge } from "@/src/ui";
import { theme, spacing, radius, shadow, fmtDate } from "@/src/theme";

const FILTERS = ["all", "pending", "in_progress", "completed"];

export default function Work() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try { setItems(await api.listWorks()); } catch { setItems([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all" ? items : items.filter((w) => w.status === filter);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
      <View style={{ backgroundColor: theme.navy, padding: spacing.lg, paddingBottom: 0 }}>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>Work Allocation</Text>
        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>{user?.role === "manager" ? "All assignments" : "Your assigned tasks"}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: spacing.md, gap: 8 }}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <Pressable key={f} testID={`work-filter-${f}`} onPress={() => setFilter(f)}
                style={{ flexShrink: 0, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: active ? "#fff" : "rgba(255,255,255,0.12)", justifyContent: "center" }}>
                <Text style={{ color: active ? theme.navy : "#fff", fontWeight: "700", fontSize: 12, textTransform: "capitalize" }}>{f.replace("_", " ")}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<EmptyState icon="briefcase-outline" title="No work items" subtitle={user?.role === "manager" ? "Tap + to assign work" : "You have no tasks currently"} />}
        renderItem={({ item }) => (
          <Pressable testID={`work-${item.id}`} onPress={() => router.push({ pathname: "/work-detail", params: { id: item.id } })} style={{ marginBottom: 10 }}>
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <PriorityDot p={item.priority} />
                    <Text style={{ fontWeight: "700", color: theme.text, fontSize: 15, flex: 1 }} numberOfLines={1}>{item.title}</Text>
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={1}>{item.customer_name}</Text>
                  {item.address ? <Text style={{ color: theme.textLight, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{item.address}</Text> : null}
                  <Text style={{ color: theme.textLight, fontSize: 11, marginTop: 4 }}>
                    <Ionicons name="person" size={10} /> {item.assigned_to_name}   ·   {fmtDate(item.scheduled_date || item.created_at)}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
            </Card>
          </Pressable>
        )}
      />

      {user?.role === "manager" && (
        <Pressable testID="work-fab" onPress={() => router.push("/work-create")}
          style={{ position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.red, alignItems: "center", justifyContent: "center", ...shadow.fab }}>
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

function PriorityDot({ p }: { p: string }) {
  const c = p === "high" ? theme.error : p === "low" ? theme.textLight : theme.warning;
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />;
}
