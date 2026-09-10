import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { buscarMinhasEnquetes } from "@/api/enquetes";
import { PRODUCAO_URL } from "@/config/links";
import { mensagemDoErro } from "@/mensagens-erro";
import { ModalEnquete } from "@/enquetes/ModalEnquete";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type { EnqueteComGrupo, EnquetesDoJogador } from "@/contrato/tipos";

export default function EnquetesGlobal() {
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

  const voltar = (
    <View style={styles.topo}>
      <Pressable hitSlop={10} onPress={() => router.back()}>
        <Text style={styles.voltar}>‹ Painel</Text>
      </Pressable>
    </View>
  );

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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cabecalho}>
          <Text style={styles.h1}>📊 Enquetes</Text>
          <Text style={styles.sub}>Votações de todos os seus grupos.</Text>
        </View>

        {todas.length === 0 && (
          <View style={styles.box}>
            <Text style={styles.boxTitulo}>Sem enquetes</Text>
            <Text style={styles.boxTexto}>Nenhuma enquete nos seus grupos ainda.</Text>
          </View>
        )}

        {dados.ativas.length > 0 && (
          <Secao titulo="Em andamento">
            {dados.ativas.map((e) => (
              <Card key={e.id} enquete={e} onPress={() => setDetalheId(e.id)} />
            ))}
          </Secao>
        )}
        {dados.encerradas.length > 0 && (
          <Secao titulo="Encerradas">
            {dados.encerradas.map((e) => (
              <Card key={e.id} enquete={e} onPress={() => setDetalheId(e.id)} />
            ))}
          </Secao>
        )}
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
      />
    </SafeAreaView>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.secao}>
      <Text style={styles.secaoTitulo}>{titulo}</Text>
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
      <Text style={styles.cardGrupo}>{enquete.grupoNome}</Text>
      <Text style={styles.cardPergunta} numberOfLines={2}>
        {enquete.pergunta}
      </Text>
      <Text style={styles.cardMeta}>
        {enquete.anonima ? "Voto secreto" : "Identificada"} · {enquete.totalVotos}{" "}
        {enquete.totalVotos === 1 ? "voto" : "votos"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  topo: { paddingHorizontal: 20, paddingTop: 4 },
  voltar: { fontSize: 16, color: cores.slate400 },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 20 },
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
  lista: { gap: 10 },
  card: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    borderLeftWidth: 3,
    backgroundColor: cores.cardFundo,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 3,
  },
  cardGrupo: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  cardPergunta: { fontSize: 15, fontWeight: "600", color: cores.branco },
  cardMeta: { fontSize: 12, color: cores.slate400, marginTop: 2 },
});
