import type { OpcoesRequisicao } from "@/api/cliente";
import type { EstadoAvaliacao, RespostaAvaliar } from "@/contrato/avaliacoes";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// Avaliação pós-partida ("nota da galera"). Ver 16-api-v1.md §8.

// GET /api/v1/partidas/{partidaId}/avaliacao — estado da votação pra mim.
export function buscarAvaliacao(chamarApi: ChamarApi, partidaId: string) {
  return chamarApi<EstadoAvaliacao>(`/api/v1/partidas/${partidaId}/avaliacao`);
}

// POST /api/v1/partidas/{partidaId}/avaliacao — 1 voto, sem editar.
// avaliadoId = meu id é a autoavaliação.
export function avaliar(
  chamarApi: ChamarApi,
  partidaId: string,
  avaliadoId: string,
  nota: number
) {
  return chamarApi<RespostaAvaliar>(`/api/v1/partidas/${partidaId}/avaliacao`, {
    metodo: "POST",
    corpo: { avaliadoId, nota },
  });
}
