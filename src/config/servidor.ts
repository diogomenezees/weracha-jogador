import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";

// URL base da API, escolhida em runtime (não fixa no build), igual o We Racha
// Cam faz. A engrenagem da tela de login troca entre Local e Produção; o valor
// fica guardado no aparelho.
//
// Local (site rodando em `next dev` na porta 3000):
//  - Emulador Android: 10.0.2.2 é o localhost da máquina host.
//  - Simulador iOS / web: localhost.
//  - Celular físico no Expo Go: o IP da máquina de dev (mesmo que o Metro usa,
//    de `Constants.expoConfig.hostUri`), na mesma Wi-Fi. Sem precisar de
//    `adb reverse` nem digitar IP à mão.

export type Ambiente = "local" | "producao";

const CHAVE = "weracha.ambiente";

const LOCAL_EMULADOR_ANDROID = "http://10.0.2.2:3000";
const LOCAL_LOCALHOST = "http://localhost:3000";
const PRODUCAO = "https://weracha.app";

export const AMBIENTE_PADRAO: Ambiente = __DEV__ ? "local" : "producao";

// IP da máquina que roda o Metro, extraído do `hostUri` (ex.: "192.168.15.24:8081").
// É onde o `next dev` também está, já que rodam na mesma máquina.
function ipDaMaquinaDeDev(): string | null {
  const host = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const ip = host?.split(":")[0]?.trim();
  return ip && ip !== "localhost" && ip !== "127.0.0.1" ? ip : null;
}

export function urlBaseDoAmbiente(ambiente: Ambiente): string {
  if (ambiente === "producao") return PRODUCAO;

  // Celular físico: fala com o site na máquina de dev pelo IP da Wi-Fi.
  if (Device.isDevice) {
    const ip = ipDaMaquinaDeDev();
    if (ip) return `http://${ip}:3000`;
  }
  // Emulador Android: 10.0.2.2 encaminha pro localhost do host.
  if (Platform.OS === "android") return LOCAL_EMULADOR_ANDROID;
  // Simulador iOS / web.
  return LOCAL_LOCALHOST;
}

export function rotuloDoAmbiente(ambiente: Ambiente): string {
  return ambiente === "producao" ? "Produção" : "Local";
}

export async function lerAmbiente(): Promise<Ambiente> {
  try {
    const salvo = await SecureStore.getItemAsync(CHAVE);
    return salvo === "local" || salvo === "producao" ? salvo : AMBIENTE_PADRAO;
  } catch {
    return AMBIENTE_PADRAO;
  }
}

export async function guardarAmbiente(ambiente: Ambiente): Promise<void> {
  await SecureStore.setItemAsync(CHAVE, ambiente);
}
