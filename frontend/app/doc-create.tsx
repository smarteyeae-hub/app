import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "@/src/shared";
import { Field, PrimaryButton, Toast, Card } from "@/src/ui";
import { theme, spacing, radius } from "@/src/theme";
import { api } from "@/src/api";

type T = "quotation" | "invoice" | "receipt" | "service_report";
const TITLES: Record<T, string> = { quotation: "New Quotation", invoice: "New Invoice", receipt: "New Receipt Voucher", service_report: "New Service Report" };

const SERVICES = ["Installation", "Maintenance", "Warranty Service", "Troubleshooting", "Access Control", "Networking", "CCTV System", "Cable Pulling", "Testing & Commissioning", "Intercom System", "Gate Automation", "Wifi/Access Point", "Others"];

export default function DocCreate() {
  const { type = "quotation" } = useLocalSearchParams<{ type: T }>();
  const t = (type as T) || "quotation";
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [items, setItems] = useState<{ description: string; quantity: string; unit: string; unit_price: string }[]>([{ description: "", quantity: "1", unit: "Lot", unit_price: "0" }]);
  const [vat, setVat] = useState("5");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  // receipt
  const [amount, setAmount] = useState("0");
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  // service report
  const [technician, setTechnician] = useState("");
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [scope, setScope] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [materials, setMaterials] = useState<{ item_name: string; model_number: string; serial_number: string; quantity: string }[]>([]);
  const [techRemark, setTechRemark] = useState("");
  const [clientRemark, setClientRemark] = useState("");
  const [total, setTotal] = useState("0");
  const [advance, setAdvance] = useState("0");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ v: boolean; m: string; k?: any }>({ v: false, m: "" });

  useEffect(() => { api.listCustomers().then(setCustomers).catch(() => {}); }, []);

  const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  const disc = Number(discount || 0);
  const vatAmt = Math.max(0, subtotal - disc) * (Number(vat || 0) / 100);
  const grandTotal = Math.max(0, subtotal - disc) + vatAmt;

  const selectCustomer = (c: any) => {
    setCustomerId(c.id); setCustomerName(c.name); setCustomerAddress(c.address || ""); setCustomerPhone(c.phone || "");
  };

  const toggleService = (s: string) => setSelectedServices((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const save = async () => {
    if (!customerName.trim()) { setToast({ v: true, m: "Enter a customer name", k: "error" }); return; }
    setSaving(true);
    try {
      let created: any;
      if (t === "quotation" || t === "invoice") {
        const body = {
          customer_id: customerId || null,
          customer_name: customerName, customer_address: customerAddress, customer_phone: customerPhone,
          subject, notes,
          vat_percent: Number(vat || 0), discount: Number(discount || 0),
          items: items.filter((i) => i.description.trim()).map((i) => ({ description: i.description, quantity: Number(i.quantity || 0), unit: i.unit, unit_price: Number(i.unit_price || 0) })),
        };
        created = t === "quotation" ? await api.createQuotation(body) : await api.createInvoice(body);
      } else if (t === "receipt") {
        created = await api.createReceipt({ customer_id: customerId || null, customer_name: customerName, amount: Number(amount || 0), payment_method: method, reference, notes });
      } else {
        created = await api.createServiceReport({
          customer_id: customerId || null, customer_name: customerName, customer_address: customerAddress, customer_phone: customerPhone,
          technician_name: technician, time_in: timeIn, time_out: timeOut, scope_of_work: scope, services: selectedServices,
          materials: materials.filter((m) => m.item_name.trim()).map((m) => ({ item_name: m.item_name, model_number: m.model_number, serial_number: m.serial_number, quantity: Number(m.quantity || 1) })),
          technician_remark: techRemark, client_remark: clientRemark,
          total_amount: Number(total || 0), advance: Number(advance || 0), balance: Number(total || 0) - Number(advance || 0),
        });
      }
      setToast({ v: true, m: "Created successfully", k: "success" });
      setTimeout(() => router.replace({ pathname: "/doc-detail", params: { type: t, id: created.id } }), 400);
    } catch (e: any) {
      setToast({ v: true, m: e.message || "Failed", k: "error" });
    } finally { setSaving(false); }
  };

  return (
    <ScreenShell title={TITLES[t]}>
      <Toast visible={toast.v} message={toast.m} kind={toast.k} onHide={() => setToast({ v: false, m: "" })} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <Text style={sectionStyle}>Customer</Text>
          {customers.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
              {customers.map((c) => (
                <Pressable key={c.id} testID={`sel-cust-${c.id}`} onPress={() => selectCustomer(c)} style={{ flexShrink: 0, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: customerId === c.id ? theme.navy : theme.surface2 }}>
                  <Text style={{ color: customerId === c.id ? "#fff" : theme.text, fontWeight: "600", fontSize: 12 }} numberOfLines={1}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <Field label="Customer Name *" value={customerName} onChangeText={setCustomerName} placeholder="M/s. Client" testID="doc-customer-name" />
          <Field label="Address" value={customerAddress} onChangeText={setCustomerAddress} placeholder="Full address" testID="doc-customer-address" />
          <Field label="Phone" value={customerPhone} onChangeText={setCustomerPhone} placeholder="+971 5X XXX XXXX" keyboardType="phone-pad" testID="doc-customer-phone" />

          {(t === "quotation" || t === "invoice") && (
            <>
              <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="Subject / description" testID="doc-subject" />

              <Text style={sectionStyle}>Line Items</Text>
              {items.map((it, idx) => (
                <Card key={idx} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={{ fontWeight: "700", color: theme.text }}>Item #{idx + 1}</Text>
                    {items.length > 1 && (
                      <Pressable testID={`del-item-${idx}`} onPress={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
                        <Ionicons name="trash" size={18} color={theme.error} />
                      </Pressable>
                    )}
                  </View>
                  <Field label="Description" value={it.description} onChangeText={(v) => setItems((prev) => prev.map((p, i) => i === idx ? { ...p, description: v } : p))} testID={`item-desc-${idx}`} multiline />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}><Field label="Qty" value={it.quantity} onChangeText={(v) => setItems((prev) => prev.map((p, i) => i === idx ? { ...p, quantity: v } : p))} keyboardType="numeric" testID={`item-qty-${idx}`} /></View>
                    <View style={{ flex: 1 }}><Field label="Unit" value={it.unit} onChangeText={(v) => setItems((prev) => prev.map((p, i) => i === idx ? { ...p, unit: v } : p))} testID={`item-unit-${idx}`} /></View>
                    <View style={{ flex: 1.2 }}><Field label="Price (AED)" value={it.unit_price} onChangeText={(v) => setItems((prev) => prev.map((p, i) => i === idx ? { ...p, unit_price: v } : p))} keyboardType="numeric" testID={`item-price-${idx}`} /></View>
                  </View>
                </Card>
              ))}
              <PrimaryButton title="+ Add Item" variant="secondary" onPress={() => setItems((p) => [...p, { description: "", quantity: "1", unit: "Lot", unit_price: "0" }])} testID="add-item-btn" />

              <View style={{ flexDirection: "row", gap: 8, marginTop: spacing.md }}>
                <View style={{ flex: 1 }}><Field label="Discount (AED)" value={discount} onChangeText={setDiscount} keyboardType="numeric" testID="doc-discount" /></View>
                <View style={{ flex: 1 }}><Field label="VAT %" value={vat} onChangeText={setVat} keyboardType="numeric" testID="doc-vat" /></View>
              </View>

              <Card style={{ marginTop: spacing.sm }}>
                <Row label="Subtotal" value={`AED ${subtotal.toFixed(2)}`} />
                {disc > 0 && <Row label="Discount" value={`-AED ${disc.toFixed(2)}`} />}
                <Row label={`VAT (${vat}%)`} value={`AED ${vatAmt.toFixed(2)}`} />
                <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 6 }} />
                <Row label="Total" value={`AED ${grandTotal.toFixed(2)}`} bold />
              </Card>

              <Field label="Notes" value={notes} onChangeText={setNotes} multiline testID="doc-notes" />
            </>
          )}

          {t === "receipt" && (
            <>
              <Text style={sectionStyle}>Payment Details</Text>
              <Field label="Amount (AED) *" value={amount} onChangeText={setAmount} keyboardType="numeric" testID="receipt-amount" />
              <Field label="Payment Method" value={method} onChangeText={setMethod} testID="receipt-method" />
              <Field label="Reference / Cheque No." value={reference} onChangeText={setReference} testID="receipt-ref" />
              <Field label="Notes" value={notes} onChangeText={setNotes} multiline testID="receipt-notes" />
            </>
          )}

          {t === "service_report" && (
            <>
              <Text style={sectionStyle}>Job Details</Text>
              <Field label="Technician Name" value={technician} onChangeText={setTechnician} testID="sr-tech" />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}><Field label="Time In" value={timeIn} onChangeText={setTimeIn} placeholder="09:00" testID="sr-timein" /></View>
                <View style={{ flex: 1 }}><Field label="Time Out" value={timeOut} onChangeText={setTimeOut} placeholder="12:00" testID="sr-timeout" /></View>
              </View>
              <Field label="Scope of Work" value={scope} onChangeText={setScope} multiline testID="sr-scope" />

              <Text style={sectionStyle}>Type of Services</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {SERVICES.map((s) => {
                  const on = selectedServices.includes(s);
                  return (
                    <Pressable key={s} testID={`sr-svc-${s}`} onPress={() => toggleService(s)}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? theme.navy : theme.surface2, borderWidth: 1, borderColor: on ? theme.navy : theme.border }}>
                      <Text style={{ color: on ? "#fff" : theme.text, fontWeight: "600", fontSize: 12 }}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={sectionStyle}>Materials Used</Text>
              {materials.map((m, idx) => (
                <Card key={idx} style={{ marginBottom: spacing.sm }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={{ fontWeight: "700", color: theme.text }}>Material #{idx + 1}</Text>
                    <Pressable testID={`sr-del-mat-${idx}`} onPress={() => setMaterials((prev) => prev.filter((_, i) => i !== idx))}>
                      <Ionicons name="trash" size={18} color={theme.error} />
                    </Pressable>
                  </View>
                  <Field label="Item Name" value={m.item_name} onChangeText={(v) => setMaterials((prev) => prev.map((p, i) => i === idx ? { ...p, item_name: v } : p))} testID={`sr-mat-name-${idx}`} />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}><Field label="Model" value={m.model_number} onChangeText={(v) => setMaterials((prev) => prev.map((p, i) => i === idx ? { ...p, model_number: v } : p))} testID={`sr-mat-model-${idx}`} /></View>
                    <View style={{ flex: 1 }}><Field label="Serial" value={m.serial_number} onChangeText={(v) => setMaterials((prev) => prev.map((p, i) => i === idx ? { ...p, serial_number: v } : p))} testID={`sr-mat-serial-${idx}`} /></View>
                    <View style={{ flex: 0.6 }}><Field label="Qty" value={m.quantity} onChangeText={(v) => setMaterials((prev) => prev.map((p, i) => i === idx ? { ...p, quantity: v } : p))} keyboardType="numeric" testID={`sr-mat-qty-${idx}`} /></View>
                  </View>
                </Card>
              ))}
              <PrimaryButton title="+ Add Material" variant="secondary" onPress={() => setMaterials((p) => [...p, { item_name: "", model_number: "", serial_number: "", quantity: "1" }])} testID="sr-add-mat" />

              <Field label="Technician Remark" value={techRemark} onChangeText={setTechRemark} multiline testID="sr-techrem" />
              <Field label="Client Remark" value={clientRemark} onChangeText={setClientRemark} multiline testID="sr-clientrem" />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}><Field label="Total (AED)" value={total} onChangeText={setTotal} keyboardType="numeric" testID="sr-total" /></View>
                <View style={{ flex: 1 }}><Field label="Advance (AED)" value={advance} onChangeText={setAdvance} keyboardType="numeric" testID="sr-adv" /></View>
              </View>
            </>
          )}

          <View style={{ marginTop: spacing.lg }}>
            <PrimaryButton title="Save & Continue" onPress={save} loading={saving} testID="doc-save-btn" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const sectionStyle = { fontSize: 12, fontWeight: "700" as const, color: theme.textMuted, marginBottom: spacing.sm, marginTop: spacing.md, letterSpacing: 0.5, textTransform: "uppercase" as const };

function Row({ label, value, bold }: any) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
      <Text style={{ color: bold ? theme.text : theme.textMuted, fontWeight: bold ? "800" : "500", fontSize: bold ? 15 : 13 }}>{label}</Text>
      <Text style={{ color: theme.text, fontWeight: bold ? "800" : "600", fontSize: bold ? 15 : 13 }}>{value}</Text>
    </View>
  );
}
