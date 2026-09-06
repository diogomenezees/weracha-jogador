import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// URL base da API, escolhida em runtime (não fixa no build), igual o We Racha
// Cam faz. A engrenagem da tela de login troca entre Local e Produção; o valor
// fica guardado no aparelho.
//
// Local (site rodando em `next dev` na porta 3000):
//  - Emulador Android: 10.0.2.2 é o localhost da máquina host.
//  - Simulador iOS / celular físico com `adb reverse tcp:3000 tcp:3000`: localhost.

export type Ambiente = "local" | "producao";

const CHAVE = "weracha.ambiente";

const LOCAL_ANDROID = "http://10.0.2.2:3000";
const LOCAL_OUTROS = "http://localhost:3000";
const PRODUCAO = "https://weracha.app";

export const AMBIENTE_PADRAO: Ambiente = __DEV__ ? "local" : "producao";

export function urlBaseDoAmbiente(ambiente: Ambiente): string {
  if (ambiente === "producao") return PRODUCAO;
  return Platform.OS === "android" ? LOCAL_ANDROID : LOCAL_OUTROS;
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
