import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Text } from "@/ui/Texto";
import { LogoWeRacha } from "@/ui/LogoWeRacha";
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  Download,
  Flame,
  Lock,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Phone,
  Play,
  Radio,
  Share2,
  Shuffle,
  Trophy,
  Users,
} from "@/ui/Icone";
import { cores, fontes, raio } from "@/tema";
import { Halo, Palco, Peca, rgba, type CorPalco } from "@/ui/PalcoAnimado";
import { marcarIntroVista } from "./vista";

// Intro de antes do login: apresenta o app inteiro pra quem acabou de instalar
// (o onboarding pós-login, `(logado)/onboarding.tsx`, é outra coisa: fala com
// quem vai organizar um grupo). Mostrada uma vez (flag em `./vista`). Mesmo molde
// visual do onboarding: barras de progresso no topo, pager horizontal e um
// "palco" com peças de UI espalhadas, que entram animadas e ficam flutuando.

const DURACAO_SLIDE_MS = 8000;

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
    eyebrow: "Bem-vindo ao WeRacha",
    titulo: "O seu racha num lugar só",
    descricao:
      "Confirme presença, veja os times sorteados e acompanhe o placar da partida, sem se perder no grupo do WhatsApp.",
    Visual: VisualRacha,
  },
  {
    cor: "orange",
    eyebrow: "Replays e artilheiros",
    titulo: "O jogo continua depois do apito",
    descricao:
      "Seus gols entram no ranking de artilheiros e viram replay em vídeo, pra rever, baixar e zoar na resenha.",
    Visual: VisualReplays,
  },
  {
    cor: "teal",
    eyebrow: "Bora jogar?",
    titulo: "Entre com seu telefone",
    descricao:
      "Recebeu um link de convite? Toque nele e você cai direto no grupo. Vai organizar o racha? Crie a conta e monte o seu grupo.",
    Visual: VisualEntrar,
  },
];

export default function TelaIntro() {
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const jaConcluiu = useRef(false);
  const [indice, setIndice] = useState(0);
  // `useState` (não `useRef`): o valor é lido no render (`interpolate`), ver onboarding.
  const [progresso] = useState(() => new Animated.Value(0));

  const ultimo = indice === SLIDES.length - 1;
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

  const concluir = useCallback(() => {
    if (jaConcluiu.current) return;
    jaConcluiu.current = true;
    void marcarIntroVista().finally(() => router.replace("/login"));
  }, []);

  // Barra de progresso + auto-avanço. No último slide a barra enche e para: quem
  // decide entrar é a pessoa, no botão "Começar".
  useEffect(() => {
    progresso.setValue(0);
    const anim = Animated.timing(progresso, {
      toValue: 1,
      duration: DURACAO_SLIDE_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished && indice < SLIDES.length - 1) irPara(indice + 1);
    });
    return () => anim.stop();
  }, [indice, irPara, progresso]);

  function aoRolar(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width === 0) return;
    const novo = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndice((atual) => (atual === novo ? atual : novo));
  }

  const corAtual = SLIDES[indice].cor;

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.barras}>
        {SLIDES.map((s, i) => (
          <View key={i} style={styles.barraTrilha}>
            {i < indice && <View style={[styles.barraCheia, corDe(s.cor, 0.5)]} />}
            {i === indice && (
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

      <View style={styles.topo}>
        <View style={styles.marca}>
          <LogoWeRacha tamanho={26} />
          <Text style={styles.marcaTexto}>WeRacha</Text>
        </View>
        {!ultimo && (
          <Pressable onPress={concluir} hitSlop={10}>
            <Text style={styles.pular}>Pular</Text>
          </Pressable>
        )}
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
              <Text style={[styles.eyebrow, slide.cor === "orange" && { color: cores.orange }]}>
                {slide.eyebrow}
              </Text>
              <Text style={styles.titulo}>{slide.titulo}</Text>
              <Text style={styles.descricao}>{slide.descricao}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.rodape}>
        {ultimo ? (
          <Pressable style={styles.botaoFinal} onPress={concluir}>
            <Text style={styles.botaoFinalTexto}>Começar</Text>
            <ArrowRight size={18} color={cores.dark} />
          </Pressable>
        ) : (
          <View style={styles.acoes}>
            <Text style={styles.contador}>
              <Text style={{ color: corAtual === "orange" ? cores.orange : cores.teal }}>
                {indice + 1}
              </Text>{" "}
              de {SLIDES.length}
            </Text>
            <Pressable style={styles.proximo} onPress={() => irPara(indice + 1)}>
              <Text style={styles.proximoTexto}>Próximo</Text>
              <ChevronRight size={14} color={corAtual === "orange" ? cores.orange : cores.teal} />
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function corDe(cor: Cor, alpha: number) {
  return { backgroundColor: rgba(cor, alpha) };
}

// ---------- Slide 1: o racha ----------

const AVATARES: { inicial: string; cor: string }[] = [
  { inicial: "R", cor: cores.teal },
  { inicial: "L", cor: cores.orange },
  { inicial: "D", cor: cores.tealDark },
  { inicial: "G", cor: "#3b82f6" },
  { inicial: "M", cor: cores.slate500 },
];

function VisualRacha({ ativo, palco }: { ativo: boolean; palco: number }) {
  return (
    <Palco palco={palco}>
      {/* Card principal: próxima partida com check-in */}
      <Peca ativo={ativo} atraso={0} flutua={3} style={{ left: palco * 0.06, right: palco * 0.06, top: palco * 0.17 }}>
        <View style={[v.card, { borderColor: cores.cardBorda }]}>
          <Text style={[v.eyebrow, { color: cores.teal }]}>PRÓXIMA PARTIDA</Text>
          <Text style={v.cardTitulo}>Racha de Quinta</Text>
          <View style={v.linhaInfo}>
            <Calendar size={13} color={cores.slate400} />
            <Text style={v.info}>Qui, 20h</Text>
            <MapPin size={13} color={cores.slate400} style={{ marginLeft: 8 }} />
            <Text style={v.info}>Arena Central</Text>
          </View>
          <View style={v.trilha}>
            <View style={[v.trilhaCheia, { width: "78%", backgroundColor: cores.teal }]} />
          </View>
          <View style={v.linhaEntre}>
            <View style={v.avatares}>
              {AVATARES.map((a, i) => (
                <View key={a.inicial} style={[v.avatar, { backgroundColor: a.cor, marginLeft: i === 0 ? 0 : -9 }]}>
                  <Text style={v.avatarTexto}>{a.inicial}</Text>
                </View>
              ))}
              <View style={[v.avatar, v.avatarMais]}>
                <Text style={[v.avatarTexto, { color: cores.slate300, fontSize: 10 }]}>+9</Text>
              </View>
            </View>
            <Text style={v.info}>
              <Text style={{ color: cores.teal, fontWeight: "700" }}>14</Text> de 18
            </Text>
          </View>
        </View>
      </Peca>

      {/* Chip laranja: times sorteados */}
      <Peca ativo={ativo} atraso={180} flutua={7} giro="5deg" style={{ right: 0, top: palco * 0.02 }}>
        <View style={[v.chip, { backgroundColor: cores.orange }]}>
          <Shuffle size={14} color={cores.dark} />
          <Text style={[v.chipTexto, { color: cores.dark }]}>Times sorteados</Text>
        </View>
      </Peca>

      {/* Chip teal: confirmado */}
      <Peca ativo={ativo} atraso={320} flutua={6} giro="-4deg" style={{ left: 0, bottom: palco * 0.1 }}>
        <View style={[v.chip, { backgroundColor: cores.darkMaisEscuro, borderColor: cores.teal, borderWidth: 1 }]}>
          <View style={v.checkBola}>
            <Check size={11} color={cores.dark} strokeWidth={3} />
          </View>
          <Text style={v.chipTexto}>Você confirmou!</Text>
        </View>
      </Peca>

      {/* Placar ao vivo */}
      <Peca ativo={ativo} atraso={460} flutua={8} giro="3deg" style={{ right: palco * 0.02, bottom: 0 }}>
        <View style={[v.card, v.placar, { borderColor: cores.laranjaBorda }]}>
          <View style={v.linhaInfo}>
            <Radio size={12} color={cores.orange} />
            <Text style={[v.eyebrow, { color: cores.orange }]}>AO VIVO</Text>
          </View>
          <View style={v.linhaPlacar}>
            <View style={[v.colete, { backgroundColor: cores.orange }]} />
            <Text style={v.placarNum}>3</Text>
            <Text style={v.placarX}>x</Text>
            <Text style={v.placarNum}>2</Text>
            <View style={[v.colete, { backgroundColor: cores.teal }]} />
          </View>
        </View>
      </Peca>
    </Palco>
  );
}

// ---------- Slide 2: replays e artilheiros ----------

function VisualReplays({ ativo, palco }: { ativo: boolean; palco: number }) {
  const largura = palco * 0.66;
  return (
    <Palco palco={palco}>
      {/* Replay do gol */}
      <Peca ativo={ativo} atraso={0} flutua={3} giro="-3deg" style={{ left: 0, top: palco * 0.12 }}>
        <View style={[v.card, { width: largura, padding: 10, borderColor: cores.laranjaBorda }]}>
          <View style={[v.video, { height: largura * 0.56 }]}>
            {/* campo desenhado: linha do meio e círculo central */}
            <View style={v.campoMeio} />
            <View style={[v.campoCirculo, { width: largura * 0.26, height: largura * 0.26, borderRadius: largura }]} />
            <View style={v.selosVideo}>
              <View style={[v.selo, { backgroundColor: cores.orange }]}>
                <Text style={[v.seloTexto, { color: cores.dark }]}>GOL</Text>
              </View>
            </View>
            <View style={v.botaoPlay}>
              <Play size={20} color={cores.dark} fill={cores.dark} />
            </View>
            <Text style={v.duracao}>0:08</Text>
          </View>
          <View style={[v.linhaEntre, { marginTop: 10 }]}>
            <Text style={v.info}>
              <Text style={{ color: cores.branco, fontWeight: "700" }}>Rafa</Text> · 2º tempo
            </Text>
            <View style={v.linhaInfo}>
              <Download size={15} color={cores.slate300} />
              <Share2 size={15} color={cores.slate300} style={{ marginLeft: 10 }} />
            </View>
          </View>
        </View>
      </Peca>

      {/* Pódio de artilheiros */}
      <Peca ativo={ativo} atraso={200} flutua={7} giro="4deg" style={{ right: 0, top: 0 }}>
        <View style={[v.card, { width: palco * 0.44, borderColor: cores.cardBorda, gap: 7 }]}>
          <View style={v.linhaInfo}>
            <Trophy size={12} color={cores.teal} />
            <Text style={[v.eyebrow, { color: cores.teal }]}>ARTILHEIROS</Text>
          </View>
          {[
            { m: "🥇", nome: "Rafa", gols: 9 },
            { m: "🥈", nome: "Léo", gols: 7 },
            { m: "🥉", nome: "Duda", gols: 6 },
          ].map((a) => (
            <View key={a.nome} style={v.linhaEntre}>
              <Text style={v.info}>
                {a.m} <Text style={{ color: cores.branco, fontWeight: "600" }}>{a.nome}</Text>
              </Text>
              <Text style={[v.info, { color: cores.teal, fontWeight: "700" }]}>{a.gols}</Text>
            </View>
          ))}
        </View>
      </Peca>

      {/* Comentário da resenha */}
      <Peca ativo={ativo} atraso={380} flutua={6} giro="-2deg" style={{ right: palco * 0.02, bottom: palco * 0.02 }}>
        <View style={v.balao}>
          <View style={[v.avatar, { backgroundColor: cores.orange, width: 26, height: 26 }]}>
            <Text style={v.avatarTexto}>L</Text>
          </View>
          <View>
            <Text style={[v.info, { color: cores.branco, fontWeight: "600" }]}>Golaço! Revi 5 vezes</Text>
            <View style={v.linhaInfo}>
              <MessageCircle size={11} color={cores.slate500} />
              <Text style={v.infoPequena}>Resenha</Text>
            </View>
          </View>
          <Flame size={16} color={cores.orange} />
        </View>
      </Peca>
    </Palco>
  );
}

// ---------- Slide 3: como entrar ----------

function VisualEntrar({ ativo, palco }: { ativo: boolean; palco: number }) {
  return (
    <Palco palco={palco}>
      {/* Mensagem com o link de convite, estilo conversa de grupo */}
      <Peca ativo={ativo} atraso={0} flutua={5} giro="-3deg" style={{ left: 0, top: palco * 0.02 }}>
        <View style={[v.balao, v.balaoConversa]}>
          <View>
            <Text style={[v.infoPequena, { color: cores.orange, fontWeight: "700" }]}>Grupo da pelada</Text>
            <Text style={[v.info, { color: cores.branco, marginTop: 2 }]}>Bora! Entra aí:</Text>
            <Text style={v.link}>weracha.app/convite/…</Text>
          </View>
        </View>
      </Peca>

      {/* Seta ligando o link ao grupo */}
      <Peca ativo={ativo} atraso={160} flutua={3} style={{ left: palco * 0.42, top: palco * 0.3 }}>
        <View style={[v.setaBola, { transform: [{ rotate: "35deg" }] }]}>
          <ArrowRight size={16} color={cores.teal} />
        </View>
      </Peca>

      {/* Card do grupo */}
      <Peca ativo={ativo} atraso={260} flutua={4} giro="2deg" style={{ right: 0, top: palco * 0.3 }}>
        <View style={[v.card, { width: palco * 0.56, borderColor: cores.cardBorda, gap: 8 }]}>
          <View style={v.linhaInfo}>
            <View style={v.logoBola}>
              <LogoWeRacha tamanho={22} />
            </View>
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={[v.cardTitulo, { fontSize: 15 }]}>Racha de Quinta</Text>
              <View style={v.linhaInfo}>
                <Users size={11} color={cores.slate400} />
                <Text style={v.infoPequena}>18 jogadores</Text>
              </View>
            </View>
          </View>
          <View style={v.botaoMini}>
            <Text style={v.botaoMiniTexto}>Entrar no grupo</Text>
          </View>
        </View>
      </Peca>

      {/* Campo de telefone */}
      <Peca ativo={ativo} atraso={420} flutua={6} giro="-2deg" style={{ left: palco * 0.02, bottom: 0 }}>
        <View style={[v.card, { width: palco * 0.6, borderColor: cores.cardBorda, gap: 8 }]}>
          <View style={v.campo}>
            <Phone size={14} color={cores.teal} />
            <Text style={[v.info, { color: cores.branco }]}>+55 (11) 9 8765-4321</Text>
          </View>
          <View style={v.linhaEntre}>
            <View style={v.linhaInfo}>
              <MessageSquareText size={11} color={cores.slate500} />
              <Text style={v.infoPequena}>Código por SMS</Text>
            </View>
            <Lock size={11} color={cores.slate500} />
          </View>
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
  topo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    minHeight: 46,
  },
  marca: { flexDirection: "row", alignItems: "center", gap: 8 },
  marcaTexto: { fontSize: 17, fontWeight: "700", color: cores.branco },
  pular: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: cores.slate400,
    textTransform: "uppercase",
  },
  pager: { flex: 1 },
  slide: { flex: 1, paddingHorizontal: 28 },
  visual: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  textos: { gap: 12, paddingBottom: 12 },
  eyebrow: {
    fontSize: 11,
    fontFamily: fontes.mono,
    letterSpacing: 2.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  titulo: { fontSize: 29, lineHeight: 34, fontWeight: "700", color: cores.branco },
  descricao: { fontSize: 15, lineHeight: 22, color: cores.slate400 },
  rodape: { paddingHorizontal: 28, paddingTop: 8, paddingBottom: 20 },
  acoes: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  contador: { fontSize: 13, fontFamily: fontes.mono, color: cores.slate500, letterSpacing: 1 },
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
});

// Peças dos palcos. Fundo opaco (não translúcido) porque elas se sobrepõem.
const v = StyleSheet.create({
  card: {
    borderRadius: raio.card,
    borderWidth: 1,
    backgroundColor: "#1a1f29",
    padding: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  eyebrow: { fontSize: 10, fontFamily: fontes.mono, letterSpacing: 1.5 },
  cardTitulo: { fontSize: 17, fontWeight: "700", color: cores.branco },
  linhaInfo: { flexDirection: "row", alignItems: "center", gap: 5 },
  linhaEntre: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  info: { fontSize: 13, color: cores.slate400 },
  infoPequena: { fontSize: 11, color: cores.slate500 },
  trilha: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginTop: 4,
  },
  trilhaCheia: { height: "100%", borderRadius: 3 },
  avatares: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#1a1f29",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMais: { backgroundColor: "#2a303c", marginLeft: -9 },
  avatarTexto: { fontSize: 12, fontWeight: "700", color: cores.dark },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  chipTexto: { fontSize: 13, fontWeight: "700", color: cores.branco },
  checkBola: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: cores.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  placar: { paddingVertical: 10, paddingHorizontal: 14, gap: 4 },
  linhaPlacar: { flexDirection: "row", alignItems: "center", gap: 8 },
  colete: { width: 10, height: 10, borderRadius: 3 },
  placarNum: { fontSize: 26, fontWeight: "700", color: cores.branco },
  placarX: { fontSize: 14, color: cores.slate500 },
  video: {
    borderRadius: 10,
    backgroundColor: "#12352f",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  campoMeio: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1.5,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  campoCirculo: { position: "absolute", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.14)" },
  selosVideo: { position: "absolute", top: 8, left: 8, flexDirection: "row", gap: 6 },
  selo: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  seloTexto: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  botaoPlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 3,
  },
  duracao: {
    position: "absolute",
    right: 8,
    bottom: 6,
    fontSize: 10,
    fontFamily: fontes.mono,
    color: cores.slate200,
  },
  balao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.laranjaBorda,
    backgroundColor: "#1a1f29",
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  balaoConversa: { borderColor: "rgba(255,255,255,0.1)", borderTopLeftRadius: 4, backgroundColor: "#1f2530" },
  link: { fontSize: 13, color: cores.teal, textDecorationLine: "underline", marginTop: 2 },
  setaBola: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    backgroundColor: cores.darkMaisEscuro,
    alignItems: "center",
    justifyContent: "center",
  },
  logoBola: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: cores.avisoFundo,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoMini: {
    height: 34,
    borderRadius: 10,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoMiniTexto: { fontSize: 13, fontWeight: "700", color: cores.dark },
  campo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
});
