import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, Modal, KeyboardAvoidingView, Platform, ScrollView, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "@/src/shared";
import { Card, EmptyState, PrimaryButton, StatusBadge, Toast } from "@/src/ui";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { theme, spacing, radius, shadow, fmtAED, fmtDate } from "@/src/theme";

export default function Expenses() {
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewing, setReviewing] = useState<{ e: any; action: "approved" | "rejected" } | null>(null);
  const [toast, setToast] = useState<{ v: boolean; m: string; k?: any }>({ v: false, m: "" });
  const router = useRouter();
  const { user } = useAuth();
  const isMgr = user?.role === "manager" || user?.role === "owner";

  const load = useCallback(async () => { try { setItems(await api.listExpenses()); } catch { setItems([]); } }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <ScreenShell title="Daily Expenses" subtitle={`${items.length} entries`}>
      <Toast visible={toast.v} message={toast.m} kind={toast.k} onHide={() => setToast({ v: false, m: "" })} />
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<EmptyState icon="wallet-outline" title="No expenses yet" />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: theme.text }}>{item.category}</Text>
                <Text style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={2}>{item.description}</Text>
                <Text style={{ color: theme.textLight, fontSize: 11, marginTop: 4 }}>{item.created_by_name} · {fmtDate(item.date)}</Text>
                {item.remarks ? <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 6, fontStyle: "italic" }}>Manager: “{item.remarks}”</Text> : null}
                {item.reviewed_by_name ? <Text style={{ color: theme.textLight, fontSize: 10, marginTop: 2 }}>Reviewed by {item.reviewed_by_name}</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontWeight: "800", color: theme.red }}>{fmtAED(item.amount)}</Text>
                <View style={{ marginTop: 6 }}><StatusBadge status={item.status} /></View>
              </View>
            </View>
            {isMgr && item.status === "pending" && (
              <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
                <Pressable testID={`exp-approve-${item.id}`} onPress={() => setReviewing({ e: item, action: "approved" })} style={{ flex: 1, backgroundColor: theme.successBg, padding: 8, borderRadius: 8, alignItems: "center" }}>
                  <Text style={{ color: theme.success, fontWeight: "700", fontSize: 12 }}>Approve</Text>
                </Pressable>
                <Pressable testID={`exp-reject-${item.id}`} onPress={() => setReviewing({ e: item, action: "rejected" })} style={{ flex: 1, backgroundColor: theme.errorBg, padding: 8, borderRadius: 8, alignItems: "center" }}>
                  <Text style={{ color: theme.error, fontWeight: "700", fontSize: 12 }}>Reject</Text>
                </Pressable>
              </View>
            )}
          </Card>
        )}
      />
      <Pressable testID="exp-fab" onPress={() => router.push("/expense-create")} style={{ position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.red, alignItems: "center", justifyContent: "center", ...shadow.fab }}>
        <Ionicons name="add" size={30} color="#fff" />
      </Pressable>

      {reviewing && (
        <ReviewModal
          expense={reviewing.e}
          action={reviewing.action}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); load(); setToast({ v: true, m: "Expense updated", k: "success" }); }}
        />
      )}
    </ScreenShell>
  );
}

function ReviewModal({ expense, action, onClose, onDone }: { expense: any; action: "approved" | "rejected"; onClose: () => void; onDone: () => void }) {
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try { await api.reviewExpense(expense.id, action, remarks); onDone(); } catch (e) { setSaving(false); }
  };
  const isApprove = action === "approved";
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <View style={{ padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: isApprove ? theme.success : theme.error }}>{isApprove ? "Approve" : "Reject"} Expense</Text>
            <Pressable testID="review-close" onPress={onClose}><Ionicons name="close" size={22} color={theme.textMuted} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>{expense.created_by_name} · {expense.category}</Text>
            <Text style={{ color: theme.text, fontSize: 15, marginTop: 2, marginBottom: 8 }}>{expense.description}</Text>
            <Text style={{ color: theme.red, fontWeight: "800", fontSize: 22, marginBottom: spacing.md }}>{fmtAED(expense.amount)}</Text>
            <Text style={{ color: theme.text, fontWeight: "600", fontSize: 13, marginBottom: 6 }}>Remarks {isApprove ? "(optional)" : "(reason for rejection)"}</Text>
            <TextInput
              testID="review-remarks"
              multiline
              value={remarks}
              onChangeText={setRemarks}
              placeholder={isApprove ? "Add a note (optional)" : "Explain why you are rejecting…"}
              placeholderTextColor={theme.textLight}
              style={{ backgroundColor: theme.card, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, padding: spacing.md, minHeight: 80, color: theme.text, fontSize: 15, marginBottom: spacing.lg, textAlignVertical: "top" }}
            />
            <PrimaryButton title={isApprove ? "Approve Expense" : "Reject Expense"} onPress={submit} loading={saving} variant={isApprove ? "primary" : "danger"} testID="review-submit-btn" />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
