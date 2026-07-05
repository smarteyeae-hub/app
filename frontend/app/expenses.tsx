import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "@/src/shared";
import { Card, EmptyState, StatusBadge } from "@/src/ui";
import { api } from "@/src/api";
import { theme, spacing, shadow, fmtAED, fmtDate } from "@/src/theme";

export default function Expenses() {
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const load = useCallback(async () => { try { setItems(await api.listExpenses()); } catch { setItems([]); } }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <ScreenShell title="Daily Expenses" subtitle={`${items.length} entries`}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<EmptyState icon="wallet-outline" title="No expenses yet" />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: theme.text }}>{item.category}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={2}>{item.description}</Text>
                <Text style={{ color: theme.textLight, fontSize: 11, marginTop: 4 }}>{item.created_by_name} · {fmtDate(item.date)}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontWeight: "800", color: theme.red }}>{fmtAED(item.amount)}</Text>
                <View style={{ marginTop: 6 }}><StatusBadge status={item.status} /></View>
              </View>
            </View>
          </Card>
        )}
      />
      <Pressable testID="exp-fab" onPress={() => router.push("/expense-create")} style={{ position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.red, alignItems: "center", justifyContent: "center", ...shadow.fab }}>
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
    </ScreenShell>
  );
}
