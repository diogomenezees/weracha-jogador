import { bannerDoFeedDepoisDe, type BannerDoFeed } from "../src/contrato/bannersDoFeed";

// Mesma regra do site (weracha-site/lib/bannersDoFeed.ts): um banner a cada 3
// vídeos; ciclo Instagram, todas as campanhas no ar, Instagram de novo. Nos
// espaços nossos, o 2º de cada 3 é o aviso de expiração.

// Banners de uma lista de `total` vídeos, com a posição (1-based) do vídeo
// que vem antes.
function banners(
  total: number,
  listaCompleta: boolean,
  totalCampanhas = 0,
  comAvisoExpiracao = true
): [number, BannerDoFeed][] {
  const r: [number, BannerDoFeed][] = [];
  for (let i = 0; i < total; i++) {
    const b = bannerDoFeedDepoisDe(i, total, listaCompleta, totalCampanhas, comAvisoExpiracao);
    if (b !== null) r.push([i + 1, b]);
  }
  return r;
}

const ig = (mensagem: number): BannerDoFeed => ({ tipo: "instagram", mensagem });
const camp = (campanha: number): BannerDoFeed => ({ tipo: "campanha", campanha });
const aviso: BannerDoFeed = { tipo: "expiracao" };

describe("bannerDoFeedDepoisDe", () => {
  it("põe um banner a cada 3 vídeos", () => {
    expect(banners(16, true).map(([p]) => p)).toEqual([3, 6, 9, 12, 15]);
  });

  it("não põe banner depois do último enquanto tem página pra carregar", () => {
    expect(banners(3, false)).toEqual([]);
    expect(banners(6, false).map(([p]) => p)).toEqual([3]);
  });

  it("lista curta e completa mostra o banner no fim, sempre do Instagram", () => {
    expect(banners(1, true)).toEqual([[1, ig(0)]]);
    expect(banners(2, true, 3)).toEqual([[2, ig(0)]]);
  });

  it("sem campanha, todos são nossos: Instagram com as mensagens em sequência e o aviso", () => {
    expect(banners(21, true).map(([, b]) => b)).toEqual([
      ig(0),
      aviso,
      ig(1),
      ig(2),
      aviso,
      ig(0),
      ig(1),
    ]);
  });

  it("sem o aviso (aba Favoritos), todos os nossos são do Instagram", () => {
    expect(banners(12, true, 0, false).map(([, b]) => b)).toEqual([ig(0), ig(1), ig(2), ig(0)]);
  });

  it("com campanhas, Instagram e depois todas elas antes de voltar pro Instagram", () => {
    expect(banners(27, true, 3).map(([, b]) => b)).toEqual([
      ig(0),
      camp(0),
      camp(1),
      camp(2),
      aviso,
      camp(0),
      camp(1),
      camp(2),
      ig(1),
    ]);
  });

  it("com uma campanha só, alterna Instagram e ela", () => {
    expect(banners(15, true, 1).map(([, b]) => b)).toEqual([
      ig(0),
      camp(0),
      aviso,
      camp(0),
      ig(1),
    ]);
  });
});
