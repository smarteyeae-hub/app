import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, Pressable, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/auth";
import { Field, PrimaryButton } from "@/src/ui";
import { theme, spacing, radius } from "@/src/theme";
import { LinearGradient } from "expo-linear-gradient";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("manager@smarteye-uae.com");
  const [password, setPassword] = useState("Manager@123");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Animation: fade + scale + gentle float loop
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const float = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 700, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, [fade, scale, float, cardSlide]);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

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
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Dual-tone diagonal gradient — navy top-left → red bottom-right, then black at edges */}
      <LinearGradient colors={["#0B1B2E", "#1B3A5F", "#7A1020", "#C8102E"]} locations={[0, 0.35, 0.8, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill as any} />
      {/* Overlay red diagonal accent bar */}
      <View style={{ position: "absolute", right: -80, top: 120, width: 260, height: 260, borderRadius: 130, backgroundColor: "#C8102E", opacity: 0.18, transform: [{ scaleX: 1.4 }] }} />
      <View style={{ position: "absolute", left: -60, bottom: 200, width: 220, height: 220, borderRadius: 110, backgroundColor: "#1B3A5F", opacity: 0.28 }} />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
            <Animated.View style={{ alignItems: "center", marginBottom: spacing.xl, opacity: fade, transform: [{ scale }, { translateY }] }}>
              <View style={{ width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}>
                <Image source={{ uri: "https://customer-assets.emergentagent.com/job_field-ops-hub-39/artifacts/yjrfceiz_Logo%20F.png" }} style={{ width: 130, height: 130 }} resizeMode="contain" />
              </View>
              <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800", marginTop: 16, letterSpacing: 0.5 }}>Smart Eye Hub</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 6, fontSize: 11, letterSpacing: 2 }}>SMART SOLUTIONS  |  INTELLIGENT FUTURE</Text>
            </Animated.View>

            <Animated.View style={{ opacity: fade, transform: [{ translateY: cardSlide }] }}>
              <View style={{ backgroundColor: "#fff", borderRadius: radius.lg, padding: spacing.xl, ...(Platform.OS !== "web" ? { shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 24 } : {}) }}>
                <Text style={{ fontSize: 20, fontWeight: "800", color: theme.text }}>Welcome back</Text>
                <Text style={{ color: theme.textMuted, fontSize: 13, marginTop: 2, marginBottom: spacing.md }}>Sign in to continue to your workspace</Text>
                <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@smarteye-uae.com" testID="login-email-input" />
                <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" testID="login-password-input" />
                {err ? <Text style={{ color: theme.error, marginBottom: 8 }} testID="login-error">{err}</Text> : null}
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
              <Text style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, textAlign: "center", marginTop: 20 }}>© Smart Eye Technical Services · RAK Free Zone, UAE</Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
