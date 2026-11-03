import * as SecureStore from "expo-secure-store";

// Última versão mínima que travou este aparelho. Guardada pra trava valer já no
// boot seguinte, antes (ou sem) resposta do site: fechar e abrir o app, ou abrir
// sem rede, não pode virar um jeito de passar pela tela "Atualize". Some quando o
// site responde que a versão atual está liberada. Não sai no logout.
const CHAVE = "weracha.versaoMinimaTravada";

export async function lerTravaGuardada(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CHAVE);
  } catch {
    return null;
  }
}

export async function guardarTrava(versaoMinima: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(CHAVE, versaoMinima);
  } catch {
    // Pior caso: no próximo boot a trava espera a resposta do site.
  }
}

export async function apagarTrava(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CHAVE);
  } catch {
    // Sem efeito prático: abaixoDaMinima já não trava quem atualizou.
  }
}
