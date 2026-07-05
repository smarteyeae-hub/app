import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/src/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.navy,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: "#fff", borderTopColor: theme.border, paddingTop: 4, height: 62, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="documents" options={{ title: "Documents", tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} /> }} />
      <Tabs.Screen name="work" options={{ title: "Work", tabBarIcon: ({ color, size }) => <Ionicons name="briefcase" size={size} color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} /> }} />
    </Tabs>
  );
}
