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
  // Média dos OUTROS votos (sem o meu). Só depois do meu voto e com o mínimo.
  mediaGalera: number | null;
};

export type CraqueDaGalera = JogadorEmPartida & { media: number; quantidade: number };

// GET /api/v1/partidas/{partidaId}/avaliacao
export type EstadoAvaliacao = {
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
  // Só depois de encerrada e só se eu fui o craque; pros outros, sempre null.
  craqueDaGalera: CraqueDaGalera | null;
};

// POST /api/v1/partidas/{partidaId}/avaliacao
export type CorpoAvaliar = { avaliadoId: string; nota: number };
export type RespostaAvaliar = { ok: true; mediaGalera: number | null };
