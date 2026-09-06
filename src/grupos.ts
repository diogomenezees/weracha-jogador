import type { Grupo, PartidaResumo } from "@/contrato/tipos";

// Helpers de leitura sobre `Grupo`. Versão simplificada do que
// weracha-site/lib/grupos.ts faz: pra uma lista read-only não precisa da precisão
// da janela de check-in (abertura 30min antes, tolerância depois). Quando a
// tela de check-in de verdade entrar, aí sim vale copiar `janelaDeCheckin`.

/** Próxima partida não cancelada com horário no futuro, ou null. */
export function proximaPartida(grupo: Grupo): PartidaResumo | null {
  const agora = Date.now();
  const futuras = grupo.partidas
    .filter((p) => !p.cancelada && new Date(p.data).getTime() > agora)
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  return futuras[0] ?? null;
}

/** Grupo recorrente sem nenhuma partida futura marcada: esperando renovação. */
export function esperandoNovaData(grupo: Grupo): boolean {
  return proximaPartida(grupo) === null;
}

export function ordenarPorProximaPartida(grupos: Grupo[]): Grupo[] {
  return [...grupos].sort((a, b) => {
    const da = proximaPartida(a)?.data;
    const db = proximaPartida(b)?.data;
    if (da && db) return new Date(da).getTime() - new Date(db).getTime();
    if (da) return -1;
    if (db) return 1;
    return a.nome.localeCompare(b.nome);
  });
}

export function meuPapelNoGrupo(grupo: Grupo, meuId: string): "DONO" | "ADMIN" | "MEMBRO" {
  if (grupo.adminId === meuId) return "DONO";
  return grupo.meuPapel;
}
