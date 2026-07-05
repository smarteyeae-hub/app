import React, { useState } from "react";
import { ScrollView, KeyboardAvoidingView, Platform, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenShell } from "@/src/shared";
import { Field, PrimaryButton, Toast } from "@/src/ui";
import { api } from "@/src/api";
import { spacing } from "@/src/theme";

export default function MaterialRequestCreate() {
  const router = useRouter();
  const { work_id } = useLocalSearchParams<{ work_id?: string }>();
  const [item, setItem] = useState(""); const [qty, setQty] = useState("1"); const [unit, setUnit] = useState("pcs"); const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ v: boolean; m: string; k?: any }>({ v: false, m: "" });
  const save = async () => {
    if (!item.trim()) { setToast({ v: true, m: "Item required", k: "error" }); return; }
    setSaving(true);
    try { await api.createMaterialRequest({ item_name: item, quantity: Number(qty || 1), unit, reason, work_id: work_id || null }); setToast({ v: true, m: "Request sent", k: "success" }); setTimeout(() => router.back(), 400); } catch (e: any) { setToast({ v: true, m: e.message, k: "error" }); } finally { setSaving(false); }
  };
  return (
    <ScreenShell title="Request Material">
      <Toast visible={toast.v} message={toast.m} kind={toast.k} onHide={() => setToast({ v: false, m: "" })} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
          <Field label="Item Name *" value={item} onChangeText={setItem} testID="mr-item" />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="Quantity" value={qty} onChangeText={setQty} keyboardType="numeric" testID="mr-qty" /></View>
            <View style={{ flex: 1 }}><Field label="Unit" value={unit} onChangeText={setUnit} testID="mr-unit" /></View>
          </View>
          <Field label="Reason / Notes" value={reason} onChangeText={setReason} multiline testID="mr-reason" />
          <View style={{ marginTop: spacing.lg }}><PrimaryButton title="Send Request" onPress={save} loading={saving} testID="mr-save" /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
