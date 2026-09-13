import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView } from "react-native-safe-area-context";

import { buscarStatusExclusao } from "@/api/conta";
import { buscarMeusReplays } from "@/api/replays";
import { buscarComentariosEmLote } from "@/api/resenha";
import { mensagemDoErro } from "@/mensagens-erro";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { ListaMeusReplays } from "@/replays/ListaMeusReplays";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import { Video } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { TituloTela } from "@/ui/TituloTela";
import type { ComentarioResenha, MeuReplay, PodeComentar } from "@/contrato/tipos";

export default function Replays() {
  const { estado, chamarApi } = useSessao();
  const jogador = estado.fase === "logado" ? estado.jogador : null;

  const [replays, setReplays] = useState<MeuReplay[] | null>(null);
  const [porPedido, setPorPedido] = useState<Record<string, ComentarioResenha[]>>({});
  const [contaPendente, setContaPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    const [status, lista] = await Promise.all([
      buscarStatusExclusao(chamarApi),
      buscarMeusReplays(chamarApi),
    ]);
    setContaPendente(status.solicitacaoPendente != null);
    setReplays(lista);
    const ids = lista.filter((r) => !r.grupoRemovido).map((r) => r.pedidoReplayId);
    setPorPedido(await buscarComentariosEmLote(chamarApi, ids));
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

  function aoComentarios(pedidoReplayId: string, lista: ComentarioResenha[]) {
    setPorPedido((m) => ({ ...m, [pedidoReplayId]: lista }));
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void recarregar()}
            tintColor={cores.teal}
          />
        }
      >
        <View style={styles.cabecalho}>
          <TituloTela Icone={Video}>Replays</TituloTela>
          <Text style={styles.sub}>
            Os replays dos seus gols em qualquer partida, de qualquer grupo, sem precisar entrar
            em cada uma.
          </Text>
        </View>

        {contaPendente ? (
          <View style={styles.box}>
            <Text style={styles.boxTexto}>
              Sua conta está marcada para exclusão. Reative no perfil pra ver seus replays.
            </Text>
          </View>
        ) : replays.length === 0 ? (
          <View style={styles.box}>
            <Text style={styles.boxTitulo}>Nenhum replay ainda</Text>
            <Text style={styles.boxTexto}>
              Pode ser que ninguém tenha gravado um gol seu ainda, ou que seu grupo não use o We
              Racha Cam. Quando o primeiro replay chegar, ele aparece aqui.
            </Text>
          </View>
        ) : (
          <ListaMeusReplays
            replays={replays}
            comentar={{
              chamarApi,
              meuJogadorId: jogador.id,
              podeComentar,
              podeModerar: false,
              porPedido,
              onComentarios: aoComentarios,
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
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
  boxTexto: { fontSize: 14, lineHeight: 20, color: cores.slate400, textAlign: "center" },
});
