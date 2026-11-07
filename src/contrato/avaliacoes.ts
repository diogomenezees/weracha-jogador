// Cópia de weracha-site/lib/avaliacoes.ts (constantes) + os tipos de
// weracha-site/lib/services/avaliacoes.ts (`EstadoAvaliacao` e afins).
// Avaliação pós-partida ("nota da galera"). Ver 16-api-v1.md e
// weracha-site/docs/especificacao/19-avaliacao-pos-partida.md.

// Abaixo disso a média de uma pessoa nunca vem da API (vem null).
export const MINIMO_AVALIACOES_PRA_MEDIA = 3;
export const JANELA_AVALIACAO_HORAS = 48;
export const NOTA_MIN = 0;
export const NOTA_MAX = 100;

type JogadorEmPartida = {
  id: string;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
};

export type AvaliadoDaPartida = JogadorEmPartida & {
  // Meu voto nesse colega (null = ainda não votei).
  minhaNota: number | null;
  // Sempre null desde 2026-11-07 (entregava a média de cada colega).
  mediaGalera: number | null;
};

export type CraqueDaGalera = JogadorEmPartida & { media: number; quantidade: number };

// Craque público (desde 2026-11-07): só quem é, sem nota. `parcial` = votação aberta.
export type CraqueDaPartida = JogadorEmPartida & { parcial: boolean };

// GET /api/v1/partidas/{partidaId}/avaliacao
export type EstadoAvaliacao = {
  // Nome do grupo, pro cabeçalho da votação (desde 2026-11-07). Opcional: site antigo não manda.
  grupoNome?: string;
  // Meu id (o `avaliadoId` da autoavaliação).
  meuId: string;
  ligada: boolean;
  temSorteio: boolean;
  aberta: boolean;
  encerrada: boolean;
  abreEm: string;
  fechaEm: string;
  souJogador: boolean;
  // Em ordem alfabética; a tela embaralha.
  avaliados: AvaliadoDaPartida[];
  minhaAutoavaliacao: number | null;
  // Só depois de encerrada. `media` null = poucas avaliações (o card não aparece).
  minhaNota: { media: number | null; quantidade: number } | null;
  // Parcial da minha nota enquanto a votação está aberta (desde 2026-11-06), só
  // pra quem jogou; `media` null abaixo do mínimo. Opcional: site antigo não manda.
  minhaNotaParcial?: { media: number | null; quantidade: number } | null;
  // Quantos COLEGAS (sem mim) já votaram em alguém e quantos colegas jogaram. Só pra quem jogou.
  participacao?: { votaram: number; total: number } | null;
  // Só depois de encerrada e só se eu fui o craque; pros outros, sempre null.
  craqueDaGalera: CraqueDaGalera | null;
  // Craque da partida pra qualquer um do grupo (desde 2026-11-07), parcial durante a
  // votação. Só nome/foto. Opcional: site antigo não manda.
  craque?: CraqueDaPartida | null;
};

// POST /api/v1/partidas/{partidaId}/avaliacao
export type CorpoAvaliar = { avaliadoId: string; nota: number };
export type RespostaAvaliar = { ok: true; mediaGalera: number | null };
