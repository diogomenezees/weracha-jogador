import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { buscarDadosDoGrupo } from "@/api/grupos";
import { buscarFeedResenha } from "@/api/resenha";
import { mensagemDoErro } from "@/mensagens-erro";
import { BlocoCard } from "@/resenha/BlocoCard";
import { Navbar } from "@/ui/Navbar";
import { TituloTela } from "@/ui/TituloTela";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores } from "@/tema";
import type { BlocoFeedResenha, FeedResenha } from "@/contrato/tipos";

export default function ResenhaDoGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chamarApi } = useSessao();

  const [feed, setFeed] = useState<FeedResenha | undefined>(undefined);
  const [blocos, setBlocos] = useState<BlocoFeedResenha[]>([]);
  const [pagina, setPagina] = useState(0);
  const [grupoNome, setGrupoNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);

  const carregarPrimeira = useCallback(async () => {
    const [dados, f] = await Promise.all([
      buscarDadosDoGrupo(chamarApi, id),
      buscarFeedResenha(chamarApi, id, 0),
    ]);
    return { nome: dados.grupo?.nome ?? "", f };
  }, [chamarApi, id]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { nome, f } = await carregarPrimeira();
        if (!vivo) return;
        setGrupoNome(nome);
        setFeed(f);
        setBlocos(f.blocos);
        setPagina(0);
        setErro(null);
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [carregarPrimeira, tentativa]);

  async function atualizar() {
    setAtualizando(true);
    try {
      const { nome, f } = await carregarPrimeira();
      setGrupoNome(nome);
      setFeed(f);
      setBlocos(f.blocos);
      setPagina(0);
      setErro(null);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setAtualizando(false);
    }
  }

  async function carregarMais() {
    if (carregandoMais || !feed?.temMais) return;
    setCarregandoMais(true);
    try {
      const prox = pagina + 1;
      const f = await buscarFeedResenha(chamarApi, id, prox);
      setFeed(f);
      setBlocos((prev) => {
        const vistos = new Set(prev.map((b) => b.pedidoReplayId));
        return [...prev, ...f.blocos.filter((b) => !vistos.has(b.pedidoReplayId))];
      });
      setPagina(prox);
    } catch {
      // silencioso: o botão continua clicável
    } finally {
      setCarregandoMais(false);
    }
  }

  const voltar = <Navbar voltar="Grupo" />;

  if (erro && !feed) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        <TelaErro mensagem={erro} onTentar={() => setTentativa((t) => t + 1)} />
      </SafeAreaView>
    );
  }
  if (!feed) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        <TelaCarregando mensagem="Carregando resenha..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      {voltar}
      <FlatList
        data={blocos}
        keyExtractor={(b) => b.pedidoReplayId}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.teal} />
        }
        onEndReachedThreshold={0.6}
        onEndReached={() => void carregarMais()}
        ListHeaderComponent={
          <View style={styles.cabecalho}>
            <TituloTela>Resenha</TituloTela>
            <Text style={styles.sub} numberOfLines={1}>
              {grupoNome}
            </Text>
            <Text style={styles.desc}>
              Os replays comentados de todas as partidas aparecem aqui.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.vazio}>
            <Text style={styles.vazioTexto}>Ainda não rolou reação nenhuma nesse grupo.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <BlocoCard
            bloco={item}
            grupoId={id}
            chamarApi={chamarApi}
            podeModerar={feed.podeModerar}
            meuJogadorId={feed.meuJogadorId}
            podeComentar={feed.podeComentar}
          />
        )}
        ListFooterComponent={
          feed.temMais ? (
            <Pressable style={styles.mais} onPress={() => void carregarMais()} disabled={carregandoMais}>
              {carregandoMais ? (
                <ActivityIndicator color={cores.slate400} />
              ) : (
                <Text style={styles.maisTexto}>
                  Carregar mais ({blocos.length} de {feed.totalBlocos})
                </Text>
              )}
            </Pressable>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  lista: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 16 },
  cabecalho: { gap: 4, marginBottom: 2 },
  h1: { fontSize: 24, fontWeight: "700", color: cores.branco },
  sub: { fontSize: 14, color: cores.slate400 },
  desc: { fontSize: 13, color: cores.slate500, marginTop: 4 },
  vazio: { paddingVertical: 48, alignItems: "center" },
  vazioTexto: { fontSize: 14, color: cores.slate400, textAlign: "center" },
  mais: { height: 44, alignItems: "center", justifyContent: "center" },
  maisTexto: { fontSize: 13, fontWeight: "600", color: cores.slate400 },
});
