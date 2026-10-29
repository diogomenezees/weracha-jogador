import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, View } from "react-native";
import { Text, FAMILIA_MONO } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { buscarDadosDoGrupo, salvarConfiguracoesDoGrupo } from "@/api/grupos";
import { CaixaErro } from "@/acesso/ui";
import { horasDoCheckin, limiteDoGrupo } from "@/grupos";
import { mensagemDoErro } from "@/mensagens-erro";
import { BotaoLaranja } from "@/painel/ui";
import { Stepper } from "@/partida/ui";
import {
  CHECKIN_ABRE_HORAS_OPCOES,
  JOGADORES_POR_TIME_MAX,
  LIMITE_CHECKINS_MAX,
  LIMITE_CHECKINS_MIN,
} from "@/partidas";
import { Navbar } from "@/ui/Navbar";
import { ScrollTeclado } from "@/ui/ScrollTeclado";
import { Clock, Settings, Star, UserCheck, Users, type LucideIcon } from "@/ui/Icone";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type { Grupo } from "@/contrato/tipos";

// Configurações do grupo (só admin, card "Configurações" nos Atalhos do grupo),
// igual a /grupos/[id]/configuracoes do site: quando o check-in abre, limite de
// jogadores por partida (opcional) e o valor inicial de jogadores por time da
// tela Configurar partida. Salva as três juntas.

export default function ConfiguracoesDoGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chamarApi } = useSessao();
  const insets = useSafeAreaInsets();

  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [horas, setHoras] = useState(24);
  const [comLimite, setComLimite] = useState(false);
  const [limite, setLimite] = useState(20);
  const [porTime, setPorTime] = useState(5);
  const [scoreTodos, setScoreTodos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function voltarParaGrupo() {
    if (router.canGoBack()) router.back();
    else router.replace(`/grupos/${id}`);
  }

  useEffect(() => {
    let vivo = true;
    buscarDadosDoGrupo(chamarApi, id)
      .then((d) => {
        if (!vivo) return;
        if (!d.grupo || d.grupo.meuPapel !== "ADMIN") {
          router.replace(`/grupos/${id}`);
          return;
        }
        const limiteAtual = limiteDoGrupo(d.grupo);
        setGrupo(d.grupo);
        setHoras(horasDoCheckin(d.grupo));
        setComLimite(limiteAtual != null);
        // Sem limite ainda: sugere 2 times completos como ponto de partida.
        setLimite(limiteAtual ?? Math.max(LIMITE_CHECKINS_MIN, d.grupo.jogadoresPorTime * 2));
        setPorTime(d.grupo.jogadoresPorTime);
        setScoreTodos(!!d.grupo.scoreVisivelTodos);
        setScoreTodos(!!d.grupo.scoreVisivelTodos);
      })
      .catch(() => vivo && router.replace(`/grupos/${id}`));
    return () => {
      vivo = false;
    };
  }, [chamarApi, id]);

  async function salvar() {
    if (!grupo) return;
    setErro(null);
    setSalvando(true);
    try {
      await salvarConfiguracoesDoGrupo(chamarApi, grupo.id, {
        checkinAbreHorasAntes: horas,
        limiteCheckins: comLimite ? limite : null,
        jogadoresPorTime: porTime,
        scoreVisivelTodos: scoreTodos,
      });
      voltarParaGrupo();
    } catch (e) {
      setErro(mensagemDoErro(e));
      setSalvando(false);
    }
  }

  if (!grupo) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar voltar="Grupo" />
        <View style={styles.carregando}>
          <ActivityIndicator color={cores.teal} />
        </View>
      </SafeAreaView>
    );
  }

  const timesCompletos = Math.floor(limite / porTime);

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Grupo" />

      <ScrollTeclado contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View>
          <View style={styles.tituloLinha}>
            <Settings size={20} color={cores.branco} />
            <Text style={styles.h1}>Configurações</Text>
          </View>
          <View style={styles.subLinha}>
            <Users size={12} color={cores.slate400} />
            <Text style={styles.sub} numberOfLines={1}>
              {grupo.nome}
            </Text>
          </View>
          <Text style={styles.intro}>
            Regras que valem pro grupo todo. Só os admins veem esta tela.
          </Text>
        </View>

        <Secao
          Icone={Clock}
          titulo="Abertura do check-in"
          descricao="Quanto tempo antes do início da partida a galera já pode confirmar presença."
        >
          <View style={styles.opcoes}>
            {CHECKIN_ABRE_HORAS_OPCOES.map((h) => {
              const ativo = horas === h;
              return (
                <Pressable
                  key={h}
                  onPress={() => setHoras(h)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  style={[styles.opcao, ativo && styles.opcaoAtiva]}
                >
                  <Text style={[styles.opcaoTexto, ativo && styles.opcaoTextoAtivo]}>
                    {h}h antes
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Secao>

        <Secao
          Icone={Users}
          titulo="Jogadores por time"
          descricao="Valor que já vem preenchido ao configurar cada partida. Dá pra mudar lá, só naquela partida."
        >
          <View style={styles.contador}>
            <Stepper valor={porTime} onChange={setPorTime} min={1} max={JOGADORES_POR_TIME_MAX} />
            <Text style={styles.contadorSufixo}>por time</Text>
          </View>
        </Secao>

        <Secao
          Icone={UserCheck}
          titulo="Limite de jogadores"
          descricao="Quantas pessoas podem fazer check-in em cada partida. Quando lotar, o botão some e aparece o aviso de lotado. Os admins ainda conseguem incluir alguém."
          acao={
            <Switch
              value={comLimite}
              onValueChange={setComLimite}
              trackColor={{ false: "rgba(255, 255, 255, 0.15)", true: cores.teal }}
              thumbColor={cores.branco}
              accessibilityLabel="Limitar jogadores por partida"
            />
          }
        >
          {comLimite ? (
            <>
              <View style={styles.contador}>
                <Stepper
                  valor={limite}
                  onChange={setLimite}
                  min={LIMITE_CHECKINS_MIN}
                  max={LIMITE_CHECKINS_MAX}
                />
                <Text style={styles.contadorSufixo}>jogadores</Text>
              </View>
              <Text style={styles.dica}>
                {timesCompletos >= 2
                  ? `Dá ${timesCompletos} times completos de ${porTime}.`
                  : `Com ${porTime} por time, ${limite} não fecha 2 times completos.`}
              </Text>
            </>
          ) : (
            <Text style={styles.semLimite}>Sem limite. Todo mundo do grupo pode entrar.</Text>
          )}
        </Secao>

        <Secao
          Icone={Star}
          titulo="Todos veem o score"
          descricao="Ligado, qualquer jogador do grupo pode mostrar o score dos outros nas listas e nos times. Desligado, só os admins veem."
          acao={
            <Switch
              value={scoreTodos}
              onValueChange={setScoreTodos}
              trackColor={{ false: "rgba(255, 255, 255, 0.15)", true: cores.teal }}
              thumbColor={cores.branco}
              accessibilityLabel="Todos os jogadores veem o score"
            />
          }
        >
          <Text style={styles.dica}>
            {scoreTodos
              ? "Atenção: sabendo o score dos outros, fica mais fácil alguém se rebaixar pra cair no time dos amigos."
              : "Cada jogador continua vendo o próprio score."}
          </Text>
        </Secao>

        {erro ? <CaixaErro>{erro}</CaixaErro> : null}
      </ScrollTeclado>

      <View style={[styles.rodape, { paddingBottom: 12 + insets.bottom }]}>
        <BotaoLaranja titulo="Salvar" onPress={() => void salvar()} carregando={salvando} />
      </View>
    </SafeAreaView>
  );
}

function Secao({
  Icone,
  titulo,
  descricao,
  acao,
  children,
}: {
  Icone: LucideIcon;
  titulo: string;
  descricao: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Título fora da caixa, no mesmo padrão do TituloSecao do painel (e da Performance e
  // das seções do grupo); a caixa leva a explicação e o controle.
  return (
    <View>
      <View style={styles.secaoTituloLinha}>
        <Icone size={16} color={cores.teal} />
        <Text style={styles.secaoTitulo}>{titulo}</Text>
      </View>
      <View style={styles.secao}>
        <View style={styles.secaoTopo}>
          <Text style={styles.secaoDescricao}>{descricao}</Text>
          {acao}
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  carregando: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 130, gap: 20 },
  tituloLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  h1: { fontSize: 24, lineHeight: 26, fontWeight: "700", color: cores.branco },
  subLinha: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  sub: { flexShrink: 1, fontSize: 14, color: cores.slate400 },
  intro: { marginTop: 12, fontSize: 14, lineHeight: 20, color: cores.slate400 },
  secao: {
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: cores.superficieSutil,
  },
  secaoTopo: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  secaoTituloLinha: {
    minHeight: 24,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secaoTitulo: {
    fontFamily: FAMILIA_MONO,
    fontSize: 12,
    letterSpacing: 1,
    color: cores.teal,
    textTransform: "uppercase",
  },
  secaoDescricao: { flex: 1, fontSize: 12, lineHeight: 17, color: cores.slate400 },
  opcoes: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  opcao: {
    width: "31%",
    flexGrow: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
  },
  opcaoAtiva: { borderColor: cores.teal, backgroundColor: cores.teal },
  opcaoTexto: { fontSize: 14, fontWeight: "500", color: cores.slate300 },
  opcaoTextoAtivo: { color: cores.dark, fontWeight: "600" },
  contador: { flexDirection: "row", alignItems: "center", gap: 10 },
  contadorSufixo: { fontSize: 14, color: cores.slate400 },
  dica: { fontSize: 12, color: cores.slate500 },
  semLimite: { fontSize: 14, color: cores.slate500 },
  rodape: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: cores.cardBorda,
    backgroundColor: cores.dark,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});
