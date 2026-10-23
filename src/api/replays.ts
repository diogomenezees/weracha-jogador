import type { OpcoesRequisicao } from "@/api/cliente";
import type { PaginaMeusReplays } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// Filtros da tela Meus replays (null = sem filtro). `expirando` (só Meus vídeos): só
// os replays que vão ser apagados, é onde o push REPLAYS_EXPIRANDO leva.
export type FiltroMeusReplays = { grupoId: string | null; mes: string | null; expirando?: boolean };

// GET /api/v1/replays?pagina=<n>&grupo=<grupoId>&mes=<YYYY-MM> — os gols do próprio
// jogador (qualquer grupo/partida) que já têm vídeo, do mais recente pro mais antigo, 5
// por página (`pagina` começa em 0). `grupo`/`mes` filtram; as opções dos chips vêm em
// `grupos`/`meses`. Cada replay já vem com o preview da resenha. Conta com exclusão
// pendente: `{ replays: [], temMais: false, total: 0 }`. Ver 16-api-v1.md §12.
export function buscarMeusReplays(
  chamarApi: ChamarApi,
  pagina: number,
  filtro: FiltroMeusReplays = { grupoId: null, mes: null }
): Promise<PaginaMeusReplays> {
  const grupo = filtro.grupoId ? `&grupo=${encodeURIComponent(filtro.grupoId)}` : "";
  const mes = filtro.mes ? `&mes=${filtro.mes}` : "";
  const expirando = filtro.expirando ? "&expirando=1" : "";
  return chamarApi<PaginaMeusReplays>(
    `/api/v1/replays?pagina=${pagina}${grupo}${mes}${expirando}`
  );
}
