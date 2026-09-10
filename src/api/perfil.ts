import { requisicao, type OpcoesRequisicao } from "@/api/cliente";
import type { MeuPerfil } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// GET /api/v1/me — perfil do jogador autenticado. Rota Bearer.
//
// Duas formas: a de baixo nível (`urlBase` + `token` crus) pro contexto de
// sessão chamar logo após `emitirToken`, quando o `chamarApi` ainda não está
// montado; e a versão `chamarApi` pras telas, que ganha o re-login em 401.
export function buscarMeuPerfilComToken(urlBase: string, token: string): Promise<MeuPerfil> {
  return requisicao<MeuPerfil>(urlBase, "/api/v1/me", { token });
}

export function buscarMeuPerfil(chamarApi: ChamarApi): Promise<MeuPerfil> {
  return chamarApi<MeuPerfil>("/api/v1/me");
}

// POST /api/v1/perfil/onboarding-concluido — marca o carrossel como concluído
// (terminar OU pular contam igual). Sem corpo. Idempotente no servidor.
export function concluirOnboarding(chamarApi: ChamarApi): Promise<{ ok: true }> {
  return chamarApi<{ ok: true }>("/api/v1/perfil/onboarding-concluido", { metodo: "POST" });
}
