import React, { useState } from "react";
import { ScrollView, KeyboardAvoidingView, Platform, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenShell } from "@/src/shared";
import { Field, PrimaryButton, Toast } from "@/src/ui";
import { api } from "@/src/api";
import { spacing } from "@/src/theme";

export default function CustomerCreate() {
  const router = useRouter();
  const [name, setName] = useState(""); const [address, setAddress] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState(""); const [trn, setTrn] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ v: boolean; m: string; k?: any }>({ v: false, m: "" });
  const save = async () => {
    if (!name.trim()) { setToast({ v: true, m: "Name required", k: "error" }); return; }
    setSaving(true);
    try { await api.createCustomer({ name, address, phone, email, trn }); setToast({ v: true, m: "Customer added", k: "success" }); setTimeout(() => router.back(), 400); } catch (e: any) { setToast({ v: true, m: e.message, k: "error" }); } finally { setSaving(false); }
  };
  return (
    <ScreenShell title="Add Customer">
      <Toast visible={toast.v} message={toast.m} kind={toast.k} onHide={() => setToast({ v: false, m: "" })} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
          <Field label="Customer Name *" value={name} onChangeText={setName} testID="cust-name" />
          <Field label="Address" value={address} onChangeText={setAddress} multiline testID="cust-addr" />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" testID="cust-phone" />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" testID="cust-email" />
          <Field label="TRN (VAT No.)" value={trn} onChangeText={setTrn} testID="cust-trn" />
          <View style={{ marginTop: spacing.lg }}><PrimaryButton title="Add Customer" onPress={save} loading={saving} testID="cust-save" /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
