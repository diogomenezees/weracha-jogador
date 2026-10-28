import { requisicao } from "@/api/cliente";

// `versaoRecomendada` só existe desde o site de 2026-10-27; sem ela, não tem
// aviso de atualização (só a trava da mínima).
export type VersaoMinima = { versaoMinima: string; versaoRecomendada: string | null; urlLoja: string };

// GET /api/v1/app/versao-minima — pública (o app consulta no boot, antes do
// login), então vai direto pelo `requisicao`, sem Bearer. Ver 16-api-v1.md §5.
export async function buscarVersaoMinima(urlBase: string): Promise<VersaoMinima | null> {
  const r = await requisicao<Partial<VersaoMinima> | undefined>(urlBase, "/api/v1/app/versao-minima");
  if (!r || typeof r.versaoMinima !== "string" || typeof r.urlLoja !== "string") return null;
  return {
    versaoMinima: r.versaoMinima,
    versaoRecomendada: typeof r.versaoRecomendada === "string" ? r.versaoRecomendada : null,
    urlLoja: r.urlLoja,
  };
}
