import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { buscarMinhasEnquetes } from "@/api/enquetes";
import { PRODUCAO_URL } from "@/config/links";
import { mensagemDoErro } from "@/mensagens-erro";
import { ModalEnquete } from "@/enquetes/ModalEnquete";
import { BarChart3, Users } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { TituloTela } from "@/ui/TituloTela";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type { EnqueteComGrupo, EnquetesDoJogador } from "@/contrato/tipos";

export default function EnquetesGlobal() {
  // Sem folga embaixo, a barra de botões do Android fica em cima do último item.
  const insets = useSafeAreaInsets();
  const { estado, chamarApi } = useSessao();
  const meuId = estado.fase === "logado" ? estado.jogador.id : null;

  const [dados, setDados] = useState<EnquetesDoJogador | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [detalheId, setDetalheId] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const d = await buscarMinhasEnquetes(chamarApi);
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
  }, [chamarApi, tentativa]);

  const recarregar = useCallback(async () => {
    try {
      setDados(await buscarMinhasEnquetes(chamarApi));
    } catch {
      // mantém
    }
  }, [chamarApi]);

  const voltar = <Navbar voltar="Painel" />;

  if (erro && !dados) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        <TelaErro mensagem={erro} onTentar={() => setTentativa((t) => t + 1)} />
      </SafeAreaView>
    );
  }
  if (!dados) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        <TelaCarregando mensagem="Carregando enquetes..." />
      </SafeAreaView>
    );
  }

  const todas = [...dados.ativas, ...dados.encerradas];
  const detalhe = todas.find((e) => e.id === detalheId) ?? null;

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      {voltar}
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.cabecalho}>
          <TituloTela Icone={BarChart3}>Enquetes</TituloTela>
          <Text style={styles.sub}>Todas as enquetes dos grupos que você faz parte, num só lugar.</Text>
        </View>

        {todas.length === 0 && (
          <View style={styles.box}>
            <Text style={styles.boxTitulo}>Sem enquetes</Text>
            <Text style={styles.boxTexto}>Nenhuma enquete nos grupos que você faz parte ainda.</Text>
          </View>
        )}

        {dados.ativas.length > 0 && (
          <Secao titulo="Enquetes em andamento" descricao="Participe das votações">
            {dados.ativas.map((e) => (
              <Card key={e.id} enquete={e} onPress={() => setDetalheId(e.id)} />
            ))}
          </Secao>
        )}
        {dados.encerradas.length > 0 && (
          <Secao titulo="Encerradas" descricao="Enquetes que já terminaram">
            {dados.encerradas.map((e) => (
              <Card key={e.id} enquete={e} onPress={() => setDetalheId(e.id)} />
            ))}
          </Secao>
        )}

        <Text style={styles.avisoCriar}>Pra criar uma enquete, entre no grupo que você faz parte.</Text>
      </ScrollView>

      <ModalEnquete
        enquete={detalhe}
        aberto={detalheId !== null}
        onFechar={() => setDetalheId(null)}
        chamarApi={chamarApi}
        meuId={meuId}
        souAdmin={detalhe?.souAdminDoGrupo ?? false}
        grupoNome={detalhe?.grupoNome ?? ""}
        linkCompartilhar={detalhe ? `${PRODUCAO_URL}/grupos/${detalhe.grupoId}/enquetes` : PRODUCAO_URL}
        onRecarregar={recarregar}
        onIrAoGrupo={detalhe ? () => router.push(`/grupos/${detalhe.grupoId}`) : undefined}
      />
    </SafeAreaView>
  );
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.secao}>
      <Text style={styles.secaoTitulo}>{titulo}</Text>
      <Text style={styles.secaoDescricao}>{descricao}</Text>
      <View style={styles.lista}>{children}</View>
    </View>
  );
}

function Card({ enquete, onPress }: { enquete: EnqueteComGrupo; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.card, { borderLeftColor: enquete.ativa ? cores.teal : "rgba(255,255,255,0.1)" }]}
      onPress={onPress}
    >
      <View style={styles.cardTopo}>
        <Text style={styles.cardPergunta} numberOfLines={1}>
          {enquete.pergunta}
        </Text>
        <View style={[styles.badge, enquete.ativa ? styles.badgeAtiva : styles.badgeEncerrada]}>
          <Text style={[styles.badgeTexto, { color: enquete.ativa ? "#6ee7b7" : cores.slate400 }]}>
            {enquete.ativa ? "Ativa" : "Encerrada"}
          </Text>
        </View>
      </View>
      <View style={styles.cardGrupoLinha}>
        <Users size={12} color={cores.slate400} />
        <Text style={styles.cardGrupo} numberOfLines={1}>
          {enquete.grupoNome}
        </Text>
      </View>
      <View style={styles.pilula}>
        <Text style={styles.pilulaTexto}>{enquete.anonima ? "Voto secreto" : "Identificada"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 20 },
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
  secao: { gap: 8 },
  secaoTitulo: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  secaoDescricao: { fontSize: 14, color: cores.slate400 },
  avisoCriar: { fontSize: 12, color: cores.slate400, textAlign: "center" },
  lista: { gap: 10 },
  card: {
    borderTopRightRadius: raio.campo,
    borderBottomRightRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    borderLeftWidth: 3,
    backgroundColor: cores.cardFundo,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 3,
  },
  cardTopo: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  cardPergunta: { flex: 1, fontSize: 16, fontWeight: "500", color: cores.branco },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeAtiva: { backgroundColor: "rgba(16,185,129,0.15)" },
  badgeEncerrada: { backgroundColor: "rgba(100,116,139,0.2)" },
  badgeTexto: { fontSize: 10, fontWeight: "500", textTransform: "uppercase" },
  cardGrupoLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardGrupo: { flexShrink: 1, fontSize: 14, color: cores.slate400 },
  pilula: {
    alignSelf: "flex-start",
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pilulaTexto: { fontSize: 10, fontWeight: "500", letterSpacing: 0.5, color: cores.slate400, textTransform: "uppercase" },
});
