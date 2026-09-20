// ─────────────────────────────────────────────────────────────────────────────
// CONTRATO COPIADO DO SITE — Nível 1. Fonte: weracha-site/docs/especificacao/16-api-v1.md
// (§2 formato de erro, §4 autenticação) + weracha-site/app/api/v1/**.
// Só os tipos que o app consome hoje. Cresce conforme cada tela entra.
// ─────────────────────────────────────────────────────────────────────────────

import type { CodigoErro } from "./codigos-erro";

/** Corpo de TODA resposta de falha de `/api/v1/*` (16-api-v1.md §2). */
export type RespostaErro = {
  /** Enum estável. É nisso que o app decide a mensagem/idioma, nunca em `mensagem`. */
  codigo: CodigoErro;
  /** Texto em PT-BR. Só debug/telemetria/fallback. */
  mensagem: string;
  /** Valor dinâmico que antes ficava preso dentro do texto (prazos, contagens, nomes). */
  detalhe?: Record<string, unknown>;
};

/** Jogador logado, como vem no login (`POST /auth/token`). Espelha o DTO
 * `JogadorEmPartida` + telefone. Subconjunto de `MeuPerfil`. */
export type JogadorSessao = {
  id: string;
  telefone: string;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
};

/** GET /api/v1/me — perfil do jogador autenticado. Cópia literal do shape de
 * `colunasMeuPerfil` em weracha-site/lib/jogadoresSeguro.ts. Sem credencial. */
export type MeuPerfil = {
  id: string;
  telefone: string;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
  /** ISO, ou null se nunca concluiu/pulou o onboarding. Decide o rodapé do /painel. */
  onboardingConcluidoEm: string | null;
  email: string | null;
  emailNotificacoes: boolean;
  /** "AAAA-MM-DD" ou null. */
  dataNascimento: string | null;
};

/** GET /api/v1/conta/exclusao — pendências + solicitação de exclusão pendente.
 * Cópia de `DadosDaTelaExclusaoConta` em
 * weracha-site/lib/services/exclusaoConta.ts. */
export type DadosDaTelaExclusaoConta = {
  pendencias: { grupos: { id: string; nome: string }[] };
  solicitacaoPendente: { criadoEm: string } | null;
};

// ── Fluxo de acesso pré-login (16-api-v1.md §4) ─────────────────────────────
// Copiado de weracha-site/lib/auth-tipos.ts. Todas as rotas abaixo são
// `rotaApiPublica` com `csrf: false` (o app chama antes de ter Bearer).

// POST /api/v1/auth/telefone/status — o que pedir a seguir pra esse telefone.
// Sem o nome do dono de propósito (evita oráculo de "de quem é esse número").
export type StatusTelefone =
  | { estado: "novo" }
  | { estado: "sem_senha"; validado: boolean }
  | { estado: "com_senha"; validado: boolean; precisaAssinarTermos: boolean };

// Sucesso das rotas que disparam SMS (telefone/codigo, senha/recuperar). Fora de
// produção o site simula o SMS: `simulado` vem true e `mensagemSimulada` traz o
// texto com o código (pra testar contra o site Local sem SMS real).
export type EnvioCodigoSms = {
  proximoCooldownSeg: number;
  simulado: boolean;
  mensagemSimulada?: string;
};

// POST /api/v1/auth/telefone/codigo
export type EnviarCodigoTelefoneRequest = { telefone: string; nome?: string };
// POST /api/v1/auth/telefone/confirmar
export type ConfirmarCodigoRequest = { telefone: string; codigo: string };
// POST /api/v1/auth/senha/recuperar
export type RecuperarSenhaRequest = { telefone: string };
// POST /api/v1/auth/senha/definir — cria a 1ª senha (conta sem senha + telefone
// já validado; `codigo` dispensado) ou redefine (conta com senha; `codigo` do
// SMS de senha/recuperar obrigatório). Nunca faz Set-Cookie.
export type DefinirSenhaRequest = { telefone: string; senha: string; codigo?: string };

// ── GET /api/v1/termos/status ──────────────────────────────────────────────
export type StatusTermos = { precisaAssinar: boolean; versaoAtual: number };

// ── Convites (16-api-v1.md §6) ─────────────────────────────────────────────
// Copiado de weracha-site/lib/services/convites.ts.
// GET /api/v1/convites/{token} — público (a tela de convite abre deslogado).
export type ConvitePublico = {
  token: string;
  grupoId: string;
  grupoNome: string;
  partidaId: string | null;
  enqueteId: string | null;
};
// POST /api/v1/convites/{token} — autenticado (o app chama logo após o login).
// `destino` é um caminho do site (/grupos/{id}, .../partidas/{id}/checkin,
// .../enquetes?enquete={id}); as rotas do app têm o mesmo formato. Ver rotaDoConvite
// em src/convites.ts.
export type ResultadoConvite = {
  ok: true;
  grupoId: string;
  destino: string;
  jaEraMembro: boolean;
};

// ── POST /api/v1/auth/token ─────────────────────────────────────────────────
// Login por telefone/senha pra cliente Bearer. NÃO cria conta nem senha.

export type LoginRequest = {
  telefone: string;
  senha: string;
  /** Rótulo do aparelho pra futura tela "meus aparelhos" (ex.: "iPhone do Diogo"). */
  nomeDispositivo?: string;
};

export type LoginResposta = {
  /** Valor cru do Bearer. Guardar; o servidor só tem o sha256. Expira em 10 dias deslizantes. */
  token: string;
  jogador: JogadorSessao;
};

// ── GET /api/v1/grupos ──────────────────────────────────────────────────────
// Grupos do jogador logado. Espelha `Grupo` de weracha-site/lib/actions/grupos.ts.

export type TipoGrupo = "RECORRENTE" | "AVULSO";
export type PapelGrupo = "ADMIN" | "MEMBRO";

export type PartidaResumo = {
  id: string;
  /** ISO. */
  data: string;
  duracaoMin: number | null;
  cancelada: boolean;
  descricao: string | null;
};

export type HorarioGrupo = {
  id: string;
  diaSemana: number | null;
  horaInicio: string;
  duracaoMin: number;
};

export type Grupo = {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: TipoGrupo;
  dataAvulsa: string | null;
  horarios: HorarioGrupo[];
  esporte: string;
  quadraId: string | null;
  jogadoresPorTime: number;
  adminId: string;
  competenciaAno: number;
  competenciaMes: number;
  partidas: PartidaResumo[];
  meuPapel: PapelGrupo;
  meuScore: number;
  meuScoreOrigem: string;
  meuPosicaoId: string | null;
  lembreteQuadraFechadoEm: string | null;
};

export type GruposResposta = { grupos: Grupo[] };

// POST /api/v1/grupos — body de criação de grupo.
export type HorarioRecorrenteInput = {
  diaSemana: number;
  horaInicio: string;
  duracaoMin: number;
};
export type DataAvulsaInput = { data: string; horaInicio: string; duracaoMin: number };
export type CriarGrupoRequest = {
  nome: string;
  tipo: TipoGrupo;
  esporte: string;
  quadraId?: string;
  horariosRecorrentes?: HorarioRecorrenteInput[];
  datasAvulsas?: DataAvulsaInput[];
};

// ── GET /api/v1/grupos/{grupoId} ────────────────────────────────────────────
// Agregado da tela do grupo. Espelha `DadosDaTelaGrupo` + `Quadra` de
// weracha-site/lib/actions/grupos.ts / lib/db/schema.ts.

/** Subconjunto de `quadras` que a tela do grupo renderiza. */
export type Quadra = {
  id: string;
  nome: string;
  endereco: string;
  /** "VALIDADA" | "PENDENTE". */
  status: string;
};

export type DadosDaTelaGrupo = {
  grupo?: Grupo;
  quadra?: Quadra;
  totalMembros: number;
  idsComResultado: string[];
  idsComMeuCheckin: string[];
  temPartidaExcluida: boolean;
};

// ── GET /api/v1/esportes ────────────────────────────────────────────────────
export type EsporteOpcao = { id: string; nome: string };

// ── GET /api/v1/parceiros ───────────────────────────────────────────────────
// Parceiros ativos, já na ordem de exibição. Ver 16-api-v1.md §3.
export type Parceiro = {
  id: string;
  nome: string;
  descricao: string;
  link: string;
  fotoUrl: string;
};

// ── GET /api/v1/artilheiros ─────────────────────────────────────────────────
// Cópia de weracha-site/lib/artilheiros.ts (tipos e helpers puros).

/** Chave do período "desde sempre". Os outros são meses "AAAA-MM". */
export const CHAVE_GERAL = "GERAL";

export type PeriodoArtilheiros = {
  chave: string;
  rotulo: string;
  rotuloCurto: string;
  emAndamento: boolean;
};

export type StatsPeriodo = { gols: number; posicao: number };

export type JogadorArtilheiro = {
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
  souEu: boolean;
  porPeriodo: Record<string, StatsPeriodo>;
};

/** Linha achatada de um período (jogador + números daquele período). */
export type LinhaRanking = {
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
  souEu: boolean;
  gols: number;
  posicao: number;
};

export type DadosArtilheiros = {
  escopo:
    | { tipo: "grupo"; grupoNome: string; esporte: string }
    | {
        tipo: "esporte";
        esporteSelecionado: string | null;
        esportesDisponiveis: string[];
      };
  periodos: PeriodoArtilheiros[];
  periodoInicial: string;
  jogadores: JogadorArtilheiro[];
};

// ── Resenha (16-api-v1.md §13) ──────────────────────────────────────────────
// Cópia de weracha-site/lib/services/resenha.ts.

export type AutorComentario = {
  id: string;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
};

export type ComentarioResenha = {
  id: string;
  pedidoReplayId: string;
  autor: AutorComentario;
  texto: string;
  criadoEm: string;
};

export type MotivoNaoPodeComentar = "sem-data-nascimento" | "menor" | "cancelada";
export type PodeComentar = { ok: true } | { ok: false; motivo: MotivoNaoPodeComentar };

export type BlocoFeedResenha = {
  pedidoReplayId: string;
  partidaId: string;
  partidaData: string;
  tipo: "GOL" | "LANCE";
  criadoEm: string;
  jogador: AutorComentario | null;
  marcadoPor: string | null;
  videos: { idCamera: string; link: string }[];
  totalComentarios: number;
  comentariosPreview: ComentarioResenha[];
  ultimaAtividade: string;
};

export type FeedResenha = {
  blocos: BlocoFeedResenha[];
  temMais: boolean;
  totalBlocos: number;
  podeModerar: boolean;
  meuJogadorId: string;
  podeComentar: PodeComentar;
};

// GET /api/v1/replays?pagina=<n> — gols do próprio jogador (qualquer grupo/partida) que
// já têm vídeo, do mais recente pro mais antigo, 5 por página. Cópia de `MeuReplay` e
// `PaginaMeusReplays` em weracha-site/lib/services/aoVivo.ts. `videos` aqui é sempre
// NUVEM (o filtro do serviço só traz gol com vídeo). `grupoRemovido`: o jogador saiu do
// grupo — o replay continua visível, sem os atalhos pro grupo/resultado nem a resenha.
// `totalComentarios` + `comentariosPreview` (últimos 2) já vêm no replay, no formato do
// bloco do feed da resenha.
export type MeuReplay = {
  golId: string;
  criadoEm: string;
  pedidoReplayId: string;
  grupoId: string;
  grupoNome: string;
  esporte: string;
  partidaId: string;
  partidaData: string;
  marcadoPor: { nome: string };
  videos: { idCamera: string; link: string }[];
  grupoRemovido: boolean;
  totalComentarios: number;
  comentariosPreview: ComentarioResenha[];
};

export type PaginaMeusReplays = {
  replays: MeuReplay[];
  temMais: boolean;
  total: number;
};

// ── Enquetes (16-api-v1.md §6) ─────────────────────────────────────────────
// Cópia de weracha-site/lib/services/enquetes.ts.

export type OpcaoEnquete = {
  id: string;
  texto: string;
  votos: number;
  votueiEu: boolean;
};

export type Enquete = {
  id: string;
  grupoId: string;
  criadoPor: string;
  criadoPorNome: string;
  pergunta: string;
  expiraEm: string;
  criadoEm: string;
  ativa: boolean;
  anonima: boolean;
  totalVotos: number;
  opcoes: OpcaoEnquete[];
};

export type VotanteEnquete = { jogadorId: string; nome: string };

export type EnquetesDoGrupo = {
  ativas: Enquete[];
  encerradas: Enquete[];
  podeCriarEnquete: boolean;
};

export type EnqueteComGrupo = Enquete & { grupoNome: string; souAdminDoGrupo: boolean };

export type EnquetesDoJogador = {
  ativas: EnqueteComGrupo[];
  encerradas: EnqueteComGrupo[];
};

// ── Gerenciar jogadores (16-api-v1.md §3) ──────────────────────────────────
// Cópia de weracha-site/lib/actions/grupos.ts (DadosDaTelaJogadoresDoGrupo),
// lib/services/membros.ts (JogadorDoGrupo), lib/db/schema.ts (membros_grupo,
// posicoes_esporte) e lib/services/perfilJogador.ts (PerfilJogador).

export type MembroGrupo = {
  id: string;
  grupoId: string;
  jogadorId: string;
  papel: "ADMIN" | "MEMBRO";
  score: number;
  scoreOrigem: string;
  posicaoId: string | null;
  /** "AAAA-MM-DD" ou null. Mensalista enquanto >= hoje. */
  mensalistaAte: string | null;
  /** Quando entrou no grupo. ISO 8601. */
  criadoEm: string;
};

/** Só os campos que a tela usa (a resposta traz o row inteiro de posicoes_esporte). */
export type PosicaoEsporte = { id: string; nome: string };

export type JogadorDoGrupo = {
  id: string;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
  /** Já formatado — mascarado se o chamador não for admin. */
  telefone: string;
  exclusaoPendente: boolean;
};

export type DadosDaTelaJogadoresDoGrupo = {
  grupo?: Grupo;
  meuId: string;
  membros: MembroGrupo[];
  jogadores: JogadorDoGrupo[];
  posicoes: PosicaoEsporte[];
};

export type PerfilJogador = {
  id: string;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
  telefone: string;
  totalGrupos: number;
  totalPartidas: number;
  totalGols: number;
};

// ── Ciclo da partida: check-in, configurar, ao vivo, resultado ──────────────
// (16-api-v1.md §8, §11, §12, §14). Cópia dos shapes de
// weracha-site/lib/services/{checkins,aoVivo}.ts e lib/db/schema.ts.

export type TipoPagamento = "MENSALISTA" | "AVULSO";
export type ModoSorteio = "SCORE" | "SORTE" | "POSICAO";

/** Row de `checkins` (timestamps chegam como ISO string). */
export type CheckIn = {
  id: string;
  partidaId: string;
  jogadorId: string;
  tipoPagamento: TipoPagamento;
  mensalistaAteNoCheckin: string | null;
  scoreNoCheckin: number | null;
  checkinEm: string;
};

/** Colega numa partida — só nome/apelido/foto (DTO `JogadorEmPartida` do site). */
export type JogadorEmPartida = {
  id: string;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
};

/** GET /api/v1/partidas/{id}/checkins — agregado de apoio das telas de partida. */
export type DadosDeApoioDaPartida = {
  membros: MembroGrupo[];
  checkins: CheckIn[];
  posicoes: PosicaoEsporteCompleta[];
  jogadores: JogadorEmPartida[];
};

/** `posicoes` vem completa aqui (o `ehGoleiro` importa pro aviso do modo POSICAO). */
export type PosicaoEsporteCompleta = {
  id: string;
  esporte: string;
  nome: string;
  ehGoleiro: boolean;
};

/** Row de `configuracoes_partida`. */
export type ConfiguracaoPartida = {
  partidaId: string;
  jogadoresPorTime: number;
  duracaoRodadaMin: number;
  golsParaEncerrarRodada: number;
  configuradoEm: string;
};

/** Row de `pre_alocacoes_partida`. */
export type PreAlocacaoPartida = {
  id: string;
  partidaId: string;
  jogadorId: string;
  timeIndice: number;
  criadoEm: string;
};

/** Row de `cores_grupo`. */
export type CorGrupo = {
  id: string;
  grupoId: string;
  hex: string;
  desativadaEm: string | null;
  criadoEm: string;
};

/** Row de `resultados` (sorteio salvo). `times` são listas de jogadorId. */
export type ResultadoSalvo = {
  id: string;
  grupoId: string;
  partidaId: string;
  jogadoresPorTime: number;
  times: string[][];
  coresTimes: (string | null)[] | null;
  comecaComABola: number | null;
  ladoDireito: number | null;
  modoSorteio: string;
  ativo: boolean;
  criadoEm: string;
};

/** Row de `estado_ao_vivo`. */
export type EstadoAoVivo = {
  partidaId: string;
  status: "PARADO" | "RODANDO";
  segundosRestantes: number;
  atualizadoEm: string;
  rodadaIniciadaEm: string;
};

/** GET /api/v1/partidas/{id}/ao-vivo — estado completo da tela (sem wrapper). */
export type EstadoAoVivoCompleto = {
  estado: EstadoAoVivo;
  config: ConfiguracaoPartida;
  golsNaRodadaAtual: number;
  golsPorJogador: Record<string, number>;
  golsGravadosPorJogador: Record<string, number>;
  ultimoGolTemVideoPorJogador: Record<string, boolean>;
  cameraAtiva: boolean;
  lancesNaPartida: number;
  lancesGravados: number;
  lancesImportantesHabilitado: boolean;
  golsGravadosNuvem: number;
  lancesGravadosNuvem: number;
};

/** GET /api/v1/partidas/{id}/{gols,lances} — um gol ou lance com seus vídeos. */
export type GolComVideos = {
  golId: string;
  criadoEm: string;
  pedidoReplayId: string | null;
  videos: { idCamera: string; link: string; origem: "NUVEM" | "LOCAL" }[];
  tipo: "GOL" | "LANCE";
  jogador?: { id: string; nome: string; apelido: string | null; fotoUrl: string | null };
  marcadoPor?: { id: string; nome: string };
  origem?: "AO_VIVO" | "CORRECAO";
  migracao?: { deNome: string; porNome: string; em: string };
  cancelado?: { porNome: string; em: string };
};
