import type { OpcoesRequisicao } from "@/api/cliente";
import type { Quadra } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/quadras?esporte=&termo= — quadras que atendem o esporte,
// filtradas por nome se `termo` vier. Alimenta o vínculo de quadra do grupo.
export async function buscarQuadras(chamarApi: ChamarApi, esporte: string, termo: string) {
  const q = new URLSearchParams({ esporte });
  if (termo.trim()) q.set("termo", termo.trim());
  const { quadras } = await chamarApi<{ quadras: Quadra[] }>(`/api/v1/quadras?${q}`);
  return quadras;
}

// POST /api/v1/quadras/sugestoes — jogador sugere uma quadra nova (fica
// PENDENTE até o dono do site aprovar). 409 se já tem uma sugestão pendente.
export async function sugerirQuadra(
  chamarApi: ChamarApi,
  dados: { nome: string; endereco: string; esporte: string }
) {
  const { quadra } = await chamarApi<{ ok: true; quadra: Quadra }>(
    "/api/v1/quadras/sugestoes",
    { metodo: "POST", corpo: dados }
  );
  return quadra;
}
