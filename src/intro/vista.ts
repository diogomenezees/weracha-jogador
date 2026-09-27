import * as SecureStore from "expo-secure-store";

// Flag "já viu a intro de antes do login". Fica no aparelho e NÃO sai no logout
// (não está em `limparSessao`): a intro é apresentação do app, aparece uma vez só.
// Quem entra (por qualquer caminho, inclusive link de convite, que nem passa pela
// intro) também fica marcado, pra não ver a intro depois de um logout.
const CHAVE = "weracha.introVista";

export async function jaViuIntro(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(CHAVE)) === "1";
  } catch {
    // Sem como ler: não prende ninguém na intro.
    return true;
  }
}

export async function marcarIntroVista(): Promise<void> {
  try {
    await SecureStore.setItemAsync(CHAVE, "1");
  } catch {
    // Pior caso: a intro aparece de novo. Não trava o fluxo.
  }
}
