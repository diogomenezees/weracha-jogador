import type { OpcoesRequisicao } from "@/api/cliente";
import type { DadosDaTelaExclusaoConta } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/conta/exclusao — pendências (grupos dos quais o jogador é dono) +
// solicitação de exclusão pendente, numa leitura só. O /painel usa só o
// `solicitacaoPendente` (banner "conta marcada para exclusão"). Ver 16-api-v1.md.
export function buscarStatusExclusao(chamarApi: ChamarApi): Promise<DadosDaTelaExclusaoConta> {
  return chamarApi<DadosDaTelaExclusaoConta>("/api/v1/conta/exclusao");
}

// DELETE /api/v1/conta/exclusao — cancela a própria solicitação pendente
// (reativa a conta).
export function cancelarExclusao(chamarApi: ChamarApi): Promise<{ ok: true }> {
  return chamarApi<{ ok: true }>("/api/v1/conta/exclusao", { metodo: "DELETE" });
}
