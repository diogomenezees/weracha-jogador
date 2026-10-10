import type { OpcoesRequisicao } from "@/api/cliente";
import type { DadosDoPainel } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/painel — tudo da tela inicial numa leitura só (exclusão
// pendente, grupos já resolvidos, próximo jogo, atalho de resultados,
// atividades recentes e destaques). Ver 16-api-v1.md.
export function buscarPainel(chamarApi: ChamarApi) {
  return chamarApi<DadosDoPainel>("/api/v1/painel");
}
