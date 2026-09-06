import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { listarMeusGrupos } from "@/api/grupos";
import { mensagemDoErro } from "@/mensagens-erro";
import { formatarDataPartida } from "@/formato";
import { esperandoNovaData, meuPapelNoGrupo, ordenarPorProximaPartida, proximaPartida } from "@/grupos";
import { rotuloDoAmbiente } from "@/config/servidor";
import { useSessao } from "@/sessao/contexto";
import type { Grupo } from "@/contrato/tipos";

export default function MeusGrupos() {
  const { estado, ambiente, urlBase, chamarApi, sair } = useSessao();
  const meuId = estado.fase === "logado" ? estado.jogador.id : "";
  const primeiroNome =
    estado.fase === "logado" ? estado.jogador.nome.split(" ")[0] : "";

  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const buscar = useCallback(async () => {
    const lista = await listarMeusGrupos(chamarApi);
    return ordenarPorProximaPartida(lista);
  }, [chamarApi]);

  // Carga inicial: só mexe no state depois do await (evita setState síncrono
  // dentro do effect).
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const lista = await buscar();
        if (vivo) setGrupos(lista);
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [buscar]);

  // Retry (tela de erro) e pull-to-refresh: disparados por gesto, não pelo effect.
  const recarregar = useCallback(
    async (modo: "botao" | "puxar") => {
      if (modo === "botao") setCarregando(true);
      else setAtualizando(true);
      setErro(null);
      try {
        setGrupos(await buscar());
      } catch (e) {
        setErro(mensagemDoErro(e));
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    [buscar]
  );

  function abrirMenu() {
    Alert.alert(
      "Conta",
      `${rotuloDoAmbiente(ambiente)} · ${urlBase}`,
      [
        { text: "Sair", style: "destructive", onPress: () => void sair() },
        { text: "Fechar", style: "cancel" },
      ],
      { cancelable: true }
    );
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <View style={styles.cabecalho}>
        <View>
          <Text style={styles.ola}>{primeiroNome ? `Olá, ${primeiroNome}` : "Meus grupos"}</Text>
          <Text style={styles.sub}>Seus rachas</Text>
        </View>
        <Pressable hitSlop={12} onPress={abrirMenu}>
          <Text style={styles.engrenagem}>⚙</Text>
        </Pressable>
      </View>

      {carregando ? (
        <View style={styles.centro}>
          <ActivityIndicator size="large" />
        </View>
      ) : erro && !grupos ? (
        <View style={styles.centro}>
          <Text style={styles.erro}>{erro}</Text>
          <Pressable style={styles.botao} onPress={() => void recarregar("botao")}>
            <Text style={styles.botaoTexto}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={grupos ?? []}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.lista}
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={() => void recarregar("puxar")} />
          }
          ListEmptyComponent={
            <View style={styles.centro}>
              <Text style={styles.vazio}>Você ainda não está em nenhum grupo.</Text>
              <Text style={styles.vazioSub}>
                Peça o link de convite pro organizador do seu racha.
              </Text>
            </View>
          }
          renderItem={({ item }) => <CardGrupo grupo={item} meuId={meuId} />}
        />
      )}
    </SafeAreaView>
  );
}

function CardGrupo({ grupo, meuId }: { grupo: Grupo; meuId: string }) {
  const papel = meuPapelNoGrupo(grupo, meuId);
  const proxima = proximaPartida(grupo);
  const atencao = esperandoNovaData(grupo);

  return (
    <View style={[styles.card, atencao && styles.cardAtencao]}>
      <View style={styles.cardTopo}>
        <Text style={styles.cardNome} numberOfLines={1}>
          {grupo.nome}
        </Text>
        {papel !== "MEMBRO" ? (
          <View style={styles.badge}>
            <Text style={styles.badgeTexto}>{papel === "DONO" ? "Dono" : "Admin"}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.cardEsporte}>{grupo.esporte}</Text>

      <Text style={[styles.cardPartida, atencao && styles.cardPartidaAtencao]}>
        {proxima
          ? `Próxima: ${formatarDataPartida(proxima.data)}`
          : grupo.tipo === "RECORRENTE"
            ? "Aguardando renovação do mês"
            : "Sem data marcada"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#f5f5f5" },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  ola: { fontSize: 22, fontWeight: "700", color: "#111" },
  sub: { fontSize: 13, color: "#777", marginTop: 2 },
  engrenagem: { fontSize: 22, color: "#555" },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  erro: { color: "#c0261c", fontSize: 15, textAlign: "center" },
  vazio: { fontSize: 16, fontWeight: "600", color: "#333", textAlign: "center" },
  vazioSub: { fontSize: 14, color: "#777", textAlign: "center" },
  lista: { padding: 16, gap: 12, flexGrow: 1 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#208AEF",
    gap: 6,
  },
  cardAtencao: { borderLeftColor: "#e0a800" },
  cardTopo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardNome: { fontSize: 17, fontWeight: "700", color: "#111", flexShrink: 1 },
  badge: { backgroundColor: "#eef4ff", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTexto: { fontSize: 11, fontWeight: "700", color: "#208AEF" },
  cardEsporte: { fontSize: 13, color: "#888", textTransform: "capitalize" },
  cardPartida: { fontSize: 14, color: "#333", marginTop: 2 },
  cardPartidaAtencao: { color: "#a06f00" },
  botao: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  botaoTexto: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
