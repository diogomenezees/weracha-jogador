import { requisicao } from "@/api/cliente";
import type {
  ConfirmarCodigoRequest,
  DefinirSenhaRequest,
  EnviarCodigoTelefoneRequest,
  EnvioCodigoSms,
  LoginRequest,
  LoginResposta,
  RecuperarSenhaRequest,
  StatusTelefone,
} from "@/contrato/tipos";

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

// --- Fluxo de acesso pré-login (sem Bearer, csrf: false no site) -------------
// Todas anônimas. Ver 16-api-v1.md §4.

// POST /api/v1/auth/telefone/status — decide o que a tela pede a seguir.
export function statusTelefone(urlBase: string, telefone: string): Promise<StatusTelefone> {
  return requisicao<StatusTelefone>(urlBase, "/api/v1/auth/telefone/status", {
    metodo: "POST",
    corpo: { telefone },
  });
}

// POST /api/v1/auth/telefone/codigo — dispara o SMS de verificação de telefone
// (cadastro / 1º acesso). `nome` obrigatório quando o telefone ainda não tem conta.
export function enviarCodigoTelefone(
  urlBase: string,
  dados: EnviarCodigoTelefoneRequest
): Promise<EnvioCodigoSms> {
  return requisicao<EnvioCodigoSms>(urlBase, "/api/v1/auth/telefone/codigo", {
    metodo: "POST",
    corpo: dados,
  });
}

// POST /api/v1/auth/telefone/confirmar — confirma o código e marca o telefone
// como validado.
export function confirmarCodigoTelefone(
  urlBase: string,
  dados: ConfirmarCodigoRequest
): Promise<{ ok: true }> {
  return requisicao<{ ok: true }>(urlBase, "/api/v1/auth/telefone/confirmar", {
    metodo: "POST",
    corpo: dados,
  });
}

// POST /api/v1/auth/senha/recuperar — dispara o SMS de recuperação (conta que já
// validou o telefone e já tem senha).
export function recuperarSenha(
  urlBase: string,
  dados: RecuperarSenhaRequest
): Promise<EnvioCodigoSms> {
  return requisicao<EnvioCodigoSms>(urlBase, "/api/v1/auth/senha/recuperar", {
    metodo: "POST",
    corpo: dados,
  });
}

// POST /api/v1/auth/senha/definir — cria a 1ª senha ou redefine. Nunca faz
// Set-Cookie; o app pega o Bearer chamando `emitirToken` logo depois.
export function definirSenha(
  urlBase: string,
  dados: DefinirSenhaRequest
): Promise<{ ok: true }> {
  return requisicao<{ ok: true }>(urlBase, "/api/v1/auth/senha/definir", {
    metodo: "POST",
    corpo: dados,
  });
}
