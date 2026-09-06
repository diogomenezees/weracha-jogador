import {
  CODIGOS_ERRO,
  ehCodigoErro,
  statusDoCodigo,
} from "../src/contrato/codigos-erro";

// Trava a cópia Nível 1 do enum de códigos de erro do site
// (weracha-site/lib/api/codigosErro.ts). Se o site adicionar/remover/renomear um
// código e a cópia daqui não acompanhar, este teste quebra. É o gatilho pra
// subir pro Nível 2 (pacote compartilhado), decidido no doc do app.

describe("contrato de códigos de erro", () => {
  it("tem a quantidade esperada de códigos", () => {
    // Ao mudar de propósito, atualize este número junto com o array.
    expect(CODIGOS_ERRO.length).toBe(134);
  });

  it("não tem código duplicado", () => {
    expect(new Set(CODIGOS_ERRO).size).toBe(CODIGOS_ERRO.length);
  });

  it("todo código é SCREAMING_SNAKE_CASE", () => {
    for (const c of CODIGOS_ERRO) {
      expect(c).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });

  it("contém os códigos que o app depende hoje", () => {
    const essenciais = [
      "NAO_AUTENTICADO",
      "TOKEN_ACESSO_AUSENTE",
      "TOKEN_ACESSO_INVALIDO",
      "SENHA_INCORRETA",
      "SENHA_NAO_DEFINIDA",
      "TELEFONE_NAO_VERIFICADO",
      "CONTA_BLOQUEADA",
      "LOGIN_BLOQUEADO",
      "CODIGO_LIMITE_DIARIO",
      "SMS_DESABILITADO",
      "CORPO_INVALIDO",
      "ERRO_INTERNO",
    ];
    for (const c of essenciais) {
      expect(CODIGOS_ERRO).toContain(c);
    }
  });

  it("ehCodigoErro distingue conhecido de desconhecido", () => {
    expect(ehCodigoErro("SENHA_INCORRETA")).toBe(true);
    expect(ehCodigoErro("NAO_EXISTE_ESSE")).toBe(false);
    expect(ehCodigoErro(42)).toBe(false);
    expect(ehCodigoErro(null)).toBe(false);
  });

  it("statusDoCodigo espelha o status HTTP do site", () => {
    expect(statusDoCodigo("SENHA_INCORRETA")).toBe(401);
    expect(statusDoCodigo("NAO_AUTENTICADO")).toBe(401);
    expect(statusDoCodigo("SOMENTE_MASTER")).toBe(403);
    expect(statusDoCodigo("JOGADOR_NAO_ENCONTRADO")).toBe(404);
    expect(statusDoCodigo("LOGIN_BLOQUEADO")).toBe(429);
    expect(statusDoCodigo("CODIGO_LIMITE_DIARIO")).toBe(429);
    expect(statusDoCodigo("SMS_DESABILITADO")).toBe(503);
    expect(statusDoCodigo("ERRO_INTERNO")).toBe(500);
    // padrão 422 pra regra de negócio sem status próprio
    expect(statusDoCodigo("SCORE_CONGELADO")).toBe(422);
  });
});
