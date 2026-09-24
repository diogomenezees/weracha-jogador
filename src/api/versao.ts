import { requisicao } from "@/api/cliente";

export type VersaoMinima = { versaoMinima: string; urlLoja: string };

// GET /api/v1/app/versao-minima — pública (o app consulta no boot, antes do
// login), então vai direto pelo `requisicao`, sem Bearer. Ver 16-api-v1.md §5.
export async function buscarVersaoMinima(urlBase: string): Promise<VersaoMinima | null> {
  const r = await requisicao<Partial<VersaoMinima> | undefined>(urlBase, "/api/v1/app/versao-minima");
  if (!r || typeof r.versaoMinima !== "string" || typeof r.urlLoja !== "string") return null;
  return { versaoMinima: r.versaoMinima, urlLoja: r.urlLoja };
}
