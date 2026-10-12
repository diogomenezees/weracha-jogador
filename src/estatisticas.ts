// Cálculos puros de "Meus indicadores". Cópia das funções de
// weracha-site/lib/estatisticas.ts: a tela recalcula tudo no aparelho a cada
// troca de filtro (grupo/mês), sem voltar ao servidor.

import { CHAVE_GERAL, type JogoDoJogador } from "@/contrato/tipos";

// Mínimo de jogos pra comparar "últimos jogos" com a média geral.
export const JOGOS_NA_TENDENCIA = 5;

export function filtrarJogos(
  jogos: JogoDoJogador[],
  filtro: { grupoId: string | null; periodo: string }
): JogoDoJogador[] {
  return jogos.filter(
    (j) =>
      (!filtro.grupoId || j.grupoId === filtro.grupoId) &&
      (filtro.periodo === CHAVE_GERAL || j.mes === filtro.periodo)
  );
}

export function media(jogos: { gols: number }[]): number {
  if (jogos.length === 0) return 0;
  return jogos.reduce((s, j) => s + j.gols, 0) / jogos.length;
}

// Seta da média: compara os jogos "recentes" com a base. No Geral, recentes =
// últimos JOGOS_NA_TENDENCIA e base = todos os jogos; num mês, recentes = os do
// mês e base = todos (mesmo grupo). null quando não dá pra comparar.
export function tendencia(
  recentes: JogoDoJogador[],
  base: JogoDoJogador[]
): { atual: number; base: number; diferenca: number } | null {
  if (recentes.length === 0 || base.length <= recentes.length) return null;
  const atual = media(recentes);
  const mediaBase = media(base);
  return { atual, base: mediaBase, diferenca: atual - mediaBase };
}

export function tendenciaGeral(jogos: JogoDoJogador[]) {
  if (jogos.length <= JOGOS_NA_TENDENCIA) return null;
  return tendencia(jogos.slice(-JOGOS_NA_TENDENCIA), jogos);
}

// Situação agora: marcando há N jogos seguidos, ou N jogos sem marcar.
export function sequenciaAtual(
  jogos: JogoDoJogador[]
): { tipo: "MARCANDO" | "JEJUM"; jogos: number } | null {
  const ultimo = jogos.at(-1);
  if (!ultimo) return null;
  const marcando = ultimo.gols > 0;
  let n = 0;
  for (let i = jogos.length - 1; i >= 0 && jogos[i].gols > 0 === marcando; i--) n++;
  return { tipo: marcando ? "MARCANDO" : "JEJUM", jogos: n };
}

export function recordeDeSequencia(jogos: JogoDoJogador[]): number {
  let recorde = 0;
  let atual = 0;
  for (const j of jogos) {
    atual = j.gols > 0 ? atual + 1 : 0;
    recorde = Math.max(recorde, atual);
  }
  return recorde;
}

// Mais gols numa partida (empate: a mais recente).
export function noiteHistorica(jogos: JogoDoJogador[]): JogoDoJogador | null {
  let melhor: JogoDoJogador | null = null;
  for (const j of jogos) if (j.gols > 0 && (!melhor || j.gols >= melhor.gols)) melhor = j;
  return melhor;
}

export function formatarMedia(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}
