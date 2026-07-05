import React from "react";
import { View, Text, ActivityIndicator, StyleSheet, Pressable, TextInput as RNInput, TextInputProps } from "react-native";
import { theme, spacing, radius, shadow } from "./theme";
import { Ionicons } from "@expo/vector-icons";

export function ScreenLoader() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
      <ActivityIndicator color={theme.navy} size="large" />
    </View>
  );
}

export function Card({ children, style }: any) {
  return <View style={[s.card, shadow.card, style]}>{children}</View>;
}

const s = StyleSheet.create({
  card: { backgroundColor: theme.card, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: theme.border },
});

export function StatusBadge({ status }: { status: string }) {
  const key = (status || "").toLowerCase();
  const map: any = {
    completed: { bg: theme.successBg, fg: theme.success },
    paid: { bg: theme.successBg, fg: theme.success },
    approved: { bg: theme.successBg, fg: theme.success },
    fulfilled: { bg: theme.successBg, fg: theme.success },
    pending: { bg: theme.warningBg, fg: theme.warning },
    unpaid: { bg: theme.warningBg, fg: theme.warning },
    draft: { bg: theme.warningBg, fg: theme.warning },
    in_progress: { bg: theme.infoBg, fg: theme.info },
    sent: { bg: theme.infoBg, fg: theme.info },
    rejected: { bg: theme.errorBg, fg: theme.error },
    cancelled: { bg: theme.errorBg, fg: theme.error },
  };
  const c = map[key] || { bg: theme.surface2, fg: theme.textMuted };
  return (
    <View style={{ backgroundColor: c.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" }}>
      <Text style={{ color: c.fg, fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>{key.replace("_", " ") || "-"}</Text>
    </View>
  );
}

export function PrimaryButton({ title, onPress, loading, style, testID, variant = "primary", icon }: { title: string; onPress?: () => void; loading?: boolean; style?: any; testID?: string; variant?: "primary" | "secondary" | "ghost" | "danger"; icon?: any }) {
  const bg = variant === "primary" ? theme.navy : variant === "danger" ? theme.red : variant === "ghost" ? "transparent" : theme.surface2;
  const fg = variant === "primary" || variant === "danger" ? "#fff" : theme.navy;
  const border = variant === "ghost" ? theme.border : "transparent";
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [{ backgroundColor: bg, opacity: pressed ? 0.85 : 1, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: spacing.lg, alignItems: "center", justifyContent: "center", flexDirection: "row", borderWidth: variant === "ghost" ? 1 : 0, borderColor: border }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} style={{ marginRight: 6 }} /> : null}
          <Text style={{ color: fg, fontWeight: "700", fontSize: 15 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, ...rest }: { label: string } & TextInputProps) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ color: theme.text, fontWeight: "600", fontSize: 13, marginBottom: 6 }}>{label}</Text>
      <RNInput
        placeholderTextColor={theme.textLight}
        style={{ backgroundColor: theme.card, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, paddingHorizontal: spacing.md, paddingVertical: 12, color: theme.text, fontSize: 15 }}
        {...rest}
      />
    </View>
  );
}

export function EmptyState({ icon = "file-tray-outline", title, subtitle }: { icon?: any; title: string; subtitle?: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: spacing.xxl }}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <Ionicons name={icon} size={32} color={theme.textMuted} />
      </View>
      <Text style={{ fontSize: 16, fontWeight: "700", color: theme.text, marginBottom: 4 }}>{title}</Text>
      {subtitle ? <Text style={{ color: theme.textMuted, textAlign: "center" }}>{subtitle}</Text> : null}
    </View>
  );
}

export function Toast({ visible, message, kind = "info", onHide }: { visible: boolean; message: string; kind?: "info" | "success" | "error"; onHide: () => void }) {
  React.useEffect(() => {
    if (visible) {
      const t = setTimeout(onHide, 2400);
      return () => clearTimeout(t);
    }
  }, [visible, onHide]);
  if (!visible) return null;
  const bg = kind === "error" ? theme.error : kind === "success" ? theme.success : theme.navy;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, top: 60, backgroundColor: bg, padding: 14, borderRadius: radius.md, zIndex: 999 }}>
      <Text style={{ color: "#fff", fontWeight: "600" }}>{message}</Text>
    </View>
  );
}
