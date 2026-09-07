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

/** Jogador logado, como vem no login. Espelha o DTO `JogadorEmPartida` + telefone. */
export type JogadorSessao = {
  id: string;
  telefone: string;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
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
// `destino` é um caminho do site; o app hoje só cai em /grupos.
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
