import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "@/src/shared";
import { EmptyState, PrimaryButton, Toast } from "@/src/ui";
import { api } from "@/src/api";
import { theme, spacing, radius } from "@/src/theme";

const CATEGORY_ICONS: Record<string, any> = {
  quotation: "pricetag",
  invoice: "document-text",
  receipt: "receipt",
  service_report: "construct",
  work: "briefcase",
  expense: "wallet",
  material_request: "cube",
  user: "person",
  general: "notifications",
};
const KIND_COLORS: Record<string, string> = {
  info: theme.info,
  success: theme.success,
  warning: theme.warning,
  error: theme.error,
  event: theme.navy,
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const days = Math.floor(s / 86400);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-GB");
}

export default function Notifications() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ v: boolean; m: string; k?: any }>({ v: false, m: "" });

  const load = useCallback(async () => {
    try { setItems(await api.listNotifications()); } catch { setItems([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleTap = async (n: any) => {
    if (!n.read) {
      try { await api.markRead(n.id); } catch { /* */ }
      setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
    }
    if (n.category === "quotation" || n.category === "invoice" || n.category === "receipt" || n.category === "service_report") {
      router.push({ pathname: "/doc-detail", params: { type: n.category, id: n.entity_id } });
    } else if (n.category === "work") {
      router.push({ pathname: "/work-detail", params: { id: n.entity_id } });
    } else if (n.category === "expense") {
      router.push("/expenses");
    } else if (n.category === "material_request") {
      router.push("/material-requests");
    } else if (n.category === "user") {
      router.push("/users");
    }
  };

  const markAll = async () => {
    try {
      await api.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      setToast({ v: true, m: "All marked as read", k: "success" });
    } catch (e: any) { setToast({ v: true, m: e.message, k: "error" }); }
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <ScreenShell title="Notifications" subtitle={`${unread} unread`}
      right={unread > 0 ? (
        <Pressable testID="notif-mark-all" onPress={markAll} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.15)" }}>
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Mark all read</Text>
        </Pressable>
      ) : undefined}
    >
      <Toast visible={toast.v} message={toast.m} kind={toast.k} onHide={() => setToast({ v: false, m: "" })} />
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<EmptyState icon="notifications-outline" title="No notifications" subtitle="You're all caught up!" />}
        renderItem={({ item }) => {
          const icon = CATEGORY_ICONS[item.category] || "notifications";
          const color = KIND_COLORS[item.kind] || theme.navy;
          return (
            <Pressable testID={`notif-${item.id}`} onPress={() => handleTap(item)} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: item.read ? "transparent" : "#EFF4FB", borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: "row", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: color + "22", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ color: theme.text, fontWeight: item.read ? "600" : "800", fontSize: 14, flex: 1 }} numberOfLines={2}>{item.title}</Text>
                  {!item.read ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.red }} /> : null}
                </View>
                {item.body ? <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={2}>{item.body}</Text> : null}
                <Text style={{ color: theme.textLight, fontSize: 11, marginTop: 4 }}>{timeAgo(item.created_at)}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </ScreenShell>
  );
}
