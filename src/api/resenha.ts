import type { OpcoesRequisicao } from "@/api/cliente";
import type { ComentarioResenha, FeedResenha } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/grupos/{grupoId}/resenha?pagina=<n> — feed de replays comentados
// do grupo, 3 blocos por página (pagina começa em 0). Corpo direto, sem
// wrapper. Ver 16-api-v1.md §13.
export function buscarFeedResenha(
  chamarApi: ChamarApi,
  grupoId: string,
  pagina: number
): Promise<FeedResenha> {
  return chamarApi<FeedResenha>(`/api/v1/grupos/${grupoId}/resenha?pagina=${pagina}`);
}

// GET /api/v1/replays/{pedidoReplayId}/comentarios — thread completa de um
// replay. É o que a carga inicial e o polling de 3s do chat usam.
export async function buscarComentarios(
  chamarApi: ChamarApi,
  pedidoReplayId: string
): Promise<ComentarioResenha[]> {
  const { comentarios } = await chamarApi<{ comentarios: ComentarioResenha[] }>(
    `/api/v1/replays/${pedidoReplayId}/comentarios`
  );
  return comentarios;
}

// POST /api/v1/replays/{pedidoReplayId}/comentarios — posta um comentário
// (1 a 500 caracteres após trim). 422: cooldown de 3s, menor de 18, etc.
export async function enviarComentario(
  chamarApi: ChamarApi,
  pedidoReplayId: string,
  texto: string
): Promise<ComentarioResenha> {
  const { comentario } = await chamarApi<{ ok: true; comentario: ComentarioResenha }>(
    `/api/v1/replays/${pedidoReplayId}/comentarios`,
    { metodo: "POST", corpo: { texto } }
  );
  return comentario;
}

// DELETE /api/v1/comentarios/{comentarioId} — idempotente. Autor apaga o
// próprio nos primeiros 5min; admin do grupo / dono do site, qualquer um.
export function apagarComentario(chamarApi: ChamarApi, comentarioId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/comentarios/${comentarioId}`, { metodo: "DELETE" });
}
