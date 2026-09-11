import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { buscarEnquetesDoGrupo } from "@/api/enquetes";
import { buscarDadosDoGrupo } from "@/api/grupos";
import { PRODUCAO_URL } from "@/config/links";
import { mensagemDoErro } from "@/mensagens-erro";
import { ModalEnquete } from "@/enquetes/ModalEnquete";
import { BarChart3 } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { TituloTela } from "@/ui/TituloTela";
import { BotaoLaranja, TelaCarregando, TelaErro } from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type { Enquete, EnquetesDoGrupo } from "@/contrato/tipos";

export default function EnquetesDoGrupoTela() {
  // `enquete` vem do link de convite (destino .../enquetes?enquete={id}): abre a
  // enquete direto ao chegar.
  const { id, enquete: enqueteInicial } = useLocalSearchParams<{ id: string; enquete?: string }>();
  const { estado, chamarApi } = useSessao();
  const meuId = estado.fase === "logado" ? estado.jogador.id : null;

  const [dados, setDados] = useState<EnquetesDoGrupo | undefined>(undefined);
  const [grupoNome, setGrupoNome] = useState("");
  const [souAdmin, setSouAdmin] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [detalheId, setDetalheId] = useState<string | null>(enqueteInicial ?? null);

  const carregar = useCallback(async () => {
    const [g, d] = await Promise.all([
      buscarDadosDoGrupo(chamarApi, id),
      buscarEnquetesDoGrupo(chamarApi, id),
    ]);
    return { nome: g.grupo?.nome ?? "", admin: g.grupo?.meuPapel === "ADMIN", d };
  }, [chamarApi, id]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { nome, admin, d } = await carregar();
        if (!vivo) return;
        setGrupoNome(nome);
        setSouAdmin(admin);
        setDados(d);
        setErro(null);
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [carregar, tentativa]);

  const recarregar = useCallback(async () => {
    try {
      const { nome, admin, d } = await carregar();
      setGrupoNome(nome);
      setSouAdmin(admin);
      setDados(d);
    } catch {
      // mantém o estado atual
    }
  }, [carregar]);

  const voltar = <Navbar voltar="Grupo" />;

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

  const { ativas, encerradas, podeCriarEnquete } = dados;
  const detalhe = [...ativas, ...encerradas].find((e) => e.id === detalheId) ?? null;

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      {voltar}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cabecalho}>
          <TituloTela Icone={BarChart3}>Enquetes</TituloTela>
          <Text style={styles.sub} numberOfLines={1}>
            {grupoNome}
          </Text>
        </View>

        {ativas.length === 0 && encerradas.length === 0 && (
          <View style={styles.box}>
            <Text style={styles.boxTitulo}>Sem enquetes</Text>
            <Text style={styles.boxTexto}>Nenhuma enquete por aqui ainda.</Text>
          </View>
        )}

        {ativas.length > 0 && (
          <Secao titulo="Em andamento" sub="Participe das votações">
            {ativas.map((e) => (
              <CardEnquete key={e.id} enquete={e} onPress={() => setDetalheId(e.id)} />
            ))}
          </Secao>
        )}
        {encerradas.length > 0 && (
          <Secao titulo="Encerradas" sub="Enquetes que já terminaram">
            {encerradas.map((e) => (
              <CardEnquete key={e.id} enquete={e} onPress={() => setDetalheId(e.id)} />
            ))}
          </Secao>
        )}
      </ScrollView>

      <View style={styles.rodape}>
        {!podeCriarEnquete && (
          <Text style={styles.rodapeNota}>Você só pode ter uma enquete ativa por vez.</Text>
        )}
        {podeCriarEnquete && (
          <BotaoLaranja
            titulo="Criar enquete"
            onPress={() => router.push(`/grupos/${id}/enquetes/nova`)}
          />
        )}
      </View>

      <ModalEnquete
        enquete={detalhe}
        aberto={detalhe !== null}
        onFechar={() => setDetalheId(null)}
        chamarApi={chamarApi}
        meuId={meuId}
        souAdmin={souAdmin}
        grupoNome={grupoNome}
        linkCompartilhar={`${PRODUCAO_URL}/grupos/${id}/enquetes`}
        onRecarregar={recarregar}
      />
    </SafeAreaView>
  );
}

function Secao({
  titulo,
  sub,
  children,
}: {
  titulo: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.secao}>
      <Text style={styles.secaoTitulo}>{titulo}</Text>
      <Text style={styles.sub}>{sub}</Text>
      <View style={styles.lista}>{children}</View>
    </View>
  );
}

function CardEnquete({ enquete, onPress }: { enquete: Enquete; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.card, { borderLeftColor: enquete.ativa ? cores.teal : "rgba(255,255,255,0.1)" }]}
      onPress={onPress}
    >
      <View style={styles.cardTopo}>
        <Text style={styles.cardPergunta} numberOfLines={2}>
          {enquete.pergunta}
        </Text>
        <View style={[styles.pill, enquete.ativa ? styles.pillAtiva : styles.pillEncerrada]}>
          <Text style={[styles.pillTexto, enquete.ativa ? styles.pillTextoAtiva : styles.pillTextoEncerrada]}>
            {enquete.ativa ? "Ativa" : "Encerrada"}
          </Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>Criada por {enquete.criadoPorNome}</Text>
      <Text style={styles.cardTag}>{enquete.anonima ? "Voto secreto" : "Identificada"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 130, gap: 20 },
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
  secao: { gap: 6 },
  secaoTitulo: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  lista: { gap: 10, marginTop: 4 },
  card: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    borderLeftWidth: 3,
    backgroundColor: cores.cardFundo,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  cardTopo: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardPergunta: { flex: 1, fontSize: 15, fontWeight: "600", color: cores.branco },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillAtiva: { backgroundColor: "rgba(16,185,129,0.15)" },
  pillEncerrada: { backgroundColor: "rgba(100,116,139,0.2)" },
  pillTexto: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  pillTextoAtiva: { color: "#6ee7b7" },
  pillTextoEncerrada: { color: cores.slate400 },
  cardMeta: { fontSize: 13, color: cores.slate400 },
  cardTag: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: cores.slate400,
    textTransform: "uppercase",
    backgroundColor: cores.superficieSutil,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  rodape: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: cores.cardBorda,
    backgroundColor: cores.dark,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 8,
  },
  rodapeNota: { fontSize: 12, color: cores.slate400, textAlign: "center" },
});
