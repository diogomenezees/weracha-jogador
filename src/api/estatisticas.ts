import type { OpcoesRequisicao } from "@/api/cliente";
import type { DadosEstatisticas } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/estatisticas — todos os jogos do jogador logado nos grupos de que
// é membro, com gols, repercussão, presença e posição nos rankings. Os filtros
// de grupo e mês são feitos no aparelho. Ver 16-api-v1.md.
export function buscarEstatisticas(chamarApi: ChamarApi): Promise<DadosEstatisticas> {
  return chamarApi<DadosEstatisticas>("/api/v1/estatisticas");
}
