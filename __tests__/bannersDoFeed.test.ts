import { bannerDoFeedDepoisDe, type BannerDoFeed } from "../src/contrato/bannersDoFeed";

// Mesma regra do site (weracha-site/lib/bannersDoFeed.ts): primeiro banner
// depois do 3º vídeo, depois a cada 6, 5, 8, 7; com campanha no ar, a cada 3
// espaços 2 são do Instagram e 1 de parceiro.

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
  it("segue a sequência fixa de posições", () => {
    expect(banners(40, true).map(([p]) => p)).toEqual([3, 9, 14, 22, 29, 35, 40]);
  });

  it("não põe banner depois do último enquanto tem página pra carregar", () => {
    expect(banners(3, false)).toEqual([]);
    expect(banners(9, false).map(([p]) => p)).toEqual([3]);
  });

  it("lista curta e completa mostra o banner no fim, sempre do Instagram", () => {
    expect(banners(1, true)).toEqual([[1, ig(0)]]);
    expect(banners(2, true, 3)).toEqual([[2, ig(0)]]);
  });

  it("sem campanha, todos são do Instagram, alternando as mensagens", () => {
    expect(banners(22, true).map(([, b]) => b)).toEqual([ig(0), ig(1), ig(2), ig(0)]);
  });

  it("com campanha, 2 do Instagram pra cada 1 de parceiro, sem pular mensagem", () => {
    expect(banners(40, true, 2).map(([, b]) => b)).toEqual([
      ig(0),
      camp(0),
      ig(1),
      ig(2),
      camp(1),
      ig(0),
      ig(1),
    ]);
  });

  it("com uma campanha só, ela se repete nos espaços de parceiro", () => {
    expect(
      banners(40, true, 1)
        .map(([, b]) => b)
        .filter((b) => b.tipo === "campanha")
    ).toEqual([camp(0), camp(0)]);
  });
});
