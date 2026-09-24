import { abaixoDaMinima } from "../src/versao/comparar";

// Gate de versão mínima: só bloqueia quando as duas versões são legíveis e a do
// app é menor. Qualquer dúvida abre o app (fail-open).
describe("abaixoDaMinima", () => {
  it("bloqueia versão menor em qualquer casa", () => {
    expect(abaixoDaMinima("1.0.0", "1.0.1")).toBe(true);
    expect(abaixoDaMinima("1.0.9", "1.1.0")).toBe(true);
    expect(abaixoDaMinima("1.9.9", "2.0.0")).toBe(true);
  });

  it("libera versão igual ou maior", () => {
    expect(abaixoDaMinima("1.0.0", "1.0.0")).toBe(false);
    expect(abaixoDaMinima("1.2.0", "1.1.9")).toBe(false);
    expect(abaixoDaMinima("2.0.0", "1.9.9")).toBe(false);
  });

  it("compara número, não texto (1.10.0 é maior que 1.9.0)", () => {
    expect(abaixoDaMinima("1.10.0", "1.9.0")).toBe(false);
    expect(abaixoDaMinima("1.9.0", "1.10.0")).toBe(true);
  });

  it("aceita versão sem patch, com prefixo v e com sufixo", () => {
    expect(abaixoDaMinima("1.0", "1.0.1")).toBe(true);
    expect(abaixoDaMinima("v1.2.0", "1.1.0")).toBe(false);
    expect(abaixoDaMinima("1.0.0-beta", "1.0.0")).toBe(false);
  });

  it("versão ilegível nunca bloqueia", () => {
    expect(abaixoDaMinima("", "1.0.0")).toBe(false);
    expect(abaixoDaMinima("1.0.0", "abc")).toBe(false);
    expect(abaixoDaMinima("x", "y")).toBe(false);
  });
});
