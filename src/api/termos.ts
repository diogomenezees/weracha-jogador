import type { OpcoesRequisicao } from "@/api/cliente";
import type { StatusTermos } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/termos/status — se o jogador logado precisa assinar a versão atual
// dos Termos/Política. Rota autenticada (Bearer), então vai pelo `chamarApi` do
// contexto de sessão. Ver 16-api-v1.md §3.
export function statusTermos(chamarApi: ChamarApi): Promise<StatusTermos> {
  return chamarApi<StatusTermos>("/api/v1/termos/status");
}

// POST /api/v1/termos/aceite — registra o aceite da versão atual. Sem corpo.
export function aceitarTermos(chamarApi: ChamarApi): Promise<{ ok: true }> {
  return chamarApi<{ ok: true }>("/api/v1/termos/aceite", { metodo: "POST" });
}
