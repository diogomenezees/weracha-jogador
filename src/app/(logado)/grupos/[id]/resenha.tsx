import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { buscarDadosDoGrupo } from "@/api/grupos";
import { buscarFeedResenha } from "@/api/resenha";
import { mensagemDoErro } from "@/mensagens-erro";
import { bannerInstagramDepoisDe } from "@/contrato/bannerInstagram";
import { BannerInstagram } from "@/resenha/BannerInstagram";
import { BlocoCard } from "@/resenha/BlocoCard";
import { EmDesenvolvimento } from "@/ui/EmDesenvolvimento";
import { MessageCircle, RefreshCw, Users } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { TituloTela } from "@/ui/TituloTela";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type { AbaResenha, BlocoFeedResenha, FeedResenha } from "@/contrato/tipos";

const ABAS: { valor: AbaResenha; rotulo: string }[] = [
  { valor: "TODOS", rotulo: "Todos os vídeos" },
  { valor: "DESTAQUES", rotulo: "Destaques" },
];

// Feed da resenha do grupo com duas abas, espelhando
// weracha-site/app/grupos/[id]/resenha/page.tsx. "Todos os vídeos": todo replay
// com vídeo, comentado ou não (o feed pra rever o jogo e comentar qualquer
// lance). "Destaques": só os já comentados, conversa mais recente no topo.
export default function ResenhaDoGrupo() {
  // ?video={pedidoReplayId}: abre já rolada até esse replay (link de vídeo
  // comentado do painel ou de "Meus indicadores"), com a borda dele destacada.
  // ?aba=destaques reabre em Destaques.
  const { id, video, aba: abaParam } = useLocalSearchParams<{
    id: string;
    video?: string;
    aba?: string;
  }>();
  const listaRef = useRef<FlatList<BlocoFeedResenha>>(null);
  const rolouAteAlvo = useRef(false);
  const tentouTodos = useRef(false);
  // Sem folga embaixo, a barra de botões do Android fica em cima do último card.
  const insets = useSafeAreaInsets();
  const { chamarApi } = useSessao();

  // Quem chega num vídeo específico vem de um vídeo já comentado: Destaques.
  // Sem nada, "Todos os vídeos" (o feed pra rever o jogo).
  const [aba, setAba] = useState<AbaResenha>(
    video || abaParam === "destaques" ? "DESTAQUES" : "TODOS"
  );
  // Aba vigente pra descartar resposta de página que chegou depois de uma troca
  // de aba (a rolagem infinita pode estar no meio de uma carga).
  const abaRef = useRef(aba);

  const [feed, setFeed] = useState<FeedResenha | undefined>(undefined);
  const [blocos, setBlocos] = useState<BlocoFeedResenha[]>([]);
  const [pagina, setPagina] = useState(0);
  const [grupoNome, setGrupoNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [trocandoAba, setTrocandoAba] = useState(false);

  // Site anterior às abas não manda `aba` (o feed é sempre o de Destaques).
  const daAbaAtual = (f: FeedResenha) => (f.aba ?? "DESTAQUES") === abaRef.current || !f.aba;

  const carregarPrimeira = useCallback(async () => {
    const [dados, f] = await Promise.all([
      buscarDadosDoGrupo(chamarApi, id),
      buscarFeedResenha(chamarApi, id, 0, abaRef.current),
    ]);
    return { nome: dados.grupo?.nome ?? "", f };
  }, [chamarApi, id]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { nome, f } = await carregarPrimeira();
        if (!vivo || !daAbaAtual(f)) return;
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
      if (!daAbaAtual(f)) return;
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

  async function trocarAba(nova: AbaResenha) {
    if (nova === abaRef.current) return;
    abaRef.current = nova;
    setAba(nova);
    setTrocandoAba(true);
    try {
      const f = await buscarFeedResenha(chamarApi, id, 0, nova);
      if (!daAbaAtual(f)) return;
      setFeed(f);
      setBlocos(f.blocos);
      setPagina(0);
      listaRef.current?.scrollToOffset({ offset: 0, animated: false });
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setTrocandoAba(false);
    }
  }

  async function carregarMais() {
    if (carregandoMais || trocandoAba || !feed?.temMais) return;
    setCarregandoMais(true);
    try {
      const prox = pagina + 1;
      const f = await buscarFeedResenha(chamarApi, id, prox, abaRef.current);
      if (!daAbaAtual(f)) return;
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

  // Rola até o ?video= uma vez só. Se ele ainda não está nas páginas
  // carregadas (o feed vem de 3 em 3), puxa a próxima até achar ou acabar. Se
  // Destaques acabou sem achar (ex.: o comentário foi apagado), tenta uma vez em
  // "Todos os vídeos".
  useEffect(() => {
    if (!video || !feed || rolouAteAlvo.current || trocandoAba) return;
    const indice = blocos.findIndex((b) => b.pedidoReplayId === video);
    if (indice >= 0) {
      rolouAteAlvo.current = true;
      setTimeout(() => listaRef.current?.scrollToIndex({ index: indice, animated: true }), 300);
    } else if (feed.temMais && !carregandoMais) {
      const t = setTimeout(() => void carregarMais(), 0);
      return () => clearTimeout(t);
    } else if (!feed.temMais && feed.totais && abaRef.current === "DESTAQUES" && !tentouTodos.current) {
      tentouTodos.current = true;
      const t = setTimeout(() => void trocarAba("TODOS"), 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocos, video, feed, carregandoMais, trocandoAba]);

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

  // Grupo sem vídeo nenhum na nuvem: sem abas, só o aviso de que o recurso está
  // chegando. (Site anterior às abas, sem `totais`: vazio = sem comentário.)
  const totais = feed.totais;
  const semVideos = totais ? totais.TODOS === 0 : blocos.length === 0;

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      {voltar}
      <FlatList
        ref={listaRef}
        data={trocandoAba || semVideos ? [] : blocos}
        // Os cards têm altura variável: sem getItemLayout o scrollToIndex pode
        // falhar pra um item ainda não medido. Rola perto e tenta de novo.
        onScrollToIndexFailed={({ index, averageItemLength }) => {
          listaRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
          setTimeout(() => listaRef.current?.scrollToIndex({ index, animated: true }), 250);
        }}
        keyExtractor={(b) => b.pedidoReplayId}
        contentContainerStyle={[styles.lista, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={atualizar} tintColor={cores.teal} />
        }
        onEndReachedThreshold={0.6}
        onEndReached={() => void carregarMais()}
        ListHeaderComponent={
          <View style={styles.cabecalho}>
            <View style={styles.tituloLinha}>
              <TituloTela>Resenha</TituloTela>
              <Pressable
                accessibilityLabel="Atualizar"
                style={styles.atualizarBtn}
                onPress={() => void atualizar()}
                disabled={atualizando}
              >
                {atualizando ? (
                  <ActivityIndicator size="small" color={cores.slate500} />
                ) : (
                  <RefreshCw size={18} color={cores.slate500} />
                )}
              </Pressable>
            </View>
            <View style={styles.subLinha}>
              <Users size={12} color={cores.slate400} />
              <Text style={styles.sub} numberOfLines={1}>
                {grupoNome}
              </Text>
            </View>
            {!semVideos && (
              <Text style={styles.desc}>
                {aba === "TODOS"
                  ? "Todos os vídeos gravados nas partidas do grupo, do jogo mais recente pro mais antigo. Comente qualquer lance."
                  : "Os vídeos que a galera já comentou, com a conversa mais recente no topo."}
              </Text>
            )}
            {!semVideos && totais && (
              <View style={styles.abas}>
                {ABAS.map(({ valor, rotulo }) => {
                  const selecionada = aba === valor;
                  return (
                    <Pressable
                      key={valor}
                      style={[styles.aba, selecionada && styles.abaSelecionada]}
                      onPress={() => void trocarAba(valor)}
                      accessibilityState={{ selected: selecionada }}
                    >
                      <Text style={[styles.abaTexto, selecionada && styles.abaTextoSelecionada]}>
                        {rotulo}
                      </Text>
                      <View style={styles.abaContador}>
                        <Text style={styles.abaContadorTexto}>{totais[valor]}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          semVideos ? (
            <EmDesenvolvimento
              titulo="A resenha está chegando"
              texto="Estamos preparando os replays dos gols para liberar em breve. Quando estiver pronto, a galera vai poder ver e comentar cada lance aqui."
            />
          ) : trocandoAba ? (
            <View style={styles.vazio}>
              <ActivityIndicator color={cores.slate400} />
            </View>
          ) : (
            // Só acontece em Destaques: tem vídeo, mas ninguém comentou ainda.
            <View style={styles.semComentario}>
              <MessageCircle size={24} color={cores.slate500} />
              <Text style={styles.semComentarioTitulo}>Nenhum vídeo comentado ainda.</Text>
              <Text style={styles.semComentarioTexto}>
                Os vídeos que receberem comentários aparecem aqui. Que tal puxar a resenha?
              </Text>
              <Pressable style={styles.botaoTeal} onPress={() => void trocarAba("TODOS")}>
                <Text style={styles.botaoTealTexto}>Ver todos os vídeos</Text>
              </Pressable>
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const banner = bannerInstagramDepoisDe(index, blocos.length, !feed.temMais);
          return (
            <View style={styles.item}>
              <BlocoCard
                bloco={item}
                grupoId={id}
                chamarApi={chamarApi}
                podeModerar={feed.podeModerar}
                meuJogadorId={feed.meuJogadorId}
                podeComentar={feed.podeComentar}
                destacado={item.pedidoReplayId === video}
              />
              {banner !== null && <BannerInstagram mensagem={banner} />}
            </View>
          );
        }}
        ListFooterComponent={
          feed.temMais && !trocandoAba && !semVideos ? (
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
  // Card + banner do Instagram (quando cai ali), com o mesmo respiro da lista.
  item: { gap: 16 },
  tituloLinha: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  atualizarBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: raio.campo,
  },
  subLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  sub: { flexShrink: 1, fontSize: 14, color: cores.slate400 },
  desc: { fontSize: 13, lineHeight: 19, color: cores.slate500, marginTop: 4 },

  // Abas (mesmo desenho das abas Ativos/Aguardando de "Seus grupos").
  abas: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  aba: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  abaSelecionada: { backgroundColor: "rgba(31, 179, 163, 0.15)" },
  abaTexto: { fontSize: 12, fontWeight: "500", color: cores.slate400 },
  abaTextoSelecionada: { color: cores.teal },
  abaContador: { borderRadius: 999, paddingHorizontal: 6, backgroundColor: "rgba(255, 255, 255, 0.1)" },
  abaContadorTexto: { fontSize: 10, color: cores.slate300 },

  vazio: { paddingVertical: 48, alignItems: "center" },
  semComentario: {
    alignItems: "center",
    gap: 10,
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  semComentarioTitulo: { fontSize: 14, color: cores.slate300, textAlign: "center" },
  semComentarioTexto: { fontSize: 12, lineHeight: 18, color: cores.slate500, textAlign: "center" },
  botaoTeal: {
    marginTop: 4,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.teal,
  },
  botaoTealTexto: { fontSize: 14, fontWeight: "600", color: cores.dark },
  mais: { height: 44, alignItems: "center", justifyContent: "center" },
  maisTexto: { fontSize: 13, fontWeight: "600", color: cores.slate400 },
});
