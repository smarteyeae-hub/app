import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "@/src/shared";
import { Card, EmptyState, StatusBadge } from "@/src/ui";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { theme, spacing, shadow, fmtDate } from "@/src/theme";

export default function MaterialRequests() {
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const load = useCallback(async () => { try { setItems(await api.listMaterialRequests()); } catch { setItems([]); } }, []);
  useEffect(() => { load(); }, [load]);

  const update = async (id: string, status: string) => { try { await api.updateMRStatus(id, status); load(); } catch { /* */ } };

  return (
    <ScreenShell title="Material Requests" subtitle={`${items.length} requests`}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<EmptyState icon="list-outline" title="No material requests" />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontWeight: "700", color: theme.text }}>{item.item_name}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>{item.quantity} {item.unit || "pcs"}</Text>
                {item.reason ? <Text style={{ color: theme.textLight, fontSize: 12, marginTop: 4 }}>{item.reason}</Text> : null}
                <Text style={{ color: theme.textLight, fontSize: 11, marginTop: 4 }}>{item.requested_by_name} · {fmtDate(item.created_at)}</Text>
              </View>
              <StatusBadge status={item.status} />
            </View>
            {user?.role === "manager" && item.status === "pending" && (
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <Pressable testID={`mr-approve-${item.id}`} onPress={() => update(item.id, "approved")} style={{ flex: 1, backgroundColor: theme.successBg, padding: 8, borderRadius: 8, alignItems: "center" }}><Text style={{ color: theme.success, fontWeight: "700" }}>Approve</Text></Pressable>
                <Pressable testID={`mr-reject-${item.id}`} onPress={() => update(item.id, "rejected")} style={{ flex: 1, backgroundColor: theme.errorBg, padding: 8, borderRadius: 8, alignItems: "center" }}><Text style={{ color: theme.error, fontWeight: "700" }}>Reject</Text></Pressable>
                <Pressable testID={`mr-fulfill-${item.id}`} onPress={() => update(item.id, "fulfilled")} style={{ flex: 1, backgroundColor: theme.brandTint, padding: 8, borderRadius: 8, alignItems: "center" }}><Text style={{ color: theme.navy, fontWeight: "700" }}>Fulfill</Text></Pressable>
              </View>
            )}
          </Card>
        )}
      />
      <Pressable testID="mr-fab" onPress={() => router.push("/material-request-create")} style={{ position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.red, alignItems: "center", justifyContent: "center", ...shadow.fab }}>
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>
    </ScreenShell>
  );
}
