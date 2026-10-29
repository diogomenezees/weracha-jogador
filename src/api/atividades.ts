import type { OpcoesRequisicao } from "@/api/cliente";
import type { PaginaDeAtividades } from "@/contrato/atividades";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/grupos/{grupoId}/atividades?pagina=<n> — "Atividades recentes"
// do grupo, de 10 em 10 (`pagina` começa em 0). A seção da tela do grupo usa
// as 5 primeiras da primeira; a tela "Ver tudo" pagina. Ver 16-api-v1.md.
export function buscarAtividadesDoGrupo(
  chamarApi: ChamarApi,
  grupoId: string,
  pagina = 0
): Promise<PaginaDeAtividades> {
  const q = pagina > 0 ? `?pagina=${pagina}` : "";
  return chamarApi<PaginaDeAtividades>(`/api/v1/grupos/${grupoId}/atividades${q}`);
}
