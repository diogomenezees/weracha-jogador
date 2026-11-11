// Regras do pedido de avaliação na loja (puras, sem I/O, testadas em
// src/avaliacao/__tests__). Quem chama é `pedirAvaliacaoSePuder` em ./pedirAvaliacao.ts.
//
// A loja NÃO conta se a pessoa avaliou nem se o pedido apareceu (Google e Apple
// escondem de propósito). Então quem já avaliou é protegido pela cota do próprio
// sistema (iOS: 3 por ano; Play: cota não divulgada) e estas travas garantem que o
// app não peça demais por conta própria.

const DIA_MS = 24 * 60 * 60 * 1000;

/** Só depois de uma semana usando o app (contada a partir da 1ª abertura logada neste aparelho). */
export const USO_MINIMO_MS = 7 * DIA_MS;
/** Intervalo mínimo entre dois pedidos, qualquer que seja o gatilho. */
export const INTERVALO_MS = 90 * DIA_MS;
/** Depois disso o app para de pedir neste aparelho, pra sempre. */
export const MAXIMO_PEDIDOS = 3;
/**
 * Janela em que a partida pode ainda estar rolando, contada do início dela (ou do
 * replay, quando não se sabe o início). Dentro dela não pede: avaliação é coisa de
 * depois do jogo, nunca no meio.
 */
export const JANELA_PARTIDA_MS = 3 * 60 * 60 * 1000;

export type MotivoAvaliacao = "notas-enviadas" | "replay-baixado" | "replay-favoritado";

export type HistoricoAvaliacao = {
  /** ISO da 1ª abertura logada do app neste aparelho. */
  primeiroUsoEm: string | null;
  /** ISO de cada pedido feito, do mais antigo pro mais novo. */
  pedidos: string[];
};

export const HISTORICO_VAZIO: HistoricoAvaliacao = { primeiroUsoEm: null, pedidos: [] };

export function podePedir(h: HistoricoAvaliacao, agora: number): boolean {
  if (!h.primeiroUsoEm) return false;
  const primeiroUso = Date.parse(h.primeiroUsoEm);
  if (Number.isNaN(primeiroUso) || agora - primeiroUso < USO_MINIMO_MS) return false;
  if (h.pedidos.length >= MAXIMO_PEDIDOS) return false;
  const ultimo = h.pedidos.length ? Date.parse(h.pedidos[h.pedidos.length - 1]) : NaN;
  if (!Number.isNaN(ultimo) && agora - ultimo < INTERVALO_MS) return false;
  return true;
}

/** `true` quando já passou a janela da partida (ver JANELA_PARTIDA_MS). */
export function depoisDaPartida(inicioIso: string, agora: number = Date.now()): boolean {
  const inicio = Date.parse(inicioIso);
  return !Number.isNaN(inicio) && agora - inicio >= JANELA_PARTIDA_MS;
}

/** Lê o histórico guardado, tolerando lixo (volta vazio). */
export function lerHistorico(bruto: string | null): HistoricoAvaliacao {
  if (!bruto) return HISTORICO_VAZIO;
  try {
    const v = JSON.parse(bruto) as Partial<HistoricoAvaliacao>;
    return {
      primeiroUsoEm: typeof v.primeiroUsoEm === "string" ? v.primeiroUsoEm : null,
      pedidos: Array.isArray(v.pedidos) ? v.pedidos.filter((p) => typeof p === "string") : [],
    };
  } catch {
    return HISTORICO_VAZIO;
  }
}
