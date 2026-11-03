import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { buscarMural, marcarMuralVisto } from "@/api/mural";
import { SEGUNDOS_PARA_MARCAR_VISTO, zerarMuralNaoLidos } from "@/mural/naoLidos";
import { mensagemDoErro } from "@/mensagens-erro";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import { Megaphone } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { TituloTela } from "@/ui/TituloTela";
import type { AvisoDoMural } from "@/contrato/tipos";

// Mural: avisos do dono do site (o push "MURAL" abre aqui). Mesma tela do site
// em weracha-site/app/mural/page.tsx.
export default function Mural() {
  const insets = useSafeAreaInsets();
  const { chamarApi } = useSessao();
  const [avisos, setAvisos] = useState<AvisoDoMural[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  // Até quando já tinha visto na 1ª carga. Fica fixo enquanto a tela está aberta
  // (puxar pra atualizar não troca): o "Novo" continua depois de marcar como lido.
  const [vistoAte, setVistoAte] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const r = await buscarMural(chamarApi);
    setAvisos(r.avisos);
    setVistoAte((atual) => atual ?? r.vistoAte);
  }, [chamarApi]);

  const ehNovo = (a: AvisoDoMural) => vistoAte !== null && a.enviadoEm > vistoAte;
  // A lista vem do mais novo pro mais antigo: o 1º novo é o mais recente.
  const maisNovo = avisos?.find(ehNovo)?.enviadoEm ?? null;

  // Depois de uns segundos na tela, os novos viram lidos (some a bolinha do menu).
  useEffect(() => {
    if (!maisNovo) return;
    const espera = setTimeout(() => {
      marcarMuralVisto(chamarApi, maisNovo)
        .then(zerarMuralNaoLidos)
        .catch(() => {});
    }, SEGUNDOS_PARA_MARCAR_VISTO * 1000);
    return () => clearTimeout(espera);
  }, [maisNovo, chamarApi]);

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

  async function atualizar() {
    setAtualizando(true);
    try {
      await carregar();
      setErro(null);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setAtualizando(false);
    }
  }

  if (erro && !avisos) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar voltar="Painel" />
        <TelaErro mensagem={erro} onTentar={() => setTentativa((t) => t + 1)} />
      </SafeAreaView>
    );
  }
  if (!avisos) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar voltar="Painel" />
        <TelaCarregando mensagem="Carregando o Mural..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Painel" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void atualizar()}
            tintColor={cores.teal}
            colors={[cores.teal]}
          />
        }
      >
        <View style={styles.cabecalho}>
          <TituloTela Icone={Megaphone}>Mural</TituloTela>
          {/* Link aninhado no texto: quebra de linha junto com a frase. */}
          <Text style={styles.sub}>
            Recados e novidades do We Racha. Pra parar de receber a notificação, desligue no{" "}
            <Text style={styles.link} onPress={() => router.push("/perfil")} suppressHighlighting>
              Perfil
            </Text>
            .
          </Text>
        </View>

        {avisos.length === 0 ? (
          <View style={styles.box}>
            <Text style={styles.boxTitulo}>Nada por aqui</Text>
            <Text style={styles.boxTexto}>Nenhum aviso ainda.</Text>
          </View>
        ) : (
          <View style={styles.lista}>
            {avisos.map((a) => (
              <View key={a.id} style={[styles.card, ehNovo(a) && styles.cardNovo]}>
                <View style={styles.dataLinha}>
                  <Text style={styles.data}>{formatarData(a.enviadoEm)}</Text>
                  {ehNovo(a) && <Text style={styles.novo}>Novo</Text>}
                </View>
                <Text style={styles.titulo}>{a.titulo}</Text>
                <Text style={styles.corpo}>{a.corpo}</Text>
              </View>
            ))}
          </View>
        )}
        {avisos.length > 0 && (
          <Text style={styles.validade}>Os avisos somem do Mural depois de 3 meses.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 18 },
  cabecalho: { gap: 4 },
  sub: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  link: { color: cores.teal, textDecorationLine: "underline" },
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
  lista: { gap: 10 },
  // Regra em weracha-site/lib/mural.ts (MESES_NO_MURAL).
  validade: { marginTop: -8, fontSize: 12, color: cores.slate500, textAlign: "center" },
  // Mesma borda esquerda teal dos cards de atividade.
  // Canto esquerdo reto: a borda colorida da esquerda vai até o fim.
  card: {
    borderTopRightRadius: raio.campo,
    borderBottomRightRadius: raio.campo,
    borderWidth: 1,
    borderLeftWidth: 2,
    borderColor: cores.cardBorda,
    borderLeftColor: cores.teal,
    backgroundColor: cores.cardFundo,
    padding: 12,
    gap: 3,
  },
  // Ainda não lido (mesmo laranja da bolinha do menu).
  cardNovo: {
    borderColor: "rgba(242, 140, 30, 0.3)",
    borderLeftColor: cores.orange,
    backgroundColor: "rgba(242, 140, 30, 0.07)",
  },
  dataLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  data: { fontSize: 12, color: cores.slate500 },
  novo: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: cores.dark,
    backgroundColor: cores.orange,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  titulo: { fontSize: 15, fontWeight: "700", color: cores.branco },
  corpo: { fontSize: 14, lineHeight: 20, color: cores.slate300, marginTop: 2 },
});
