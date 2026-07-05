import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from "@/src/auth";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "login";
    if (!user && !inAuth) router.replace("/login");
    else if (user && inAuth) router.replace("/(tabs)");
  }, [user, loading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F9FAFB" } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="doc-create" options={{ presentation: "modal" }} />
      <Stack.Screen name="doc-detail" />
      <Stack.Screen name="work-create" options={{ presentation: "modal" }} />
      <Stack.Screen name="work-detail" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="inventory-create" options={{ presentation: "modal" }} />
      <Stack.Screen name="purchases" />
      <Stack.Screen name="purchase-create" options={{ presentation: "modal" }} />
      <Stack.Screen name="expenses" />
      <Stack.Screen name="expense-create" options={{ presentation: "modal" }} />
      <Stack.Screen name="customers" />
      <Stack.Screen name="customer-create" options={{ presentation: "modal" }} />
      <Stack.Screen name="material-requests" />
      <Stack.Screen name="material-request-create" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();
  useEffect(() => { if (loaded || error) SplashScreen.hideAsync(); }, [loaded, error]);
  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <AuthGate />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
