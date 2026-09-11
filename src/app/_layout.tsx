import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  SpaceGrotesk_300Light,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { GeistMono_400Regular } from "@expo-google-fonts/geist-mono";

import { SessaoProvider } from "@/sessao/contexto";

// Segura o splash até as fontes carregarem (o site usa Space Grotesk em tudo e
// Geist Mono no eyebrow; ver src/ui/Texto.tsx).
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontesCarregadas] = useFonts({
    SpaceGrotesk_300Light,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    GeistMono_400Regular,
  });

  useEffect(() => {
    if (fontesCarregadas) void SplashScreen.hideAsync().catch(() => {});
  }, [fontesCarregadas]);

  if (!fontesCarregadas) return null;

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
