import type { OpcoesRequisicao } from "@/api/cliente";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

export type TokenPush = { token: string; plataforma: "android" | "ios" };

// POST /api/v1/push/token — registra o token Expo Push deste aparelho pra conta
// logada. Upsert no site: chamar a cada abertura é o esperado (o token pode
// mudar). 204 sem corpo. Ver 16-api-v1.md §15.
export function registrarTokenPush(chamarApi: ChamarApi, dados: TokenPush): Promise<void> {
  return chamarApi<void>("/api/v1/push/token", { metodo: "POST", corpo: dados });
}

// O DELETE do logout não passa por aqui: ele roda dentro do `sair` da sessão,
// com o Bearer na mão e sem o re-login do `chamarApi` (ver src/sessao/contexto.tsx).
