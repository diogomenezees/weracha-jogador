import type { OpcoesRequisicao } from "@/api/cliente";
import type { FiltroMeusReplays } from "@/api/replays";
import type { PaginaFavoritos } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/replays/favoritos/ids — os pedidoReplayId que o jogador favoritou. O app
// busca uma vez e pinta o coração de qualquer card a partir daí (src/replay/favoritos.tsx).
export async function buscarIdsFavoritos(chamarApi: ChamarApi): Promise<string[]> {
  const { ids } = await chamarApi<{ ids: string[] }>("/api/v1/replays/favoritos/ids");
  return ids;
}

// PUT/DELETE /api/v1/replays/{pedidoReplayId}/favorito — marca/desmarca. Idempotente.
export function definirFavorito(chamarApi: ChamarApi, pedidoReplayId: string, favorito: boolean) {
  return chamarApi<{ ok: true }>(`/api/v1/replays/${pedidoReplayId}/favorito`, {
    metodo: favorito ? "PUT" : "DELETE",
  });
}

// GET /api/v1/replays/favoritos?pagina=<n>&grupo=<grupoId>&mes=<YYYY-MM> — aba
// "Favoritos" da tela Replays. Ver 16-api-v1.md §12.
export function buscarFavoritos(
  chamarApi: ChamarApi,
  pagina: number,
  filtro: FiltroMeusReplays = { grupoId: null, mes: null }
): Promise<PaginaFavoritos> {
  const grupo = filtro.grupoId ? `&grupo=${encodeURIComponent(filtro.grupoId)}` : "";
  const mes = filtro.mes ? `&mes=${filtro.mes}` : "";
  return chamarApi<PaginaFavoritos>(`/api/v1/replays/favoritos?pagina=${pagina}${grupo}${mes}`);
}
