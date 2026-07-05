import React, { useState } from "react";
import { ScrollView, KeyboardAvoidingView, Platform, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenShell } from "@/src/shared";
import { Field, PrimaryButton, Toast } from "@/src/ui";
import { api } from "@/src/api";
import { spacing } from "@/src/theme";

export default function InventoryCreate() {
  const router = useRouter();
  const [name, setName] = useState(""); const [model, setModel] = useState(""); const [unit, setUnit] = useState("pcs"); const [qty, setQty] = useState("0"); const [price, setPrice] = useState("0"); const [cat, setCat] = useState(""); const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ v: boolean; m: string; k?: any }>({ v: false, m: "" });
  const save = async () => {
    if (!name.trim()) { setToast({ v: true, m: "Name required", k: "error" }); return; }
    setSaving(true);
    try { await api.createInventory({ name, model_number: model, unit, quantity: Number(qty), unit_price: Number(price), category: cat, notes }); setToast({ v: true, m: "Item added", k: "success" }); setTimeout(() => router.back(), 400); } catch (e: any) { setToast({ v: true, m: e.message, k: "error" }); } finally { setSaving(false); }
  };
  return (
    <ScreenShell title="Add Inventory Item">
      <Toast visible={toast.v} message={toast.m} kind={toast.k} onHide={() => setToast({ v: false, m: "" })} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
          <Field label="Item Name *" value={name} onChangeText={setName} testID="inv-name" />
          <Field label="Model Number" value={model} onChangeText={setModel} testID="inv-model" />
          <Field label="Category" value={cat} onChangeText={setCat} placeholder="CCTV, Networking, ..." testID="inv-cat" />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Field label="Unit" value={unit} onChangeText={setUnit} testID="inv-unit" /></View>
            <View style={{ flex: 1 }}><Field label="Quantity" value={qty} onChangeText={setQty} keyboardType="numeric" testID="inv-qty" /></View>
            <View style={{ flex: 1.2 }}><Field label="Unit Price (AED)" value={price} onChangeText={setPrice} keyboardType="numeric" testID="inv-price" /></View>
          </View>
          <Field label="Notes" value={notes} onChangeText={setNotes} multiline testID="inv-notes" />
          <View style={{ marginTop: spacing.lg }}><PrimaryButton title="Add Item" onPress={save} loading={saving} testID="inv-save" /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
