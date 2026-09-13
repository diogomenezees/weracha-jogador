import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView } from "react-native-safe-area-context";

import { buscarArtilheiros } from "@/api/artilheiros";
import { buscarStatusExclusao } from "@/api/conta";
import { mensagemDoErro } from "@/mensagens-erro";
import { TelaArtilheiros } from "@/artilheiros/TelaArtilheiros";
import { Goal } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { TituloTela } from "@/ui/TituloTela";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type { DadosArtilheiros } from "@/contrato/tipos";

export default function ArtilheirosGlobal() {
  const { chamarApi } = useSessao();
  const [dados, setDados] = useState<DadosArtilheiros | undefined>(undefined);
  const [contaPendente, setContaPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [trocando, setTrocando] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [status, d] = await Promise.all([
          buscarStatusExclusao(chamarApi),
          buscarArtilheiros(chamarApi),
        ]);
        if (!vivo) return;
        setContaPendente(status.solicitacaoPendente != null);
        setDados(d);
        setErro(null);
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [chamarApi, tentativa]);

  const trocarEsporte = useCallback(
    async (esporte: string) => {
      setTrocando(esporte);
      try {
        setDados(await buscarArtilheiros(chamarApi, { esporte }));
      } catch (e) {
        setErro(mensagemDoErro(e));
      } finally {
        setTrocando(null);
      }
    },
    [chamarApi]
  );

  const voltar = <Navbar voltar="Painel" />;

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

  const semGrupos =
    dados.escopo.tipo === "esporte" && dados.escopo.esportesDisponiveis.length === 0;

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      {voltar}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cabecalho}>
          <TituloTela Icone={Goal}>Artilheiros</TituloTela>
          <Text style={styles.sub}>Ranking de gols nos grupos que você faz parte.</Text>
        </View>

        {contaPendente ? (
          <View style={styles.box}>
            <Text style={styles.boxTexto}>
              Sua conta está marcada para exclusão. Reative no painel pra ver o ranking.
            </Text>
          </View>
        ) : semGrupos ? (
          <View style={styles.box}>
            <Text style={styles.boxTitulo}>Sem grupos</Text>
            <Text style={styles.boxTexto}>
              Entre num grupo pra ver o ranking de artilheiros do seu esporte.
            </Text>
          </View>
        ) : (
          <TelaArtilheiros
            dados={dados}
            aoTrocarEsporte={trocarEsporte}
            esporteCarregando={trocando}
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
