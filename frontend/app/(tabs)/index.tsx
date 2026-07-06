import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";
import { Card, ScreenLoader, StatusBadge } from "@/src/ui";
import { theme, spacing, radius, fmtAED, fmtDate } from "@/src/theme";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const d = await api.dashboard(); setData(d); } catch (e) { console.log("dash err", e); }
    try { const u = await api.unreadCount(); setUnread(u.count); } catch { /* */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!user) return <ScreenLoader />;
  if (!data) return <ScreenLoader />;

  const isMgr = user.role === "manager" || user.role === "owner";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.navyDark }} edges={["top"]}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <LinearGradient
        colors={[theme.navyDark, theme.navy, theme.red]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" }}
      >
        <Image
          source={{ uri: "https://customer-assets.emergentagent.com/job_fc8c025f-3476-4081-9887-6ff4a2206e09/artifacts/v7c9qnc3_Logo%20F.png" }}
          style={{ position: "absolute", right: -30, top: -20, width: 180, height: 180, opacity: 0.12 }}
          resizeMode="contain"
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, letterSpacing: 0.5 }}>WELCOME BACK</Text>
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 }}>{user.name}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
              <View style={{ backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 }}>{user.role}</Text>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Smart Eye Hub</Text>
            </View>
          </View>
          <Pressable testID="logout-btn" onPress={logout} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </Pressable>
          <Pressable testID="notif-bell-btn" onPress={() => router.push("/notifications")} style={{ marginLeft: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="notifications-outline" size={20} color="#fff" />
            {unread > 0 ? (
              <View style={{ position: "absolute", top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: theme.red, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}>
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }} testID="notif-badge-count">{unread > 99 ? "99+" : unread}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {isMgr ? (
          <>
            <Text style={styles.section}>This Month</Text>
            <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.md }}>
              <StatCard testID="stat-revenue" icon="trending-up" label="Revenue" value={fmtAED(data.revenue_month)} accent={theme.success} />
              <StatCard testID="stat-expenses" icon="trending-down" label="Expenses" value={fmtAED(data.expenses_month)} accent={theme.red} />
            </View>
            <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.md }}>
              <StatCard testID="stat-profit" icon="cash" label="Profit" value={fmtAED(data.profit_month)} accent={theme.navy} />
              <StatCard testID="stat-invoices" icon="document-text" label="Invoices" value={String(data.invoices_count)} accent={theme.info} />
            </View>
            <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg }}>
              <StatCard testID="stat-pending-works" icon="briefcase" label="Pending Works" value={String(data.pending_works)} accent={theme.warning} />
              <StatCard testID="stat-pending-mr" icon="cube" label="Material Reqs" value={String(data.pending_material_requests)} accent={theme.warning} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.section}>My Overview</Text>
            <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.md }}>
              <StatCard testID="stat-my-pending" icon="briefcase" label="Pending Work" value={String(data.pending_works)} accent={theme.warning} />
              <StatCard testID="stat-my-done" icon="checkmark-circle" label="Completed" value={String(data.completed_works)} accent={theme.success} />
            </View>
            <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg }}>
              <StatCard testID="stat-my-expenses" icon="wallet" label="My Expenses" value={fmtAED(data.expenses_month)} accent={theme.navy} />
              <View style={{ flex: 1 }} />
            </View>

            <Text style={styles.section}>Up Next</Text>
            {(data.upcoming || []).length === 0 ? (
              <Card><Text style={{ color: theme.textMuted }}>No pending work assigned.</Text></Card>
            ) : (
              (data.upcoming || []).map((w: any) => (
                <Pressable key={w.id} testID={`upcoming-${w.id}`} onPress={() => router.push({ pathname: "/work-detail", params: { id: w.id } })} style={{ marginBottom: 10 }}>
                  <Card>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontWeight: "700", color: theme.text, fontSize: 15 }}>{w.title}</Text>
                        <Text style={{ color: theme.textMuted, marginTop: 2, fontSize: 12 }}>{w.customer_name}</Text>
                        {w.scheduled_date ? <Text style={{ color: theme.textLight, fontSize: 11, marginTop: 4 }}>{fmtDate(w.scheduled_date)}</Text> : null}
                      </View>
                      <StatusBadge status={w.status} />
                    </View>
                  </Card>
                </Pressable>
              ))
            )}
          </>
        )}

        <Text style={styles.section}>Quick Actions</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
          {isMgr && <QuickAction testID="qa-new-quotation" icon="pricetag" label="New Quotation" onPress={() => router.push({ pathname: "/doc-create", params: { type: "quotation" } })} />}
          {isMgr && <QuickAction testID="qa-new-invoice" icon="document-text" label="New Invoice" onPress={() => router.push({ pathname: "/doc-create", params: { type: "invoice" } })} />}
          {isMgr && <QuickAction testID="qa-new-receipt" icon="receipt" label="New Receipt" onPress={() => router.push({ pathname: "/doc-create", params: { type: "receipt" } })} />}
          <QuickAction testID="qa-new-service-report" icon="construct" label="Service Report" onPress={() => router.push({ pathname: "/doc-create", params: { type: "service_report" } })} />
          {isMgr && <QuickAction testID="qa-new-work" icon="briefcase" label="Assign Work" onPress={() => router.push("/work-create")} />}
          <QuickAction testID="qa-new-expense" icon="wallet" label="Add Expense" onPress={() => router.push("/expense-create")} />
          <QuickAction testID="qa-material-req" icon="cube" label="Request Material" onPress={() => router.push("/material-request-create")} />
          {isMgr && <QuickAction testID="qa-new-purchase" icon="cart" label="New Purchase" onPress={() => router.push("/purchase-create")} />}
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, accent, testID }: any) {
  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: "#fff", borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: accent + "1a", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: "800", marginTop: 2 }} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress, testID }: any) {
  return (
    <Pressable testID={testID} onPress={onPress} style={{ width: "47%", backgroundColor: "#fff", borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.brandTint, alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        <Ionicons name={icon} size={20} color={theme.navy} />
      </View>
      <Text style={{ color: theme.text, fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 13, fontWeight: "700", color: theme.textMuted, marginBottom: spacing.sm, marginTop: spacing.sm, letterSpacing: 0.5, textTransform: "uppercase" },
});
