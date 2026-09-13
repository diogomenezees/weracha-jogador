import { router } from "expo-router";

jest.mock("@/api/convites", () => ({
  processarConvite: jest.fn(),
  buscarConvite: jest.fn(),
}));

import { processarConvite } from "@/api/convites";
import {
  processarConviteEIrParaDestino,
  rotaDoConvite,
  tokenDeConvite,
} from "../src/convites";

// Trava tokenDeConvite/rotaDoConvite contra os casos que motivaram a reescrita
// (trailing punctuation de apps de mensagem, prosa que não é um token). Ver
// weracha-jogador/CLAUDE.md e docs/10-app-de-jogador.md.
describe("tokenDeConvite", () => {
  it("extrai o token de uma URL completa", () => {
    expect(tokenDeConvite("https://weracha.app/convite/AbC123xYz9")).toBe(
      "AbC123xYz9"
    );
  });

  it("ignora querystring depois do token na URL", () => {
    expect(
      tokenDeConvite("https://weracha.app/convite/AbC123xYz9?partida=X")
    ).toBe("AbC123xYz9");
  });

  it("funciona com o esquema weracha:// e exp://", () => {
    expect(tokenDeConvite("weracha://convite/AbC123xYz9")).toBe("AbC123xYz9");
    expect(
      tokenDeConvite("exp://192.168.0.10:8081/--/convite/AbC123xYz9")
    ).toBe("AbC123xYz9");
  });

  it("não deixa pontuação de autolink colada no fim do token, dentro da URL", () => {
    expect(tokenDeConvite("https://weracha.app/convite/AbC123xYz9.")).toBe(
      "AbC123xYz9"
    );
    expect(tokenDeConvite("(weracha://convite/AbC123xYz9)")).toBe(
      "AbC123xYz9"
    );
  });

  it("aceita o token colado sozinho, com espaço em volta", () => {
    expect(tokenDeConvite("  AbC-123_xYz9  ")).toBe("AbC-123_xYz9");
  });

  it("tira pontuação de abre/fecha do token colado sozinho", () => {
    expect(tokenDeConvite("AbC123xYz9.")).toBe("AbC123xYz9");
    expect(tokenDeConvite("(AbC123xYz9)")).toBe("AbC123xYz9");
    expect(tokenDeConvite('"AbC123xYz9"')).toBe("AbC123xYz9");
  });

  it("rejeita token curto demais", () => {
    expect(tokenDeConvite("abc12")).toBeNull();
    expect(tokenDeConvite("https://weracha.app/convite/abc12")).toBeNull();
  });

  it("rejeita texto vazio", () => {
    expect(tokenDeConvite("")).toBeNull();
    expect(tokenDeConvite("   ")).toBeNull();
  });

  // O bug que motivou reescrever: um fallback ingênuo que pega só o PREFIXO
  // válido do texto aceitaria a primeira palavra de qualquer frase como token.
  it("rejeita uma frase qualquer que comece com 6+ letras", () => {
    expect(
      tokenDeConvite("Confirma sua presença no racha de sábado")
    ).toBeNull();
    expect(tokenDeConvite("oi")).toBeNull();
  });
});

describe("rotaDoConvite", () => {
  it("usa o destino quando ele é um caminho de grupo", () => {
    expect(rotaDoConvite("/grupos/g1/partidas/p1/checkin", "g1")).toBe(
      "/grupos/g1/partidas/p1/checkin"
    );
  });

  it("cai no grupo quando o destino foge do padrão esperado", () => {
    expect(rotaDoConvite("/algo-inesperado", "g1")).toBe("/grupos/g1");
  });
});

describe("processarConviteEIrParaDestino", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("navega pro destino que a API devolveu", async () => {
    (processarConvite as jest.Mock).mockResolvedValue({
      ok: true,
      grupoId: "g1",
      destino: "/grupos/g1/partidas/p1/checkin",
      jaEraMembro: false,
    });
    const replaceSpy = jest.spyOn(router, "replace").mockImplementation(() => {});
    const chamarApi = jest.fn();

    const r = await processarConviteEIrParaDestino(chamarApi as never, "tok");

    expect(processarConvite).toHaveBeenCalledWith(chamarApi, "tok", undefined);
    expect(replaceSpy).toHaveBeenCalledWith("/grupos/g1/partidas/p1/checkin");
    expect(r.grupoId).toBe("g1");
    replaceSpy.mockRestore();
  });

  it("não navega e deixa o erro subir se a API recusar o convite", async () => {
    (processarConvite as jest.Mock).mockRejectedValue(new Error("CONVITE_INVALIDO"));
    const replaceSpy = jest.spyOn(router, "replace").mockImplementation(() => {});
    const chamarApi = jest.fn();

    await expect(
      processarConviteEIrParaDestino(chamarApi as never, "tok")
    ).rejects.toThrow("CONVITE_INVALIDO");
    expect(replaceSpy).not.toHaveBeenCalled();
    replaceSpy.mockRestore();
  });
});
