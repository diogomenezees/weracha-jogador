import {
  depoisDaPartida,
  INTERVALO_MS,
  JANELA_PARTIDA_MS,
  lerHistorico,
  MAXIMO_PEDIDOS,
  podePedir,
  USO_MINIMO_MS,
} from "../regras";

const AGORA = Date.parse("2026-11-11T12:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const usoAntigo = iso(AGORA - USO_MINIMO_MS - 1);

describe("podePedir", () => {
  it("não pede sem 1º uso registrado", () => {
    expect(podePedir({ primeiroUsoEm: null, pedidos: [] }, AGORA)).toBe(false);
  });

  it("não pede antes do uso mínimo", () => {
    expect(podePedir({ primeiroUsoEm: iso(AGORA - USO_MINIMO_MS + 1000), pedidos: [] }, AGORA)).toBe(false);
  });

  it("pede depois do uso mínimo sem pedido anterior", () => {
    expect(podePedir({ primeiroUsoEm: usoAntigo, pedidos: [] }, AGORA)).toBe(true);
  });

  it("respeita o intervalo entre pedidos", () => {
    const recente = { primeiroUsoEm: usoAntigo, pedidos: [iso(AGORA - INTERVALO_MS + 1000)] };
    const velho = { primeiroUsoEm: usoAntigo, pedidos: [iso(AGORA - INTERVALO_MS - 1000)] };
    expect(podePedir(recente, AGORA)).toBe(false);
    expect(podePedir(velho, AGORA)).toBe(true);
  });

  it("para depois do máximo de pedidos", () => {
    const pedidos = Array.from({ length: MAXIMO_PEDIDOS }, (_, i) => iso(AGORA - (i + 2) * INTERVALO_MS)).reverse();
    expect(podePedir({ primeiroUsoEm: iso(AGORA - 10 * INTERVALO_MS), pedidos }, AGORA)).toBe(false);
  });
});

describe("depoisDaPartida", () => {
  it("dentro da janela da partida é false; depois é true", () => {
    expect(depoisDaPartida(iso(AGORA - JANELA_PARTIDA_MS + 1000), AGORA)).toBe(false);
    expect(depoisDaPartida(iso(AGORA - JANELA_PARTIDA_MS), AGORA)).toBe(true);
  });

  it("data inválida é false", () => {
    expect(depoisDaPartida("lixo", AGORA)).toBe(false);
  });
});

describe("lerHistorico", () => {
  it("tolera vazio e lixo", () => {
    expect(lerHistorico(null)).toEqual({ primeiroUsoEm: null, pedidos: [] });
    expect(lerHistorico("{")).toEqual({ primeiroUsoEm: null, pedidos: [] });
    expect(lerHistorico('{"primeiroUsoEm":1,"pedidos":["a",2]}')).toEqual({ primeiroUsoEm: null, pedidos: ["a"] });
  });
});
