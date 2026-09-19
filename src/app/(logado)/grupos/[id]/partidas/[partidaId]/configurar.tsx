import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { router, useLocalSearchParams } from "expo-router";

import { buscarDadosDoGrupo } from "@/api/grupos";
import { buscarApoioDaPartida } from "@/api/checkins";
import {
  buscarConfiguracao,
  buscarPreAlocacoes,
  buscarResultadoAtivo,
  buscarUltimoModoSorteio,
  gerarSorteio,
  salvarConfiguracao,
  salvarPreAlocacoes,
} from "@/api/partidas";
import { adicionarCor, buscarCoresDoGrupo, desativarCor } from "@/api/cores";
import { mensagemDoErro } from "@/mensagens-erro";
import { MenuAcoes, type ItemMenu } from "@/grupo/MenuAcoes";
import { ModalCartao, ModalConfirmar } from "@/grupo/modais";
import { ModalPerfil } from "@/jogadores/modais";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import {
  AvisoPartida,
  Cabecalho,
  CardJogadorPartida,
  Eyebrow,
  Rodape,
  BotaoPrimario,
  SegOrdenacao,
  Stepper,
  TelaPartida,
  ToggleScore,
} from "@/partida/ui";
import { buscarPartida, duracaoDaPartida } from "@/grupos";
import { dentroDaJanelaDeCheckin, sugerirJogadoresPorTime } from "@/partidas";
import { useSessao } from "@/sessao/contexto";
import { ArrowDownAZ, Clock, Palette, Plus, Settings, Shield, Shuffle, Star, Swords } from "@/ui/Icone";
import { cores, raio } from "@/tema";
import type {
  CorGrupo,
  DadosDeApoioDaPartida,
  Grupo,
  JogadorEmPartida,
  ModoSorteio,
  PartidaResumo,
} from "@/contrato/tipos";

type Ordenacao = "NOME" | "SCORE" | "CHEGADA";

// Cores principais pra colete: uma família por opção (nenhum par muito
// parecido), cobrindo os tons de camisa mais comuns numa pelada.
const SWATCHES = [
  "#ef4444", // vermelho
  "#f97316", // laranja
  "#eab308", // amarelo
  "#22c55e", // verde
  "#15803d", // verde escuro
  "#14b8a6", // teal
  "#3b82f6", // azul
  "#1e3a8a", // azul marinho
  "#a855f7", // roxo
  "#ec4899", // rosa
  "#78350f", // marrom
  "#6b7280", // cinza
  "#ffffff", // branco
  "#111827", // preto
];

type Presente = {
  jogador: JogadorEmPartida;
  score: number;
  posicaoNome: string | null;
  ehGoleiro: boolean;
  checkinEm: string;
};

export default function TelaConfigurar() {
  const { id, partidaId } = useLocalSearchParams<{ id: string; partidaId: string }>();
  const { chamarApi } = useSessao();

  const [grupo, setGrupo] = useState<Grupo | null | undefined>(undefined);
  const [partida, setPartida] = useState<PartidaResumo | null | undefined>(undefined);
  const [semAcesso, setSemAcesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [pronto, setPronto] = useState(false);

  const [presentes, setPresentes] = useState<Presente[]>([]);
  const [jogadoresPorTime, setJogadoresPorTime] = useState(5);
  const [modo, setModo] = useState<ModoSorteio>("SCORE");
  const [duracaoRodadaMin, setDuracaoRodadaMin] = useState(0);
  const [golsParaEncerrar, setGolsParaEncerrar] = useState(0);
  const [coresPaleta, setCoresPaleta] = useState<CorGrupo[]>([]);
  const [fixacoes, setFixacoes] = useState<Record<string, number>>({});
  const [paletaAberta, setPaletaAberta] = useState(false);
  const [verScore, setVerScore] = useState(false);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("NOME");

  const [menuFixar, setMenuFixar] = useState<{ jogadorId: string; nome: string } | null>(null);
  const [corParaRemover, setCorParaRemover] = useState<CorGrupo | null>(null);
  const [confirmarInicio, setConfirmarInicio] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erroSorteio, setErroSorteio] = useState<string | null>(null);
  const [perfilId, setPerfilId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const dados = await buscarDadosDoGrupo(chamarApi, id);
    const g = dados.grupo ?? null;
    setGrupo(g);
    if (g && g.meuPapel !== "ADMIN") {
      setSemAcesso(true);
      setPartida(null);
      return;
    }
    const p = g ? buscarPartida(g, partidaId) ?? null : null;
    setPartida(p);
    if (!g || !p) return;

    const jaTemResultado = await buscarResultadoAtivo(chamarApi, partidaId);
    if (jaTemResultado) {
      router.replace(`/grupos/${id}/partidas/${partidaId}/resultado`);
      return;
    }

    const [config, apoio, paleta, preAloc, ultimoModo] = await Promise.all([
      buscarConfiguracao(chamarApi, partidaId),
      buscarApoioDaPartida(chamarApi, partidaId),
      buscarCoresDoGrupo(chamarApi, id),
      buscarPreAlocacoes(chamarApi, partidaId),
      buscarUltimoModoSorteio(chamarApi, partidaId),
    ]);

    setPresentes(montarPresentes(apoio));
    setJogadoresPorTime(config?.jogadoresPorTime ?? sugerirJogadoresPorTime(apoio.checkins.length));
    setModo(ultimoModo ?? "SCORE");
    setDuracaoRodadaMin(config?.duracaoRodadaMin ?? 0);
    setGolsParaEncerrar(config?.golsParaEncerrarRodada ?? 0);
    setCoresPaleta(paleta);
    setFixacoes(Object.fromEntries(preAloc.map((pa) => [pa.jogadorId, pa.timeIndice])));
    setPronto(true);
  }, [chamarApi, id, partidaId]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        await carregar();
        if (vivo) setErro(null);
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [carregar, tentativa]);

  const total = presentes.length;
  const minimo = jogadoresPorTime * 2;
  const bloqueado = jogadoresPorTime < 1 || total < minimo;
  const timesPossiveis = bloqueado ? 0 : Math.floor(total / jogadoresPorTime);
  const sobra = bloqueado ? 0 : total - timesPossiveis * jogadoresPorTime;
  const comPosicao = presentes.filter((p) => p.posicaoNome).length;
  const goleiros = presentes.filter((p) => p.ehGoleiro).length;
  const coresDisponiveis = SWATCHES.filter(
    (hex) => !coresPaleta.some((c) => c.hex.toLowerCase() === hex)
  );

  const contagemFixadosPorTime = useMemo(
    () =>
      Array.from({ length: timesPossiveis }, (_, i) =>
        Object.values(fixacoes).filter((t) => t === i).length
      ),
    [fixacoes, timesPossiveis]
  );
  const capacidadeExcedida = contagemFixadosPorTime.some((c) => c > jogadoresPorTime);

  const presentesOrdenados = useMemo(
    () =>
      [...presentes].sort((a, b) => {
        if (ordenacao === "SCORE" && a.score !== b.score) return b.score - a.score;
        if (ordenacao === "CHEGADA") {
          const ca = new Date(a.checkinEm).getTime();
          const cb = new Date(b.checkinEm).getTime();
          if (ca !== cb) return cb - ca;
        }
        return a.jogador.nome.localeCompare(b.jogador.nome, "pt-BR");
      }),
    [presentes, ordenacao]
  );

  async function handleAdicionarCor(hex: string) {
    try {
      const cor = await adicionarCor(chamarApi, id, hex);
      setCoresPaleta((prev) => [...prev, cor]);
      setErroSorteio(null);
      setPaletaAberta(false);
    } catch (e) {
      setErroSorteio(mensagemDoErro(e));
    }
  }

  async function handleIniciar() {
    setConfirmarInicio(false);
    setErroSorteio(null);
    setGerando(true);
    try {
      await Promise.all([
        salvarConfiguracao(chamarApi, partidaId, {
          jogadoresPorTime,
          duracaoRodadaMin,
          golsParaEncerrarRodada: golsParaEncerrar,
        }),
        salvarPreAlocacoes(chamarApi, partidaId, fixacoes),
      ]);
      await gerarSorteio(chamarApi, partidaId, jogadoresPorTime, modo);
      router.replace(`/grupos/${id}/partidas/${partidaId}/resultado`);
    } catch (e) {
      setErroSorteio(mensagemDoErro(e));
      setGerando(false);
    }
  }

  if (erro) {
    return (
      <TelaPartida voltar="Check-in">
        <TelaErro mensagem={erro} onTentar={() => setTentativa((t) => t + 1)} />
      </TelaPartida>
    );
  }
  if (semAcesso) {
    return (
      <TelaPartida voltar="Check-in">
        <AvisoPartida
          mensagem="Só um admin do grupo pode configurar a partida."
          destino={`/grupos/${id}`}
          rotuloDestino="Grupo"
        />
      </TelaPartida>
    );
  }
  if (grupo === undefined || partida === undefined || (grupo && partida && !pronto)) {
    return (
      <TelaPartida voltar="Check-in">
        <TelaCarregando mensagem="Carregando configuração..." />
      </TelaPartida>
    );
  }
  const g = grupo;
  const p = partida;
  if (!g || !p) {
    return (
      <TelaPartida voltar="Check-in">
        <AvisoPartida mensagem="Partida não encontrada." destino="/painel" rotuloDestino="Painel" />
      </TelaPartida>
    );
  }
  if (p.cancelada) {
    return (
      <TelaPartida voltar="Check-in">
        <AvisoPartida
          mensagem="Essa partida foi cancelada."
          destino={`/grupos/${id}`}
          rotuloDestino="Grupo"
        />
      </TelaPartida>
    );
  }
  if (!dentroDaJanelaDeCheckin(new Date(p.data), duracaoDaPartida(g, p))) {
    return (
      <TelaPartida voltar="Check-in">
        <AvisoPartida
          mensagem="A configuração só fica disponível durante a janela da partida."
          destino={`/grupos/${id}`}
          rotuloDestino="Grupo"
        />
      </TelaPartida>
    );
  }

  if (gerando) {
    return (
      <TelaPartida voltar="Check-in">
        <TelaCarregando mensagem="Calculando os times..." />
      </TelaPartida>
    );
  }

  return (
    <TelaPartida voltar="Check-in">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Cabecalho titulo="Configurar partida" Icone={Settings} grupoNome={g.nome} descricao={p.descricao} />
        <SegOrdenacao
          opcoes={[
            { chave: "SCORE", rotulo: "Score", Icone: Star },
            { chave: "POSICAO", rotulo: "Posição", Icone: Shield },
            { chave: "SORTE", rotulo: "Sorte", Icone: Shuffle },
          ]}
          valor={modo}
          onChange={setModo}
          expandir
        />

        <View style={styles.bloco}>
          <View style={styles.blocoLinha}>
            <View style={{ flex: 1 }}>
              <Text style={styles.blocoTitulo}>Jogadores por time</Text>
              {bloqueado ? (
                <Text style={styles.blocoErro}>
                  Precisa de pelo menos {minimo} jogadores pra formar 2 times.
                </Text>
              ) : (
                <Text style={styles.blocoOk}>
                  {timesPossiveis} time{timesPossiveis === 1 ? "" : "s"}{" "}
                  {timesPossiveis === 1 ? "possível" : "possíveis"}
                </Text>
              )}
            </View>
            <Stepper valor={jogadoresPorTime} onChange={setJogadoresPorTime} min={1} max={20} />
          </View>
          {!bloqueado && sobra > 0 && (
            <Text style={styles.blocoErro}>
              {sobra} jogador{sobra > 1 ? "es" : ""} {sobra > 1 ? "ficam" : "fica"} na lista de
              próximos
            </Text>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Eyebrow>Cores dos coletes</Eyebrow>
          <View style={styles.coresLinha}>
            {coresPaleta.map((cor) => (
              <Pressable
                key={cor.id}
                style={[styles.swatch, { backgroundColor: cor.hex }]}
                onPress={() => setCorParaRemover(cor)}
              />
            ))}
            <Pressable
              style={styles.swatchAdicionar}
              onPress={() => setPaletaAberta(true)}
              accessibilityLabel="Adicionar cor de colete"
            >
              <Plus size={16} color={cores.teal} />
            </Pressable>
          </View>
          <Text style={styles.coresNota}>Toque numa cor cadastrada pra remover.</Text>
        </View>

        {capacidadeExcedida && (
          <Text style={styles.blocoErro}>
            Um time tem mais jogadores fixados do que cabe. Ajuste antes de sortear.
          </Text>
        )}

        <View style={styles.tituloLinha}>
          <Eyebrow>Jogadores ({total})</Eyebrow>
          <View style={styles.tituloAcoes}>
            <View style={styles.ordGrupo}>
              {(
                [
                  ["NOME", ArrowDownAZ, "Ordenar por nome"],
                  ["CHEGADA", Clock, "Ordenar por chegada (mais novo primeiro)"],
                  ["SCORE", Star, "Ordenar por score"],
                ] as const
              ).map(([v, Icone, rotulo], i) => (
                <Pressable
                  key={v}
                  accessibilityLabel={rotulo}
                  style={[
                    styles.ordBtn,
                    i > 0 && styles.ordBtnDivisor,
                    ordenacao === v && styles.ordBtnAtivo,
                  ]}
                  onPress={() => setOrdenacao(v)}
                >
                  <Icone size={16} color={ordenacao === v ? cores.dark : cores.slate400} />
                </Pressable>
              ))}
            </View>
            <ToggleScore ligado={verScore} onToggle={() => setVerScore((v) => !v)} />
          </View>
        </View>

        {modo === "POSICAO" && !bloqueado && (goleiros < timesPossiveis || comPosicao < total) && (
          <View style={styles.avisoPos}>
            {goleiros < timesPossiveis && (
              <Text style={styles.avisoPosTexto}>
                {goleiros === 0
                  ? "Nenhum goleiro entre os presentes."
                  : `Só ${goleiros} goleiro${goleiros > 1 ? "s" : ""} pra ${timesPossiveis} times.`}{" "}
                Os times sem goleiro se viram na quadra.
              </Text>
            )}
            {comPosicao < total && (
              <Text style={styles.avisoPosTexto}>
                {total - comPosicao} de {total} jogadores sem posição. Entram completando os times,
                equilibrados pelo score.
              </Text>
            )}
          </View>
        )}

        <View style={{ gap: 8 }}>
          {presentesOrdenados.map(({ jogador, score, posicaoNome }) => {
            const fix = fixacoes[jogador.id];
            return (
              <CardJogadorPartida
                key={jogador.id}
                id={jogador.id}
                nome={jogador.nome}
                apelido={jogador.apelido}
                fotoUrl={jogador.fotoUrl}
                posicaoNome={posicaoNome}
                score={score}
                mostrarScore={verScore}
                onAbrirPerfil={() => setPerfilId(jogador.id)}
                direita={
                  <Pressable
                    style={styles.fixChip}
                    disabled={bloqueado}
                    onPress={() => setMenuFixar({ jogadorId: jogador.id, nome: jogador.nome })}
                  >
                    <Text style={styles.fixChipTexto}>
                      {fix === undefined ? "Livre ▾" : `Time ${fix + 1} ▾`}
                    </Text>
                  </Pressable>
                }
              />
            );
          })}
        </View>
      </ScrollView>

      <Rodape
        erro={erroSorteio}
        primario={
          <BotaoPrimario
            titulo="Iniciar separação"
            desativado={bloqueado || capacidadeExcedida}
            onPress={() => setConfirmarInicio(true)}
          />
        }
      />

      <MenuAcoes
        aberto={menuFixar !== null}
        titulo={menuFixar ? `Time fixo de ${menuFixar.nome}` : undefined}
        itens={
          menuFixar
            ? ([
                {
                  rotulo: "Sem preferência",
                  onPress: () =>
                    setFixacoes((prev) => {
                      const resto = { ...prev };
                      delete resto[menuFixar.jogadorId];
                      return resto;
                    }),
                },
                ...Array.from({ length: Math.max(timesPossiveis, 1) }, (_, i) => i).map(
                  (i): ItemMenu => ({
                    rotulo: `Time ${i + 1}`,
                    onPress: () =>
                      setFixacoes((prev) => ({ ...prev, [menuFixar.jogadorId]: i })),
                  })
                ),
              ] as ItemMenu[])
            : []
        }
        onFechar={() => setMenuFixar(null)}
      />

      <ModalCartao aberto={paletaAberta} onFechar={() => setPaletaAberta(false)}>
        <View style={styles.paletaEyebrowLinha}>
          <Palette size={16} color={cores.teal} />
          <Eyebrow>Cores</Eyebrow>
        </View>
        <Text style={styles.paletaTitulo}>Adicionar cor de colete</Text>
        {coresDisponiveis.length > 0 ? (
          <View style={styles.paletaGrade}>
            {coresDisponiveis.map((hex) => (
              <Pressable
                key={hex}
                style={[styles.swatch, { backgroundColor: hex }]}
                onPress={() => void handleAdicionarCor(hex)}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.coresNota}>Todas as cores já estão cadastradas.</Text>
        )}
      </ModalCartao>

      <ModalConfirmar
        aberto={corParaRemover !== null}
        eyebrow="Cores"
        titulo="Remover essa cor?"
        descricao="Ela deixa de aparecer nos novos sorteios. Resultados que já usaram continuam mostrando ela."
        destrutivo
        confirmarLabel="Remover cor"
        onConfirmar={async () => {
          if (!corParaRemover) return;
          try {
            await desativarCor(chamarApi, corParaRemover.id);
            setCoresPaleta((prev) => prev.filter((c) => c.id !== corParaRemover.id));
          } catch (e) {
            setErroSorteio(mensagemDoErro(e));
          } finally {
            setCorParaRemover(null);
          }
        }}
        onFechar={() => setCorParaRemover(null)}
      />

      <ModalConfirmar
        aberto={confirmarInicio}
        Icone={Swords}
        eyebrow="Sem volta"
        titulo={
          modo === "POSICAO"
            ? "Separar os times por posição?"
            : modo === "SORTE"
              ? "Separar os times na sorte?"
              : "Separar os times por score?"
        }
        descricao="Depois de iniciada, não dá pra voltar e mexer no check-in ou nos jogadores por time."
        cancelarLabel="Ainda não"
        confirmarLabel="Sim, iniciar"
        onConfirmar={() => void handleIniciar()}
        onFechar={() => setConfirmarInicio(false)}
      />

      {perfilId && (
        <ModalPerfil
          key={perfilId}
          aberto
          chamarApi={chamarApi}
          grupoId={id}
          jogadorId={perfilId}
          onFechar={() => setPerfilId(null)}
        />
      )}
    </TelaPartida>
  );
}

function montarPresentes(apoio: DadosDeApoioDaPartida): Presente[] {
  const jogadorPorId = new Map(apoio.jogadores.map((j) => [j.id, j]));
  const scorePorId = new Map(apoio.checkins.map((c) => [c.jogadorId, c.scoreNoCheckin ?? 50]));
  const posNomePorId = new Map(apoio.posicoes.map((p) => [p.id, p.nome]));
  const posGoleiroPorId = new Map(apoio.posicoes.map((p) => [p.id, p.ehGoleiro]));
  const posIdPorJogador = new Map(apoio.membros.map((m) => [m.jogadorId, m.posicaoId]));

  return apoio.checkins
    .map((c) => {
      const jogador = jogadorPorId.get(c.jogadorId);
      if (!jogador) return null;
      const posId = posIdPorJogador.get(jogador.id) ?? null;
      return {
        jogador,
        score: scorePorId.get(jogador.id) ?? 50,
        posicaoNome: posId ? (posNomePorId.get(posId) ?? null) : null,
        ehGoleiro: posId ? (posGoleiroPorId.get(posId) ?? false) : false,
        checkinEm: c.checkinEm,
      };
    })
    .filter((x): x is Presente => !!x);
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 150, gap: 16 },
  bloco: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 12,
    gap: 8,
  },
  blocoLinha: { flexDirection: "row", alignItems: "center", gap: 12 },
  blocoTitulo: { fontSize: 14, fontWeight: "600", color: cores.slate300 },
  blocoErro: { fontSize: 13, color: cores.erroTexto },
  blocoOk: { fontSize: 13, fontWeight: "600", color: "#6ee7b7" },
  coresLinha: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  swatchAdicionar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: cores.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  coresNota: { fontSize: 12, color: cores.slate400 },
  paletaEyebrowLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  paletaTitulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  paletaGrade: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  tituloLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  tituloAcoes: { flexDirection: "row", alignItems: "center", gap: 8 },
  ordGrupo: {
    flexDirection: "row",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    overflow: "hidden",
  },
  ordBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  ordBtnDivisor: { borderLeftWidth: 1, borderLeftColor: cores.avisoBorda },
  ordBtnAtivo: { backgroundColor: cores.teal },
  avisoPos: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.ambarBorda,
    backgroundColor: cores.ambarFundo,
    padding: 10,
    gap: 4,
  },
  avisoPosTexto: { fontSize: 12, lineHeight: 17, color: cores.ambar },
  fixChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  fixChipTexto: { fontSize: 11, color: cores.branco },
});
