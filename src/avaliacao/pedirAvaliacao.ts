import * as SecureStore from "expo-secure-store";
import * as StoreReview from "expo-store-review";

import { lerHistorico, podePedir, type HistoricoAvaliacao, type MotivoAvaliacao } from "./regras";

// Pedido de avaliação na loja (expo-store-review: In-App Review da Play / SKStoreReview
// no iOS), disparado só em momentos felizes DEPOIS do jogo: notas pós-partida enviadas,
// replay baixado e replay favoritado. Regras em ./regras.ts.
//
// Nunca perguntar "está curtindo?" antes nem pôr isto atrás de um botão: as lojas
// proíbem filtrar quem vai avaliar, e o pedido pode não abrir nada (cota do sistema).
//
// Só aparece de verdade em build de loja: no Android exige app instalado pela Play
// (teste interno serve); no iOS o TestFlight nunca mostra. No Expo Go/dev, testar a
// lógica pelo log `[avaliacao]`.
//
// Fica no aparelho e NÃO sai no logout (não está em `limparSessao`): é do aparelho, e
// a cota da loja também é por conta da loja, não por conta do We Racha.
const CHAVE = "weracha.avaliacaoLoja";

let jaPediuNestaSessao = false;

async function ler(): Promise<HistoricoAvaliacao> {
  try {
    return lerHistorico(await SecureStore.getItemAsync(CHAVE));
  } catch {
    return lerHistorico(null);
  }
}

async function gravar(h: HistoricoAvaliacao): Promise<void> {
  try {
    await SecureStore.setItemAsync(CHAVE, JSON.stringify(h));
  } catch {
    // Pior caso: conta o uso de novo / pode pedir de novo. A cota da loja segura.
  }
}

/** Marca a 1ª abertura logada (início da contagem do uso mínimo). Idempotente. */
export async function registrarPrimeiroUso(): Promise<void> {
  const h = await ler();
  if (h.primeiroUsoEm) return;
  await gravar({ ...h, primeiroUsoEm: new Date().toISOString() });
}

/**
 * Pede a avaliação se as travas deixarem, depois de `atrasoMs` (pra não cobrir o
 * feedback do que a pessoa acabou de fazer). Nunca lança, e não faz nada em web.
 */
export function pedirAvaliacaoSePuder(motivo: MotivoAvaliacao, atrasoMs = 1500): void {
  void (async () => {
    try {
      if (jaPediuNestaSessao) return;
      const h = await ler();
      const agora = Date.now();
      if (!podePedir(h, agora)) {
        if (__DEV__) console.log(`[avaliacao] ${motivo}: travado`, h);
        return;
      }
      if (!(await StoreReview.isAvailableAsync())) {
        if (__DEV__) console.log(`[avaliacao] ${motivo}: indisponível neste aparelho`);
        return;
      }
      // Conta antes de abrir: dois gatilhos quase juntos não pedem duas vezes.
      jaPediuNestaSessao = true;
      await gravar({ ...h, pedidos: [...h.pedidos, new Date(agora).toISOString()] });
      if (__DEV__) console.log(`[avaliacao] ${motivo}: pedindo`);
      setTimeout(() => {
        StoreReview.requestReview().catch(() => {});
      }, atrasoMs);
    } catch {
      // Avaliação nunca atrapalha o fluxo.
    }
  })();
}
