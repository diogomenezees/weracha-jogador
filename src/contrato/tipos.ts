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
