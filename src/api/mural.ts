import type { OpcoesRequisicao } from "@/api/cliente";
import type { AvisoDoMural } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/mural — avisos do dono do site pra todos ou pros grupos do
// jogador, do mais novo pro mais antigo (até 50), + `vistoAte` (o que veio
// depois é "Novo"). Ver 18-mural.md no site.
export function buscarMural(
  chamarApi: ChamarApi
): Promise<{ avisos: AvisoDoMural[]; vistoAte: string }> {
  return chamarApi<{ avisos: AvisoDoMural[]; vistoAte: string }>("/api/v1/mural");
}

// GET /api/v1/mural/nao-lidos — bolinha do menu.
export async function contarNaoLidosDoMural(chamarApi: ChamarApi): Promise<number> {
  const { naoLidos } = await chamarApi<{ naoLidos: number }>("/api/v1/mural/nao-lidos");
  return naoLidos;
}

// POST /api/v1/mural/visto — marca como visto até o aviso mais novo mostrado.
export function marcarMuralVisto(chamarApi: ChamarApi, ate: string): Promise<{ ok: true }> {
  return chamarApi<{ ok: true }>("/api/v1/mural/visto", { metodo: "POST", corpo: { ate } });
}
