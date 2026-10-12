import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { buscarStatusExclusao } from "@/api/conta";
import { buscarEstatisticas } from "@/api/estatisticas";
import { mensagemDoErro } from "@/mensagens-erro";
import { TelaEstatisticas } from "@/estatisticas/TelaEstatisticas";
import { Activity } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { TituloTela } from "@/ui/TituloTela";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type { DadosEstatisticas } from "@/contrato/tipos";

// "Meus indicadores": os números do jogador logado com filtro de grupo e mês.
// Uma leitura só (GET /api/v1/estatisticas); os filtros recalculam no aparelho.
// Espelha weracha-site/app/indicadores/page.tsx.
export default function Estatisticas() {
  // Sem folga embaixo, a barra de botões do Android fica em cima do último item.
  const insets = useSafeAreaInsets();
  const { chamarApi } = useSessao();
  const [dados, setDados] = useState<DadosEstatisticas | undefined>(undefined);
  const [contaPendente, setContaPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    const [status, d] = await Promise.all([
      buscarStatusExclusao(chamarApi),
      buscarEstatisticas(chamarApi),
    ]);
    setContaPendente(status.solicitacaoPendente != null);
    setDados(d);
    setErro(null);
  }, [chamarApi]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        await carregar();
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [carregar, tentativa]);

  async function atualizar() {
    setAtualizando(true);
    try {
      await carregar();
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setAtualizando(false);
    }
  }

  const voltar = <Navbar voltar="Painel" />;

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
        <TelaCarregando mensagem="Carregando seus indicadores..." />
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
          <TituloTela Icone={Activity}>Meus indicadores</TituloTela>
          <Text style={styles.sub}>Seus números nos grupos que você joga.</Text>
        </View>

        {contaPendente ? (
          <View style={styles.box}>
            <Text style={styles.boxTexto}>
              Sua conta está marcada para exclusão. Reative no painel pra ver seus números.
            </Text>
          </View>
        ) : dados.grupos.length === 0 ? (
          <View style={styles.box}>
            <Text style={styles.boxTitulo}>Sem grupos</Text>
            <Text style={styles.boxTexto}>
              Entre num grupo e jogue a primeira partida pra ver seus números aqui.
            </Text>
          </View>
        ) : (
          <TelaEstatisticas dados={dados} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 18 },
  cabecalho: { gap: 4 },
  sub: { fontSize: 14, color: cores.slate400 },
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
});
