import type { OpcoesRequisicao } from "@/api/cliente";
import type { DadosArtilheiros } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/artilheiros — ranking de gols (Geral + por mês), centrado no
// jogador. `grupoId` tem precedência; `geral` soma todos os grupos do jogador; sem
// nenhum, o servidor abre no grupo onde ele jogou por último. Ver 16-api-v1.md §3.
export function buscarArtilheiros(
  chamarApi: ChamarApi,
  filtro: { grupoId?: string; geral?: boolean; esporte?: string } = {}
): Promise<DadosArtilheiros> {
  const q = new URLSearchParams();
  if (filtro.grupoId) q.set("grupoId", filtro.grupoId);
  else if (filtro.geral) q.set("geral", "1");
  else if (filtro.esporte) q.set("esporte", filtro.esporte);
  const query = q.toString();
  return chamarApi<DadosArtilheiros>(`/api/v1/artilheiros${query ? `?${query}` : ""}`);
}
