import React, { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { Field, PrimaryButton, Toast } from "@/src/ui";
import { theme, spacing, radius } from "@/src/theme";
import { LinearGradient } from "expo-linear-gradient";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("manager@smarteye-uae.com");
  const [password, setPassword] = useState("Manager@123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setLoading(true); setErr("");
    try { await login(email.trim(), password); }
    catch (e: any) { setErr(e.message || "Login failed"); }
    finally { setLoading(false); }
  };

  const fill = (kind: "manager" | "employee") => {
    if (kind === "manager") { setEmail("manager@smarteye-uae.com"); setPassword("Manager@123"); }
    else { setEmail("employee@smarteye-uae.com"); setPassword("Employee@123"); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.navyDark }}>
      <LinearGradient colors={[theme.navyDark, theme.navy, "#000"]} style={{ position: "absolute", inset: 0, top: 0, left: 0, right: 0, bottom: 0 }} />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
            <View style={{ alignItems: "center", marginBottom: spacing.xl }}>
              <Image source={{ uri: "https://customer-assets.emergentagent.com/job_fc8c025f-3476-4081-9887-6ff4a2206e09/artifacts/v7c9qnc3_Logo%20F.png" }} style={{ width: 140, height: 140, resizeMode: "contain" }} />
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 12, letterSpacing: 0.3 }}>Smart Eye Hub</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 4, fontSize: 12, letterSpacing: 1 }}>SMART SOLUTIONS  |  INTELLIGENT FUTURE</Text>
            </View>

            <View style={{ backgroundColor: "#fff", borderRadius: radius.lg, padding: spacing.xl }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, marginBottom: spacing.md }}>Sign in to your account</Text>
              <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@smarteye-uae.com" testID="login-email-input" />
              <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" testID="login-password-input" />
              {err ? <Text style={{ color: theme.error, marginBottom: 8 }}>{err}</Text> : null}
              <PrimaryButton title="Sign In" onPress={submit} loading={loading} testID="login-submit-button" />

              <View style={{ marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: spacing.md }}>
                <Text style={{ color: theme.textMuted, fontSize: 12, marginBottom: 6 }}>Quick fill demo credentials:</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable testID="fill-manager-btn" onPress={() => fill("manager")} style={{ flex: 1, padding: 10, backgroundColor: theme.brandTint, borderRadius: radius.sm, alignItems: "center" }}>
                    <Text style={{ color: theme.navy, fontWeight: "700", fontSize: 12 }}>Manager</Text>
                  </Pressable>
                  <Pressable testID="fill-employee-btn" onPress={() => fill("employee")} style={{ flex: 1, padding: 10, backgroundColor: theme.surface2, borderRadius: radius.sm, alignItems: "center" }}>
                    <Text style={{ color: theme.text, fontWeight: "700", fontSize: 12 }}>Employee</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
