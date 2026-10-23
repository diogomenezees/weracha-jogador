import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { buscarStatusExclusao } from "@/api/conta";
import { buscarFavoritos } from "@/api/favoritos";
import { buscarMeusReplays, type FiltroMeusReplays } from "@/api/replays";
import { mensagemDoErro } from "@/mensagens-erro";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { bannerDoFeedDepoisDe } from "@/contrato/bannersDoFeed";
import {
  MESES_COMUNICADOS,
  TEXTO_AVISO_EXPIRACAO,
  TEXTO_AVISO_FAVORITOS,
} from "@/contrato/expiracaoReplays";
import { BannerDoFeed, useCampanhasNoAr } from "@/resenha/BannerDoFeed";
import { BlocoCard } from "@/resenha/BlocoCard";
import { AjudaExpiracao } from "@/resenha/AjudaExpiracao";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import { EmDesenvolvimento } from "@/ui/EmDesenvolvimento";
import { FiltroChips, opcoesDeMeses } from "@/ui/FiltroChips";
import { Heart, Hourglass, Video, X } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { TituloTela } from "@/ui/TituloTela";
import { useCarregarNoFim } from "@/ui/useCarregarNoFim";
import type {
  AutorComentario,
  BlocoFeedResenha,
  MeuReplay,
  PeriodoArtilheiros,
  PodeComentar,
} from "@/contrato/tipos";

// Abas: "Meus vídeos" (os replays dos meus gols, de qualquer grupo) e "Favoritos" (os
// replays que marquei com o coração, de qualquer pessoa). Espelha
// weracha-site/app/replays/page.tsx.
type Aba = "MEUS" | "FAVORITOS";

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: "MEUS", rotulo: "Meus vídeos" },
  { valor: "FAVORITOS", rotulo: "Favoritos" },
];

// Adapta um gol meu ao "post" da resenha, pra reusar o mesmo card do feed
// (src/resenha/BlocoCard). O jogador é sempre eu; a prévia da resenha já vem no próprio
// replay (MeuReplay).
function comoBloco(r: MeuReplay, eu: AutorComentario): BlocoFeedResenha {
  return {
    pedidoReplayId: r.pedidoReplayId,
    partidaId: r.partidaId,
    partidaData: r.partidaData,
    tipo: "GOL",
    criadoEm: r.criadoEm,
    jogador: eu,
    marcadoPor: r.marcadoPor.nome,
    videos: r.videos,
    totalComentarios: r.totalComentarios,
    comentariosPreview: r.comentariosPreview,
    ultimaAtividade: r.comentariosPreview.at(-1)?.criadoEm ?? r.criadoEm,
    expiraEm: r.expiraEm,
  };
}

// Um card da lista, nas duas abas.
type Item = {
  grupoId: string;
  grupoNome: string;
  bloco: BlocoFeedResenha;
  // Só em "Meus vídeos": saí do grupo (o replay segue, sem atalhos nem resenha).
  grupoRemovido: boolean;
};

type Pagina = {
  itens: Item[];
  temMais: boolean;
  total: number;
  // Meus vídeos vazio, mas já teve gol em vídeo (todos venceram).
  temVencidos?: boolean;
  grupos?: { id: string; nome: string }[];
  meses?: PeriodoArtilheiros[];
};

const FILTRO_VAZIO: FiltroMeusReplays = { grupoId: null, mes: null, expirando: false };

export default function Replays() {
  // Sem folga embaixo, a barra de botões do Android fica em cima do último card.
  const insets = useSafeAreaInsets();
  const { estado, chamarApi } = useSessao();
  const campanhas = useCampanhasNoAr();
  const jogador = estado.fase === "logado" ? estado.jogador : null;
  // ?expirando=1: vem do push "N replays seus vão ser apagados".
  const params = useLocalSearchParams<{ expirando?: string }>();

  const [aba, setAba] = useState<Aba>("MEUS");
  const [itens, setItens] = useState<Item[] | null>(null);
  const [temMais, setTemMais] = useState(false);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [contaPendente, setContaPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  // Falhou ao puxar a próxima página: para o automático até tocar no botão.
  const [falhouMais, setFalhouMais] = useState(false);
  const [filtro, setFiltro] = useState<FiltroMeusReplays>(() => ({
    ...FILTRO_VAZIO,
    expirando: params.expirando === "1",
  }));
  const [opcoes, setOpcoes] = useState<Pick<Pagina, "grupos" | "meses">>({});
  const [trocando, setTrocando] = useState(false);
  // Já veio vídeo em alguma aba/filtro: liga o "!" da expiração e não desliga mais
  // (trocar pra uma aba ou filtro vazio não esconde). Quem não tem nenhum não vê.
  const [temVideo, setTemVideo] = useState(false);
  // Meus vídeos vazio porque todos os gols em vídeo passaram dos 4 meses.
  const [temVencidos, setTemVencidos] = useState(false);
  // Aba/filtro vigentes + contador de cargas: resposta de uma aba/filtro antigo (troca
  // no meio de uma carga, ou do scroll infinito) é descartada.
  const abaRef = useRef(aba);
  const filtroRef = useRef(filtro);
  const cargaRef = useRef(0);

  const buscarPagina = useCallback(
    async (abaAlvo: Aba, n: number, f: FiltroMeusReplays): Promise<Pagina> => {
      if (abaAlvo === "FAVORITOS") {
        const p = await buscarFavoritos(chamarApi, n, f);
        return {
          itens: p.itens.map((i) => ({ ...i, grupoRemovido: false })),
          temMais: p.temMais,
          total: p.total,
          grupos: p.grupos,
          meses: p.meses,
        };
      }
      const p = await buscarMeusReplays(chamarApi, n, f);
      return {
        itens: jogador
          ? p.replays.map((r) => ({
              grupoId: r.grupoId,
              grupoNome: r.grupoNome,
              bloco: comoBloco(r, jogador),
              grupoRemovido: r.grupoRemovido,
            }))
          : [],
        temMais: p.temMais,
        total: p.total,
        grupos: p.grupos,
        meses: p.meses,
        temVencidos: p.temVencidos,
      };
    },
    [chamarApi, jogador]
  );

  const aplicarPrimeiraPagina = useCallback((p: Pagina) => {
    setItens(p.itens);
    setTemMais(p.temMais);
    setTotal(p.total);
    setPagina(0);
    setOpcoes({ grupos: p.grupos, meses: p.meses });
    setTemVencidos(!!p.temVencidos);
    if (p.itens.length > 0 || (p.grupos?.length ?? 0) > 0 || p.temVencidos) setTemVideo(true);
  }, []);

  const carregar = useCallback(async () => {
    const carga = ++cargaRef.current;
    const [status, primeira] = await Promise.all([
      buscarStatusExclusao(chamarApi),
      buscarPagina(abaRef.current, 0, filtroRef.current),
    ]);
    if (carga !== cargaRef.current) return;
    setContaPendente(status.solicitacaoPendente != null);
    aplicarPrimeiraPagina(primeira);
  }, [chamarApi, buscarPagina, aplicarPrimeiraPagina]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tentativa]);

  const recarregarPull = useCallback(async () => {
    setAtualizando(true);
    try {
      await carregar();
      setErro(null);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setAtualizando(false);
    }
  }, [carregar]);

  // Troca de aba ou de filtro. Os filtros (acima das abas) valem pras duas abas; se o
  // grupo escolhido não existe na aba nova, o servidor ignora e o chip volta pra "Geral".
  async function recarregar(novaAba: Aba, novoFiltro: FiltroMeusReplays) {
    abaRef.current = novaAba;
    filtroRef.current = novoFiltro;
    setAba(novaAba);
    setFiltro(novoFiltro);
    setTrocando(true);
    const carga = ++cargaRef.current;
    try {
      const p = await buscarPagina(novaAba, 0, novoFiltro);
      if (carga !== cargaRef.current) return;
      if (novoFiltro.grupoId && !p.grupos?.some((g) => g.id === novoFiltro.grupoId)) {
        filtroRef.current = { ...novoFiltro, grupoId: null };
        setFiltro(filtroRef.current);
      }
      aplicarPrimeiraPagina(p);
      setErro(null);
    } catch (e) {
      if (carga === cargaRef.current) setErro(mensagemDoErro(e));
    } finally {
      if (carga === cargaRef.current) setTrocando(false);
    }
  }

  function trocarAba(nova: Aba) {
    if (nova === abaRef.current) return;
    // "Vão ser apagados" só existe em Meus vídeos (favorito nunca expira).
    void recarregar(nova, { ...filtroRef.current, expirando: false });
  }

  function trocarFiltro(mudanca: Partial<FiltroMeusReplays>) {
    void recarregar(abaRef.current, { ...filtroRef.current, ...mudanca });
  }

  async function carregarMais() {
    if (carregandoMais || trocando || !temMais) return;
    setCarregandoMais(true);
    const carga = cargaRef.current;
    try {
      const prox = pagina + 1;
      const p = await buscarPagina(abaRef.current, prox, filtroRef.current);
      if (carga !== cargaRef.current) return;
      setItens((prev) => {
        const vistos = new Set((prev ?? []).map((i) => i.bloco.pedidoReplayId));
        return [...(prev ?? []), ...p.itens.filter((i) => !vistos.has(i.bloco.pedidoReplayId))];
      });
      setTemMais(p.temMais);
      setTotal(p.total);
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
    temMais && !carregandoMais && !trocando && !contaPendente && !falhouMais,
    () => void carregarMais()
  );

  if (erro && !itens) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar voltar="Painel" />
        <TelaErro mensagem={erro} onTentar={() => setTentativa((t) => t + 1)} />
      </SafeAreaView>
    );
  }
  if (!jogador || !itens) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar voltar="Painel" />
        <TelaCarregando mensagem="Carregando replays..." />
      </SafeAreaView>
    );
  }

  const podeComentar: PodeComentar = jogador.dataNascimento
    ? { ok: true }
    : { ok: false, motivo: "sem-data-nascimento" };

  const favoritos = aba === "FAVORITOS";
  const gruposDosChips = opcoes.grupos ?? [];
  const mesesDosChips = opcoes.meses ?? [];
  const filtrando = !!filtro.grupoId || !!filtro.mes || !!filtro.expirando;
  // Grupos só com 2+; meses só com 2+ (com 1, "Geral" e o mês mostram a mesma coisa).
  const mostraGrupos = !contaPendente && gruposDosChips.length > 1;
  const mostraMeses = !contaPendente && (mesesDosChips.length > 1 || !!filtro.mes);

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Painel" />
      <FlatList
        data={contaPendente || trocando ? [] : itens}
        // Campanhas chegam numa busca à parte: redesenha os banners quando vierem.
        extraData={campanhas}
        keyExtractor={(i) => i.bloco.pedidoReplayId}
        contentContainerStyle={[styles.lista, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void recarregarPull()}
            tintColor={cores.teal}
          />
        }
        {...noFim}
        ListHeaderComponent={
          <View style={styles.cabecalho}>
            <View style={styles.tituloComSelo}>
              <TituloTela Icone={Video}>Replays</TituloTela>
              {/* Mesmo selo da Resenha e da Repercussão em Minha performance. */}
              <Text style={styles.beta}>Beta</Text>
            </View>
            <View style={styles.subLinha}>
              <Text style={[styles.sub, { flex: 1 }]}>
                Os vídeos dos seus gols e os que você favoritou, de todos os grupos, num lugar só.
              </Text>
              {temVideo && !contaPendente && <AjudaExpiracao />}
            </View>
            {!contaPendente && filtro.expirando && !favoritos && (
              <Pressable
                style={styles.chipExpirando}
                onPress={() => trocarFiltro({ expirando: false })}
                accessibilityRole="button"
                accessibilityLabel="Tirar filtro: só os que vão sumir"
              >
                <Hourglass size={13} color={cores.ambar} />
                <Text style={styles.chipExpirandoTexto}>Só os que vão sumir</Text>
                <X size={13} color={cores.ambar} />
              </Pressable>
            )}
            {(mostraGrupos || mostraMeses) && (
              <View style={styles.filtros}>
                {mostraGrupos && (
                  <FiltroChips
                    rotulo="Grupos"
                    opcoes={[
                      { valor: null, rotulo: "Geral" },
                      ...gruposDosChips.map((g) => ({ valor: g.id, rotulo: g.nome })),
                    ]}
                    ativo={filtro.grupoId}
                    carregando={trocando}
                    onEscolher={(grupoId) => trocarFiltro({ grupoId })}
                  />
                )}
                {mostraMeses && (
                  <FiltroChips
                    rotulo="Meses"
                    opcoes={opcoesDeMeses(mesesDosChips)}
                    ativo={filtro.mes}
                    carregando={trocando}
                    onEscolher={(mes) => trocarFiltro({ mes })}
                  />
                )}
              </View>
            )}
            {!contaPendente && (
              <View style={styles.abas}>
                {ABAS.map(({ valor, rotulo }) => {
                  const selecionada = aba === valor;
                  return (
                    <Pressable
                      key={valor}
                      style={[styles.aba, selecionada && styles.abaSelecionada]}
                      onPress={() => trocarAba(valor)}
                      accessibilityState={{ selected: selecionada }}
                    >
                      {valor === "FAVORITOS" && (
                        <Heart
                          size={13}
                          color={selecionada ? cores.favorito : cores.slate400}
                          fill={selecionada ? cores.favorito : "transparent"}
                        />
                      )}
                      <Text style={[styles.abaTexto, selecionada && styles.abaTextoSelecionada]}>
                        {rotulo}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {/* Aviso da expiração só pra quem tem vídeo na aba: os replays ainda não
                estão liberados pra todo mundo. Espelha o site. */}
            {!contaPendente && !trocando && itens.length > 0 && (
              <View style={styles.aviso}>
                <Hourglass size={14} color={cores.ambar} style={{ marginTop: 2 }} />
                <Text style={styles.avisoTexto}>
                  {favoritos ? TEXTO_AVISO_FAVORITOS : TEXTO_AVISO_EXPIRACAO}
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          contaPendente ? (
            <View style={styles.box}>
              <Text style={styles.boxTexto}>
                Sua conta está marcada para exclusão. Reative no perfil pra ver seus replays.
              </Text>
            </View>
          ) : trocando ? (
            <ActivityIndicator style={styles.trocando} color={cores.teal} />
          ) : filtrando ? (
            // Ex.: trocou de grupo mantendo um mês sem vídeo nesse grupo.
            <View style={styles.box}>
              <Text style={styles.boxTexto}>Nenhum vídeo nesse filtro.</Text>
              <Pressable style={styles.limpar} onPress={() => trocarFiltro(FILTRO_VAZIO)}>
                <Text style={styles.limparTexto}>Ver todos</Text>
              </Pressable>
            </View>
          ) : favoritos ? (
            <View style={styles.box}>
              <Heart size={24} color={cores.favorito} />
              <Text style={styles.boxTitulo}>Nenhum vídeo favorito ainda.</Text>
              <Text style={styles.boxTexto}>
                Toque no coração de qualquer vídeo, na Resenha, no resultado da partida ou aqui,
                pra guardar ele nesta aba.
              </Text>
            </View>
          ) : temVencidos ? (
            <View style={styles.box}>
              <Hourglass size={24} color="rgba(245, 158, 11, 0.7)" />
              <Text style={styles.boxTitulo}>
                Nenhum gol seu em vídeo nos últimos {MESES_COMUNICADOS} meses
              </Text>
              <Text style={styles.boxTexto}>
                Os vídeos mais antigos somem automaticamente. Os que você favoritou estão em
                Favoritos.
              </Text>
              <Pressable style={styles.limpar} onPress={() => trocarAba("FAVORITOS")}>
                <Text style={styles.limparTexto}>Ver Favoritos</Text>
              </Pressable>
            </View>
          ) : (
            <EmDesenvolvimento
              titulo="Seus gols em vídeo estão chegando"
              texto="Estamos preparando os replays para liberar em breve. Quando estiver pronto, cada gol seu vai aparecer aqui em vídeo."
            />
          )
        }
        renderItem={({ item, index }) => {
          const banner = bannerDoFeedDepoisDe(index, itens.length, !temMais, campanhas.length);
          return (
            <View style={styles.item}>
              <BlocoCard
                bloco={item.bloco}
                grupoId={item.grupoId}
                chamarApi={chamarApi}
                podeModerar={false}
                meuJogadorId={jogador.id}
                podeComentar={podeComentar}
                {...(favoritos
                  ? { favoritos: { grupoNome: item.grupoNome } }
                  : { meus: { grupoNome: item.grupoNome, grupoRemovido: item.grupoRemovido } })}
              />
              {banner !== null && <BannerDoFeed banner={banner} campanhas={campanhas} />}
            </View>
          );
        }}
        ListFooterComponent={
          temMais && !contaPendente && !trocando ? (
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
                  Carregar mais ({itens.length} de {total})
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
  // Card + banner (Instagram ou campanha, quando cai ali), com o mesmo respiro da lista.
  item: { gap: 16 },
  sub: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  subLinha: { flexDirection: "row", alignItems: "center", gap: 12 },

  // Abas (mesmo desenho das abas da Resenha).
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

  box: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 18,
    gap: 6,
    alignItems: "center",
  },
  boxTitulo: { fontSize: 14, color: cores.slate300, textAlign: "center" },
  boxTexto: { fontSize: 14, lineHeight: 20, color: cores.slate400, textAlign: "center" },
  filtros: { gap: 8, marginTop: 10 },
  aviso: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.ambarBorda,
    backgroundColor: cores.ambarFundo,
  },
  avisoTexto: { flex: 1, fontSize: 12, lineHeight: 18, color: cores.ambar },
  chipExpirando: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    marginTop: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.ambarBorda,
    backgroundColor: cores.ambarFundo,
  },
  chipExpirandoTexto: { fontSize: 12, fontWeight: "500", color: cores.ambar },
  trocando: { paddingVertical: 40 },
  limpar: {
    marginTop: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: raio.campo,
    backgroundColor: cores.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  limparTexto: { fontSize: 14, fontWeight: "700", color: cores.dark },
  mais: { height: 44, alignItems: "center", justifyContent: "center" },
  maisTexto: { fontSize: 13, fontWeight: "600", color: cores.slate400 },
});
