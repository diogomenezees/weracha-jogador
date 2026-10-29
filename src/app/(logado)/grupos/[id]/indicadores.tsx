import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { buscarIndicadoresDoGrupo } from "@/api/indicadoresGrupo";
import { mensagemDoErro } from "@/mensagens-erro";
import { TelaIndicadoresGrupo } from "@/estatisticas/TelaIndicadoresGrupo";
import { Activity, Users } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { TituloTela } from "@/ui/TituloTela";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores } from "@/tema";
import type { DadosIndicadoresDoGrupo } from "@/contrato/tipos";

// Indicadores do grupo por mês (GET /api/v1/grupos/{id}/indicadores). Abre no
// mês corrente; cada chip pede o período ao servidor. Espelha
// weracha-site/app/grupos/[id]/indicadores/page.tsx.
export default function IndicadoresDoGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Sem folga embaixo, a barra de botões do Android fica em cima do último item.
  const insets = useSafeAreaInsets();
  const { chamarApi } = useSessao();
  const [dados, setDados] = useState<DadosIndicadoresDoGrupo | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const [periodoCarregando, setPeriodoCarregando] = useState<string | null>(null);
  // Último período pedido: resposta atrasada de um chip anterior é descartada.
  const pedidoRef = useRef<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const d = await buscarIndicadoresDoGrupo(chamarApi, id);
        if (!vivo) return;
        setDados(d);
        setErro(null);
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [chamarApi, id, tentativa]);

  const trocarPeriodo = useCallback(
    async (periodo: string) => {
      pedidoRef.current = periodo;
      setPeriodoCarregando(periodo);
      try {
        const d = await buscarIndicadoresDoGrupo(chamarApi, id, periodo);
        if (pedidoRef.current === periodo) setDados(d);
      } catch (e) {
        setErro(mensagemDoErro(e));
      } finally {
        if (pedidoRef.current === periodo) setPeriodoCarregando(null);
      }
    },
    [chamarApi, id]
  );

  async function atualizar() {
    setAtualizando(true);
    try {
      setDados(await buscarIndicadoresDoGrupo(chamarApi, id, dados?.periodo));
      setErro(null);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setAtualizando(false);
    }
  }

  const voltar = <Navbar voltar="Grupo" />;

  if (erro && !dados) {
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
        <TelaCarregando mensagem="Carregando indicadores..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      {voltar}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void atualizar()}
            tintColor={cores.teal}
          />
        }
      >
        <View style={styles.cabecalho}>
          <TituloTela Icone={Activity}>Indicadores</TituloTela>
          <View style={styles.subLinha}>
            <Users size={12} color={cores.slate400} />
            <Text style={styles.sub} numberOfLines={1}>
              {dados.grupo.nome}
            </Text>
          </View>
        </View>

        <TelaIndicadoresGrupo
          dados={dados}
          periodoCarregando={periodoCarregando}
          aoTrocarPeriodo={(p) => void trocarPeriodo(p)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 18 },
  cabecalho: { gap: 2 },
  subLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  sub: { flexShrink: 1, fontSize: 14, color: cores.slate400 },
});
