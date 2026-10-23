import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { buscarDadosDoGrupo } from "@/api/grupos";
import { buscarFeedResenha } from "@/api/resenha";
import { mensagemDoErro } from "@/mensagens-erro";
import { bannerDoFeedDepoisDe } from "@/contrato/bannersDoFeed";
import { BannerDoFeed, useCampanhasNoAr } from "@/resenha/BannerDoFeed";
import { BlocoCard } from "@/resenha/BlocoCard";
import { AjudaExpiracao } from "@/resenha/AjudaExpiracao";
import { EmDesenvolvimento } from "@/ui/EmDesenvolvimento";
import { FiltroChips, opcoesDeMeses } from "@/ui/FiltroChips";
import { Hourglass, MessageCircle, RefreshCw, Users } from "@/ui/Icone";
import { MESES_COMUNICADOS } from "@/contrato/expiracaoReplays";
import { Navbar } from "@/ui/Navbar";
import { TituloTela } from "@/ui/TituloTela";
import { useCarregarNoFim } from "@/ui/useCarregarNoFim";
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
  const campanhas = useCampanhasNoAr();

  // Quem chega num vídeo específico vem de um vídeo já comentado: Destaques.
  // Sem nada, "Todos os vídeos" (o feed pra rever o jogo).
  const [aba, setAba] = useState<AbaResenha>(
    video || abaParam === "destaques" ? "DESTAQUES" : "TODOS"
  );
  // Mês da partida (null = todos). Filtra as duas abas.
  const [mes, setMes] = useState<string | null>(null);
  // Aba/mês vigentes pra descartar resposta de página que chegou depois de uma troca
  // (a rolagem infinita pode estar no meio de uma carga).
  const abaRef = useRef(aba);
  const mesRef = useRef(mes);

  const [feed, setFeed] = useState<FeedResenha | undefined>(undefined);
  const [blocos, setBlocos] = useState<BlocoFeedResenha[]>([]);
  const [pagina, setPagina] = useState(0);
  const [grupoNome, setGrupoNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  // Falhou ao puxar a próxima página: para o automático (senão tentaria em loop
  // parado no fim) até tocar no "Carregar mais".
  const [falhouMais, setFalhouMais] = useState(false);
  // Trocando aba ou mês: a lista dá lugar ao spinner. `trocandoMes` só põe o spinner
  // no chip do mês.
  const [trocandoAba, setTrocandoAba] = useState(false);
  const [trocandoMes, setTrocandoMes] = useState(false);

  // Site anterior às abas não manda `aba` (o feed é sempre o de Destaques), e um
  // anterior ao filtro de mês não manda `mes`.
  const daAbaAtual = (f: FeedResenha) =>
    (!f.aba || f.aba === abaRef.current) &&
    (f.mes === undefined || f.mes === mesRef.current);

  const carregarPrimeira = useCallback(async () => {
    const [dados, f] = await Promise.all([
      buscarDadosDoGrupo(chamarApi, id),
      buscarFeedResenha(chamarApi, id, 0, abaRef.current, mesRef.current),
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

  async function trocarFiltro(mudanca: { aba?: AbaResenha; mes?: string | null }) {
    const novaAba = mudanca.aba ?? abaRef.current;
    const novoMes = mudanca.mes !== undefined ? mudanca.mes : mesRef.current;
    if (novaAba === abaRef.current && novoMes === mesRef.current) return;
    const mudouMes = novoMes !== mesRef.current;
    abaRef.current = novaAba;
    mesRef.current = novoMes;
    setAba(novaAba);
    setMes(novoMes);
    setTrocandoAba(true);
    if (mudouMes) setTrocandoMes(true);
    try {
      const f = await buscarFeedResenha(chamarApi, id, 0, novaAba, novoMes);
      if (!daAbaAtual(f)) return;
      setFeed(f);
      setBlocos(f.blocos);
      setPagina(0);
      listaRef.current?.scrollToOffset({ offset: 0, animated: false });
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      if (abaRef.current === novaAba && mesRef.current === novoMes) {
        setTrocandoAba(false);
        setTrocandoMes(false);
      }
    }
  }

  function trocarAba(nova: AbaResenha) {
    return trocarFiltro({ aba: nova });
  }

  async function carregarMais() {
    if (carregandoMais || trocandoAba || !feed?.temMais) return;
    setCarregandoMais(true);
    try {
      const prox = pagina + 1;
      const f = await buscarFeedResenha(chamarApi, id, prox, abaRef.current, mesRef.current);
      if (!daAbaAtual(f)) return;
      setFeed(f);
      setBlocos((prev) => {
        const vistos = new Set(prev.map((b) => b.pedidoReplayId));
        return [...prev, ...f.blocos.filter((b) => !vistos.has(b.pedidoReplayId))];
      });
      setPagina(prox);
      setFalhouMais(false);
    } catch {
      // silencioso: o botão continua clicável
      setFalhouMais(true);
    } finally {
      setCarregandoMais(false);
    }
  }

  const noFim = useCarregarNoFim(
    !!feed?.temMais && !carregandoMais && !trocandoAba && !trocandoMes && !falhouMais,
    () => void carregarMais()
  );

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
  // Com mês filtrado o total é só do mês; os chips só oferecem mês com vídeo, então
  // ali nunca é "sem vídeo".
  const totais = feed.totais;
  const semVideos = !mes && (totais ? totais.TODOS === 0 : blocos.length === 0);
  // Sem nada em dia, mas o grupo já gravou: os replays venceram (mais de 4 meses).
  // Não é "a resenha está chegando"; o "!" continua. Espelha o site.
  const soVencidos = semVideos && !!feed.temVencidos;
  const meses = feed.meses ?? [];
  // Só com 2+ meses (com 1, "Geral" e o mês mostrariam a mesma coisa).
  const mostraMeses = !semVideos && (meses.length > 1 || !!mes);

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      {voltar}
      <FlatList
        ref={listaRef}
        data={trocandoAba || semVideos ? [] : blocos}
        // Campanhas chegam numa busca à parte: redesenha os banners quando vierem.
        extraData={campanhas}
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
        {...noFim}
        ListHeaderComponent={
          <View style={styles.cabecalho}>
            <View style={styles.tituloLinha}>
              <View style={styles.tituloComSelo}>
                <TituloTela>Resenha</TituloTela>
                {/* Mesmo selo da Repercussão em Minha performance. */}
                <Text style={styles.beta}>Beta</Text>
              </View>
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
            {(!semVideos || soVencidos) && (
              <View style={styles.descLinha}>
                <Text style={[styles.desc, { flex: 1 }]}>
                  {soVencidos
                    ? `Os vídeos gravados nas partidas do grupo ficam aqui por ${MESES_COMUNICADOS} meses.`
                    : aba === "TODOS"
                      ? "Todos os vídeos gravados nas partidas do grupo, do jogo mais recente pro mais antigo. Comente qualquer lance."
                      : "Os vídeos que a galera já comentou, com a conversa mais recente no topo."}
                </Text>
                {/* Só com vídeo no grupo (mesma condição da descrição). */}
                <AjudaExpiracao />
              </View>
            )}
            {/* Filtro de mês acima das abas: vale pra "Todos os vídeos" e "Destaques". */}
            {mostraMeses && (
              <View style={styles.meses}>
                <FiltroChips
                  rotulo="Meses"
                  opcoes={opcoesDeMeses(meses)}
                  ativo={mes}
                  carregando={trocandoMes}
                  onEscolher={(valor) => void trocarFiltro({ mes: valor })}
                />
              </View>
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
          soVencidos ? (
            <View style={styles.semComentario}>
              <Hourglass size={24} color="rgba(245, 158, 11, 0.7)" />
              <Text style={styles.semComentarioTitulo}>
                Nenhum replay dos últimos {MESES_COMUNICADOS} meses
              </Text>
              <Text style={styles.semComentarioTexto}>
                Os vídeos mais antigos somem automaticamente. Os lances da próxima partida gravada
                aparecem aqui.
              </Text>
            </View>
          ) : semVideos ? (
            <EmDesenvolvimento
              titulo="A resenha está chegando"
              texto="Estamos preparando os replays dos gols para liberar em breve. Quando estiver pronto, a galera vai poder ver e comentar cada lance aqui."
            />
          ) : trocandoAba ? (
            <View style={styles.vazio}>
              <ActivityIndicator color={cores.slate400} />
            </View>
          ) : (
            // Só acontece em Destaques: tem vídeo (no mês filtrado), mas ninguém comentou ainda.
            <View style={styles.semComentario}>
              <MessageCircle size={24} color={cores.slate500} />
              <Text style={styles.semComentarioTitulo}>
                {mes ? "Nenhum vídeo comentado neste mês." : "Nenhum vídeo comentado ainda."}
              </Text>
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
          const banner = bannerDoFeedDepoisDe(index, blocos.length, !feed.temMais, campanhas.length);
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
              {banner !== null && <BannerDoFeed banner={banner} campanhas={campanhas} />}
            </View>
          );
        }}
        ListFooterComponent={
          feed.temMais && !trocandoAba && !semVideos ? (
            <Pressable
              style={styles.mais}
              onPress={() => {
                setFalhouMais(false);
                void carregarMais();
              }}
              disabled={carregandoMais}
            >
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
  // Card + banner (Instagram ou campanha, quando cai ali), com o mesmo respiro da lista.
  item: { gap: 16 },
  tituloLinha: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  tituloComSelo: { flexDirection: "row", alignItems: "center", gap: 8 },
  beta: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: cores.ambar,
    borderWidth: 1,
    borderColor: cores.ambarBorda,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },
  atualizarBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: raio.campo,
  },
  subLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  sub: { flexShrink: 1, fontSize: 14, color: cores.slate400 },
  desc: { fontSize: 13, lineHeight: 19, color: cores.slate500 },
  descLinha: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },

  meses: { marginTop: 12 },

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
