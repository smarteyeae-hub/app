import React, { useState } from "react";
import { ScrollView, KeyboardAvoidingView, Platform, View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell, pickFileAsBase64 } from "@/src/shared";
import { Field, PrimaryButton, Toast } from "@/src/ui";
import { api } from "@/src/api";
import { theme, spacing, radius } from "@/src/theme";

export default function PurchaseCreate() {
  const router = useRouter();
  const [supplier, setSupplier] = useState(""); const [ref, setRef] = useState(""); const [date, setDate] = useState(""); const [amount, setAmount] = useState("0"); const [notes, setNotes] = useState("");
  const [file, setFile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ v: boolean; m: string; k?: any }>({ v: false, m: "" });
  const pick = async () => { const f = await pickFileAsBase64("any"); if (f) setFile(f); };
  const save = async () => {
    if (!supplier.trim() || !amount) { setToast({ v: true, m: "Fill required fields", k: "error" }); return; }
    setSaving(true);
    try { await api.createPurchase({ supplier, invoice_ref: ref, date: date || null, amount: Number(amount), notes, bill_file: file }); setToast({ v: true, m: "Purchase saved", k: "success" }); setTimeout(() => router.back(), 400); } catch (e: any) { setToast({ v: true, m: e.message, k: "error" }); } finally { setSaving(false); }
  };
  return (
    <ScreenShell title="New Purchase">
      <Toast visible={toast.v} message={toast.m} kind={toast.k} onHide={() => setToast({ v: false, m: "" })} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
          <Field label="Supplier *" value={supplier} onChangeText={setSupplier} testID="pur-supplier" />
          <Field label="Invoice / Reference" value={ref} onChangeText={setRef} testID="pur-ref" />
          <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-07-05" testID="pur-date" />
          <Field label="Amount (AED) *" value={amount} onChangeText={setAmount} keyboardType="numeric" testID="pur-amount" />
          <Field label="Notes" value={notes} onChangeText={setNotes} multiline testID="pur-notes" />

          <Pressable testID="pur-pick" onPress={pick} style={{ padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, borderStyle: "dashed", alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, backgroundColor: theme.card }}>
            <Ionicons name="cloud-upload-outline" size={20} color={theme.navy} />
            <Text style={{ color: theme.navy, fontWeight: "700" }}>{file ? `Attached: ${file.name}` : "Upload Bill (JPG/PDF)"}</Text>
          </Pressable>

          <View style={{ marginTop: spacing.lg }}><PrimaryButton title="Save Purchase" onPress={save} loading={saving} testID="pur-save" /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
