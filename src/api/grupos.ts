import { requisicao, type OpcoesRequisicao } from "@/api/cliente";
import type {
  CriarGrupoRequest,
  DadosDaTelaGrupo,
  Grupo,
  GruposResposta,
} from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/grupos — grupos do jogador logado (papel, score, partidas).
// Alimenta o /painel. Ver 16-api-v1.md.
export async function listarMeusGrupos(chamarApi: ChamarApi) {
  const { grupos } = await chamarApi<GruposResposta>("/api/v1/grupos");
  return grupos;
}

// POST /api/v1/grupos — cria um grupo (RECORRENTE ou AVULSO). 422: data já
// passada, quadra incompatível, conta com exclusão pendente.
export async function criarGrupo(chamarApi: ChamarApi, dados: CriarGrupoRequest) {
  const { grupo } = await chamarApi<{ ok: true; grupo: Grupo }>("/api/v1/grupos", {
    metodo: "POST",
    corpo: dados,
  });
  return grupo;
}

// GET /api/v1/esportes — pra rota pública/leitura. Usada no seletor de "Criar
// grupo". Pode ir sem Bearer (autenticada aceita cookie OU bearer), mas o app
// sempre manda o Bearer via chamarApi.
export function listarEsportes(chamarApi: ChamarApi) {
  return chamarApi<{ esportes: { id: string; nome: string }[] }>("/api/v1/esportes");
}

// Também disponível sem sessão pronta (não é o caso do app hoje, mas mantém o
// padrão de auth.ts pra chamadas de baixo nível).
export function listarEsportesComToken(urlBase: string, token: string) {
  return requisicao<{ esportes: { id: string; nome: string }[] }>(urlBase, "/api/v1/esportes", {
    token,
  });
}

// GET /api/v1/grupos/{grupoId} — agregado da tela do grupo.
export function buscarDadosDoGrupo(chamarApi: ChamarApi, grupoId: string) {
  return chamarApi<DadosDaTelaGrupo>(`/api/v1/grupos/${grupoId}`);
}

// PATCH /api/v1/grupos/{grupoId} — nome OU descrição (exatamente um).
export async function editarGrupo(
  chamarApi: ChamarApi,
  grupoId: string,
  campo: { nome: string } | { descricao: string }
) {
  const { grupo } = await chamarApi<{ ok: true; grupo?: Grupo }>(
    `/api/v1/grupos/${grupoId}`,
    { metodo: "PATCH", corpo: campo }
  );
  return grupo;
}

// DELETE /api/v1/grupos/{grupoId} — soft-delete. 422 se tem partida com resultado.
export function excluirGrupo(chamarApi: ChamarApi, grupoId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/grupos/${grupoId}`, { metodo: "DELETE" });
}

// DELETE /api/v1/grupos/{grupoId}/membros/me — o próprio jogador sai. 422 se é dono.
export function sairDoGrupo(chamarApi: ChamarApi, grupoId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/grupos/${grupoId}/membros/me`, { metodo: "DELETE" });
}

// PUT /api/v1/grupos/{grupoId}/quadra — vincula (definitivo).
export async function vincularQuadra(chamarApi: ChamarApi, grupoId: string, quadraId: string) {
  const { grupo } = await chamarApi<{ ok: true; grupo?: Grupo }>(
    `/api/v1/grupos/${grupoId}/quadra`,
    { metodo: "PUT", corpo: { quadraId } }
  );
  return grupo;
}

// POST /api/v1/grupos/{grupoId}/renovacao — gera as partidas do próximo mês
// (no-op em grupo AVULSO). Devolve o grupo atualizado.
export async function renovarGrupo(chamarApi: ChamarApi, grupoId: string) {
  const { grupo } = await chamarApi<{ grupo?: Grupo }>(
    `/api/v1/grupos/${grupoId}/renovacao`,
    { metodo: "POST" }
  );
  return grupo;
}

// POST /api/v1/grupos/{grupoId}/partidas — adiciona partida avulsa (só grupo AVULSO).
export async function adicionarPartidaAvulsa(
  chamarApi: ChamarApi,
  grupoId: string,
  dados: { data: string; horaInicio: string; duracaoMin: number }
) {
  const { grupo } = await chamarApi<{ ok: true; grupo: Grupo }>(
    `/api/v1/grupos/${grupoId}/partidas`,
    { metodo: "POST", corpo: dados }
  );
  return grupo;
}

// POST /api/v1/grupos/{grupoId}/convite — cria/obtém o token de convite do grupo.
export async function obterConvite(chamarApi: ChamarApi, grupoId: string) {
  const { token } = await chamarApi<{ token: string }>(`/api/v1/grupos/${grupoId}/convite`, {
    metodo: "POST",
  });
  return token;
}

// POST /api/v1/grupos/{grupoId}/convite/regeneracao — invalida o link antigo.
export async function regenerarConvite(chamarApi: ChamarApi, grupoId: string) {
  const { token } = await chamarApi<{ token: string }>(
    `/api/v1/grupos/${grupoId}/convite/regeneracao`,
    { metodo: "POST" }
  );
  return token;
}
