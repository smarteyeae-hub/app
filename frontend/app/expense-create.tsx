import React, { useState } from "react";
import { ScrollView, KeyboardAvoidingView, Platform, View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell, pickFileAsBase64 } from "@/src/shared";
import { Field, PrimaryButton, Toast } from "@/src/ui";
import { api } from "@/src/api";
import { theme, spacing, radius } from "@/src/theme";

const CATS = ["Fuel", "Food", "Materials", "Transport", "Tools", "Utility", "Other"];

export default function ExpenseCreate() {
  const router = useRouter();
  const [cat, setCat] = useState("Fuel"); const [desc, setDesc] = useState(""); const [amount, setAmount] = useState("0"); const [date, setDate] = useState("");
  const [file, setFile] = useState<any>(null); const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ v: boolean; m: string; k?: any }>({ v: false, m: "" });
  const pick = async () => { const f = await pickFileAsBase64("any"); if (f) setFile(f); };
  const save = async () => {
    if (!desc.trim() || !amount) { setToast({ v: true, m: "Fill required fields", k: "error" }); return; }
    setSaving(true);
    try { await api.createExpense({ category: cat, description: desc, amount: Number(amount), date: date || null, bill_file: file }); setToast({ v: true, m: "Expense logged", k: "success" }); setTimeout(() => router.back(), 400); } catch (e: any) { setToast({ v: true, m: e.message, k: "error" }); } finally { setSaving(false); }
  };
  return (
    <ScreenShell title="Add Expense">
      <Toast visible={toast.v} message={toast.m} kind={toast.k} onHide={() => setToast({ v: false, m: "" })} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: theme.textMuted, marginBottom: 8, letterSpacing: 0.5 }}>CATEGORY</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md }}>
            {CATS.map((c) => (
              <Pressable key={c} testID={`exp-cat-${c}`} onPress={() => setCat(c)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: cat === c ? theme.navy : theme.surface2 }}>
                <Text style={{ color: cat === c ? "#fff" : theme.text, fontWeight: "600", fontSize: 12 }}>{c}</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Description *" value={desc} onChangeText={setDesc} multiline testID="exp-desc" />
          <Field label="Amount (AED) *" value={amount} onChangeText={setAmount} keyboardType="numeric" testID="exp-amount" />
          <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} testID="exp-date" />
          <Pressable testID="exp-pick" onPress={pick} style={{ padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, borderStyle: "dashed", alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, backgroundColor: theme.card }}>
            <Ionicons name="cloud-upload-outline" size={20} color={theme.navy} />
            <Text style={{ color: theme.navy, fontWeight: "700" }}>{file ? `Attached: ${file.name}` : "Upload Bill (JPG/PDF)"}</Text>
          </Pressable>
          <View style={{ marginTop: spacing.lg }}><PrimaryButton title="Log Expense" onPress={save} loading={saving} testID="exp-save" /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
