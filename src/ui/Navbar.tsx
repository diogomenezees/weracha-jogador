import { useEffect, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { Text } from "@/ui/Texto";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";

import { abrirNoNavegador, URL_CONTATO } from "@/config/links";
import { rotuloDoAmbiente } from "@/config/servidor";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { useBlurTarget } from "@/ui/BlurTarget";
import { LogoWeRacha } from "@/ui/LogoWeRacha";
import {
  BarChart3,
  ChevronLeft,
  CircleUserRound,
  Goal,
  LayoutDashboard,
  type LucideIcon,
  LogOut,
  Mail,
  Menu,
  Shuffle,
  Store,
  UserCheck,
  Users,
  Video,
  X,
} from "@/ui/Icone";

// Cabeçalho padronizado das telas logadas. Espelha `weracha-site/components/navbar.tsx`:
// marca à esquerda (ou um "‹ destino" quando a tela é interna) e um botão de menu
// à direita que abre a gaveta com as telas principais. A gaveta é dona do próprio
// estado — cada tela só renderiza `<Navbar />` (ou `<Navbar voltar="Grupo" />`).

type Item =
  | { rotulo: string; Icone: LucideIcon; tipo: "rota"; rota: Href; beta?: boolean }
  | { rotulo: string; Icone: LucideIcon; tipo: "em-breve"; beta?: boolean }
  | { rotulo: string; Icone: LucideIcon; tipo: "externo"; url: string };

// Mesma ordem e mesmos ícones (lucide) do menu do site
// (weracha-site/components/navbar.tsx). Telas não portadas cairiam no /em-breve
// (nenhuma hoje).
const ITENS: Item[] = [
  { rotulo: "Perfil", Icone: CircleUserRound, tipo: "rota", rota: "/perfil" },
  { rotulo: "Grupos", Icone: Users, tipo: "rota", rota: "/painel" },
  { rotulo: "Artilheiros", Icone: Goal, tipo: "rota", rota: "/artilheiros" },
  { rotulo: "Replays", Icone: Video, tipo: "rota", rota: "/replays", beta: true },
  { rotulo: "Enquetes", Icone: BarChart3, tipo: "rota", rota: "/enquetes" },
  { rotulo: "Parcerias", Icone: Store, tipo: "rota", rota: "/parcerias" },
  { rotulo: "Contato", Icone: Mail, tipo: "externo", url: URL_CONTATO },
  { rotulo: "Sorteio rápido", Icone: Shuffle, tipo: "rota", rota: "/sorteio" },
];

export function Navbar({
  voltar,
  onVoltar,
}: {
  voltar?: string;
  onVoltar?: () => void;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <View style={styles.barra}>
      {voltar ? (
        <Pressable
          hitSlop={10}
          style={styles.voltarBotao}
          onPress={onVoltar ?? (() => router.back())}
          accessibilityRole="button"
          accessibilityLabel={`Voltar para ${voltar}`}
        >
          <ChevronLeft size={24} color={cores.slate400} />
          {voltar === "Grupo" && <Users size={18} color={cores.slate400} />}
          {voltar === "Painel" && <LayoutDashboard size={18} color={cores.slate400} />}
          {voltar === "Check-in" && <UserCheck size={18} color={cores.slate400} />}
          {voltar === "Times" && <Users size={18} color={cores.slate400} />}
          <Text style={styles.voltarTexto}>{voltar}</Text>
        </Pressable>
      ) : (
        <View style={styles.marcaLinha}>
          <LogoWeRacha tamanho={32} />
          <Text style={styles.marca}>
            We<Text style={styles.marcaForte}>Racha</Text>
          </Text>
        </View>
      )}

      <Pressable
        hitSlop={10}
        style={styles.menuBotao}
        onPress={() => setAberto(true)}
        accessibilityRole="button"
        accessibilityLabel="Abrir menu"
      >
        <Menu size={26} color={cores.slate300} />
      </Pressable>

      <Gaveta aberto={aberto} onFechar={() => setAberto(false)} />
    </View>
  );
}

const LARGURA_GAVETA = 300;
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

function Gaveta({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { estado, ambiente, sair } = useSessao();
  const jogador = estado.fase === "logado" ? estado.jogador : null;
  const blurTarget = useBlurTarget();

  // Desliza da direita, sem fade nativo do Modal por cima (igual ao
  // `slide-in-from-right` / `slide-out-to-right` do Sheet do site). `anim`:
  // 1 = fora da tela, 0 = aberto. O Modal só desmonta depois que a animação de
  // saída termina, senão o painel some de repente em vez de deslizar pra fora.
  const [montado, setMontado] = useState(aberto);
  const [anim] = useState(() => new Animated.Value(aberto ? 0 : 1));

  // Ajuste de estado durante o render (não num efeito): abrir precisa montar
  // o Modal na hora, antes de qualquer animação rodar.
  if (aberto && !montado) {
    setMontado(true);
  }

  useEffect(() => {
    if (aberto) {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    } else if (montado) {
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start(() => {
        setMontado(false);
      });
    }
  }, [aberto, anim, montado]);

  if (!montado) return null;

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LARGURA_GAVETA],
  });
  const opacidadeFundo = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  function irPara(item: Item) {
    onFechar();
    if (item.tipo === "externo") {
      abrirNoNavegador(item.url);
    } else if (item.tipo === "rota") {
      router.navigate(item.rota);
    } else {
      router.navigate({ pathname: "/em-breve", params: { titulo: item.rotulo } });
    }
  }

  return (
    <Modal visible transparent animationType="none" onRequestClose={onFechar}>
      <View style={styles.gavetaRaiz}>
        <AnimatedBlurView
          intensity={40}
          tint="dark"
          blurMethod="dimezisBlurView"
          blurTarget={blurTarget}
          style={[styles.fundo, { opacity: opacidadeFundo }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onFechar}
            accessibilityLabel="Fechar menu"
          />
        </AnimatedBlurView>

        <Animated.View style={[styles.painel, { transform: [{ translateX }] }]}>
          <SafeAreaView style={styles.painelInterno} edges={["top", "bottom", "right"]}>
            <View style={styles.painelTopo}>
              {jogador ? (
                <View style={styles.perfil}>
                  <AvatarJogador
                    id={jogador.id}
                    nome={jogador.nome}
                    fotoUrl={jogador.fotoUrl}
                    tamanho={40}
                  />
                  <View style={styles.perfilTextos}>
                    <Text style={styles.perfilNome} numberOfLines={1}>
                      {jogador.nome}
                    </Text>
                    {jogador.apelido ? (
                      <Text style={styles.perfilApelido} numberOfLines={1}>
                        {jogador.apelido}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : (
                <View style={styles.perfil} />
              )}
              <Pressable
                hitSlop={10}
                onPress={onFechar}
                style={styles.fechar}
                accessibilityRole="button"
                accessibilityLabel="Fechar menu"
              >
                <X size={20} color={cores.slate300} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.itens} showsVerticalScrollIndicator={false}>
              {ITENS.map((item) => (
                <Pressable key={item.rotulo} style={styles.item} onPress={() => irPara(item)}>
                  <View style={styles.itemIcone}>
                    <item.Icone size={20} color={cores.slate400} />
                  </View>
                  <Text style={styles.itemTexto}>{item.rotulo}</Text>
                  {item.tipo !== "externo" && item.beta ? (
                    <Text style={styles.beta}>Beta</Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.rodape}>
              <Text style={styles.ambiente}>{`Servidor: ${rotuloDoAmbiente(ambiente)}`}</Text>
              <Pressable
                style={styles.item}
                onPress={() => {
                  onFechar();
                  void sair();
                }}
                accessibilityRole="button"
              >
                <View style={styles.itemIcone}>
                  <LogOut size={18} color={cores.erroTexto} />
                </View>
                <Text style={[styles.itemTexto, styles.sairTexto]}>Sair</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: cores.cardBorda,
  },
  voltarBotao: { flexDirection: "row", alignItems: "center", gap: 4 },
  voltarTexto: { fontSize: 19, fontWeight: "600", color: cores.slate400 },
  marcaLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  marca: { fontSize: 20, fontWeight: "700", color: cores.branco },
  marcaForte: { color: cores.teal },
  menuBotao: {
    width: 32,
    height: 32,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  gavetaRaiz: { flex: 1, flexDirection: "row", justifyContent: "flex-end" },
  fundo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  painel: {
    width: LARGURA_GAVETA,
    maxWidth: "88%",
    height: "100%",
    backgroundColor: "#12161f",
    borderLeftWidth: 1,
    borderLeftColor: cores.linhaSutil,
  },
  painelInterno: { flex: 1 },
  painelTopo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: cores.linhaSutil,
  },
  perfil: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  perfilTextos: { flex: 1 },
  perfilNome: { fontSize: 14, fontWeight: "700", color: cores.slate200 },
  perfilApelido: { fontSize: 12, color: cores.slate400 },
  fechar: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },

  itens: { paddingVertical: 8, paddingHorizontal: 10 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: raio.campo,
  },
  itemIcone: { width: 22, alignItems: "center" },
  itemTexto: { flex: 1, fontSize: 15, fontWeight: "600", color: cores.slate200 },
  beta: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: cores.ambar,
    borderWidth: 1,
    borderColor: cores.ambarBorda,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  rodape: {
    borderTopWidth: 1,
    borderTopColor: cores.linhaSutil,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 2,
  },
  ambiente: {
    fontSize: 11,
    color: cores.slate500,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  sairTexto: { color: cores.erroTexto },
});
