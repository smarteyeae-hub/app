import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const RAW = process.env.EXPO_PUBLIC_BACKEND_URL || (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_BACKEND_URL || "";
export const API_BASE = `${RAW.replace(/\/$/, "")}/api`;

const TOKEN_KEY = "smarteye_token";
const USER_KEY = "smarteye_user";

export type Role = "manager" | "employee";
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
}

export async function saveAuth(token: string, user: AuthUser) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}
export async function loadAuth(): Promise<{ token: string | null; user: AuthUser | null }> {
  const [token, userStr] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(USER_KEY),
  ]);
  return { token, user: userStr ? JSON.parse(userStr) : null };
}
export async function clearAuth() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function apiFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = data?.detail || data?.message || `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    apiFetch<{ access_token: string; user: AuthUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => apiFetch<AuthUser>("/auth/me"),
  dashboard: () => apiFetch<any>("/dashboard/summary"),
  // customers
  listCustomers: () => apiFetch<any[]>("/customers"),
  createCustomer: (b: any) => apiFetch("/customers", { method: "POST", body: JSON.stringify(b) }),
  // inventory
  listInventory: () => apiFetch<any[]>("/inventory"),
  createInventory: (b: any) => apiFetch("/inventory", { method: "POST", body: JSON.stringify(b) }),
  // users
  listUsers: () => apiFetch<any[]>("/users"),
  listEmployees: () => apiFetch<any[]>("/users/employees"),
  createUser: (b: any) => apiFetch("/auth/register", { method: "POST", body: JSON.stringify(b) }),
  updateUser: (id: string, b: any) => apiFetch(`/users/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  toggleUserActive: (id: string) => apiFetch(`/users/${id}/active`, { method: "PATCH" }),
  deleteUser: (id: string) => apiFetch(`/users/${id}`, { method: "DELETE" }),
  // works
  listWorks: () => apiFetch<any[]>("/works"),
  createWork: (b: any) => apiFetch("/works", { method: "POST", body: JSON.stringify(b) }),
  updateWorkStatus: (id: string, status: string) => apiFetch(`/works/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getWork: (id: string) => apiFetch<any>(`/works/${id}`),
  // docs
  listQuotations: () => apiFetch<any[]>("/quotations"),
  createQuotation: (b: any) => apiFetch("/quotations", { method: "POST", body: JSON.stringify(b) }),
  quotationToInvoice: (id: string) => apiFetch<any>(`/quotations/${id}/convert-to-invoice`, { method: "POST" }),
  quotationPdf: (id: string) => apiFetch<{ filename: string; data: string }>(`/quotations/${id}/pdf`),
  listInvoices: () => apiFetch<any[]>("/invoices"),
  createInvoice: (b: any) => apiFetch("/invoices", { method: "POST", body: JSON.stringify(b) }),
  invoiceToReceipt: (id: string) => apiFetch<any>(`/invoices/${id}/convert-to-receipt`, { method: "POST" }),
  invoicePdf: (id: string) => apiFetch<{ filename: string; data: string }>(`/invoices/${id}/pdf`),
  listReceipts: () => apiFetch<any[]>("/receipts"),
  createReceipt: (b: any) => apiFetch("/receipts", { method: "POST", body: JSON.stringify(b) }),
  receiptPdf: (id: string) => apiFetch<{ filename: string; data: string }>(`/receipts/${id}/pdf`),
  listServiceReports: () => apiFetch<any[]>("/service-reports"),
  createServiceReport: (b: any) => apiFetch("/service-reports", { method: "POST", body: JSON.stringify(b) }),
  serviceReportPdf: (id: string) => apiFetch<{ filename: string; data: string }>(`/service-reports/${id}/pdf`),
  // purchases / expenses / material
  listPurchases: () => apiFetch<any[]>("/purchases"),
  createPurchase: (b: any) => apiFetch("/purchases", { method: "POST", body: JSON.stringify(b) }),
  listExpenses: () => apiFetch<any[]>("/expenses"),
  createExpense: (b: any) => apiFetch("/expenses", { method: "POST", body: JSON.stringify(b) }),
  reviewExpense: (id: string, status: string, remarks: string) => apiFetch(`/expenses/${id}/status`, { method: "PATCH", body: JSON.stringify({ status, remarks }) }),
  listMaterialRequests: () => apiFetch<any[]>("/material-requests"),
  createMaterialRequest: (b: any) => apiFetch("/material-requests", { method: "POST", body: JSON.stringify(b) }),
  updateMRStatus: (id: string, status: string) => apiFetch(`/material-requests/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  // notifications
  listNotifications: () => apiFetch<any[]>("/notifications"),
  unreadCount: () => apiFetch<{ count: number }>("/notifications/unread-count"),
  markRead: (id: string) => apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => apiFetch("/notifications/read-all", { method: "POST" }),
  deleteNotification: (id: string) => apiFetch(`/notifications/${id}`, { method: "DELETE" }),
};

export const isWeb = Platform.OS === "web";
