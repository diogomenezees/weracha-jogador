import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Sentry from "@sentry/react-native";
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
import { PortaoDeVersao } from "@/versao/PortaoDeVersao";
import { BlurTargetProvider } from "@/ui/BlurTarget";
import { DialogosProvider } from "@/ui/Dialogos";
import { cores } from "@/tema";

// Segura o splash até as fontes carregarem (o site usa Space Grotesk em tudo e
// Geist Mono no eyebrow; ver src/ui/Texto.tsx).
void SplashScreen.preventAutoHideAsync();

// Relatório de falhas. Só liga em build de release (no Expo Go/dev o erro já aparece no
// Metro) e só quando o DSN existe (vem do EAS, nunca do código). Nada de dado pessoal:
// sem `setUser`, sem PII padrão e sem corpo de requisição, porque telefone e nome não
// podem sair do aparelho (ver o Data safety da Play).
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !__DEV__ && !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend(evento) {
    if (evento.request) {
      delete evento.request.data;
      delete evento.request.cookies;
      delete evento.request.headers;
    }
    if (evento.user) evento.user = { id: evento.user.id };
    return evento;
  },
});

function RootLayout() {
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
    <BlurTargetProvider>
      <SessaoProvider>
        <DialogosProvider>
        <StatusBar style="auto" />
        <PortaoDeVersao>
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: cores.dark } }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="convite/[token]" />
            <Stack.Screen name="(logado)" />
          </Stack>
        </PortaoDeVersao>
        </DialogosProvider>
      </SessaoProvider>
    </BlurTargetProvider>
  );
}

export default Sentry.wrap(RootLayout);
