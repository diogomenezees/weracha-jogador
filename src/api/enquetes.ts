import type { OpcoesRequisicao } from "@/api/cliente";
import type {
  EnqueteComGrupo,
  EnquetesDoGrupo,
  EnquetesDoJogador,
  RespondenteEnquete,
  TipoEnquete,
  VotanteEnquete,
} from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// `?livres=1`: este app sabe desenhar a enquete de resposta livre (nuvem de
// palavras). Sem o parâmetro o site esconde essas enquetes, pra não quebrar
// quem ainda roda a versão antiga da Play.

// GET /api/v1/grupos/{grupoId}/enquetes — ativas/encerradas + podeCriarEnquete.
export function buscarEnquetesDoGrupo(chamarApi: ChamarApi, grupoId: string) {
  return chamarApi<EnquetesDoGrupo>(`/api/v1/grupos/${grupoId}/enquetes?livres=1`);
}

// GET /api/v1/enquetes — enquetes de todos os grupos do jogador (atalho).
export function buscarMinhasEnquetes(chamarApi: ChamarApi) {
  return chamarApi<EnquetesDoJogador>("/api/v1/enquetes?livres=1");
}

// GET /api/v1/enquetes/{enqueteId} — uma enquete só, pro modal acompanhar ao
// vivo (polling de 3s).
export async function buscarEnquete(chamarApi: ChamarApi, enqueteId: string) {
  const { enquete } = await chamarApi<{ ok: true; enquete: EnqueteComGrupo }>(
    `/api/v1/enquetes/${enqueteId}`
  );
  return enquete;
}

// GET /api/v1/enquetes/{enqueteId}/votantes — só enquete identificada.
// 422 se voto secreto. Em LIVRE vem `respostas` (e `votantes` vazio).
export async function buscarVotantes(chamarApi: ChamarApi, enqueteId: string) {
  const { votantes, respostas } = await chamarApi<{
    ok: true;
    votantes: Record<string, VotanteEnquete[]>;
    respostas?: RespondenteEnquete[];
  }>(`/api/v1/enquetes/${enqueteId}/votantes`);
  return { votantes, respostas: respostas ?? [] };
}

// POST /api/v1/grupos/{grupoId}/enquetes — cria (qualquer membro). Em LIVRE
// não vai `opcoes`.
export function criarEnquete(
  chamarApi: ChamarApi,
  grupoId: string,
  dados: {
    pergunta: string;
    opcoes?: string[];
    duracaoDias: number;
    anonima: boolean;
    tipo: TipoEnquete;
  }
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

// POST /api/v1/enquetes/{enqueteId}/resposta — responde a enquete LIVRE (até
// 20 caracteres, 1 vez só). 409 se já respondeu.
export function responder(chamarApi: ChamarApi, enqueteId: string, texto: string) {
  return chamarApi<{ ok: true; resposta: string }>(`/api/v1/enquetes/${enqueteId}/resposta`, {
    metodo: "POST",
    corpo: { texto },
  });
}

// POST /api/v1/enquetes/{enqueteId}/palavras-ocultas — admin esconde/mostra
// uma palavra da nuvem. 403 se não for admin do grupo.
export function alternarPalavraOculta(
  chamarApi: ChamarApi,
  enqueteId: string,
  chave: string,
  oculta: boolean
) {
  return chamarApi<{ ok: true; palavrasOcultas: string[] }>(
    `/api/v1/enquetes/${enqueteId}/palavras-ocultas`,
    { metodo: "POST", corpo: { chave, oculta } }
  );
}
