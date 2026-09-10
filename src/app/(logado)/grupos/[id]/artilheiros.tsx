import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { buscarArtilheiros } from "@/api/artilheiros";
import { PRODUCAO_URL } from "@/config/links";
import { mensagemDoErro } from "@/mensagens-erro";
import { TelaArtilheiros } from "@/artilheiros/TelaArtilheiros";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores } from "@/tema";
import type { DadosArtilheiros } from "@/contrato/tipos";

export default function ArtilheirosDoGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chamarApi } = useSessao();
  const [dados, setDados] = useState<DadosArtilheiros | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const carregar = useCallback(async () => {
    return buscarArtilheiros(chamarApi, { grupoId: id });
  }, [chamarApi, id]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const d = await carregar();
        if (vivo) {
          setDados(d);
          setErro(null);
        }
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [carregar, tentativa]);

  const voltar = (
    <View style={styles.topo}>
      <Pressable hitSlop={10} onPress={() => router.back()}>
        <Text style={styles.voltar}>‹ Grupo</Text>
      </Pressable>
    </View>
  );

  if (erro) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        <TelaErro mensagem={erro} onTentar={() => setTentativa((t) => t + 1)} />
      </SafeAreaView>
    );
  }
  if (dados === undefined) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        <TelaCarregando mensagem="Carregando ranking..." />
      </SafeAreaView>
    );
  }

  const grupoNome = dados.escopo.tipo === "grupo" ? dados.escopo.grupoNome : "";

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      {voltar}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cabecalho}>
          <Text style={styles.h1}>⚽ Artilheiros</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {grupoNome}
          </Text>
        </View>
        {dados.escopo.tipo === "grupo" ? (
          <TelaArtilheiros
            dados={dados}
            linkCompartilhar={`${PRODUCAO_URL}/grupos/${id}/artilheiros`}
          />
        ) : (
          <Text style={styles.sub}>Não deu pra carregar o ranking desse grupo.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  topo: { paddingHorizontal: 20, paddingTop: 4 },
  voltar: { fontSize: 16, color: cores.slate400 },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 18 },
  cabecalho: { gap: 4 },
  h1: { fontSize: 24, fontWeight: "700", color: cores.branco },
  sub: { fontSize: 14, color: cores.slate400 },
});
