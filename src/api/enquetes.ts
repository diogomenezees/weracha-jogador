import type { OpcoesRequisicao } from "@/api/cliente";
import type {
  EnquetesDoGrupo,
  EnquetesDoJogador,
  VotanteEnquete,
} from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/grupos/{grupoId}/enquetes — ativas/encerradas + podeCriarEnquete.
export function buscarEnquetesDoGrupo(chamarApi: ChamarApi, grupoId: string) {
  return chamarApi<EnquetesDoGrupo>(`/api/v1/grupos/${grupoId}/enquetes`);
}

// GET /api/v1/enquetes — enquetes de todos os grupos do jogador (atalho).
export function buscarMinhasEnquetes(chamarApi: ChamarApi) {
  return chamarApi<EnquetesDoJogador>("/api/v1/enquetes");
}

// GET /api/v1/enquetes/{enqueteId}/votantes — só enquete identificada.
// 422 se voto secreto.
export async function buscarVotantes(chamarApi: ChamarApi, enqueteId: string) {
  const { votantes } = await chamarApi<{ ok: true; votantes: Record<string, VotanteEnquete[]> }>(
    `/api/v1/enquetes/${enqueteId}/votantes`
  );
  return votantes;
}

// POST /api/v1/grupos/{grupoId}/enquetes — cria (qualquer membro).
export function criarEnquete(
  chamarApi: ChamarApi,
  grupoId: string,
  dados: { pergunta: string; opcoes: string[]; duracaoDias: number; anonima: boolean }
) {
  return chamarApi<{ ok: true }>(`/api/v1/grupos/${grupoId}/enquetes`, {
    metodo: "POST",
    corpo: dados,
  });
}

// PATCH /api/v1/enquetes/{enqueteId} — corrige a pergunta (só antes do 1º voto).
export async function editarPergunta(chamarApi: ChamarApi, enqueteId: string, pergunta: string) {
  const r = await chamarApi<{ ok: true; pergunta: string }>(`/api/v1/enquetes/${enqueteId}`, {
    metodo: "PATCH",
    corpo: { pergunta },
  });
  return r.pergunta;
}

// POST /api/v1/enquetes/{enqueteId}/voto — vota (toggle na mesma opção).
export function votar(chamarApi: ChamarApi, enqueteId: string, opcaoId: string) {
  return chamarApi<{ ok: true }>(`/api/v1/enquetes/${enqueteId}/voto`, {
    metodo: "POST",
    corpo: { opcaoId },
  });
}
