import type { OpcoesRequisicao } from "@/api/cliente";
import type { DadosIndicadoresDoGrupo } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/grupos/{grupoId}/indicadores?periodo=<GERAL|AAAA-MM> — destaques
// do grupo no período (padrão: mês corrente) + partidas realizadas com gols e
// presentes. Ver 16-api-v1.md.
export function buscarIndicadoresDoGrupo(
  chamarApi: ChamarApi,
  grupoId: string,
  periodo?: string
): Promise<DadosIndicadoresDoGrupo> {
  const q = periodo ? `?periodo=${encodeURIComponent(periodo)}` : "";
  return chamarApi<DadosIndicadoresDoGrupo>(`/api/v1/grupos/${grupoId}/indicadores${q}`);
}
