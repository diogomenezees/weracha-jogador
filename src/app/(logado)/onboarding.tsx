import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";

import {
  CircleCheck,
  ChevronRight,
  Plus,
  Share2,
  Shuffle,
  Timer,
  Trophy,
  Users,
} from "@/ui/Icone";
import { useSessao } from "@/sessao/contexto";
import { cores, fontes, raio } from "@/tema";
import { Halo, Palco, Peca, pecaEstilos, rgba, type CorPalco } from "@/ui/PalcoAnimado";

// Onboarding de quem acabou de entrar e ainda não tem grupo. A intro de antes do
// login (`src/intro/`) já apresentou o app inteiro; aqui o assunto é só a escolha
// de como começar: Sorteio rápido (times na hora, nada salvo) ou Grupo (o racha de
// sempre). Termina com a própria escolha. Mesmo palco animado da intro.

const DURACAO_SLIDE_MS = 15000;

type Cor = CorPalco;

type Slide = {
  cor: Cor;
  eyebrow: string;
  titulo: string;
  descricao: string;
  Visual: (p: { ativo: boolean; palco: number }) => React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    cor: "teal",
    eyebrow: "Sorteio rápido",
    titulo: "Times na hora, sem cadastro",
    descricao:
      "Digite os nomes de quem veio e o app divide os times. Ninguém precisa ter conta e nada fica salvo. Bom pra pelada de última hora.",
    Visual: VisualSorteio,
  },
  {
    cor: "orange",
    eyebrow: "Grupo",
    titulo: "Pra quem joga sempre junto",
    descricao:
      "A galera entra pelo link de convite e confirma presença. O app lembra o nível de cada um pra equilibrar os times e guarda os gols e o histórico.",
    Visual: VisualGrupo,
  },
];

export default function Onboarding() {
  const { width, height } = useWindowDimensions();
  const { marcarOnboardingConcluido } = useSessao();
  const scrollRef = useRef<ScrollView>(null);
  const jaConcluiu = useRef(false);
  const [indice, setIndice] = useState(0);
  const [concluindo, setConcluindo] = useState(false);
  // `useState` (não `useRef`) pra não esbarrar no react-hooks/refs do lint com o
  // React Compiler: o valor é lido no render (`interpolate`).
  const [progresso] = useState(() => new Animated.Value(0));

  // Largura do palco; em tela baixa encolhe pra ele (0,9 x largura de altura) não
  // invadir as barras do topo nem o texto.
  const palco = Math.min(width - 48, 360, (height * 0.4) / 0.9);

  const irPara = useCallback(
    (i: number) => {
      const alvo = Math.max(0, Math.min(SLIDES.length - 1, i));
      scrollRef.current?.scrollTo({ x: alvo * width, animated: true });
      setIndice(alvo);
    },
    [width]
  );

  // Marca o onboarding como visto e segue pro destino ("Pular" volta pro painel).
  const concluir = useCallback(
    (destino: Href = "/painel") => {
      if (jaConcluiu.current) return;
      jaConcluiu.current = true;
      setConcluindo(true);
      void marcarOnboardingConcluido()
        .catch(() => {})
        .finally(() => router.replace(destino));
    },
    [marcarOnboardingConcluido]
  );

  // Barra de progresso + auto-avanço. No último slide a barra enche e para: a
  // escolha (grupo ou sorteio) é da pessoa.
  useEffect(() => {
    if (concluindo) return;
    progresso.setValue(0);
    const anim = Animated.timing(progresso, {
      toValue: 1,
      duration: DURACAO_SLIDE_MS,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished && indice < SLIDES.length - 1) irPara(indice + 1);
    });
    return () => anim.stop();
  }, [indice, concluindo, irPara, progresso]);

  function aoRolar(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width === 0) return;
    const novo = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndice((atual) => (atual === novo ? atual : novo));
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.barras}>
        {SLIDES.map((s, i) => (
          <View key={i} style={styles.barraTrilha}>
            {i < indice && (
              <View style={[styles.barraCheia, corDe(s.cor, 0.5)]} />
            )}
            {i === indice && !concluindo && (
              <Animated.View
                style={[
                  styles.barraCheia,
                  corDe(s.cor, 1),
                  { width: progresso.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={aoRolar}
        style={styles.pager}
      >
        {SLIDES.map((slide, i) => (
          <View key={slide.titulo} style={[styles.slide, { width }]}>
            <View style={styles.visual}>
              <Halo cor={slide.cor} tamanho={palco} />
              <slide.Visual ativo={i === indice} palco={palco} />
            </View>
            <View style={styles.textos}>
              <Text style={[styles.passo, slide.cor === "orange" && { color: cores.orange }]}>
                {slide.eyebrow}
              </Text>
              <Text style={styles.titulo}>{slide.titulo}</Text>
              <Text style={styles.descricao}>{slide.descricao}</Text>

              {i === SLIDES.length - 1 ? (
                <View style={styles.escolha}>
                  <Pressable
                    style={styles.botaoFinal}
                    onPress={() => concluir("/criar-grupo")}
                    disabled={concluindo}
                  >
                    <Plus size={18} color={cores.dark} />
                    <Text style={styles.botaoFinalTexto}>Criar um grupo</Text>
                  </Pressable>
                  <Pressable
                    style={styles.botaoSecundario}
                    onPress={() => concluir("/sorteio")}
                    disabled={concluindo}
                  >
                    <Shuffle size={16} color={cores.teal} />
                    <Text style={styles.botaoSecundarioTexto}>Fazer um sorteio rápido</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.acoes}>
                  <Pressable onPress={() => concluir()} hitSlop={8} disabled={concluindo}>
                    <Text style={styles.pular}>Pular</Text>
                  </Pressable>
                  <Pressable style={styles.proximo} onPress={() => irPara(i + 1)}>
                    <Text style={styles.proximoTexto}>Próximo</Text>
                    <ChevronRight size={14} color={cores.teal} />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function corDe(cor: Cor, alpha: number) {
  return { backgroundColor: rgba(cor, alpha) };
}

// ---------- Slide 1: Sorteio rápido ----------

const NOMES = ["Rafa", "Léo", "Duda", "Gui", "Beto", "Caio"];

function VisualSorteio({ ativo, palco }: { ativo: boolean; palco: number }) {
  return (
    <Palco palco={palco}>
      {/* Os nomes digitados */}
      <Peca ativo={ativo} atraso={0} flutua={4} giro="-4deg" style={{ left: 0, top: palco * 0.02 }}>
        <View style={[pecaEstilos.card, { width: palco * 0.52, borderColor: cores.cardBorda, gap: 8 }]}>
          <Text style={[v.eyebrow, { color: cores.slate400 }]}>QUEM VEIO</Text>
          <View style={v.nomes}>
            {NOMES.map((n) => (
              <View key={n} style={v.nome}>
                <Text style={v.nomeTexto}>{n}</Text>
              </View>
            ))}
          </View>
        </View>
      </Peca>

      {/* O sorteio no meio do caminho */}
      <Peca ativo={ativo} atraso={160} flutua={3} style={{ left: palco * 0.44, top: palco * 0.36 }}>
        <View style={v.bolaSorteio}>
          <Shuffle size={18} color={cores.dark} />
        </View>
      </Peca>

      {/* Os times que saíram */}
      <Peca ativo={ativo} atraso={280} flutua={5} giro="3deg" style={{ right: 0, bottom: palco * 0.04 }}>
        <View style={[pecaEstilos.card, { width: palco * 0.6, borderColor: cores.avisoBorda, gap: 8 }]}>
          <View style={v.linha}>
            <Shuffle size={12} color={cores.teal} />
            <Text style={[v.eyebrow, { color: cores.teal }]}>TIMES</Text>
          </View>
          <View style={v.times}>
            {[
              ["Rafa", "Gui", "Beto"],
              ["Léo", "Duda", "Caio"],
            ].map((time, t) => (
              <View key={t} style={[v.time, t === 0 && { backgroundColor: rgba("teal", 0.14) }]}>
                <View style={[v.colete, { backgroundColor: t === 0 ? cores.teal : cores.orange }]} />
                {time.map((n) => (
                  <Text key={n} style={v.nomeTime}>{n}</Text>
                ))}
              </View>
            ))}
          </View>
        </View>
      </Peca>

      <Peca ativo={ativo} atraso={420} flutua={7} giro="5deg" style={{ right: palco * 0.02, top: palco * 0.08 }}>
        <View style={[pecaEstilos.chip, v.chipContorno, { borderColor: cores.teal }]}>
          <Timer size={14} color={cores.teal} />
          <Text style={pecaEstilos.chipTexto}>Em 30 s</Text>
        </View>
      </Peca>

      <Peca ativo={ativo} atraso={540} flutua={6} giro="-3deg" style={{ left: palco * 0.02, bottom: palco * 0.08 }}>
        <View style={[pecaEstilos.chip, v.chipContorno, { borderColor: "rgba(255,255,255,0.15)" }]}>
          <Text style={[pecaEstilos.chipTexto, { color: cores.slate300 }]}>Nada fica salvo</Text>
        </View>
      </Peca>
    </Palco>
  );
}

// ---------- Slide 2: Grupo ----------

function VisualGrupo({ ativo, palco }: { ativo: boolean; palco: number }) {
  return (
    <Palco palco={palco}>
      {/* O grupo, com o nível de cada jogador */}
      <Peca ativo={ativo} atraso={0} flutua={3} giro="-3deg" style={{ left: 0, top: palco * 0.12 }}>
        <View style={[pecaEstilos.card, { width: palco * 0.58, borderColor: cores.laranjaBorda, gap: 8 }]}>
          <View style={v.linha}>
            <Users size={12} color={cores.orange} />
            <Text style={[v.eyebrow, { color: cores.orange }]}>RACHA DE QUINTA</Text>
          </View>
          {[
            { i: "R", nome: "Rafa", nota: 82, cor: cores.teal },
            { i: "L", nome: "Léo", nota: 71, cor: cores.orange },
            { i: "D", nome: "Duda", nota: 64, cor: cores.tealDark },
          ].map((j, k) => (
            <View key={j.nome} style={v.jogador}>
              <View style={[v.avatar, { backgroundColor: j.cor }]}>
                <Text style={v.avatarTexto}>{j.i}</Text>
              </View>
              <Text style={[v.texto, { flex: 1, color: cores.branco }]}>{j.nome}</Text>
              <Text style={[v.texto, { fontWeight: "700", color: k === 0 ? cores.orange : cores.slate400 }]}>
                {j.nota}
              </Text>
            </View>
          ))}
        </View>
      </Peca>

      <Peca ativo={ativo} atraso={180} flutua={7} giro="4deg" style={{ right: 0, top: 0 }}>
        <View style={[pecaEstilos.chip, v.chipContorno, { borderColor: cores.teal }]}>
          <Share2 size={14} color={cores.teal} />
          <Text style={pecaEstilos.chipTexto}>Convite pelo link</Text>
        </View>
      </Peca>

      {/* Check-in da próxima partida */}
      <Peca ativo={ativo} atraso={320} flutua={5} giro="3deg" style={{ right: palco * 0.01, top: palco * 0.44 }}>
        <View style={[pecaEstilos.card, { width: palco * 0.46, borderColor: cores.avisoBorda, gap: 8 }]}>
          <View style={v.linha}>
            <CircleCheck size={14} color={cores.teal} />
            <Text style={[v.texto, { color: cores.branco, fontWeight: "700" }]}>Check-in</Text>
          </View>
          <View style={v.trilha}>
            <View style={[v.trilhaCheia, { width: "78%" }]} />
          </View>
          <Text style={v.nota}>
            <Text style={{ color: cores.teal, fontWeight: "700" }}>14</Text> de 18 confirmados
          </Text>
        </View>
      </Peca>

      <Peca ativo={ativo} atraso={460} flutua={8} giro="-3deg" style={{ left: palco * 0.04, bottom: 0 }}>
        <View style={[pecaEstilos.chip, { backgroundColor: cores.orange }]}>
          <Trophy size={14} color={cores.dark} />
          <Text style={[pecaEstilos.chipTexto, { color: cores.dark }]}>Gols e histórico salvos</Text>
        </View>
      </Peca>
    </Palco>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.darkMaisEscuro },
  barras: { flexDirection: "row", gap: 6, paddingHorizontal: 20, paddingTop: 8 },
  barraTrilha: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  barraCheia: { height: "100%", width: "100%" },
  pager: { flex: 1 },
  slide: { flex: 1, paddingHorizontal: 28 },
  visual: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 16 },
  textos: { gap: 12, paddingBottom: 24 },
  passo: {
    fontSize: 11,
    fontFamily: fontes.mono,
    letterSpacing: 2.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  titulo: { fontSize: 27, lineHeight: 32, fontWeight: "700", color: cores.branco },
  descricao: { fontSize: 14, lineHeight: 21, color: cores.slate400 },
  escolha: { marginTop: 8, gap: 10 },
  botaoFinal: {
    height: 52,
    borderRadius: raio.card,
    backgroundColor: cores.orange,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoFinalTexto: { fontSize: 16, fontWeight: "700", color: cores.dark },
  botaoSecundario: {
    height: 48,
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    backgroundColor: cores.avisoFundo,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoSecundarioTexto: { fontSize: 15, fontWeight: "700", color: cores.teal },
  acoes: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pular: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: cores.slate400,
    textTransform: "uppercase",
  },
  proximo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: cores.superficieMedia,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  proximoTexto: { fontSize: 14, fontWeight: "700", color: cores.branco },
});

// Peças dos palcos.
const v = StyleSheet.create({
  eyebrow: { fontSize: 10, fontFamily: fontes.mono, letterSpacing: 1.5 },
  linha: { flexDirection: "row", alignItems: "center", gap: 6 },
  texto: { fontSize: 13, color: cores.slate400 },
  nota: { fontSize: 11, color: cores.slate500 },
  nomes: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  nome: {
    borderRadius: 999,
    backgroundColor: cores.superficieMedia,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  nomeTexto: { fontSize: 12, color: cores.slate200 },
  bolaSorteio: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: cores.teal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 9,
  },
  times: { flexDirection: "row", gap: 6 },
  time: { flex: 1, borderRadius: 8, backgroundColor: cores.superficieMedia, padding: 8, gap: 3 },
  colete: { width: 10, height: 10, borderRadius: 3, marginBottom: 2 },
  nomeTime: { fontSize: 12, color: cores.slate200 },
  jogador: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  avatarTexto: { fontSize: 10, fontWeight: "700", color: cores.dark },
  chipContorno: { backgroundColor: cores.darkMaisEscuro, borderWidth: 1 },
  trilha: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  trilhaCheia: { height: "100%", borderRadius: 3, backgroundColor: cores.teal },
});
