import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";
import Constants from "expo-constants";
import * as Device from "expo-device";

import type { TokenPush } from "@/api/push";

// Push notifications (Expo Push; o site manda, ver weracha-site/lib/services/push.ts).
//
// `expo-notifications` é carregado sob demanda e NUNCA no Expo Go: lá o push
// remoto não existe no Android desde o SDK 53, e só importar o módulo já cospe
// avisos amarelos. No Expo Go tudo aqui vira no-op e o app segue igual; push só
// funciona em build de verdade (EAS).

type ModuloNotificacoes = typeof import("expo-notifications");

let carregando: Promise<ModuloNotificacoes | null> | null = null;

export function carregarNotificacoes(): Promise<ModuloNotificacoes | null> {
  if (!carregando) {
    carregando = isRunningInExpoGo()
      ? Promise.resolve(null)
      : import("expo-notifications").then((N) => {
          // Com o app aberto, a notificação também aparece (banner + som). Sem
          // isso o sistema engole a notificação quando o app está em primeiro plano.
          N.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowBanner: true,
              shouldShowList: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
            }),
          });
          return N;
        });
  }
  return carregando;
}

// Token registrado no site nesta sessão do app, pro `sair` saber qual apagar.
let tokenRegistrado: string | null = null;

export function tokenPushRegistrado(): string | null {
  return tokenRegistrado;
}

export function marcarTokenPushRegistrado(token: string | null): void {
  tokenRegistrado = token;
}

// Pede permissão (se ainda dá pra pedir) e devolve o token Expo Push deste
// aparelho, ou null quando não tem como receber push: Expo Go, emulador sem
// Google Play, permissão negada, ou erro do Expo. Nunca lança.
export async function obterTokenPush(): Promise<TokenPush | null> {
  try {
    const N = await carregarNotificacoes();
    if (!N || !Device.isDevice) return null;

    if (Platform.OS === "android") {
      // Canal padrão (Android 8+). O site manda sem `channelId`, que cai aqui.
      await N.setNotificationChannelAsync("default", {
        name: "Avisos do grupo",
        importance: N.AndroidImportance.HIGH,
      });
    }

    // Android 13+ e iOS mostram o pedido do sistema. Se a pessoa já negou de
    // vez (`canAskAgain` falso), o sistema nem mostra mais: só segue sem push.
    let permissao = await N.getPermissionsAsync();
    if (!permissao.granted && permissao.canAskAgain) {
      permissao = await N.requestPermissionsAsync();
    }
    if (!permissao.granted) return null;

    const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId;
    const { data } = await N.getExpoPushTokenAsync({ projectId });
    return { token: data, plataforma: Platform.OS === "ios" ? "ios" : "android" };
  } catch {
    return null;
  }
}
