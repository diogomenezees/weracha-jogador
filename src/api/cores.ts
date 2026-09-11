import type { OpcoesRequisicao } from "@/api/cliente";
import type { CorGrupo } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// Paleta de cores dos coletes de um grupo (16-api-v1.md §11). Só admin lê e
// escreve — alimenta a tela de configurar partida.

// GET /api/v1/grupos/{grupoId}/cores — paleta ativa (cores desativadas não vêm).
export async function buscarCoresDoGrupo(
  chamarApi: ChamarApi,
  grupoId: string
): Promise<CorGrupo[]> {
  const { cores } = await chamarApi<{ cores: CorGrupo[] }>(`/api/v1/grupos/${grupoId}/cores`);
  return cores;
}

// POST /api/v1/grupos/{grupoId}/cores — adiciona uma cor. `hex` = "#RRGGBB".
export async function adicionarCor(
  chamarApi: ChamarApi,
  grupoId: string,
  hex: string
): Promise<CorGrupo> {
  const { cor } = await chamarApi<{ ok: true; cor: CorGrupo }>(
    `/api/v1/grupos/${grupoId}/cores`,
    { metodo: "POST", corpo: { hex } }
  );
  return cor;
}

// DELETE /api/v1/cores/{corId} — desativa (soft delete). Idempotente.
export function desativarCor(chamarApi: ChamarApi, corId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/cores/${corId}`, { metodo: "DELETE" });
}
