import type { OpcoesRequisicao } from "@/api/cliente";
import type { CampanhaNoAr, Parceiro } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/parceiros — parceiros ativos, na ordem de exibição. Ver
// 16-api-v1.md §3. Rota de leitura (aceita cookie ou Bearer; o app manda Bearer).
export async function buscarParceiros(chamarApi: ChamarApi): Promise<Parceiro[]> {
  const { parceiros } = await chamarApi<{ parceiros: Parceiro[] }>("/api/v1/parceiros");
  return parceiros;
}

// GET /api/v1/campanhas — campanhas de parceiro no ar hoje, já embaralhadas,
// pros banners entre os vídeos (Resenha e Meus replays). Ver 16-api-v1.md §3.
export async function buscarCampanhasNoAr(chamarApi: ChamarApi): Promise<CampanhaNoAr[]> {
  const { campanhas } = await chamarApi<{ campanhas: CampanhaNoAr[] }>("/api/v1/campanhas");
  return campanhas;
}
