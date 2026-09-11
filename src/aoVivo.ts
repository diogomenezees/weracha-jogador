// Cronômetro da tela "Ao vivo". Porte literal de weracha-site/lib/aoVivo.ts —
// a lógica não muda: `atualizadoEm` é um instante absoluto (ISO), então a conta
// de "quanto passou" vale igual no cliente.

import type { EstadoAoVivo } from "@/contrato/tipos";

// Resetar sempre volta o cronômetro pra duração cheia — se ainda havia tempo
// sobrando, resetar na prática AUMENTA o tempo de jogo (por isso a confirmação
// na tela). Só existe trava quando o grupo configurou uma meta de gols pra
// encerrar antes: aí exige pelo menos 1 gol na rodada ou o tempo já zerado.
export function podeResetarRodada(
  golsNaRodada: number,
  golsParaEncerrar: number,
  segundosRestantes: number
): boolean {
  if (golsParaEncerrar === 0) return true;
  return golsNaRodada > 0 || segundosRestantes <= 0;
}

// Cronômetro autoritativo no servidor: enquanto RODANDO, o tempo restante real
// é derivado de "quanto passou desde a última mudança de estado", nunca de uma
// contagem local — mantém todos os aparelhos sincronizados. Não trava em zero
// de propósito: negativo mostra quanto já passou do previsto.
export function segundosRestantesAgora(
  estado: Pick<EstadoAoVivo, "status" | "segundosRestantes" | "atualizadoEm">,
  agora: Date
): number {
  if (estado.status !== "RODANDO") return estado.segundosRestantes;
  const decorrido = Math.floor(
    (agora.getTime() - new Date(estado.atualizadoEm).getTime()) / 1000
  );
  return estado.segundosRestantes - decorrido;
}

// Segundos negativos viram "-MM:SS" — tempo extra já jogado além do previsto.
export function formatarMMSS(segundos: number): string {
  const negativo = segundos < 0;
  const s = Math.floor(Math.abs(segundos));
  const min = Math.floor(s / 60);
  const sec = s % 60;
  return `${negativo ? "-" : ""}${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
