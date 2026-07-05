import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";
import { Card, EmptyState, StatusBadge } from "@/src/ui";
import { theme, spacing, radius, shadow, fmtAED, fmtDate } from "@/src/theme";

type DocType = "quotation" | "invoice" | "receipt" | "service_report";

const TYPES: { key: DocType; label: string; icon: any }[] = [
  { key: "quotation", label: "Quotations", icon: "pricetag" },
  { key: "invoice", label: "Invoices", icon: "document-text" },
  { key: "receipt", label: "Receipts", icon: "receipt" },
  { key: "service_report", label: "Service Reports", icon: "construct" },
];

export default function Documents() {
  const [tab, setTab] = useState<DocType>("quotation");
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const load = useCallback(async (t: DocType) => {
    try {
      const data = t === "quotation" ? await api.listQuotations()
        : t === "invoice" ? await api.listInvoices()
        : t === "receipt" ? await api.listReceipts()
        : await api.listServiceReports();
      setItems(data);
    } catch { setItems([]); }
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  const canCreate = user?.role === "manager" || tab === "service_report";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
      <View style={{ backgroundColor: theme.navy, padding: spacing.lg, paddingBottom: 0 }}>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>Documents</Text>
        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>Quotations, Invoices, Receipts & Service Reports</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: spacing.md, gap: 8 }}>
          {TYPES.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable key={t.key} testID={`docs-tab-${t.key}`} onPress={() => setTab(t.key)}
                style={{ flexShrink: 0, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: active ? "#fff" : "rgba(255,255,255,0.12)", flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name={t.icon} size={14} color={active ? theme.navy : "#fff"} />
                <Text style={{ color: active ? theme.navy : "#fff", fontWeight: "700", fontSize: 12 }}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(tab); setRefreshing(false); }} />}
        ListEmptyComponent={<EmptyState icon="document-text-outline" title="No documents yet" subtitle={canCreate ? "Tap the + button to create one" : "Only managers can create this type"} />}
        renderItem={({ item }) => (
          <Pressable testID={`doc-${item.id}`} onPress={() => router.push({ pathname: "/doc-detail", params: { type: tab, id: item.id } })} style={{ marginBottom: 10 }}>
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ fontSize: 12, color: theme.navy, fontWeight: "700" }}>{item.doc_number}</Text>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: theme.text, marginTop: 2 }} numberOfLines={1}>{item.customer_name}</Text>
                  {item.subject ? <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{item.subject}</Text> : null}
                  <Text style={{ color: theme.textLight, fontSize: 11, marginTop: 4 }}>{fmtDate(item.created_at)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontWeight: "800", color: theme.text, fontSize: 15 }}>
                    {tab === "receipt" ? fmtAED(item.amount) : tab === "service_report" ? fmtAED(item.total_amount || 0) : fmtAED(item.total)}
                  </Text>
                  {item.status ? <View style={{ marginTop: 6 }}><StatusBadge status={item.status} /></View> : null}
                </View>
              </View>
            </Card>
          </Pressable>
        )}
      />

      {canCreate && (
        <Pressable testID="docs-fab" onPress={() => router.push({ pathname: "/doc-create", params: { type: tab } })}
          style={{ position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.red, alignItems: "center", justifyContent: "center", ...shadow.fab }}>
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}
