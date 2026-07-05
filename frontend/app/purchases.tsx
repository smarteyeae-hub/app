import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "@/src/shared";
import { Card, EmptyState } from "@/src/ui";
import { api } from "@/src/api";
import { theme, spacing, shadow, fmtAED, fmtDate } from "@/src/theme";

export default function Purchases() {
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const load = useCallback(async () => { try { setItems(await api.listPurchases()); } catch { setItems([]); } }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <ScreenShell title="Purchases" subtitle={`${items.length} entries`}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<EmptyState icon="cart-outline" title="No purchases yet" />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: theme.text }}>{item.supplier}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{item.invoice_ref || "-"} · {fmtDate(item.date)}</Text>
                {item.notes ? <Text style={{ color: theme.textLight, fontSize: 12, marginTop: 4 }} numberOfLines={2}>{item.notes}</Text> : null}
              </View>
              <Text style={{ fontWeight: "800", color: theme.navy }}>{fmtAED(item.amount)}</Text>
            </View>
          </Card>
        )}
      />
      <Pressable testID="pur-fab" onPress={() => router.push("/purchase-create")} style={{ position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.red, alignItems: "center", justifyContent: "center", ...shadow.fab }}>
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
    </ScreenShell>
  );
}
