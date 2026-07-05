export const theme = {
  navy: "#1B3A5F",
  navyDark: "#122840",
  red: "#C8102E",
  redDark: "#9E0C24",
  bg: "#F9FAFB",
  card: "#FFFFFF",
  surface2: "#F3F4F6",
  text: "#111827",
  textMuted: "#6B7280",
  textLight: "#9CA3AF",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  success: "#059669",
  successBg: "#D1FAE5",
  warning: "#D97706",
  warningBg: "#FEF3C7",
  error: "#DC2626",
  errorBg: "#FEE2E2",
  info: "#2563EB",
  infoBg: "#DBEAFE",
  brandTint: "#E0E7FF",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export const shadow = {
  card: {
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fab: {
    shadowColor: "#1B3A5F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
};

export const statusColor = (s: string) => {
  const k = (s || "").toLowerCase();
  if (["completed", "paid", "approved", "fulfilled"].includes(k)) return { bg: theme.successBg, fg: theme.success };
  if (["pending", "unpaid", "draft"].includes(k)) return { bg: theme.warningBg, fg: theme.warning };
  if (["in_progress", "sent"].includes(k)) return { bg: theme.infoBg, fg: theme.info };
  if (["rejected", "cancelled"].includes(k)) return { bg: theme.errorBg, fg: theme.error };
  return { bg: theme.surface2, fg: theme.textMuted };
};

export const fmtAED = (n: number | string) => {
  const num = Number(n) || 0;
  return `AED ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB") : "-");
