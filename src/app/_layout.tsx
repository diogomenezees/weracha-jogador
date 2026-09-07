import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { SessaoProvider } from "@/sessao/contexto";

export default function RootLayout() {
  return (
    <SessaoProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="convite/[token]" />
        <Stack.Screen name="(logado)" />
      </Stack>
    </SessaoProvider>
  );
}
