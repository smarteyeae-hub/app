import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "@/src/shared";
import { Card, EmptyState } from "@/src/ui";
import { api } from "@/src/api";
import { theme, spacing, radius, shadow, fmtAED } from "@/src/theme";
import { useAuth } from "@/src/auth";

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const load = useCallback(async () => { try { setItems(await api.listInventory()); } catch { setItems([]); } }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <ScreenShell title="Inventory" subtitle={`${items.length} items`}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<EmptyState icon="cube-outline" title="Inventory is empty" />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontWeight: "700", color: theme.text }}>{item.name}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{item.model_number || "-"} · {item.category || "General"}</Text>
                <Text style={{ color: theme.textLight, fontSize: 11, marginTop: 4 }}>Stock: {item.quantity} {item.unit}</Text>
              </View>
              <Text style={{ fontWeight: "800", color: theme.navy }}>{fmtAED(item.unit_price)}</Text>
            </View>
          </Card>
        )}
      />
      {user?.role === "manager" && (
        <Pressable testID="inv-fab" onPress={() => router.push("/inventory-create")} style={{ position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.red, alignItems: "center", justifyContent: "center", ...shadow.fab }}>
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      )}
    </ScreenShell>
  );
}
