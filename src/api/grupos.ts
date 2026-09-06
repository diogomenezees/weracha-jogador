import type { OpcoesRequisicao } from "@/api/cliente";
import type { GruposResposta } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/grupos — grupos do jogador logado (papel, score, partidas).
// Alimenta a tela inicial. Ver 16-api-v1.md.
export async function listarMeusGrupos(chamarApi: ChamarApi) {
  const { grupos } = await chamarApi<GruposResposta>("/api/v1/grupos");
  return grupos;
}
