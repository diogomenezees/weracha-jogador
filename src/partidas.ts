// Janela de check-in, duração e formatação de partida. Porta de
// weracha-site/lib/partidas.ts, mas SEM o fuso explícito America/Sao_Paulo: o
// site precisa dele porque o servidor roda em UTC; aqui o cliente é local por
// natureza (o jogador está no Brasil), então `new Date(iso)` + `getHours()` já
// dá a hora de parede certa. Mesmos números da janela (30min antes, +10 depois).

export const DIAS_SEMANA = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
] as const;

export function abreviarDiaSemana(diaSemana: number): string {
  const nome = DIAS_SEMANA[diaSemana] ?? "";
  return nome.charAt(0).toUpperCase() + nome.slice(1, 3);
}

export function nomeDoMes(mes: number): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2000, mes, 1));
}

/** Data local de hoje como "AAAA-MM-DD" (pro <input type=date> / picker). */
export function hojeISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export const JANELA_CHECKIN_ANTES_MIN = 30;
const JANELA_CHECKIN_TOLERANCIA_DEPOIS_MIN = 10;

/** Duração da partida: snapshot, ou recalculada do(s) horário(s) do grupo. */
export function resolverDuracaoMin(
  duracaoSnapshot: number | null,
  tipoGrupo: string,
  dataPartida: Date,
  horariosDoGrupo: { diaSemana: number | null; duracaoMin: number }[]
): number {
  if (duracaoSnapshot != null) return duracaoSnapshot;
  if (tipoGrupo === "AVULSO") return horariosDoGrupo[0]?.duracaoMin ?? 60;
  const diaSemana = dataPartida.getDay();
  const horario = horariosDoGrupo.find((h) => h.diaSemana === diaSemana);
  return horario?.duracaoMin ?? horariosDoGrupo[0]?.duracaoMin ?? 60;
}

export function janelaDeCheckin(
  dataPartida: Date,
  duracaoMin: number
): { abertura: Date; fechamento: Date } {
  return {
    abertura: new Date(dataPartida.getTime() - JANELA_CHECKIN_ANTES_MIN * 60_000),
    fechamento: new Date(
      dataPartida.getTime() + (duracaoMin + JANELA_CHECKIN_TOLERANCIA_DEPOIS_MIN) * 60_000
    ),
  };
}

export function dentroDaJanelaDeCheckin(
  dataPartida: Date,
  duracaoMin: number,
  agora: Date = new Date()
): boolean {
  const { abertura, fechamento } = janelaDeCheckin(dataPartida, duracaoMin);
  return agora.getTime() >= abertura.getTime() && agora.getTime() <= fechamento.getTime();
}

export function partidaEncerrada(
  dataPartida: Date,
  duracaoMin: number,
  agora: Date = new Date()
): boolean {
  return agora.getTime() > janelaDeCheckin(dataPartida, duracaoMin).fechamento.getTime();
}

/** Janela de check-in ainda não abriu (30min antes do início). */
export function partidaAindaNaoComecou(
  dataPartida: Date,
  duracaoMin: number,
  agora: Date = new Date()
): boolean {
  return agora.getTime() < janelaDeCheckin(dataPartida, duracaoMin).abertura.getTime();
}

// Depois desse prazo (contado do FIM da partida), o admin não pode mais
// corrigir/cancelar/migrar gol. Mesmo número do site (lib/partidas.ts).
export const PRAZO_EDICAO_GOLS_HORAS = 24;

export function dentroDoPrazoDeEdicaoDeGols(
  dataPartida: Date,
  duracaoMin: number,
  agora: Date = new Date()
): boolean {
  const fimPartida = dataPartida.getTime() + duracaoMin * 60_000;
  const prazo = fimPartida + PRAZO_EDICAO_GOLS_HORAS * 60 * 60_000;
  return agora.getTime() <= prazo;
}

// A partir desse prazo antes do início da próxima partida do grupo, a
// autoavaliação do próprio score fica bloqueada (o admin nunca é bloqueado).
// Mesmo número do site (lib/partidas.ts) — aqui só pro indício visual da tela
// de perfil; o servidor é quem recusa de verdade.
export const PRAZO_CONGELAMENTO_SCORE_HORAS = 1;

export function scoreCongelado(
  dataProximaPartida: Date | null | undefined,
  agora: Date = new Date()
): boolean {
  if (!dataProximaPartida) return false;
  return (
    agora.getTime() >=
    dataProximaPartida.getTime() - PRAZO_CONGELAMENTO_SCORE_HORAS * 60 * 60_000
  );
}

// Sugestão inicial de "jogadores por time" pra rachas com poucos check-ins:
// cresce junto com quem chegou (1 time por dupla) até o teto de 5.
// De weracha-site/lib/balanceamento.ts.
export function sugerirJogadoresPorTime(totalPresentes: number): number {
  return Math.min(5, Math.max(1, Math.floor(totalPresentes / 2)));
}

export function formatarDiaSemanaData(data: Date): string {
  const semana = DIAS_SEMANA[data.getDay()];
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${dia}/${mes}`;
}

export function formatarHora(data: Date): string {
  const hora = String(data.getHours()).padStart(2, "0");
  const min = String(data.getMinutes()).padStart(2, "0");
  return `${hora}:${min}`;
}

export function formatarContagemRegressiva(dataPartida: Date, agora: Date = new Date()): string {
  const diffMs = dataPartida.getTime() - agora.getTime();
  if (diffMs <= 0) return "É agora!";

  const totalMin = Math.floor(diffMs / 60_000);
  const dias = Math.floor(totalMin / (60 * 24));
  const horas = Math.floor((totalMin % (60 * 24)) / 60);
  const minutos = totalMin % 60;

  const partes: string[] = [];
  if (dias > 0) partes.push(`${dias} ${dias === 1 ? "dia" : "dias"}`);
  if (horas > 0) partes.push(`${horas} ${horas === 1 ? "hora" : "horas"}`);
  if (dias === 0 && horas === 0) {
    partes.push(`${minutos} ${minutos === 1 ? "minuto" : "minutos"}`);
  }
  return `Faltam ${partes.join(" e ")}`;
}
