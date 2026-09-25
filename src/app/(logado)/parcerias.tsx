import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";

import { abrirNoNavegador } from "@/config/links";

import { buscarParceiros } from "@/api/parceiros";
import { mensagemDoErro } from "@/mensagens-erro";
import { ModalCartao } from "@/grupo/modais";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import { ChevronRight, ExternalLink, Store } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { TituloTela } from "@/ui/TituloTela";
import type { Parceiro } from "@/contrato/tipos";

export default function Parcerias() {
  // Sem folga embaixo, a barra de botões do Android fica em cima do último item.
  const insets = useSafeAreaInsets();
  const { chamarApi } = useSessao();
  const [parceiros, setParceiros] = useState<Parceiro[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [selecionado, setSelecionado] = useState<Parceiro | null>(null);

  const carregar = useCallback(async () => {
    setParceiros(await buscarParceiros(chamarApi));
  }, [chamarApi]);

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

  if (erro && !parceiros) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar voltar="Painel" />
        <TelaErro mensagem={erro} onTentar={() => setTentativa((t) => t + 1)} />
      </SafeAreaView>
    );
  }
  if (!parceiros) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar voltar="Painel" />
        <TelaCarregando mensagem="Carregando parcerias..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Painel" />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.cabecalho}>
          <TituloTela Icone={Store}>Parcerias</TituloTela>
          <Text style={styles.sub}>
            Negócios de gente do próprio racha, com condição especial pra quem é do WeRacha.
          </Text>
        </View>

        {parceiros.length === 0 ? (
          <View style={styles.box}>
            <Text style={styles.boxTitulo}>Sem parcerias</Text>
            <Text style={styles.boxTexto}>Nenhuma parceria cadastrada ainda.</Text>
          </View>
        ) : (
          <View style={styles.lista}>
            {parceiros.map((p) => (
              <Pressable key={p.id} style={styles.card} onPress={() => setSelecionado(p)}>
                <Logo url={p.fotoUrl} tamanho={48} />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardNome} numberOfLines={1}>
                    {p.nome}
                  </Text>
                  <Text style={styles.cardDesc} numberOfLines={1}>
                    {p.descricao}
                  </Text>
                </View>
                <ChevronRight size={18} color={cores.slate500} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.indicar}>
          <Text style={styles.indicarTexto}>Tem um negócio pra indicar?</Text>
          <Pressable hitSlop={6} onPress={() => router.push({ pathname: "/contato", params: { motivo: "Parceria" } })}>
            <Text style={styles.indicarLink}>Indicar parceria</Text>
          </Pressable>
        </View>
      </ScrollView>

      {selecionado && (
        <ModalCartao aberto onFechar={() => setSelecionado(null)}>
          <Text style={styles.modalEyebrow}>Parceiro</Text>
          <View style={styles.modalTopo}>
            <Logo url={selecionado.fotoUrl} tamanho={60} />
            <View style={{ flex: 1 }}>
              <Text style={styles.modalNome}>{selecionado.nome}</Text>
            </View>
          </View>
          <Text style={styles.modalDesc}>{selecionado.descricao}</Text>
          <Pressable
            style={styles.modalBotao}
            onPress={() => {
              const link = selecionado.link;
              setSelecionado(null);
              abrirNoNavegador(link);
            }}
          >
            <ExternalLink size={16} color={cores.dark} />
            <Text style={styles.modalBotaoTexto}>Visualizar</Text>
          </Pressable>
        </ModalCartao>
      )}
    </SafeAreaView>
  );
}

function Logo({ url, tamanho }: { url: string; tamanho: number }) {
  return (
    <Image
      source={{ uri: url }}
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        backgroundColor: cores.superficieMedia,
      }}
      contentFit="cover"
    />
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 18 },
  cabecalho: { gap: 4 },
  h1: { fontSize: 24, fontWeight: "700", color: cores.branco },
  sub: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  box: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 18,
    gap: 6,
    alignItems: "center",
  },
  boxTitulo: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  boxTexto: { fontSize: 14, color: cores.slate400, textAlign: "center" },
  lista: { gap: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 12,
  },
  cardInfo: { flex: 1 },
  cardNome: { fontSize: 15, fontWeight: "700", color: cores.branco },
  cardDesc: { fontSize: 13, color: cores.slate400, marginTop: 2 },
  indicar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  indicarTexto: { fontSize: 12, color: cores.slate500 },
  indicarLink: { fontSize: 12, fontWeight: "600", color: cores.teal },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  modalTopo: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalNome: { fontSize: 18, fontWeight: "700", color: cores.branco },
  modalDesc: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  modalBotao: {
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  modalBotaoTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
});
