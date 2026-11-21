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
import { ALTURA_RODAPE_SEM_GRUPO, EstadoSemGrupo, EstadoVazio, RodapeSemGrupo } from "@/ui/SemGrupo";

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
        <TelaErro mensagem={erro} onTentar={() => {
            setErro(null);
            setTentativa((t) => t + 1);
          }} />
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

  const semGrupo = !contaPendente && dados.grupos.length === 0;
  const semJogo = !contaPendente && !semGrupo && dados.jogos.length === 0;

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      {voltar}
      <ScrollView
        contentContainerStyle={[styles.scroll, semGrupo ? { flexGrow: 1, paddingBottom: ALTURA_RODAPE_SEM_GRUPO + insets.bottom } : semJogo ? { flexGrow: 1, paddingBottom: 40 + insets.bottom } : { paddingBottom: 40 + insets.bottom }]}
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
          <TituloTela Icone={Activity}>Minha performance</TituloTela>
          <Text style={styles.sub}>Seus números nos grupos que você joga.</Text>
        </View>

        {contaPendente ? (
          <View style={styles.box}>
            <Text style={styles.boxTexto}>
              Sua conta está marcada para exclusão. Reative no painel pra ver seus números.
            </Text>
          </View>
        ) : dados.grupos.length === 0 ? (
          <EstadoSemGrupo
            Icone={Activity}
            titulo="Sua performance começa no primeiro racha"
            texto="Gols, presença e evolução aparecem aqui assim que você jogar com um grupo."
          />
        ) : semJogo ? (
          // Tem grupo, mas nenhum jogo seu com resultado: no lugar de um monte de zeros,
          // a tela espera o primeiro resultado (igual ao site).
          dados.partidasRealizadas.some((p) => p.total > 0) ? (
            <EstadoVazio
              Icone={Activity}
              titulo="Você ainda não entrou em campo"
              texto="Seus gols, sua presença e sua evolução aparecem aqui depois do primeiro racha que você jogar."
            />
          ) : (
            <EstadoVazio
              Icone={Activity}
              titulo="Aguardando o primeiro resultado"
              texto="Seus gols, sua presença e sua evolução aparecem aqui assim que o primeiro racha do seu grupo tiver resultado."
            />
          )
        ) : (
          <TelaEstatisticas dados={dados} />
        )}
      </ScrollView>
      {semGrupo && <RodapeSemGrupo />}
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
