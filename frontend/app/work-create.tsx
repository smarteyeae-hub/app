import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ScreenShell } from "@/src/shared";
import { Field, PrimaryButton, Toast } from "@/src/ui";
import { theme, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";

export default function WorkCreate() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [title, setTitle] = useState(""); const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [address, setAddress] = useState(""); const [phone, setPhone] = useState(""); const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>(""); const [priority, setPriority] = useState("normal"); const [scheduled, setScheduled] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ v: boolean; m: string; k?: any }>({ v: false, m: "" });

  useEffect(() => { api.listEmployees().then(setEmployees).catch(() => {}); api.listCustomers().then(setCustomers).catch(() => {}); }, []);

  const save = async () => {
    if (!title.trim() || !customerName.trim() || !assignedTo) { setToast({ v: true, m: "Fill required fields", k: "error" }); return; }
    setSaving(true);
    try {
      await api.createWork({ title, customer_id: customerId, customer_name: customerName, address, phone, description, assigned_to: assignedTo, priority, scheduled_date: scheduled || null });
      setToast({ v: true, m: "Work assigned", k: "success" });
      setTimeout(() => router.back(), 500);
    } catch (e: any) { setToast({ v: true, m: e.message, k: "error" }); } finally { setSaving(false); }
  };

  return (
    <ScreenShell title="Assign Work">
      <Toast visible={toast.v} message={toast.m} kind={toast.k} onHide={() => setToast({ v: false, m: "" })} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
          <Field label="Job Title *" value={title} onChangeText={setTitle} testID="work-title" placeholder="CCTV installation at ..." />
          {customers.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
              {customers.map((c) => (
                <Pressable key={c.id} testID={`wcust-${c.id}`} onPress={() => { setCustomerId(c.id); setCustomerName(c.name); setAddress(c.address || ""); setPhone(c.phone || ""); }} style={{ flexShrink: 0, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: customerId === c.id ? theme.navy : theme.surface2 }}>
                  <Text style={{ color: customerId === c.id ? "#fff" : theme.text, fontWeight: "600", fontSize: 12 }}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <Field label="Customer *" value={customerName} onChangeText={setCustomerName} testID="work-customer" />
          <Field label="Address" value={address} onChangeText={setAddress} testID="work-address" />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" testID="work-phone" />
          <Field label="Description" value={description} onChangeText={setDescription} multiline testID="work-desc" />

          <Text style={{ fontSize: 12, fontWeight: "700", color: theme.textMuted, marginTop: spacing.md, marginBottom: 6, letterSpacing: 0.5 }}>ASSIGN TO EMPLOYEE *</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md }}>
            {employees.map((e) => (
              <Pressable key={e.id} testID={`emp-${e.id}`} onPress={() => setAssignedTo(e.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: assignedTo === e.id ? theme.navy : theme.surface2 }}>
                <Text style={{ color: assignedTo === e.id ? "#fff" : theme.text, fontWeight: "600", fontSize: 12 }}>{e.name}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ fontSize: 12, fontWeight: "700", color: theme.textMuted, marginBottom: 6, letterSpacing: 0.5 }}>PRIORITY</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: spacing.md }}>
            {["low", "normal", "high"].map((p) => (
              <Pressable key={p} testID={`pri-${p}`} onPress={() => setPriority(p)} style={{ flex: 1, paddingVertical: 10, borderRadius: radius.md, backgroundColor: priority === p ? theme.navy : theme.surface2, alignItems: "center" }}>
                <Text style={{ color: priority === p ? "#fff" : theme.text, fontWeight: "600", textTransform: "capitalize" }}>{p}</Text>
              </Pressable>
            ))}
          </View>

          <Field label="Scheduled Date (YYYY-MM-DD)" value={scheduled} onChangeText={setScheduled} placeholder="2026-07-15" testID="work-date" />
          <View style={{ marginTop: spacing.lg }}><PrimaryButton title="Assign Work" onPress={save} loading={saving} testID="work-save-btn" /></View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}
