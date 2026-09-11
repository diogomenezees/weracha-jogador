import type { OpcoesRequisicao } from "@/api/cliente";
import type { Parceiro } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/parceiros — parceiros ativos, na ordem de exibição. Ver
// 16-api-v1.md §3. Rota de leitura (aceita cookie ou Bearer; o app manda Bearer).
export async function buscarParceiros(chamarApi: ChamarApi): Promise<Parceiro[]> {
  const { parceiros } = await chamarApi<{ parceiros: Parceiro[] }>("/api/v1/parceiros");
  return parceiros;
}
