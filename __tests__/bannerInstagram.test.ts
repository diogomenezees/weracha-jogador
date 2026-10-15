import { bannerInstagramDepoisDe } from "../src/contrato/bannerInstagram";

// Posições (1-based) dos banners numa lista de `total` vídeos.
function posicoes(total: number, listaCompleta: boolean): number[] {
  const r: number[] = [];
  for (let i = 0; i < total; i++) {
    if (bannerInstagramDepoisDe(i, total, listaCompleta) !== null) r.push(i + 1);
  }
  return r;
}

// Mesma regra do site (weracha-site/lib/bannerInstagram.ts): primeiro depois
// do 3º vídeo, depois a cada 6, 5, 8, 7.
describe("bannerInstagramDepoisDe", () => {
  it("segue a sequência fixa", () => {
    expect(posicoes(40, true)).toEqual([3, 9, 14, 22, 29, 35, 40]);
  });

  it("não põe banner depois do último enquanto tem página pra carregar", () => {
    expect(posicoes(3, false)).toEqual([]);
    expect(posicoes(9, false)).toEqual([3]);
  });

  it("lista curta e completa mostra o banner no fim", () => {
    expect(posicoes(1, true)).toEqual([1]);
    expect(posicoes(2, true)).toEqual([2]);
  });

  it("alterna as mensagens na ordem dos banners", () => {
    expect([2, 8, 13, 21].map((i) => bannerInstagramDepoisDe(i, 40, true))).toEqual([0, 1, 2, 0]);
  });
});
