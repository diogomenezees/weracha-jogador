import type {
  CheckIn,
  JogadorEmPartida,
  MembroGrupo,
  PosicaoEsporteCompleta,
  ResultadoSalvo,
} from "@/contrato/tipos";

// Porte de `montarResultado` de weracha-site/lib/actions/telaResultado.ts.
// O site faz isso numa Server Action (`dadosDaTelaResultado`); o app não tem
// endpoint agregado equivalente, então monta a partir de `resultado` +
// `checkins` + `membros` + `posicoes` + `jogadores` que já vêm de outras rotas.

export type JogadorNoTime = {
  jogadorId: string;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
  posicaoNome: string | null;
  score: number;
};

export type ResultadoMontado = {
  times: JogadorNoTime[][];
  proximos: JogadorNoTime[];
  comecaComABola: number | null;
  ladoDireito: number | null;
  coresTimes: (string | null)[];
};

export function montarResultado(
  salvo: ResultadoSalvo,
  checkins: CheckIn[],
  membros: MembroGrupo[],
  posicoes: PosicaoEsporteCompleta[],
  jogadores: JogadorEmPartida[]
): ResultadoMontado {
  const idsAlocados = new Set(salvo.times.flat());
  const jogadorPorId = new Map(jogadores.map((j) => [j.id, j]));
  const scorePorId = new Map(checkins.map((c) => [c.jogadorId, c.scoreNoCheckin ?? 50]));
  const posicaoNomePorId = new Map(posicoes.map((p) => [p.id, p.nome]));
  const posicaoIdPorJogadorId = new Map(membros.map((m) => [m.jogadorId, m.posicaoId]));

  function resolver(jogadorId: string): JogadorNoTime {
    const j = jogadorPorId.get(jogadorId);
    const posicaoId = posicaoIdPorJogadorId.get(jogadorId) ?? null;
    return {
      jogadorId,
      nome: j?.nome ?? "Ex-jogador",
      apelido: j?.apelido ?? null,
      fotoUrl: j?.fotoUrl ?? null,
      posicaoNome: posicaoId ? (posicaoNomePorId.get(posicaoId) ?? null) : null,
      score: scorePorId.get(jogadorId) ?? 50,
    };
  }

  const times = salvo.times.map((ids) => ids.map(resolver));
  const proximos = checkins
    .filter((c) => !idsAlocados.has(c.jogadorId))
    .filter((c) => jogadorPorId.has(c.jogadorId))
    .map((c) => resolver(c.jogadorId));

  return {
    times,
    proximos,
    comecaComABola: salvo.comecaComABola,
    ladoDireito: salvo.ladoDireito,
    coresTimes: salvo.coresTimes ?? [],
  };
}
