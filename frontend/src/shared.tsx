import React from "react";
import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { theme, spacing, radius } from "./theme";

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <View style={{ backgroundColor: theme.navy, padding: spacing.lg, paddingBottom: spacing.md, flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Pressable testID="back-btn" onPress={() => router.back()} style={{ padding: 6 }}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>{title}</Text>
        {subtitle ? <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function ScreenShell({ title, subtitle, right, children }: any) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top", "bottom"]}>
      <ScreenHeader title={title} subtitle={subtitle} right={right} />
      {children}
    </SafeAreaView>
  );
}

export async function pickFileAsBase64(kind: "any" | "image" = "any"): Promise<{ name: string; mime: string; data: string } | null> {
  if (kind === "image") {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.7 });
    if (res.canceled || !res.assets?.[0]) return null;
    const a = res.assets[0];
    return { name: a.fileName || `img_${Date.now()}.jpg`, mime: a.mimeType || "image/jpeg", data: a.base64 || "" };
  }
  const res = await DocumentPicker.getDocumentAsync({ type: ["image/*", "application/pdf"], copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  let base64 = "";
  try {
    base64 = await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
  } catch { /* ignore */ }
  return { name: a.name, mime: a.mimeType || "application/octet-stream", data: base64 };
}

export async function shareBase64Pdf(filename: string, b64: string) {
  if (Platform.OS === "web") {
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${b64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
  }
}
