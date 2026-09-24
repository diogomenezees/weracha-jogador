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
  /** Teto da chamada inteira (cabeçalho + corpo). Padrão 15s. */
  timeoutMs?: number;
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
  const { metodo = "GET", corpo, token, sinal, timeoutMs = TIMEOUT_MS } = opcoes;

  const controle = new AbortController();
  const timeout = setTimeout(() => controle.abort(), timeoutMs);
  if (sinal) {
    sinal.addEventListener("abort", () => controle.abort(), { once: true });
  }

  // O timeout cobre a chamada INTEIRA, inclusive a leitura do corpo. Antes ele
  // era desarmado assim que o cabeçalho chegava, e uma conexão que entregava o
  // cabeçalho e travava no corpo ficava pendurada pra sempre (e, com o limite de
  // conexões por host do Android, travava as outras chamadas junto).
  let resposta: Response;
  let texto: string;
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
    texto = await resposta.text();
  } catch (causa) {
    throw erroSemResposta(causa);
  } finally {
    clearTimeout(timeout);
  }

  const json = texto ? seguroParse(texto) : undefined;

  if (!resposta.ok) {
    throw erroDaResposta(resposta.status, json);
  }
  // Toda rota GET da API responde JSON. 200 com corpo vazio é conexão que caiu no
  // meio (o servidor loga 200, o app recebe nada): tratar como falha de rede pra
  // quem chamou poder tentar de novo, em vez de devolver `undefined` e estourar
  // um "cannot read property of undefined" lá na frente.
  if (metodo === "GET" && json === undefined) {
    throw erroSemResposta(new Error("Resposta vazia do servidor."));
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
