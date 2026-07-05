import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "@/src/shared";
import { Card, EmptyState } from "@/src/ui";
import { api } from "@/src/api";
import { theme, spacing, shadow } from "@/src/theme";

export default function Customers() {
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const load = useCallback(async () => { try { setItems(await api.listCustomers()); } catch { setItems([]); } }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <ScreenShell title="Customers" subtitle={`${items.length} customers`}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<EmptyState icon="people-outline" title="No customers yet" />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 10 }}>
            <Text style={{ fontWeight: "700", color: theme.text }}>{item.name}</Text>
            {item.address ? <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>{item.address}</Text> : null}
            <Text style={{ color: theme.textLight, fontSize: 12, marginTop: 4 }}>{item.phone || "-"} {item.email ? `· ${item.email}` : ""}</Text>
            {item.trn ? <Text style={{ color: theme.textLight, fontSize: 11, marginTop: 2 }}>TRN: {item.trn}</Text> : null}
          </Card>
        )}
      />
      <Pressable testID="cust-fab" onPress={() => router.push("/customer-create")} style={{ position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.red, alignItems: "center", justifyContent: "center", ...shadow.fab }}>
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
    </ScreenShell>
  );
}
