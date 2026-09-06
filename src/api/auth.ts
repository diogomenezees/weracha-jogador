import { requisicao } from "@/api/cliente";
import type { LoginRequest, LoginResposta } from "@/contrato/tipos";

// POST /api/v1/auth/token — login por telefone/senha pro cliente Bearer.
// NÃO cria conta nem senha: quem nunca definiu senha pelo site é recusado
// (`SENHA_NAO_DEFINIDA`). Token expira em 10 dias deslizantes; um 401 depois
// significa reautenticar por aqui. Ver 16-api-v1.md §4.
export function emitirToken(
  urlBase: string,
  dados: LoginRequest
): Promise<LoginResposta> {
  return requisicao<LoginResposta>(urlBase, "/api/v1/auth/token", {
    metodo: "POST",
    corpo: dados,
  });
}
