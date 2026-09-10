import type { OpcoesRequisicao } from "@/api/cliente";
import type {
  DadosDaTelaJogadoresDoGrupo,
  MembroGrupo,
  PerfilJogador,
  PosicaoEsporte,
} from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/grupos/{grupoId}/jogadores — grupo + elenco + posições, 1 leitura.
export function buscarElencoDoGrupo(chamarApi: ChamarApi, grupoId: string) {
  return chamarApi<DadosDaTelaJogadoresDoGrupo>(`/api/v1/grupos/${grupoId}/jogadores`);
}

// GET /api/v1/posicoes?esporte=<nome> — posições do esporte (id + nome).
export async function listarPosicoes(chamarApi: ChamarApi, esporte: string) {
  const { posicoes } = await chamarApi<{ posicoes: PosicaoEsporte[] }>(
    `/api/v1/posicoes?esporte=${encodeURIComponent(esporte)}`
  );
  return posicoes;
}

// PUT /api/v1/grupos/{grupoId}/membros/{jogadorId}/score — 0 a 100.
export function definirScore(chamarApi: ChamarApi, grupoId: string, jogadorId: string, score: number) {
  return chamarApi<{ ok: true }>(`/api/v1/grupos/${grupoId}/membros/${jogadorId}/score`, {
    metodo: "PUT",
    corpo: { score },
  });
}

// PUT /api/v1/grupos/{grupoId}/membros/{jogadorId}/posicao — id ou null.
export function definirPosicao(
  chamarApi: ChamarApi,
  grupoId: string,
  jogadorId: string,
  posicaoId: string | null
) {
  return chamarApi<{ ok: true }>(`/api/v1/grupos/${grupoId}/membros/${jogadorId}/posicao`, {
    metodo: "PUT",
    corpo: { posicaoId },
  });
}

// PUT /api/v1/grupos/{grupoId}/membros/{jogadorId}/papel — só o dono.
export function definirPapel(
  chamarApi: ChamarApi,
  grupoId: string,
  jogadorId: string,
  papel: "ADMIN" | "MEMBRO"
) {
  return chamarApi<{ ok: true }>(`/api/v1/grupos/${grupoId}/membros/${jogadorId}/papel`, {
    metodo: "PUT",
    corpo: { papel },
  });
}

// PUT /api/v1/grupos/{grupoId}/membros/{jogadorId}/mensalista
export function definirMensalista(
  chamarApi: ChamarApi,
  grupoId: string,
  jogadorId: string,
  ativar: boolean
) {
  return chamarApi<{ ok: true }>(`/api/v1/grupos/${grupoId}/membros/${jogadorId}/mensalista`, {
    metodo: "PUT",
    corpo: { ativar },
  });
}

// DELETE /api/v1/grupos/{grupoId}/membros/{jogadorId} — admin remove.
export function removerJogador(chamarApi: ChamarApi, grupoId: string, jogadorId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/grupos/${grupoId}/membros/${jogadorId}`, {
    metodo: "DELETE",
  });
}

// DELETE /api/v1/grupos/{grupoId}/papel-admin — o próprio admin abre mão.
export function deixarCargoAdmin(chamarApi: ChamarApi, grupoId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/grupos/${grupoId}/papel-admin`, { metodo: "DELETE" });
}

// POST /api/v1/grupos/{grupoId}/dono — transfere a titularidade.
export function transferirDono(chamarApi: ChamarApi, grupoId: string, novoDonoId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/grupos/${grupoId}/dono`, {
    metodo: "POST",
    corpo: { novoDonoId },
  });
}

// POST /api/v1/grupos/{grupoId}/membros — admin adiciona (cadastra se novo).
export async function adicionarMembro(
  chamarApi: ChamarApi,
  grupoId: string,
  dados: { telefone: string; nome: string; score: number; origemScore?: "ADMIN" | "PADRAO" }
) {
  const { membro } = await chamarApi<{ ok: true; membro: MembroGrupo }>(
    `/api/v1/grupos/${grupoId}/membros`,
    { metodo: "POST", corpo: dados }
  );
  return membro;
}

// GET /api/v1/grupos/{grupoId}/jogadores/{jogadorId}/perfil — perfil-resumo.
export function buscarPerfilJogador(chamarApi: ChamarApi, grupoId: string, jogadorId: string) {
  return chamarApi<PerfilJogador>(`/api/v1/grupos/${grupoId}/jogadores/${jogadorId}/perfil`);
}

// GET /api/v1/jogadores/por-telefone?telefone=<normalizado> — { id, nome } | null.
export function buscarJogadorPorTelefone(chamarApi: ChamarApi, telefone: string) {
  return chamarApi<{ jogador: { id: string; nome: string } | null }>(
    `/api/v1/jogadores/por-telefone?telefone=${encodeURIComponent(telefone)}`
  );
}

// GET /api/v1/jogadores/{jogadorId}/sugestao-score?esporte=<esporte>
export function buscarSugestaoScore(chamarApi: ChamarApi, jogadorId: string, esporte: string) {
  return chamarApi<{ score: number; definido: boolean }>(
    `/api/v1/jogadores/${jogadorId}/sugestao-score?esporte=${encodeURIComponent(esporte)}`
  );
}

/** Mensalista enquanto `mensalistaAte >= hoje` (data local). */
export function ehMensalistaHoje(membro: Pick<MembroGrupo, "mensalistaAte">): boolean {
  if (!membro.mensalistaAte) return false;
  const d = new Date();
  const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
  return membro.mensalistaAte >= hoje;
}
