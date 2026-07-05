import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenShell, shareBase64Pdf } from "@/src/shared";
import { Card, PrimaryButton, ScreenLoader, StatusBadge, Toast } from "@/src/ui";
import { api } from "@/src/api";
import { theme, spacing, fmtAED, fmtDate } from "@/src/theme";

type T = "quotation" | "invoice" | "receipt" | "service_report";

export default function DocDetail() {
  const { type = "quotation", id } = useLocalSearchParams<{ type: T; id: string }>();
  const t = (type as T) || "quotation";
  const [doc, setDoc] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<{ v: boolean; m: string; k?: any }>({ v: false, m: "" });

  useEffect(() => {
    (async () => {
      try {
        const path =
          t === "quotation" ? `/quotations/${id}` :
          t === "invoice" ? `/invoices/${id}` :
          t === "receipt" ? `/receipts/${id}` :
          `/service-reports/${id}`;
        const { apiFetch } = await import("@/src/api");
        setDoc(await apiFetch(path));
      } catch { /* */ }
    })();
  }, [id, t]);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const res = t === "quotation" ? await api.quotationPdf(id!)
        : t === "invoice" ? await api.invoicePdf(id!)
        : t === "receipt" ? await api.receiptPdf(id!)
        : await api.serviceReportPdf(id!);
      if (!res?.data) throw new Error("No PDF data received from server");
      await shareBase64Pdf(res.filename, res.data);
      setToast({ v: true, m: "PDF ready", k: "success" });
    } catch (e: any) {
      setToast({ v: true, m: e?.message || "PDF failed", k: "error" });
    } finally { setDownloading(false); }
  };

  if (!doc) return <ScreenLoader />;

  return (
    <ScreenShell title={doc.doc_number} subtitle={doc.customer_name}>
      <Toast visible={toast.v} message={toast.m} kind={toast.k} onHide={() => setToast({ v: false, m: "" })} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Card>
          <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: "700" }}>{t.replace("_", " ").toUpperCase()}</Text>
          <Text style={{ color: theme.navy, fontSize: 20, fontWeight: "800", marginTop: 4 }}>{doc.doc_number}</Text>
          <Text style={{ color: theme.text, fontSize: 15, marginTop: 6 }}>{doc.customer_name}</Text>
          {doc.customer_address ? <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>{doc.customer_address}</Text> : null}
          {doc.customer_phone ? <Text style={{ color: theme.textMuted, fontSize: 12 }}>{doc.customer_phone}</Text> : null}
          <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ color: theme.textLight, fontSize: 11 }}>Created {fmtDate(doc.created_at)}</Text>
            {doc.status ? <StatusBadge status={doc.status} /> : null}
          </View>
        </Card>

        {(t === "quotation" || t === "invoice") && (
          <>
            {doc.subject ? <Card style={{ marginTop: 12 }}><Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: "700", marginBottom: 4 }}>SUBJECT</Text><Text style={{ color: theme.text }}>{doc.subject}</Text></Card> : null}
            <Card style={{ marginTop: 12 }}>
              <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: "700", marginBottom: 8 }}>LINE ITEMS</Text>
              {(doc.items || []).map((it: any, i: number) => (
                <View key={i} style={{ paddingVertical: 8, borderBottomWidth: i === doc.items.length - 1 ? 0 : 1, borderBottomColor: theme.border }}>
                  <Text style={{ color: theme.text, fontWeight: "600" }}>{it.description}</Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>{it.quantity} {it.unit} × {fmtAED(it.unit_price)}</Text>
                    <Text style={{ color: theme.text, fontWeight: "700" }}>{fmtAED(Number(it.quantity) * Number(it.unit_price))}</Text>
                  </View>
                </View>
              ))}
            </Card>
            <Card style={{ marginTop: 12 }}>
              <Row label="Subtotal" value={fmtAED(doc.subtotal)} />
              {doc.discount ? <Row label="Discount" value={`-${fmtAED(doc.discount)}`} /> : null}
              <Row label={`VAT (${doc.vat_percent}%)`} value={fmtAED(doc.vat_amount)} />
              <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 8 }} />
              <Row label="Total" value={fmtAED(doc.total)} bold />
            </Card>
          </>
        )}

        {t === "receipt" && (
          <Card style={{ marginTop: 12 }}>
            <Row label="Amount" value={fmtAED(doc.amount)} bold />
            <Row label="Method" value={doc.payment_method} />
            {doc.reference ? <Row label="Reference" value={doc.reference} /> : null}
            {doc.against_invoice ? <Row label="Against Invoice" value={doc.against_invoice} /> : null}
          </Card>
        )}

        {t === "service_report" && (
          <>
            <Card style={{ marginTop: 12 }}>
              <Row label="Technician" value={doc.technician_name || "-"} />
              <Row label="Time In" value={doc.time_in || "-"} />
              <Row label="Time Out" value={doc.time_out || "-"} />
              {doc.scope_of_work ? <><View style={{ height: 8 }} /><Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: "700" }}>SCOPE OF WORK</Text><Text style={{ color: theme.text, marginTop: 2 }}>{doc.scope_of_work}</Text></> : null}
            </Card>
            {(doc.services || []).length > 0 && (
              <Card style={{ marginTop: 12 }}>
                <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: "700", marginBottom: 6 }}>SERVICES</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {(doc.services || []).map((s: string) => (
                    <View key={s} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: theme.brandTint, borderRadius: 999 }}>
                      <Text style={{ color: theme.navy, fontSize: 12, fontWeight: "600" }}>{s}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}
            {(doc.materials || []).length > 0 && (
              <Card style={{ marginTop: 12 }}>
                <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: "700", marginBottom: 6 }}>MATERIALS USED</Text>
                {doc.materials.map((m: any, i: number) => (
                  <View key={i} style={{ paddingVertical: 6, borderBottomWidth: i === doc.materials.length - 1 ? 0 : 1, borderBottomColor: theme.border }}>
                    <Text style={{ color: theme.text, fontWeight: "600" }}>{m.item_name}</Text>
                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>{m.model_number} · SN: {m.serial_number || "-"} · Qty: {m.quantity}</Text>
                  </View>
                ))}
              </Card>
            )}
            <Card style={{ marginTop: 12 }}>
              <Row label="Total" value={fmtAED(doc.total_amount || 0)} bold />
              <Row label="Advance" value={fmtAED(doc.advance || 0)} />
              <Row label="Balance" value={fmtAED(doc.balance || 0)} />
            </Card>
          </>
        )}

        <View style={{ marginTop: spacing.xl }}>
          <PrimaryButton title="Download / Share PDF" onPress={downloadPdf} loading={downloading} icon="download" testID="pdf-download-btn" />
        </View>
      </ScrollView>
    </ScreenShell>
  );
}

function Row({ label, value, bold }: any) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
      <Text style={{ color: bold ? theme.text : theme.textMuted, fontWeight: bold ? "800" : "500", fontSize: bold ? 15 : 13 }}>{label}</Text>
      <Text style={{ color: theme.text, fontWeight: bold ? "800" : "600", fontSize: bold ? 15 : 13 }}>{value}</Text>
    </View>
  );
}
