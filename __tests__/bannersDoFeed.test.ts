import { bannerDoFeedDepoisDe, type BannerDoFeed } from "../src/contrato/bannersDoFeed";

// Mesma regra do site (weracha-site/lib/bannersDoFeed.ts): um banner a cada 3
// vídeos; ciclo Instagram, todas as campanhas no ar, Instagram de novo.

// Banners de uma lista de `total` vídeos, com a posição (1-based) do vídeo
// que vem antes.
function banners(
  total: number,
  listaCompleta: boolean,
  totalCampanhas = 0
): [number, BannerDoFeed][] {
  const r: [number, BannerDoFeed][] = [];
  for (let i = 0; i < total; i++) {
    const b = bannerDoFeedDepoisDe(i, total, listaCompleta, totalCampanhas);
    if (b !== null) r.push([i + 1, b]);
  }
  return r;
}

const ig = (mensagem: number): BannerDoFeed => ({ tipo: "instagram", mensagem });
const camp = (campanha: number): BannerDoFeed => ({ tipo: "campanha", campanha });

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

  it("sem campanha, todos são do Instagram, alternando as mensagens", () => {
    expect(banners(12, true).map(([, b]) => b)).toEqual([ig(0), ig(1), ig(2), ig(0)]);
  });

  it("com campanhas, Instagram e depois todas elas antes de voltar pro Instagram", () => {
    expect(banners(27, true, 3).map(([, b]) => b)).toEqual([
      ig(0),
      camp(0),
      camp(1),
      camp(2),
      ig(1),
      camp(0),
      camp(1),
      camp(2),
      ig(2),
    ]);
  });

  it("com uma campanha só, alterna Instagram e ela", () => {
    expect(banners(15, true, 1).map(([, b]) => b)).toEqual([
      ig(0),
      camp(0),
      ig(1),
      camp(0),
      ig(2),
    ]);
  });
});
