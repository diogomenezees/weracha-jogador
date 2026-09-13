import { requisicao, type OpcoesRequisicao } from "@/api/cliente";
import type { ConvitePublico, ResultadoConvite } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

export type Alvo = { partidaId?: string | null; enqueteId?: string | null };

function querystring(alvo: Alvo): string {
  const qs = new URLSearchParams();
  if (alvo.partidaId) qs.set("partidaId", alvo.partidaId);
  if (alvo.enqueteId) qs.set("enqueteId", alvo.enqueteId);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

// GET /api/v1/convites/{token} — leitura pública (deslogado). `ErroApi` com
// `codigo: "CONVITE_INVALIDO"` (404) se o token não vale mais.
export function buscarConvite(
  urlBase: string,
  token: string,
  alvo: Alvo = {}
): Promise<ConvitePublico> {
  return requisicao<ConvitePublico>(
    urlBase,
    `/api/v1/convites/${encodeURIComponent(token)}${querystring(alvo)}`
  );
}

// POST /api/v1/convites/{token} — processa o convite pro jogador logado (entra
// no grupo). Autenticado: vai pelo `chamarApi` do contexto de sessão.
export function processarConvite(
  chamarApi: ChamarApi,
  token: string,
  alvo: Alvo = {}
): Promise<ResultadoConvite> {
  return chamarApi<ResultadoConvite>(
    `/api/v1/convites/${encodeURIComponent(token)}${querystring(alvo)}`,
    { metodo: "POST" }
  );
}
