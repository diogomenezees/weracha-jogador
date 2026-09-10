import {
  aguardandoRenovacao,
  avulsoAguardandoNovoJogo,
  meuPapelNoGrupo,
  ordenarPorProximaPartida,
  partidaEmAndamento,
  proximaPartida,
  proximaPartidaInfo,
} from "../src/grupos";
import { formatarDataPartida } from "../src/formato";
import type { Grupo, PartidaResumo } from "../src/contrato/tipos";

function grupo(over: Partial<Grupo> = {}): Grupo {
  return {
    id: "g1",
    nome: "Racha",
    descricao: null,
    tipo: "RECORRENTE",
    dataAvulsa: null,
    horarios: [],
    esporte: "futsal",
    quadraId: null,
    jogadoresPorTime: 5,
    adminId: "dono",
    competenciaAno: 2026,
    competenciaMes: 8,
    partidas: [],
    meuPapel: "MEMBRO",
    meuScore: 50,
    meuScoreOrigem: "AUTO",
    meuPosicaoId: null,
    lembreteQuadraFechadoEm: null,
    ...over,
  };
}

function partida(over: Partial<PartidaResumo> = {}): PartidaResumo {
  return { id: "p", data: "", duracaoMin: null, cancelada: false, descricao: null, ...over };
}

const daquiA = (ms: number) => new Date(Date.now() + ms).toISOString();
const HORA = 3600_000;

describe("proximaPartida", () => {
  it("pega a mais próxima no futuro, ignora passado e cancelada", () => {
    const g = grupo({
      partidas: [
        partida({ id: "passada", data: daquiA(-2 * HORA) }),
        partida({ id: "cancelada", data: daquiA(1 * HORA), cancelada: true }),
        partida({ id: "longe", data: daquiA(48 * HORA) }),
        partida({ id: "logo", data: daquiA(24 * HORA) }),
      ],
    });
    expect(proximaPartida(g)?.id).toBe("logo");
  });

  it("null quando não há partida futura", () => {
    expect(proximaPartida(grupo({ partidas: [partida({ data: daquiA(-HORA) })] }))).toBeNull();
    expect(aguardandoRenovacao(grupo())).toBe(true);
    expect(avulsoAguardandoNovoJogo(grupo({ tipo: "AVULSO" }))).toBe(true);
  });
});

describe("partidaEmAndamento / proximaPartidaInfo", () => {
  it("acha a partida que já começou e ainda não terminou", () => {
    const g = grupo({
      partidas: [partida({ id: "rolando", data: daquiA(-0.5 * HORA), duracaoMin: 90 })],
    });
    expect(partidaEmAndamento(g)?.id).toBe("rolando");
    const info = proximaPartidaInfo(g);
    expect(info?.checkinDisponivel).toBe(true);
  });

  it("partida encerrada (fora da duração) não conta como em andamento", () => {
    const g = grupo({
      partidas: [partida({ data: daquiA(-3 * HORA), duracaoMin: 60 })],
    });
    expect(partidaEmAndamento(g)).toBeNull();
    expect(aguardandoRenovacao(g)).toBe(true);
  });

  it("sem partida em andamento, aponta a próxima futura sem check-in", () => {
    const g = grupo({ partidas: [partida({ data: daquiA(24 * HORA) })] });
    const info = proximaPartidaInfo(g);
    expect(info?.checkinDisponivel).toBe(false);
    expect(aguardandoRenovacao(g)).toBe(false);
  });
});

describe("ordenarPorProximaPartida", () => {
  it("grupos com partida antes; sem partida vão pro fim em ordem alfabética", () => {
    const comLogo = grupo({ id: "a", nome: "A", partidas: [partida({ data: daquiA(HORA) })] });
    const comDepois = grupo({ id: "b", nome: "B", partidas: [partida({ data: daquiA(10 * HORA) })] });
    const semData1 = grupo({ id: "z", nome: "Zebra", partidas: [] });
    const semData2 = grupo({ id: "m", nome: "Minhoca", partidas: [] });
    const ordem = ordenarPorProximaPartida([semData1, comDepois, semData2, comLogo]).map((g) => g.id);
    expect(ordem).toEqual(["a", "b", "m", "z"]);
  });
});

describe("meuPapelNoGrupo", () => {
  it("dono ganha de admin/membro", () => {
    expect(meuPapelNoGrupo(grupo({ adminId: "eu" }), "eu")).toBe("DONO");
    expect(meuPapelNoGrupo(grupo({ meuPapel: "ADMIN" }), "eu")).toBe("ADMIN");
    expect(meuPapelNoGrupo(grupo(), "eu")).toBe("MEMBRO");
  });
});

describe("formatarDataPartida", () => {
  it("formata dia da semana + data + hora", () => {
    // 2026-09-14 é uma segunda-feira.
    expect(formatarDataPartida("2026-09-14T21:30:00")).toBe("Seg, 14/09 · 21:30");
  });
  it("string inválida vira vazio", () => {
    expect(formatarDataPartida("nada")).toBe("");
  });
});
