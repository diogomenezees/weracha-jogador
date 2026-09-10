import type { OpcoesRequisicao } from "@/api/cliente";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// POST /api/v1/partidas/{partidaId}/cancelamento — cancela (justificativa
// opcional). 422 se a partida já tem resultado.
export function cancelarPartida(
  chamarApi: ChamarApi,
  partidaId: string,
  justificativa?: string
) {
  return chamarApi<{ ok: true }>(`/api/v1/partidas/${partidaId}/cancelamento`, {
    metodo: "POST",
    corpo: { justificativa: justificativa ?? "" },
  });
}

// DELETE /api/v1/partidas/{partidaId}/cancelamento — reativa (desfaz o cancelamento).
export function reativarPartida(chamarApi: ChamarApi, partidaId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/partidas/${partidaId}/cancelamento`, {
    metodo: "DELETE",
  });
}

// PATCH /api/v1/partidas/{partidaId} — edita só a descrição.
export function editarDescricaoPartida(
  chamarApi: ChamarApi,
  partidaId: string,
  descricao: string
) {
  return chamarApi<{ ok: true }>(`/api/v1/partidas/${partidaId}`, {
    metodo: "PATCH",
    corpo: { descricao },
  });
}

// DELETE /api/v1/partidas/{partidaId} — exclui de vez uma partida já cancelada.
export function excluirPartida(chamarApi: ChamarApi, partidaId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/partidas/${partidaId}`, { metodo: "DELETE" });
}
