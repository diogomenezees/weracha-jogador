import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { buscarArtilheiros } from "@/api/artilheiros";
import { CHAVE_GERAL, golsLabel, mesNaFrase } from "@/artilheiros/ranking";
import { PRODUCAO_URL } from "@/config/links";
import { mensagemDoErro } from "@/mensagens-erro";
import { TelaArtilheiros } from "@/artilheiros/TelaArtilheiros";
import { Goal, Share2, Users } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { TituloTela } from "@/ui/TituloTela";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores } from "@/tema";
import type { DadosArtilheiros, LinhaRanking, PeriodoArtilheiros } from "@/contrato/tipos";

const MEDALHAS = ["🥇", "🥈", "🥉"];

// Texto que acompanha o link no compartilhamento (WhatsApp), mesma voz da
// versão web (weracha-site/app/grupos/[id]/artilheiros/page.tsx). Sem
// travessão (regra do weracha/CLAUDE.md pra texto visível).
function montarMensagemArtilheiros(
  grupoNome: string,
  periodo: PeriodoArtilheiros,
  top3: LinhaRanking[],
  link: string
): string {
  const linhas = top3
    .map((j, i) => `${MEDALHAS[i] ?? `${i + 1}º`} ${j.nome}: ${golsLabel(j.gols)}`)
    .join("\n");
  const titulo =
    periodo.chave === CHAVE_GERAL
      ? `🏆 Artilheiros do grupo *${grupoNome}*`
      : `🏆 Artilheiros de ${mesNaFrase(periodo.rotulo)} no grupo *${grupoNome}*`;
  return `${titulo}\n\n${linhas}\n\nPra ver o ranking completo, é só clicar aqui:\n${link}`;
}

export default function ArtilheirosDoGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chamarApi } = useSessao();
  const [dados, setDados] = useState<DadosArtilheiros | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [ctx, setCtx] = useState<{ periodo: PeriodoArtilheiros; ranking: LinhaRanking[] } | null>(
    null
  );

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

  const voltar = <Navbar voltar="Grupo" />;

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
  const top3Ctx = ctx?.ranking.slice(0, 3) ?? [];
  const mostrarCompartilhar = dados.escopo.tipo === "grupo" && top3Ctx.length > 0;

  async function compartilhar() {
    if (!ctx || top3Ctx.length === 0) return;
    const link = `${PRODUCAO_URL}/grupos/${id}/artilheiros`;
    const texto = montarMensagemArtilheiros(grupoNome, ctx.periodo, top3Ctx, link);
    try {
      await Share.share({ message: texto });
    } catch {
      // cancelou
    }
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      {voltar}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cabecalho}>
          <View style={styles.tituloLinha}>
            <TituloTela Icone={Goal}>Artilheiros</TituloTela>
            {mostrarCompartilhar && (
              <Pressable
                accessibilityLabel="Compartilhar artilheiros"
                style={styles.compartilharBtn}
                onPress={() => void compartilhar()}
              >
                <Share2 size={16} color={cores.orange} />
              </Pressable>
            )}
          </View>
          <View style={styles.subLinha}>
            <Users size={12} color={cores.slate400} />
            <Text style={styles.sub} numberOfLines={1}>
              {grupoNome}
            </Text>
          </View>
        </View>
        {dados.escopo.tipo === "grupo" ? (
          <TelaArtilheiros dados={dados} aoMudarContexto={setCtx} />
        ) : (
          <Text style={styles.sub}>Não deu pra carregar o ranking desse grupo.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 18 },
  cabecalho: { gap: 4 },
  tituloLinha: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  compartilharBtn: {
    width: 30,
    height: 30,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  h1: { fontSize: 24, fontWeight: "700", color: cores.branco },
  subLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  sub: { flexShrink: 1, fontSize: 14, color: cores.slate400 },
});
