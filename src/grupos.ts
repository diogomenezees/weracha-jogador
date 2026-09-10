import type { Grupo, PartidaResumo } from "@/contrato/tipos";
import {
  dentroDaJanelaDeCheckin,
  janelaDeCheckin,
  resolverDuracaoMin,
} from "@/partidas";

// Helpers de leitura sobre `Grupo`, espelhando weracha-site/lib/grupos.ts.
// A janela de check-in (30min antes, +10 depois) vem de src/partidas.ts.

function ordenar(partidas: PartidaResumo[]): PartidaResumo[] {
  return [...partidas].sort(
    (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
  );
}

export function buscarPartida(grupo: Grupo, partidaId: string): PartidaResumo | undefined {
  return grupo.partidas.find((p) => p.id === partidaId);
}

export function duracaoDaPartida(grupo: Grupo, partida: PartidaResumo): number {
  return resolverDuracaoMin(
    partida.duracaoMin,
    grupo.tipo,
    new Date(partida.data),
    grupo.horarios
  );
}

/** Partidas não canceladas dentro da janela de check-in agora. */
export function partidasEmAndamento(grupo: Grupo): PartidaResumo[] {
  return ordenar(
    grupo.partidas.filter(
      (p) =>
        !p.cancelada &&
        dentroDaJanelaDeCheckin(new Date(p.data), duracaoDaPartida(grupo, p))
    )
  );
}

/** Partidas cuja janela de check-in ainda não abriu (canceladas somem só quando
 * o horário todo passa). */
export function partidasFuturas(grupo: Grupo): PartidaResumo[] {
  const agora = Date.now();
  return ordenar(
    grupo.partidas.filter((p) => {
      const { abertura, fechamento } = janelaDeCheckin(
        new Date(p.data),
        duracaoDaPartida(grupo, p)
      );
      if (p.cancelada) return fechamento.getTime() > agora;
      return abertura.getTime() > agora;
    })
  );
}

/** Partidas cuja janela de check-in já fechou, da mais recente pra mais antiga. */
export function partidasPassadas(grupo: Grupo): PartidaResumo[] {
  const agora = Date.now();
  return ordenar(
    grupo.partidas.filter((p) => {
      const { fechamento } = janelaDeCheckin(new Date(p.data), duracaoDaPartida(grupo, p));
      return fechamento.getTime() < agora;
    })
  ).reverse();
}

/** Próxima partida não cancelada com janela ainda por abrir, ou null. */
export function proximaPartida(grupo: Grupo): PartidaResumo | null {
  return partidasFuturas(grupo).find((p) => !p.cancelada) ?? null;
}

/** Uma partida não cancelada em andamento agora, ou null. */
export function partidaEmAndamento(grupo: Grupo): PartidaResumo | null {
  return partidasEmAndamento(grupo)[0] ?? null;
}

/** A partida mais relevante agora (em andamento primeiro) + se o check-in dela
 * está aberto. Espelha `proximaPartidaInfo` do site. */
export function proximaPartidaInfo(
  grupo: Grupo
): { data: Date; checkinDisponivel: boolean } | null {
  const emAndamento = partidaEmAndamento(grupo);
  if (emAndamento) return { data: new Date(emAndamento.data), checkinDisponivel: true };
  const prox = proximaPartida(grupo);
  return prox ? { data: new Date(prox.data), checkinDisponivel: false } : null;
}

/** Grupo recorrente sem partida futura não cancelada nem em andamento. */
export function aguardandoRenovacao(grupo: Grupo): boolean {
  return (
    grupo.tipo === "RECORRENTE" &&
    partidasFuturas(grupo).filter((p) => !p.cancelada).length === 0 &&
    partidasEmAndamento(grupo).length === 0
  );
}

/** Grupo avulso sem próxima partida: só esperando combinarem a próxima data. */
export function avulsoAguardandoNovoJogo(grupo: Grupo): boolean {
  return grupo.tipo === "AVULSO" && proximaPartidaInfo(grupo) === null;
}

// Mês para o qual a renovação deve gerar partidas: o mês seguinte à competência
// atual do grupo, ou o mês corrente, o que vier depois.
export function mesDeRenovacao(
  grupo: Grupo,
  agora: Date = new Date()
): { ano: number; mes: number } {
  const indiceProximo = grupo.competenciaAno * 12 + grupo.competenciaMes + 1;
  const indiceAtual = agora.getFullYear() * 12 + agora.getMonth();
  const indiceAlvo = Math.max(indiceProximo, indiceAtual);
  return { ano: Math.floor(indiceAlvo / 12), mes: indiceAlvo % 12 };
}

export function ordenarPorProximaPartida(grupos: Grupo[]): Grupo[] {
  return [...grupos].sort((a, b) => {
    const da = proximaPartidaInfo(a)?.data;
    const db = proximaPartidaInfo(b)?.data;
    if (da && db) return da.getTime() - db.getTime();
    if (da) return -1;
    if (db) return 1;
    return a.nome.localeCompare(b.nome);
  });
}

export function meuPapelNoGrupo(grupo: Grupo, meuId: string): "DONO" | "ADMIN" | "MEMBRO" {
  if (grupo.adminId === meuId) return "DONO";
  return grupo.meuPapel;
}
