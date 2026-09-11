import type { Href } from "expo-router";

// Quando o login veio de um convite (`src/app/convite/[token].tsx` guardou o
// token), `useFluxoAcesso.concluirLogin` processa o convite e guarda aqui pra
// onde a `TelaAcesso` deve mandar em vez do `/painel`. Estado de módulo, não
// persistente, consumido uma vez. Mesmo padrão do convitePendente.ts ao lado.

let destino: Href | null = null;

export function guardarDestinoPosLogin(d: Href): void {
  destino = d;
}

export function consumirDestinoPosLogin(): Href | null {
  const d = destino;
  destino = null;
  return d;
}
