import type { OpcoesRequisicao } from "@/api/cliente";
import type { MeuReplay } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/replays — os gols do próprio jogador (qualquer grupo/partida) que
// já têm vídeo, do mais recente pro mais antigo. Conta com exclusão pendente:
// `{ replays: [] }`. Ver 16-api-v1.md §12. Os comentários de cada replay vêm do
// `buscarComentariosEmLote` de `src/api/resenha.ts`.
export async function buscarMeusReplays(chamarApi: ChamarApi): Promise<MeuReplay[]> {
  const { replays } = await chamarApi<{ replays: MeuReplay[] }>("/api/v1/replays");
  return replays;
}
