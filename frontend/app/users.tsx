import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenShell } from "@/src/shared";
import { Card, EmptyState, Field, PrimaryButton, Toast } from "@/src/ui";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { theme, spacing, radius, shadow, fmtDate } from "@/src/theme";

const ROLES = ["owner", "manager", "employee"] as const;

export default function Users() {
  const { user: me } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ v: boolean; m: string; k?: any }>({ v: false, m: "" });

  const load = useCallback(async () => { try { setItems(await api.listUsers()); } catch { setItems([]); } }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (u: any) => {
    try { await api.toggleUserActive(u.id); setToast({ v: true, m: `User ${u.is_active === false ? "reactivated" : "deactivated"}`, k: "success" }); load(); } catch (e: any) { setToast({ v: true, m: e.message, k: "error" }); }
  };
  const del = async (u: any) => {
    try { await api.deleteUser(u.id); setToast({ v: true, m: "User deleted", k: "success" }); load(); } catch (e: any) { setToast({ v: true, m: e.message, k: "error" }); }
  };

  return (
    <ScreenShell title="User Management" subtitle={`${items.length} users`}>
      <Toast visible={toast.v} message={toast.m} kind={toast.k} onHide={() => setToast({ v: false, m: "" })} />
      <FlatList
        data={items}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<EmptyState icon="people-outline" title="No users" />}
        renderItem={({ item }) => {
          const isSelf = item.id === me?.id;
          return (
            <Card style={{ marginBottom: 10, opacity: item.is_active === false ? 0.6 : 1 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.brandTint, alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                  <Text style={{ color: theme.navy, fontWeight: "800" }}>{(item.name || "?").slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontWeight: "700", color: theme.text }}>{item.name}</Text>
                    {isSelf ? <Text style={{ fontSize: 10, color: theme.textLight }}>(you)</Text> : null}
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>{item.email}</Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                    <View style={{ backgroundColor: theme.navy, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>{item.role}</Text>
                    </View>
                    <View style={{ backgroundColor: item.is_active === false ? theme.errorBg : theme.successBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                      <Text style={{ color: item.is_active === false ? theme.error : theme.success, fontSize: 10, fontWeight: "800" }}>{item.is_active === false ? "INACTIVE" : "ACTIVE"}</Text>
                    </View>
                  </View>
                </View>
              </View>
              {!isSelf && (
                <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
                  <Pressable testID={`user-edit-${item.id}`} onPress={() => setEditing(item)} style={{ flex: 1, backgroundColor: theme.brandTint, padding: 8, borderRadius: 8, alignItems: "center" }}><Text style={{ color: theme.navy, fontWeight: "700", fontSize: 12 }}>Edit</Text></Pressable>
                  <Pressable testID={`user-toggle-${item.id}`} onPress={() => toggle(item)} style={{ flex: 1, backgroundColor: item.is_active === false ? theme.successBg : theme.warningBg, padding: 8, borderRadius: 8, alignItems: "center" }}><Text style={{ color: item.is_active === false ? theme.success : theme.warning, fontWeight: "700", fontSize: 12 }}>{item.is_active === false ? "Activate" : "Deactivate"}</Text></Pressable>
                  <Pressable testID={`user-delete-${item.id}`} onPress={() => del(item)} style={{ flex: 1, backgroundColor: theme.errorBg, padding: 8, borderRadius: 8, alignItems: "center" }}><Text style={{ color: theme.error, fontWeight: "700", fontSize: 12 }}>Delete</Text></Pressable>
                </View>
              )}
            </Card>
          );
        }}
      />
      <Pressable testID="users-fab" onPress={() => setCreating(true)} style={{ position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.red, alignItems: "center", justifyContent: "center", ...shadow.fab }}>
        <Ionicons name="person-add" size={24} color="#fff" />
      </Pressable>

      {editing && <UserFormModal user={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); setToast({ v: true, m: "User updated", k: "success" }); }} />}
      {creating && <UserFormModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); setToast({ v: true, m: "User created", k: "success" }); }} />}
    </ScreenShell>
  );
}

function UserFormModal({ user, onClose, onSaved }: { user?: any; onClose: () => void; onSaved: () => void }) {
  const editMode = !!user;
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [role, setRole] = useState<string>(user?.role || "employee");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setErr(""); setSaving(true);
    try {
      if (editMode) {
        const body: any = { name, phone, role };
        if (password) body.password = password;
        await api.updateUser(user.id, body);
      } else {
        if (!email.trim() || !password) { setErr("Email & password required"); setSaving(false); return; }
        await api.createUser({ email, password, name, role, phone });
      }
      onSaved();
    } catch (e: any) { setErr(e.message || "Failed"); } finally { setSaving(false); }
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: theme.text }}>{editMode ? "Edit User" : "Create User"}</Text>
            <Pressable testID="user-form-close" onPress={onClose}><Ionicons name="close" size={22} color={theme.textMuted} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
            <Field label="Full Name *" value={name} onChangeText={setName} testID="uf-name" />
            {!editMode && <Field label="Email *" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" testID="uf-email" />}
            <Field label={editMode ? "New Password (leave empty to keep)" : "Password *"} value={password} onChangeText={setPassword} secureTextEntry testID="uf-password" />
            <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" testID="uf-phone" />
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.textMuted, marginBottom: 6 }}>ROLE</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {ROLES.map((r) => (
                <Pressable key={r} testID={`uf-role-${r}`} onPress={() => setRole(r)} style={{ flex: 1, padding: 12, borderRadius: 8, backgroundColor: role === r ? theme.navy : theme.surface2, alignItems: "center" }}>
                  <Text style={{ color: role === r ? "#fff" : theme.text, fontWeight: "700", textTransform: "capitalize", fontSize: 12 }}>{r}</Text>
                </Pressable>
              ))}
            </View>
            {err ? <Text style={{ color: theme.error, marginBottom: 8 }}>{err}</Text> : null}
            <PrimaryButton title={editMode ? "Save Changes" : "Create User"} onPress={submit} loading={saving} testID="uf-save" />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
