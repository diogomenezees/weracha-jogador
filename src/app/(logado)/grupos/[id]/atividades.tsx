import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { buscarAtividadesDoGrupo } from "@/api/atividades";
import { mensagemDoErro } from "@/mensagens-erro";
import { ListaAtividades } from "@/atividades/ListaAtividades";
import { ChevronDown, Bell, Users } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { TituloTela } from "@/ui/TituloTela";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores } from "@/tema";
import type { AtividadeGrupo, PaginaDeAtividades } from "@/contrato/atividades";

type Estado = {
  grupoNome: string;
  atividades: AtividadeGrupo[];
  pagina: number;
  temMais: boolean;
  carregadoEm: number;
};

function primeiraPagina(d: PaginaDeAtividades): Estado {
  return {
    grupoNome: d.grupoNome,
    atividades: d.atividades,
    pagina: 0,
    temMais: d.temMais,
    carregadoEm: Date.now(),
  };
}

// "Ver tudo" de "Atividades recentes" da tela do grupo: o histórico só desse
// grupo, de 10 em 10 (GET /api/v1/grupos/{id}/atividades?pagina=). O Painel não
// tem essa tela de propósito (mistura vários grupos). Espelha
// weracha-site/app/grupos/[id]/atividades/page.tsx.
export default function AtividadesDoGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Sem folga embaixo, a barra de botões do Android fica em cima do último item.
  const insets = useSafeAreaInsets();
  const { chamarApi } = useSessao();
  const [estado, setEstado] = useState<Estado | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erroMais, setErroMais] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const d = await buscarAtividadesDoGrupo(chamarApi, id);
        if (!vivo) return;
        setEstado(primeiraPagina(d));
        setErro(null);
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [chamarApi, id, tentativa]);

  async function atualizar() {
    setAtualizando(true);
    try {
      setEstado(primeiraPagina(await buscarAtividadesDoGrupo(chamarApi, id)));
      setErro(null);
      setErroMais(null);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setAtualizando(false);
    }
  }

  async function verMais() {
    if (!estado) return;
    setCarregandoMais(true);
    setErroMais(null);
    try {
      const proxima = estado.pagina + 1;
      const d = await buscarAtividadesDoGrupo(chamarApi, id, proxima);
      // Atividade nova entre uma página e outra empurra a lista e pode repetir
      // um item: descarta pelo id.
      setEstado((atual) => {
        if (!atual) return atual;
        const vistos = new Set(atual.atividades.map((a) => a.id));
        return {
          ...atual,
          atividades: [...atual.atividades, ...d.atividades.filter((a) => !vistos.has(a.id))],
          pagina: proxima,
          temMais: d.temMais,
        };
      });
    } catch {
      setErroMais("Não foi possível carregar mais. Tente de novo.");
    } finally {
      setCarregandoMais(false);
    }
  }

  const voltar = <Navbar voltar="Grupo" />;

  if (erro && !estado) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        <TelaErro mensagem={erro} onTentar={() => setTentativa((t) => t + 1)} />
      </SafeAreaView>
    );
  }
  if (estado === undefined) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        <TelaCarregando mensagem="Carregando atividades..." />
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
          <TituloTela Icone={Bell}>Atividades recentes</TituloTela>
          <View style={styles.subLinha}>
            <Users size={12} color={cores.slate400} />
            <Text style={styles.sub} numberOfLines={1}>
              {estado.grupoNome}
            </Text>
          </View>
          <Text style={styles.descricao}>
            Tudo o que rolou no grupo, do mais recente pro mais antigo.
          </Text>
        </View>

        {estado.atividades.length === 0 ? (
          <Text style={styles.vazio}>Nada por aqui ainda.</Text>
        ) : (
          <View>
            <Text style={styles.rotulo}>Linha do tempo</Text>
            <ListaAtividades atividades={estado.atividades} agora={estado.carregadoEm} noGrupo />
            {estado.temMais && (
              <Pressable
                style={styles.verMais}
                disabled={carregandoMais}
                onPress={() => void verMais()}
              >
                {carregandoMais ? (
                  <ActivityIndicator size="small" color={cores.teal} />
                ) : (
                  <>
                    <Text style={styles.verMaisTexto}>Ver mais</Text>
                    <ChevronDown size={16} color={cores.teal} />
                  </>
                )}
              </Pressable>
            )}
            {erroMais && <Text style={styles.erroMais}>{erroMais}</Text>}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 18 },
  cabecalho: { gap: 2 },
  subLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  // lineHeight + includeFontPadding: sem isso o Android afasta nome do grupo e
  // descrição bem mais que o site.
  sub: { flexShrink: 1, fontSize: 14, lineHeight: 20, includeFontPadding: false, color: cores.slate400 },
  // Encostada no nome do grupo: o marginTop negativo desconta o gap do cabeçalho.
  descricao: { marginTop: -2, fontSize: 14, lineHeight: 18, includeFontPadding: false, color: cores.slate400 },
  // Mesmo rótulo teal das seções da tela de enquetes.
  rotulo: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  vazio: { fontSize: 14, color: cores.slate400, textAlign: "center", paddingVertical: 40 },
  verMais: {
    marginTop: 12,
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  verMaisTexto: { fontSize: 13, fontWeight: "600", color: cores.teal },
  erroMais: { marginTop: 8, fontSize: 13, color: cores.erroTexto, textAlign: "center" },
});
