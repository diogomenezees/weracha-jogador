import * as WebBrowser from "expo-web-browser";

// Domínio de produção do site. Usado pra montar links de convite / de grupo
// que vão pro WhatsApp (sempre apontam pro site no ar, nunca pro Local).
export const PRODUCAO_URL = "https://weracha.app";

// Documentos legais: sempre a versão web de produção (mesmo conteúdo, sempre no
// ar, e é o que as lojas esperam num link público). Não replicamos o texto no
// app de propósito. Ver weracha-site/app/{termos,privacidade}/page.tsx.
export const URL_TERMOS = "https://weracha.app/termos";
export const URL_PRIVACIDADE = "https://weracha.app/privacidade";

// Ouvidoria. Abrimos a página web (tem o Turnstile funcionando) em vez de
// replicar o formulário + captcha no app. Serve pra quem não está conseguindo
// entrar acionar a gente.
export const URL_CONTATO = "https://weracha.app/contato";

export function abrirNoNavegador(url: string): void {
  void WebBrowser.openBrowserAsync(url);
}
