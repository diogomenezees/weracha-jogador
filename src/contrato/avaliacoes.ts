// Cópia de weracha-site/lib/avaliacoes.ts (constantes) + os tipos de
// weracha-site/lib/services/avaliacoes.ts (`EstadoAvaliacao` e afins).
// Avaliação pós-partida ("nota da galera"). Ver 16-api-v1.md e
// weracha-site/docs/especificacao/19-avaliacao-pos-partida.md.

// Abaixo disso a média de uma pessoa nunca vem da API (vem null). Era 3; desde
// 2026-11-10 é 1 (grupo pequeno nunca via nota nem craque).
export const MINIMO_AVALIACOES_PRA_MEDIA = 1;
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

// Uma linha do ranking das notas da galera (desde 2026-11-10): média recebida
// (sem a autoavaliação) e de quantos votos. `media` null = sem voto (fica no fim).
export type NotaNoRanking = JogadorEmPartida & { media: number | null; quantidade: number };

// GET /api/v1/partidas/{partidaId}/avaliacao
export type EstadoAvaliacao = {
  // Nome do grupo, pro cabeçalho da votação (desde 2026-11-07). Opcional: site antigo não manda.
  grupoNome?: string;
  // Meu id (o `avaliadoId` da autoavaliação).
  meuId: string;
  // Sempre true desde 2026-11-11 (a avaliação não desliga mais).
  ligada: boolean;
  // Posso abrir a tela "Notas da galera" (desde 2026-11-11): o grupo ligou
  // "Notas pós-partida" nas Configurações, ou sou admin. false = `ranking` null e
  // os cards do Resultado não levam pra lá. Site antigo não manda (trata como true).
  notasVisiveis?: boolean;
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
  // Quantos COLEGAS (sem mim) já votaram em alguém e quantos colegas jogaram. Pra quem
  // jogou, sempre; pra quem não jogou (desde 2026-11-10), durante a votação e depois de
  // fechar, contando o elenco inteiro (card "A galera está se avaliando" no Resultado).
  participacao?: { votaram: number; total: number } | null;
  // Só depois de encerrada e só se eu fui o craque; pros outros, sempre null.
  craqueDaGalera: CraqueDaGalera | null;
  // Craque da partida pra qualquer um do grupo (desde 2026-11-07), parcial durante a
  // votação. Só nome/foto. Opcional: site antigo não manda.
  craque?: CraqueDaPartida | null;
  // Ranking das notas da galera (desde 2026-11-10), pra qualquer um do grupo: todo o
  // elenco, maior média primeiro, sem voto no fim. Parcial durante a votação; null
  // antes de abrir. Opcional: site antigo não manda (tela trata como sem dados).
  ranking?: NotaNoRanking[] | null;
};

// POST /api/v1/partidas/{partidaId}/avaliacao
export type CorpoAvaliar = { avaliadoId: string; nota: number };
export type RespostaAvaliar = { ok: true; mediaGalera: number | null };
