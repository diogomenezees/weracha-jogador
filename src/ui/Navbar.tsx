import { useEffect, useState } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";

import { abrirNoNavegador, URL_CONTATO } from "@/config/links";
import { rotuloDoAmbiente } from "@/config/servidor";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import { AvatarJogador } from "@/ui/AvatarJogador";

// Cabeçalho padronizado das telas logadas. Espelha `weracha-site/components/navbar.tsx`:
// marca à esquerda (ou um "‹ destino" quando a tela é interna) e um botão de menu
// à direita que abre a gaveta com as telas principais. A gaveta é dona do próprio
// estado — cada tela só renderiza `<Navbar />` (ou `<Navbar voltar="Grupo" />`).

type Item =
  | { rotulo: string; emoji: string; tipo: "rota"; rota: Href; beta?: boolean }
  | { rotulo: string; emoji: string; tipo: "em-breve"; beta?: boolean }
  | { rotulo: string; emoji: string; tipo: "externo"; url: string };

// Mesma ordem do menu do site. As telas ainda não portadas caem no /em-breve
// (decidido com o dono: espelhar o menu inteiro, não esconder o que falta).
const ITENS: Item[] = [
  { rotulo: "Perfil", emoji: "👤", tipo: "rota", rota: "/perfil" },
  { rotulo: "Grupos", emoji: "👥", tipo: "rota", rota: "/painel" },
  { rotulo: "Artilheiros", emoji: "⚽", tipo: "rota", rota: "/artilheiros" },
  { rotulo: "Replays", emoji: "🎬", tipo: "rota", rota: "/replays", beta: true },
  { rotulo: "Enquetes", emoji: "📊", tipo: "rota", rota: "/enquetes" },
  { rotulo: "Parcerias", emoji: "🏪", tipo: "rota", rota: "/parcerias" },
  { rotulo: "Contato", emoji: "✉️", tipo: "externo", url: URL_CONTATO },
  { rotulo: "Sorteio rápido", emoji: "🔀", tipo: "rota", rota: "/sorteio" },
];

export function Navbar({ voltar }: { voltar?: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <View style={styles.barra}>
      {voltar ? (
        <Pressable
          hitSlop={10}
          style={styles.voltarBotao}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={`Voltar para ${voltar}`}
        >
          <Text style={styles.voltarTexto}>{`‹ ${voltar}`}</Text>
        </Pressable>
      ) : (
        <Text style={styles.marca}>
          We <Text style={styles.marcaForte}>Racha</Text>
        </Text>
      )}

      <Pressable
        hitSlop={10}
        style={styles.menuBotao}
        onPress={() => setAberto(true)}
        accessibilityRole="button"
        accessibilityLabel="Abrir menu"
      >
        <View style={styles.traco} />
        <View style={styles.traco} />
        <View style={styles.traco} />
      </Pressable>

      <Gaveta aberto={aberto} onFechar={() => setAberto(false)} />
    </View>
  );
}

const LARGURA_GAVETA = 300;

function Gaveta({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { estado, ambiente, sair } = useSessao();
  const jogador = estado.fase === "logado" ? estado.jogador : null;

  // A entrada desliza da direita; o Modal com `animationType="fade"` cuida do
  // fade do conjunto (fundo + painel) e da saída. `anim`: 1 = fora, 0 = aberto.
  const [anim] = useState(() => new Animated.Value(aberto ? 0 : 1));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: aberto ? 0 : 1,
      duration: aberto ? 220 : 0,
      useNativeDriver: true,
    }).start();
  }, [aberto, anim]);

  if (!aberto) return null;

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, LARGURA_GAVETA],
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
    <Modal visible transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.gavetaRaiz}>
        <Pressable style={styles.fundo} onPress={onFechar} accessibilityLabel="Fechar menu" />

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
                <Text style={styles.fecharTexto}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.itens} showsVerticalScrollIndicator={false}>
              {ITENS.map((item) => (
                <Pressable key={item.rotulo} style={styles.item} onPress={() => irPara(item)}>
                  <Text style={styles.itemEmoji}>{item.emoji}</Text>
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
                <Text style={styles.itemEmoji}>⎋</Text>
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
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 6,
    minHeight: 40,
  },
  voltarBotao: { paddingVertical: 4 },
  voltarTexto: { fontSize: 16, color: cores.slate400 },
  marca: { fontSize: 17, fontWeight: "700", color: cores.branco },
  marcaForte: { color: cores.teal },
  menuBotao: {
    width: 32,
    height: 32,
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 5,
  },
  traco: { width: 22, height: 2, borderRadius: 2, backgroundColor: cores.slate300 },

  gavetaRaiz: { flex: 1, flexDirection: "row", justifyContent: "flex-end" },
  fundo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
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
  fecharTexto: { fontSize: 16, color: cores.slate300 },

  itens: { paddingVertical: 8, paddingHorizontal: 10 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: raio.campo,
  },
  itemEmoji: { fontSize: 16, width: 22, textAlign: "center" },
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
