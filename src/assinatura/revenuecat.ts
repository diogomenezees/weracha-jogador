import { Platform } from "react-native";
import Purchases, { PURCHASES_ERROR_CODE, type PurchasesPackage } from "react-native-purchases";

// Compra do Pro pelo RevenueCat (Google Play no Android, App Store no iPhone).
// Spec: weracha-site/docs/pendente/01-assinatura-pro.md.
//
// - A verdade sobre "tem Pro" é do site (que reconsulta o RevenueCat). Daqui só
//   sai a compra/restauração; depois a tela chama `POST /api/v1/assinatura/sincronizar`.
// - `app_user_id` = id do jogador (Purchases.logIn), nunca usuário anônimo.
// - Chaves públicas por plataforma em EXPO_PUBLIC_REVENUECAT_ANDROID / _IOS.
//   Em dev elas recebem a chave `test_` (Test Store do RevenueCat, em
//   .env.local, fora do git); build de loja recebe `goog_`/`appl_` pelas
//   variáveis do EAS. Nunca publicar build de loja com a `test_`.
// - No Expo Go o SDK roda em "Browser Mode" (sem módulo nativo) e, com a chave
//   `test_`, simula a compra: dá pra testar o fluxo inteiro sem build do EAS.

function chave(): string | undefined {
  const k =
    Platform.OS === "ios"
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID;
  return k?.trim() || undefined;
}

export function compraDisponivel(): boolean {
  return !!chave();
}

let configuradoPara: string | null = null;

// Chamado com a sessão aberta (layout logado). Idempotente.
export async function prepararRevenueCat(jogadorId: string): Promise<boolean> {
  const apiKey = chave();
  if (!apiKey) return false;
  try {
    if (configuradoPara === jogadorId) return true;
    if (!(await Purchases.isConfigured())) {
      Purchases.configure({ apiKey, appUserID: jogadorId });
    } else {
      await Purchases.logIn(jogadorId);
    }
    configuradoPara = jogadorId;
    return true;
  } catch (e) {
    console.warn("[revenuecat] falha ao preparar:", e);
    return false;
  }
}

// Logout do app: desvincula o jogador do SDK. Best-effort.
export async function encerrarRevenueCat(): Promise<void> {
  if (!configuradoPara) return;
  configuradoPara = null;
  try {
    await Purchases.logOut();
  } catch {
    // logOut de usuário anônimo lança; não importa no logout.
  }
}

// Pacote mensal da offering atual (preço vem da loja, nunca hardcoded).
export async function buscarPacotePro(): Promise<PurchasesPackage | null> {
  const ofertas = await Purchases.getOfferings();
  const atual = ofertas.current;
  return atual?.monthly ?? atual?.availablePackages[0] ?? null;
}

export type ResultadoCompra = "comprou" | "cancelou";

export async function comprarPro(pacote: PurchasesPackage): Promise<ResultadoCompra> {
  try {
    await Purchases.purchasePackage(pacote);
    return "comprou";
  } catch (e) {
    const erro = e as { userCancelled?: boolean; code?: string };
    if (erro.userCancelled || erro.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return "cancelou";
    }
    throw e;
  }
}

// "Restaurar compras" (exigido pela Apple). Depois a tela sincroniza com o site.
export async function restaurarCompras(): Promise<void> {
  await Purchases.restorePurchases();
}
