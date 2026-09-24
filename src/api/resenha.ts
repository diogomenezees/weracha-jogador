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
// Busca em andamento por replay. Quem pedir de novo enquanto uma está no ar (polling
// de 3s, recarga depois de bloquear alguém, carga inicial) reaproveita a mesma em vez
// de empilhar pedidos: numa rede ruim os pendurados enchiam o limite de conexões por
// host do Android e a carga inicial da conversa ficava presa atrás deles.
const buscasEmAndamento = new Map<string, Promise<ComentarioResenha[]>>();

export function buscarComentarios(
  chamarApi: ChamarApi,
  pedidoReplayId: string
): Promise<ComentarioResenha[]> {
  const emVoo = buscasEmAndamento.get(pedidoReplayId);
  if (emVoo) return emVoo;
  const p = (async () => {
    const { comentarios } = await chamarApi<{ comentarios: ComentarioResenha[] }>(
      `/api/v1/replays/${pedidoReplayId}/comentarios`,
      // Teto curto: é leitura barata e repetida (polling), melhor desistir e tentar
      // de novo do que ficar pendurado 15s.
      { timeoutMs: 8000 }
    );
    return comentarios;
  })().finally(() => {
    buscasEmAndamento.delete(pedidoReplayId);
  });
  buscasEmAndamento.set(pedidoReplayId, p);
  return p;
}

// GET /api/v1/replays/comentarios?ids=<id1>,<id2>,... — comentários em lote de
// vários replays, por pedidoReplayId. Chave por id, valor [] pros sem
// comentário. Usado pela tela de Resultado (gols + lances de uma vez).
export function buscarComentariosEmLote(
  chamarApi: ChamarApi,
  ids: string[]
): Promise<Record<string, ComentarioResenha[]>> {
  if (ids.length === 0) return Promise.resolve({});
  return chamarApi<Record<string, ComentarioResenha[]>>(
    `/api/v1/replays/comentarios?ids=${ids.map(encodeURIComponent).join(",")}`
  );
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

// POST /api/v1/comentarios/{comentarioId}/denuncia — denuncia um comentário de
// outra pessoa. Cai na ouvidoria com o texto copiado. Idempotente. Sem corpo.
// 404 (comentário já apagado), 422 (é o próprio), 429 (limite por hora).
export function denunciarComentario(chamarApi: ChamarApi, comentarioId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/comentarios/${comentarioId}/denuncia`, {
    metodo: "POST",
  });
}

// PUT /api/v1/jogadores/{jogadorId}/bloqueio — bloqueio PESSOAL: passo a não ver
// os comentários dessa pessoa na resenha (o servidor troca por um aviso).
// Idempotente. DELETE na mesma rota desfaz. Não afeta a conta dela.
export function bloquearJogador(chamarApi: ChamarApi, jogadorId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/jogadores/${jogadorId}/bloqueio`, { metodo: "PUT" });
}

export function desbloquearJogador(chamarApi: ChamarApi, jogadorId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/jogadores/${jogadorId}/bloqueio`, { metodo: "DELETE" });
}
