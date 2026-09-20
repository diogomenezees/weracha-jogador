import type { OpcoesRequisicao } from "@/api/cliente";
import type { PaginaMeusReplays } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/replays?pagina=<n> — os gols do próprio jogador (qualquer grupo/partida)
// que já têm vídeo, do mais recente pro mais antigo, 5 por página (`pagina` começa em
// 0). Cada replay já vem com o preview da resenha. Conta com exclusão pendente:
// `{ replays: [], temMais: false, total: 0 }`. Ver 16-api-v1.md §12.
export function buscarMeusReplays(
  chamarApi: ChamarApi,
  pagina: number
): Promise<PaginaMeusReplays> {
  return chamarApi<PaginaMeusReplays>(`/api/v1/replays?pagina=${pagina}`);
}
