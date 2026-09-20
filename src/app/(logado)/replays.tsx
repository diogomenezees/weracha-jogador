import { useCallback, useEffect, useState } from "react";
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

import { buscarStatusExclusao } from "@/api/conta";
import { buscarMeusReplays } from "@/api/replays";
import { mensagemDoErro } from "@/mensagens-erro";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { BlocoCard } from "@/resenha/BlocoCard";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import { Video } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { TituloTela } from "@/ui/TituloTela";
import type {
  AutorComentario,
  BlocoFeedResenha,
  MeuReplay,
  PodeComentar,
} from "@/contrato/tipos";

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
  };
}

export default function Replays() {
  // Sem folga embaixo, a barra de botões do Android fica em cima do último card.
  const insets = useSafeAreaInsets();
  const { estado, chamarApi } = useSessao();
  const jogador = estado.fase === "logado" ? estado.jogador : null;

  const [replays, setReplays] = useState<MeuReplay[] | null>(null);
  const [temMais, setTemMais] = useState(false);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [contaPendente, setContaPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);

  const carregar = useCallback(async () => {
    const [status, primeira] = await Promise.all([
      buscarStatusExclusao(chamarApi),
      buscarMeusReplays(chamarApi, 0),
    ]);
    setContaPendente(status.solicitacaoPendente != null);
    setReplays(primeira.replays);
    setTemMais(primeira.temMais);
    setTotal(primeira.total);
    setPagina(0);
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

  const recarregar = useCallback(async () => {
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

  async function carregarMais() {
    if (carregandoMais || !temMais) return;
    setCarregandoMais(true);
    try {
      const prox = pagina + 1;
      const p = await buscarMeusReplays(chamarApi, prox);
      setReplays((prev) => {
        const vistos = new Set((prev ?? []).map((r) => r.golId));
        return [...(prev ?? []), ...p.replays.filter((r) => !vistos.has(r.golId))];
      });
      setTemMais(p.temMais);
      setTotal(p.total);
      setPagina(prox);
    } catch {
      // silencioso: o botão continua clicável
    } finally {
      setCarregandoMais(false);
    }
  }

  if (erro && !replays) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar voltar="Painel" />
        <TelaErro mensagem={erro} onTentar={() => setTentativa((t) => t + 1)} />
      </SafeAreaView>
    );
  }
  if (!jogador || !replays) {
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

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Painel" />
      <FlatList
        data={contaPendente ? [] : replays}
        keyExtractor={(r) => r.pedidoReplayId}
        contentContainerStyle={[styles.lista, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void recarregar()}
            tintColor={cores.teal}
          />
        }
        onEndReachedThreshold={0.6}
        onEndReached={() => void carregarMais()}
        ListHeaderComponent={
          <View style={styles.cabecalho}>
            <TituloTela Icone={Video}>Replays</TituloTela>
            <Text style={styles.sub}>
              Os replays dos seus gols em qualquer partida, de qualquer grupo, sem precisar entrar
              em cada uma.
            </Text>
          </View>
        }
        ListEmptyComponent={
          contaPendente ? (
            <View style={styles.box}>
              <Text style={styles.boxTexto}>
                Sua conta está marcada para exclusão. Reative no perfil pra ver seus replays.
              </Text>
            </View>
          ) : (
            <View style={styles.box}>
              <Text style={styles.boxTitulo}>Nenhum replay ainda</Text>
              <Text style={styles.boxTexto}>
                Pode ser que ninguém tenha gravado um gol seu ainda, ou que seu grupo não use o We
                Racha Cam. Quando o primeiro replay chegar, ele aparece aqui.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <BlocoCard
            bloco={comoBloco(item, jogador)}
            grupoId={item.grupoId}
            chamarApi={chamarApi}
            podeModerar={false}
            meuJogadorId={jogador.id}
            podeComentar={podeComentar}
            meus={{ grupoNome: item.grupoNome, grupoRemovido: item.grupoRemovido }}
          />
        )}
        ListFooterComponent={
          temMais && !contaPendente ? (
            <Pressable
              style={styles.mais}
              onPress={() => void carregarMais()}
              disabled={carregandoMais}
            >
              {carregandoMais ? (
                <ActivityIndicator color={cores.slate400} />
              ) : (
                <Text style={styles.maisTexto}>
                  Carregar mais ({replays.length} de {total})
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
  boxTexto: { fontSize: 14, lineHeight: 20, color: cores.slate400, textAlign: "center" },
  mais: { height: 44, alignItems: "center", justifyContent: "center" },
  maisTexto: { fontSize: 13, fontWeight: "600", color: cores.slate400 },
});
