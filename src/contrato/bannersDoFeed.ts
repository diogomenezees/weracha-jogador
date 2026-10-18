// Banners intercalados nas listas de vídeo (Resenha, nas duas abas, e Meus
// replays): o de divulgação do nosso Instagram e as campanhas dos parceiros.
// Regra pura, sem React, pra ser copiada igual no app de jogador.
//
// ONDE entra banner não depende de ter campanha: o primeiro vem cedo, depois
// do 3º vídeo (em Meus replays o jogador tem poucos gols, não desceria até o
// 7º). Daí em diante, a cada 5 a 8 vídeos pra não ficar num ritmo previsível
// (e chato). A sequência é fixa em vez de aleatória pra posição não pular a
// cada render nem quando o scroll infinito anexa uma página nova.
//
// O QUE entra em cada espaço: com campanha no ar, a cada 3 espaços 2 são do
// Instagram e 1 de parceiro (Instagram, campanha, Instagram, Instagram,
// campanha…), pra ter mais propaganda nossa do que dos outros. O primeiro é
// sempre nosso. Sem campanha, todos são do Instagram.

export const INSTAGRAM_USUARIO = "weracha.app";
export const INSTAGRAM_URL = `https://www.instagram.com/${INSTAGRAM_USUARIO}`;

const PRIMEIRO = 3;
const INTERVALOS = [6, 5, 8, 7];
const CICLO = 3;
const POSICAO_CAMPANHA_NO_CICLO = 1;

export type MensagemBannerInstagram = { titulo: string; texto: string };

// Alterna entre "poste marcando" e "siga a página", na ordem em que os banners
// do Instagram aparecem na lista.
export const MENSAGENS_BANNER_INSTAGRAM: MensagemBannerInstagram[] = [
  {
    titulo: "Fez golaço? Mostra pro mundo",
    texto: `Baixe o vídeo no menu ⋮ e poste no Instagram marcando @${INSTAGRAM_USUARIO}.`,
  },
  {
    titulo: "Siga a gente no Instagram",
    texto: `Os melhores lances das peladas aparecem no @${INSTAGRAM_USUARIO}.`,
  },
  {
    titulo: "Quer seu lance no nosso perfil?",
    texto: `Posta o replay e marca @${INSTAGRAM_USUARIO} na publicação. A gente reposta os melhores.`,
  },
];

// `mensagem` indexa MENSAGENS_BANNER_INSTAGRAM; `campanha` indexa a lista de
// campanhas no ar que a tela recebeu (GET /api/v1/campanhas), que roda em
// círculo quando os espaços passam do número de campanhas.
export type BannerDoFeed =
  | { tipo: "instagram"; mensagem: number }
  | { tipo: "campanha"; campanha: number };

// Número (0-based) do espaço de banner logo depois do vídeo na posição
// `indice` (0-based) da lista, ou null se não vai banner ali.
// - Enquanto ainda tem página pra carregar (`listaCompleta` false), nunca põe
//   banner depois do último vídeo carregado, senão ele "pula" pra baixo quando
//   chega a próxima página.
// - Lista completa com menos vídeos que o PRIMEIRO (ex.: jogador com 1 ou 2
//   gols em Meus replays) mostra o banner no fim, pra ele não sumir de vez.
function espacoDeBannerDepoisDe(
  indice: number,
  totalCarregado: number,
  listaCompleta: boolean
): number | null {
  const ultimo = indice === totalCarregado - 1;
  if (ultimo && !listaCompleta) return null;
  if (ultimo && totalCarregado < PRIMEIRO) return 0;
  let posicao = PRIMEIRO;
  for (let n = 0; ; n++) {
    if (posicao - 1 === indice) return n;
    if (posicao - 1 > indice) return null;
    posicao += INTERVALOS[n % INTERVALOS.length];
  }
}

// Banner que vai logo depois do vídeo na posição `indice` (0-based), ou null.
// `totalCampanhas` é o tamanho da lista de campanhas no ar (0 = só Instagram).
export function bannerDoFeedDepoisDe(
  indice: number,
  totalCarregado: number,
  listaCompleta: boolean,
  totalCampanhas: number
): BannerDoFeed | null {
  const espaco = espacoDeBannerDepoisDe(indice, totalCarregado, listaCompleta);
  if (espaco === null) return null;
  if (totalCampanhas === 0) {
    return { tipo: "instagram", mensagem: espaco % MENSAGENS_BANNER_INSTAGRAM.length };
  }
  const ciclo = Math.floor(espaco / CICLO);
  if (espaco % CICLO === POSICAO_CAMPANHA_NO_CICLO) {
    return { tipo: "campanha", campanha: ciclo % totalCampanhas };
  }
  // Quantos espaços de campanha vieram antes deste, pra as mensagens do
  // Instagram seguirem em sequência sem pular nenhuma.
  const campanhasAntes = ciclo + (espaco % CICLO > POSICAO_CAMPANHA_NO_CICLO ? 1 : 0);
  return {
    tipo: "instagram",
    mensagem: (espaco - campanhasAntes) % MENSAGENS_BANNER_INSTAGRAM.length,
  };
}
