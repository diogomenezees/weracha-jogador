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

// Quantas horas antes do início o check-in abre é configuração do grupo
// (`grupo.checkinAbreHorasAntes`, tela Configurações do grupo). Espelha
// weracha-site/lib/partidas.ts. 24 é o padrão e o máximo.
export const CHECKIN_ABRE_HORAS_PADRAO = 24;
export const CHECKIN_ABRE_HORAS_OPCOES = [1, 2, 3, 6, 12, 24] as const;
const JANELA_CHECKIN_TOLERANCIA_DEPOIS_MIN = 10;

// Faixas das outras Configurações do grupo (o servidor valida de novo).
export const LIMITE_CHECKINS_MIN = 2;
export const LIMITE_CHECKINS_MAX = 200;
export const JOGADORES_POR_TIME_MAX = 20;

/** "1 hora" / "6 horas", pros textos "o check-in abre X antes". */
export function textoHorasAntes(horas: number): string {
  return horas === 1 ? "1 hora" : `${horas} horas`;
}

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

function fechamentoDoCheckin(dataPartida: Date, duracaoMin: number): Date {
  return new Date(
    dataPartida.getTime() + (duracaoMin + JANELA_CHECKIN_TOLERANCIA_DEPOIS_MIN) * 60_000
  );
}

export function janelaDeCheckin(
  dataPartida: Date,
  duracaoMin: number,
  horasAntes: number
): { abertura: Date; fechamento: Date } {
  return {
    abertura: new Date(dataPartida.getTime() - horasAntes * 60 * 60_000),
    fechamento: fechamentoDoCheckin(dataPartida, duracaoMin),
  };
}

export function dentroDaJanelaDeCheckin(
  dataPartida: Date,
  duracaoMin: number,
  horasAntes: number,
  agora: Date = new Date()
): boolean {
  const { abertura, fechamento } = janelaDeCheckin(dataPartida, duracaoMin, horasAntes);
  return agora.getTime() >= abertura.getTime() && agora.getTime() <= fechamento.getTime();
}

/** Não depende de quando o check-in abre, só do fim da partida + tolerância. */
export function partidaEncerrada(
  dataPartida: Date,
  duracaoMin: number,
  agora: Date = new Date()
): boolean {
  return agora.getTime() > fechamentoDoCheckin(dataPartida, duracaoMin).getTime();
}

/** Janela de check-in ainda não abriu (`horasAntes` antes do início). */
export function partidaAindaNaoComecou(
  dataPartida: Date,
  duracaoMin: number,
  horasAntes: number,
  agora: Date = new Date()
): boolean {
  return (
    agora.getTime() < janelaDeCheckin(dataPartida, duracaoMin, horasAntes).abertura.getTime()
  );
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

export function formatarDiaSemanaData(data: Date): string {
  const semana = DIAS_SEMANA[data.getDay()];
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${dia}/${mes}`;
}

// Formato reduzido pros badges de horário, ex.: "21/09 seg 12:00". Espelha
// `formatarPartidaResumo` do site (lib/partidas.ts), que usa 2 espaços porque o
// HTML colapsa; no RN o espaço duplo apareceria, então aqui é 1 só.
export function formatarPartidaResumo(data: Date): string {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const semana = DIAS_SEMANA[data.getDay()].slice(0, 3);
  return `${dia}/${mes} ${semana} ${formatarHora(data)}`;
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
