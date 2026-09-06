import { erroDaResposta, erroSemResposta, ErroApi } from "@/api/erros";

// Cliente HTTP de baixo nível pra `/api/v1/*`. Uma chamada, um resultado.
// A orquestração de "401 → re-loga com a senha guardada → tenta de novo" mora
// na camada de sessão (`src/sessao/contexto.tsx`), não aqui.

export type OpcoesRequisicao = {
  metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  corpo?: unknown;
  /** Bearer. Ausente = chamada anônima (login, verificação de telefone). */
  token?: string;
  sinal?: AbortSignal;
};

const TIMEOUT_MS = 15_000;

function juntarUrl(urlBase: string, caminho: string): string {
  return `${urlBase.replace(/\/$/, "")}/${caminho.replace(/^\//, "")}`;
}

/**
 * Faz a chamada e devolve o corpo JSON já tipado. Levanta `ErroApi` em
 * qualquer falha (rede, status != 2xx, corpo fora do contrato).
 */
export async function requisicao<T>(
  urlBase: string,
  caminho: string,
  opcoes: OpcoesRequisicao = {}
): Promise<T> {
  const { metodo = "GET", corpo, token, sinal } = opcoes;

  const controle = new AbortController();
  const timeout = setTimeout(() => controle.abort(), TIMEOUT_MS);
  if (sinal) {
    sinal.addEventListener("abort", () => controle.abort(), { once: true });
  }

  let resposta: Response;
  try {
    resposta = await fetch(juntarUrl(urlBase, caminho), {
      method: metodo,
      headers: {
        Accept: "application/json",
        ...(corpo !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      signal: controle.signal,
    });
  } catch (causa) {
    throw erroSemResposta(causa);
  } finally {
    clearTimeout(timeout);
  }

  const texto = await resposta.text();
  const json = texto ? seguroParse(texto) : undefined;

  if (!resposta.ok) {
    throw erroDaResposta(resposta.status, json);
  }
  return json as T;
}

function seguroParse(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}

export { ErroApi };
