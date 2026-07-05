import React from "react";
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/auth";
import { theme, spacing, radius } from "@/src/theme";

export default function More() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const isMgr = user?.role === "manager";

  const items: { key: string; icon: any; label: string; onPress: () => void; visible?: boolean }[] = [
    { key: "inventory", icon: "cube", label: "Inventory", onPress: () => router.push("/inventory"), visible: true },
    { key: "purchases", icon: "cart", label: "Purchases", onPress: () => router.push("/purchases"), visible: isMgr },
    { key: "expenses", icon: "wallet", label: "Expenses", onPress: () => router.push("/expenses"), visible: true },
    { key: "customers", icon: "people", label: "Customers", onPress: () => router.push("/customers"), visible: true },
    { key: "material-requests", icon: "list", label: "Material Requests", onPress: () => router.push("/material-requests"), visible: true },
  ].filter((x) => x.visible !== false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ backgroundColor: theme.navy, padding: spacing.lg, paddingBottom: spacing.xl }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.red, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 20 }}>{(user?.name || "?").slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>{user?.name}</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{user?.email}</Text>
              <View style={{ marginTop: 4, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>{user?.role}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ padding: spacing.lg }}>
          <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: "700", letterSpacing: 0.5, marginBottom: spacing.sm }}>OPERATIONS</Text>
          <View style={{ backgroundColor: "#fff", borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
            {items.map((it, i) => (
              <Pressable key={it.key} testID={`more-${it.key}`} onPress={it.onPress} style={({ pressed }) => ({ padding: spacing.md, flexDirection: "row", alignItems: "center", borderBottomWidth: i === items.length - 1 ? 0 : 1, borderBottomColor: theme.border, backgroundColor: pressed ? theme.surface2 : "#fff" })}>
                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: theme.brandTint, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <Ionicons name={it.icon} size={18} color={theme.navy} />
                </View>
                <Text style={{ flex: 1, color: theme.text, fontWeight: "600", fontSize: 15 }}>{it.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.textLight} />
              </Pressable>
            ))}
          </View>

          <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: "700", letterSpacing: 0.5, marginTop: spacing.xl, marginBottom: spacing.sm }}>COMPANY</Text>
          <View style={{ backgroundColor: "#fff", borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, padding: spacing.lg, alignItems: "center" }}>
            <Image source={{ uri: "https://customer-assets.emergentagent.com/job_fc8c025f-3476-4081-9887-6ff4a2206e09/artifacts/v7c9qnc3_Logo%20F.png" }} style={{ width: 80, height: 80, resizeMode: "contain" }} />
            <Text style={{ marginTop: 8, fontSize: 15, fontWeight: "800", color: theme.text }}>Smart Eye Technical Services</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 4, textAlign: "center" }}>VUEP2795, Al Hulaila, Compas Bldg., RAK, UAE</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>+971 50 473 5525  •  info@smarteye-uae.com</Text>
            <Text style={{ color: theme.textLight, fontSize: 10, marginTop: 8, letterSpacing: 1 }}>SMART SOLUTIONS  |  INTELLIGENT FUTURE</Text>
          </View>

          <Pressable testID="logout-btn-more" onPress={logout} style={{ marginTop: spacing.xl, backgroundColor: theme.errorBg, padding: spacing.md, borderRadius: radius.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}>
            <Ionicons name="log-out-outline" size={18} color={theme.error} />
            <Text style={{ color: theme.error, fontWeight: "700" }}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
