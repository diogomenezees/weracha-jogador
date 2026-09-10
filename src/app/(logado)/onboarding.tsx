import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";

const DURACAO_SLIDE_MS = 20000;

type Cor = "teal" | "orange";

type Slide = {
  cor: Cor;
  titulo: string;
  descricao: string;
  visual: React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    cor: "teal",
    titulo: "Duas formas de organizar",
    descricao:
      "No sorteio, monta os times na hora e pronto: sem cadastro, nada salvo. No completo, cada jogador tem score, presença e histórico.",
    visual: <VisualSorteioVsCompleto />,
  },
  {
    cor: "teal",
    titulo: "Do racha fixo à partida de hoje",
    descricao:
      "Racha semanal gera as partidas sozinho, sem você lembrar de nada. Jogo avulso é data e hora, só dessa vez.",
    visual: <VisualCalendario />,
  },
  {
    cor: "orange",
    titulo: "Tudo que rola fora da quadra",
    descricao:
      "Da escalação ao chat pós-jogo, o app cuida da parte chata. Você só aparece pra jogar.",
    visual: <VisualRecursos />,
  },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const { marcarOnboardingConcluido } = useSessao();
  const scrollRef = useRef<ScrollView>(null);
  const jaConcluiu = useRef(false);
  const [indice, setIndice] = useState(0);
  const [concluindo, setConcluindo] = useState(false);
  // `useState` (não `useRef`) pra não esbarrar no react-hooks/refs do lint com o
  // React Compiler: o valor é lido no render (`interpolate`).
  const [progresso] = useState(() => new Animated.Value(0));

  const irPara = useCallback(
    (i: number) => {
      const alvo = Math.max(0, Math.min(SLIDES.length - 1, i));
      scrollRef.current?.scrollTo({ x: alvo * width, animated: true });
    },
    [width]
  );

  const concluir = useCallback(() => {
    if (jaConcluiu.current) return;
    jaConcluiu.current = true;
    setConcluindo(true);
    void marcarOnboardingConcluido()
      .catch(() => {})
      .finally(() => router.replace("/painel"));
  }, [marcarOnboardingConcluido]);

  // Barra de progresso + auto-avanço do slide atual.
  useEffect(() => {
    if (concluindo) return;
    progresso.setValue(0);
    const anim = Animated.timing(progresso, {
      toValue: 1,
      duration: DURACAO_SLIDE_MS,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (!finished) return;
      if (indice === SLIDES.length - 1) concluir();
      else irPara(indice + 1);
    });
    return () => anim.stop();
  }, [indice, concluindo, concluir, irPara, progresso]);

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
            <View style={styles.visual}>{slide.visual}</View>
            <View style={styles.textos}>
              <Text style={[styles.passo, slide.cor === "orange" && { color: cores.orange }]}>
                Passo {i + 1} de 3
              </Text>
              <Text style={styles.titulo}>{slide.titulo}</Text>
              <Text style={styles.descricao}>{slide.descricao}</Text>

              {i === SLIDES.length - 1 ? (
                <Pressable style={styles.botaoFinal} onPress={concluir} disabled={concluindo}>
                  <Text style={styles.botaoFinalTexto}>Vamos lá!</Text>
                </Pressable>
              ) : (
                <View style={styles.acoes}>
                  <Pressable onPress={concluir} hitSlop={8} disabled={concluindo}>
                    <Text style={styles.pular}>Pular</Text>
                  </Pressable>
                  <Pressable style={styles.proximo} onPress={() => irPara(i + 1)}>
                    <Text style={styles.proximoTexto}>Próximo ›</Text>
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
  const base = cor === "teal" ? "31, 179, 163" : "242, 140, 30";
  return { backgroundColor: `rgba(${base}, ${alpha})` };
}

function VisualSorteioVsCompleto() {
  return (
    <View style={visualStyles.linha}>
      <View style={[visualStyles.mini, { borderColor: "rgba(31,179,163,0.3)", backgroundColor: cores.avisoFundo }]}>
        <Text style={[visualStyles.miniRotulo, { color: cores.teal }]}>SORTEIO</Text>
        <View style={visualStyles.barraCinza} />
        <View style={visualStyles.barraCinzaCurta} />
        <View style={visualStyles.times}>
          <View style={[visualStyles.time, { backgroundColor: "rgba(31,179,163,0.25)" }]} />
          <View style={[visualStyles.time, { backgroundColor: cores.superficieMedia }]} />
        </View>
        <Text style={visualStyles.miniNota}>30 s</Text>
      </View>
      <View style={[visualStyles.mini, { borderColor: cores.laranjaBorda, backgroundColor: cores.laranjaFundo }]}>
        <Text style={[visualStyles.miniRotulo, { color: cores.orange }]}>COMPLETA</Text>
        {[82, 64, 71].map((n, i) => (
          <View key={i} style={visualStyles.jogadorLinha}>
            <View style={visualStyles.bolinha} />
            <View style={visualStyles.barraFlex} />
            <Text style={[visualStyles.score, i === 0 && { color: cores.orange }]}>{n}</Text>
          </View>
        ))}
        <Text style={visualStyles.miniNota}>Histórico salvo</Text>
      </View>
    </View>
  );
}

const DIAS_MINI = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

function VisualCalendario() {
  return (
    <View style={{ gap: 10 }}>
      <View style={visualStyles.semana}>
        {DIAS_MINI.map((d) => (
          <Text
            key={d}
            style={[
              visualStyles.diaLabel,
              d === "QUI" && { color: cores.teal },
              d === "DOM" && { color: cores.orange },
            ]}
          >
            {d}
          </Text>
        ))}
      </View>
      {[1, 0.5].map((op, linha) => (
        <View key={linha} style={[visualStyles.semana, { opacity: op }]}>
          {DIAS_MINI.map((d) => (
            <View
              key={d}
              style={[
                visualStyles.celula,
                d === "QUI" && { borderColor: cores.teal, backgroundColor: "rgba(31,179,163,0.15)", borderWidth: 1 },
                d === "DOM" && linha === 0 && { borderColor: cores.orange, backgroundColor: "rgba(242,140,30,0.15)", borderWidth: 1 },
              ]}
            >
              {d === "QUI" && <View style={[visualStyles.ponto, { backgroundColor: cores.teal }]} />}
              {d === "DOM" && linha === 0 && (
                <View style={[visualStyles.ponto, { backgroundColor: cores.orange }]} />
              )}
            </View>
          ))}
        </View>
      ))}
      <View style={visualStyles.tags}>
        <View style={[visualStyles.tag, { borderColor: "rgba(31,179,163,0.2)", backgroundColor: cores.avisoFundo }]}>
          <View style={[visualStyles.ponto, { backgroundColor: cores.teal }]} />
          <Text style={visualStyles.tagTexto}>Toda quinta</Text>
        </View>
        <View style={[visualStyles.tag, { borderColor: "rgba(242,140,30,0.2)", backgroundColor: cores.laranjaFundo }]}>
          <View style={[visualStyles.ponto, { backgroundColor: cores.orange }]} />
          <Text style={visualStyles.tagTexto}>Só domingo</Text>
        </View>
      </View>
    </View>
  );
}

function VisualRecursos() {
  const itens: { emoji: string; cor: Cor; titulo: string; texto: string }[] = [
    { emoji: "🏆", cor: "teal", titulo: "Score de 0 a 100", texto: "Times equilibrados automaticamente" },
    { emoji: "📊", cor: "teal", titulo: "Enquete", texto: "O grupo decide junto antes do jogo" },
    { emoji: "📡", cor: "orange", titulo: "Modo ao vivo", texto: "Cronômetro e gols em tempo real" },
    { emoji: "💬", cor: "orange", titulo: "Resenha", texto: "Chat aberto durante e depois do jogo" },
  ];
  return (
    <View style={{ gap: 10, width: "100%" }}>
      {itens.map((it) => (
        <View
          key={it.titulo}
          style={[
            visualStyles.recurso,
            { borderColor: it.cor === "teal" ? "rgba(31,179,163,0.2)" : "rgba(242,140,30,0.2)" },
          ]}
        >
          <Text style={visualStyles.recursoEmoji}>{it.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={visualStyles.recursoTitulo}>{it.titulo}</Text>
            <Text style={visualStyles.recursoTexto}>{it.texto}</Text>
          </View>
        </View>
      ))}
    </View>
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
  visual: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24 },
  textos: { gap: 12, paddingBottom: 24 },
  passo: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  titulo: { fontSize: 27, lineHeight: 32, fontWeight: "700", color: cores.branco },
  descricao: { fontSize: 14, lineHeight: 21, color: cores.slate400 },
  botaoFinal: {
    marginTop: 8,
    height: 52,
    borderRadius: raio.card,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoFinalTexto: { fontSize: 16, fontWeight: "700", color: cores.dark },
  acoes: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pular: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: cores.slate400,
    textTransform: "uppercase",
  },
  proximo: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: cores.superficieMedia,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  proximoTexto: { fontSize: 14, fontWeight: "700", color: cores.branco },
});

const visualStyles = StyleSheet.create({
  linha: { flexDirection: "row", gap: 14, width: "100%" },
  mini: { flex: 1, borderRadius: raio.card, borderWidth: 1, padding: 14, gap: 8 },
  miniRotulo: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  barraCinza: { height: 8, width: "80%", borderRadius: 4, backgroundColor: "rgba(255,255,255,0.16)" },
  barraCinzaCurta: { height: 8, width: "55%", borderRadius: 4, backgroundColor: "rgba(255,255,255,0.1)" },
  times: { flexDirection: "row", gap: 6, marginTop: 2 },
  time: { flex: 1, height: 28, borderRadius: 8 },
  miniNota: { fontSize: 10, color: cores.slate500 },
  jogadorLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  bolinha: { width: 14, height: 14, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.1)" },
  barraFlex: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.12)" },
  score: { fontSize: 10, color: cores.slate500, fontWeight: "700" },
  semana: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  diaLabel: { flex: 1, textAlign: "center", fontSize: 9, letterSpacing: 0.5, color: cores.slate600 },
  celula: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  ponto: { width: 6, height: 6, borderRadius: 3 },
  tags: { flexDirection: "row", gap: 10, marginTop: 4 },
  tag: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tagTexto: { fontSize: 12, color: cores.slate300 },
  recurso: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: raio.card,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
  },
  recursoEmoji: { fontSize: 20 },
  recursoTitulo: { fontSize: 14, fontWeight: "700", color: cores.branco },
  recursoTexto: { fontSize: 12, color: cores.slate400 },
});
