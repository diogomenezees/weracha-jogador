import type { OpcoesRequisicao } from "@/api/cliente";
import type { DadosDaTelaExclusaoConta, EnvioCodigoSms } from "@/contrato/tipos";

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

// POST /api/v1/conta/exclusao/codigo — dispara o SMS de confirmação da exclusão
// (mesmo canal da troca de senha). Sem corpo. 429 CODIGO_LIMITE_DIARIO / 503
// SMS_DESABILITADO como os outros senders.
export function enviarCodigoExclusao(chamarApi: ChamarApi): Promise<EnvioCodigoSms> {
  return chamarApi<EnvioCodigoSms>("/api/v1/conta/exclusao/codigo", { metodo: "POST" });
}

// POST /api/v1/conta/exclusao — confirma o pedido com o código do SMS. Cria a
// solicitação na fila do admin (não apaga na hora; a conta segue funcionando e
// dá pra cancelar pelo banner). 422 se o jogador ainda é dono de algum grupo.
export function confirmarExclusao(chamarApi: ChamarApi, codigo: string): Promise<{ ok: true }> {
  return chamarApi<{ ok: true }>("/api/v1/conta/exclusao", {
    metodo: "POST",
    corpo: { codigo },
  });
}
