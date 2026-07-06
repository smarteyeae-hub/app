import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenShell } from "@/src/shared";
import { Card, PrimaryButton, ScreenLoader, StatusBadge, Toast } from "@/src/ui";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { theme, spacing, fmtDate } from "@/src/theme";

export default function WorkDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [w, setW] = useState<any>(null);
  const [toast, setToast] = useState<{ v: boolean; m: string; k?: any }>({ v: false, m: "" });

  const load = () => api.getWork(id!).then(setW).catch(() => {});
  useEffect(() => { load(); }, [id]);

  const update = async (status: string) => {
    try { await api.updateWorkStatus(id!, status); setToast({ v: true, m: `Marked ${status.replace("_", " ")}`, k: "success" }); load(); } catch (e: any) { setToast({ v: true, m: e.message, k: "error" }); }
  };

  if (!w) return <ScreenLoader />;

  return (
    <ScreenShell title={w.title} subtitle={w.customer_name}>
      <Toast visible={toast.v} message={toast.m} kind={toast.k} onHide={() => setToast({ v: false, m: "" })} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: "700" }}>STATUS</Text>
            <StatusBadge status={w.status} />
          </View>
          <View style={{ marginTop: 10 }}>
            <Row label="Customer" value={w.customer_name} />
            <Row label="Phone" value={w.phone || "-"} />
            <Row label="Address" value={w.address || "-"} />
            <Row label="Assigned to" value={w.assigned_to_name} />
            <Row label="Priority" value={w.priority} />
            <Row label="Scheduled" value={fmtDate(w.scheduled_date || w.created_at)} />
          </View>
          {w.description ? <><View style={{ height: 8 }} /><Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: "700" }}>DESCRIPTION</Text><Text style={{ color: theme.text, marginTop: 4 }}>{w.description}</Text></> : null}
        </Card>

        {((user?.role === "manager" || user?.role === "owner") || w.assigned_to === user?.id) && w.status !== "completed" && (
          <View style={{ marginTop: spacing.lg, gap: 10 }}>
            {w.status === "pending" && <PrimaryButton title="Start Work" onPress={() => update("in_progress")} icon="play" testID="work-start-btn" />}
            {w.status !== "pending" && <PrimaryButton title="Mark Completed" onPress={() => update("completed")} icon="checkmark-circle" testID="work-done-btn" />}
            <PrimaryButton title="Create Service Report" variant="secondary" onPress={() => router.push({ pathname: "/doc-create", params: { type: "service_report", work_id: w.id, customer_name: w.customer_name, customer_address: w.address, customer_phone: w.phone } })} testID="work-sr-btn" />
            <PrimaryButton title="Request Material" variant="ghost" onPress={() => router.push({ pathname: "/material-request-create", params: { work_id: w.id } })} testID="work-mr-btn" />
          </View>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

function Row({ label, value }: any) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
      <Text style={{ color: theme.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: theme.text, fontWeight: "600", fontSize: 13, textTransform: label === "Priority" ? "capitalize" : "none" }}>{value}</Text>
    </View>
  );
}
