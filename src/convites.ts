import { router, type Href } from "expo-router";

import { processarConvite, type Alvo } from "@/api/convites";
import type { OpcoesRequisicao } from "@/api/cliente";
import type { ResultadoConvite } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// Extrai o token de um convite colado pelo usuário. Aceita a URL completa
// (`https://weracha.app/convite/<token>`, `weracha://convite/<token>`,
// `exp://192.168.0.10:8081/--/convite/<token>`) ou o token solto. Devolve null se
// não sobrar nada com cara de token (`crypto.randomBytes(9).toString("base64url")`
// no site: 12 chars do alfabeto A-Za-z0-9_-).
export function tokenDeConvite(texto: string): string | null {
  const limpo = texto.trim();
  if (!limpo) return null;

  // Com "convite/" na string: pega só o trecho já do alfabeto válido (não
  // captura até a próxima barra/`?`/espaço e *depois* limpa) — apps de
  // mensagem costumam colar um "." ou ")" de pontuação no fim do link ao
  // autolinkar, e isso não pode entrar no token.
  const naUrl = limpo.match(/convite\/([A-Za-z0-9_-]+)/i);
  if (naUrl) return naUrl[1].length >= 6 ? naUrl[1] : null;

  // Sem "convite/": só aceita se o texto INTEIRO (tirando pontuação de abre/
  // fecha colada nas pontas, ex.: "(AbC123xYz9)") for do alfabeto do token.
  // Diferente do caso acima, aqui não dá pra só pegar o prefixo válido — uma
  // frase qualquer que comece com 6+ letras ("Confirma sua presença...") não
  // é um token.
  const semPontuacao = limpo
    .replace(/^[([{'"]+/, "")
    .replace(/[.,;:!?)\]}'"]+$/, "");
  return /^[A-Za-z0-9_-]{6,}$/.test(semPontuacao) ? semPontuacao : null;
}

// O `destino` que `POST /api/v1/convites/{token}` devolve é um caminho do site
// (`/grupos/{id}`, `/grupos/{id}/partidas/{id}/checkin`,
// `/grupos/{id}/enquetes?enquete={id}`). As rotas do app têm o mesmo formato, então
// o caminho serve direto; só validamos o prefixo e caímos na tela do grupo se vier
// algo inesperado.
export function rotaDoConvite(destino: string, grupoId: string): Href {
  return (destino.startsWith("/grupos/") ? destino : `/grupos/${grupoId}`) as Href;
}

// Processa o convite pro jogador já autenticado (entra no grupo) e navega pro
// destino que a resposta manda, via `rotaDoConvite`. Mesmo passo usado tanto
// pelo botão "Entrar no grupo" de `/convite/[token]` quanto pelo login que
// veio de um link de convite (`useFluxoAcesso.concluirLogin`) — um só lugar
// decidindo como o `ResultadoConvite` vira navegação. O erro sobe pra quem
// chamou: a tela mostra na UI, o login engole como best-effort (a conta já
// está logada de qualquer forma).
export async function processarConviteEIrParaDestino(
  chamarApi: ChamarApi,
  token: string,
  alvo?: Alvo
): Promise<ResultadoConvite> {
  const r = await processarConvite(chamarApi, token, alvo);
  router.replace(rotaDoConvite(r.destino, r.grupoId));
  return r;
}
