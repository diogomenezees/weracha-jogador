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

// --- Edição dos campos do perfil (tela /perfil). Todas PUT, Bearer. ---------
// Ver 16-api-v1.md §14. Cada uma grava um campo; a tela faz update otimista.

export function definirNome(chamarApi: ChamarApi, nome: string): Promise<{ ok: true }> {
  return chamarApi<{ ok: true }>("/api/v1/perfil/nome", { metodo: "PUT", corpo: { nome } });
}

export function definirApelido(
  chamarApi: ChamarApi,
  apelido: string | null
): Promise<{ ok: true }> {
  return chamarApi<{ ok: true }>("/api/v1/perfil/apelido", { metodo: "PUT", corpo: { apelido } });
}

export function definirEmail(
  chamarApi: ChamarApi,
  email: string | null,
  receberNotificacoes: boolean
): Promise<{ ok: true }> {
  return chamarApi<{ ok: true }>("/api/v1/perfil/email", {
    metodo: "PUT",
    corpo: { email, receberNotificacoes },
  });
}

export function definirDataNascimento(
  chamarApi: ChamarApi,
  dataNascimento: string | null
): Promise<{ ok: true }> {
  return chamarApi<{ ok: true }>("/api/v1/perfil/data-nascimento", {
    metodo: "PUT",
    corpo: { dataNascimento },
  });
}

// PUT /api/v1/perfil/foto — grava (ou limpa com null) a URL da foto, depois que
// o upload presigned pro R2 terminou. O site confirma que a URL é do bucket/
// pasta do próprio jogador.
export function definirFotoUrl(
  chamarApi: ChamarApi,
  fotoUrl: string | null
): Promise<{ ok: true }> {
  return chamarApi<{ ok: true }>("/api/v1/perfil/foto", { metodo: "PUT", corpo: { fotoUrl } });
}

// POST /api/v1/perfil/foto/upload-url — URL assinada de upload direto pro R2.
// Fluxo: pede a URL aqui → `PUT` da imagem crua nessa URL (fora do /api/v1,
// direto no R2) → `definirFotoUrl(linkPublico)`. Ver 16-api-v1.md §14.
export function pedirUrlUploadFoto(
  chamarApi: ChamarApi,
  contentType: string,
  tamanho: number
): Promise<{ url: string; chave: string; linkPublico: string }> {
  return chamarApi("/api/v1/perfil/foto/upload-url", {
    metodo: "POST",
    corpo: { contentType, tamanho },
  });
}
