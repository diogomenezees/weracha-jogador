import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { buscarStatusExclusao, cancelarExclusao } from "@/api/conta";
import { listarMeusGrupos } from "@/api/grupos";
import { rotuloDoAmbiente } from "@/config/servidor";
import { ehHoje, formatarDataPartida, rotuloDoDia } from "@/formato";
import {
  aguardandoRenovacao,
  avulsoAguardandoNovoJogo,
  meuPapelNoGrupo,
  ordenarPorProximaPartida,
  proximaPartidaInfo,
} from "@/grupos";
import { mensagemDoErro } from "@/mensagens-erro";
import { MenuAcoes } from "@/grupo/MenuAcoes";
import {
  BotaoLaranja,
  CartaoCaminho,
  Eyebrow,
  LinhaEsqueleto,
  PassoComoFunciona,
  Selo,
  TelaCarregando,
  TelaErro,
} from "@/painel/ui";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type { Grupo } from "@/contrato/tipos";

export default function Painel() {
  const { estado, ambiente, urlBase, chamarApi, sair, recarregarPerfil } = useSessao();
  const jogador = estado.fase === "logado" ? estado.jogador : null;
  const primeiroNome = jogador?.nome.split(" ")[0] ?? "";

  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [exclusaoPendente, setExclusaoPendente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [reativando, setReativando] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  const carregar = useCallback(async () => {
    const [, status, lista] = await Promise.all([
      recarregarPerfil(),
      buscarStatusExclusao(chamarApi),
      listarMeusGrupos(chamarApi),
    ]);
    setExclusaoPendente(status.solicitacaoPendente != null);
    setGrupos(ordenarPorProximaPartida(lista));
  }, [chamarApi, recarregarPerfil]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        await carregar();
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [carregar]);

  const recarregar = useCallback(
    async (modo: "botao" | "puxar") => {
      if (modo === "botao") setCarregando(true);
      else setAtualizando(true);
      setErro(null);
      try {
        await carregar();
      } catch (e) {
        setErro(mensagemDoErro(e));
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    [carregar]
  );

  function abrirMenu() {
    setMenuAberto(true);
  }

  async function reativarConta() {
    setReativando(true);
    try {
      await cancelarExclusao(chamarApi);
      setExclusaoPendente(false);
    } catch (e) {
      Alert.alert("Não deu pra reativar", mensagemDoErro(e));
    } finally {
      setReativando(false);
    }
  }

  const menu = (
    <MenuAcoes
      aberto={menuAberto}
      titulo={`${rotuloDoAmbiente(ambiente)} · ${urlBase}`}
      itens={[
        { rotulo: "Ver artilheiros", onPress: () => router.push("/artilheiros") },
        { rotulo: "Ver enquetes", onPress: () => router.push("/enquetes") },
        { rotulo: "Sair", destrutivo: true, onPress: () => void sair() },
      ]}
      onFechar={() => setMenuAberto(false)}
    />
  );

  if (!jogador || (carregando && grupos === null)) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <TopoMenu onMenu={abrirMenu} />
        <TelaCarregando mensagem="Carregando seu painel..." />
        {menu}
      </SafeAreaView>
    );
  }

  if (erro && grupos === null) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <TopoMenu onMenu={abrirMenu} />
        <TelaErro mensagem={erro} onTentar={() => void recarregar("botao")} />
        {menu}
      </SafeAreaView>
    );
  }

  const lista = grupos ?? [];
  const temGrupo = lista.length > 0;
  const onboardingConcluido = !!jogador.onboardingConcluidoEm;

  const paraRenovar = lista.filter(aguardandoRenovacao);
  const aguardandoNovoJogo = lista.filter(avulsoAguardandoNovoJogo);
  const emDia = lista.filter((g) => !aguardandoRenovacao(g) && !avulsoAguardandoNovoJogo(g));

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <TopoMenu onMenu={abrirMenu} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void recarregar("puxar")}
            tintColor={cores.teal}
          />
        }
      >
        {!temGrupo && !onboardingConcluido && <HeroSemOnboarding nome={primeiroNome} />}
        {!temGrupo && onboardingConcluido && <HeroSemGrupo nome={primeiroNome} />}
        {temGrupo && (
          <View style={styles.bloco}>
            <Text style={styles.h1}>Olá, {primeiroNome}</Text>
            <Text style={styles.paragrafo}>Que bom ver você por aqui de novo!</Text>
          </View>
        )}

        {exclusaoPendente && temGrupo && <BannerExclusao />}

        {temGrupo && emDia.length === 0 && !exclusaoPendente && (
          <View style={styles.avisoBox}>
            <Eyebrow>Não fique parado</Eyebrow>
            <Text style={styles.paragrafo}>
              Renove, marque um novo jogo ou crie um grupo pra continuar jogando.
            </Text>
          </View>
        )}

        <SecaoGrupos
          titulo="Seus grupos"
          sub="Grupos que você ama fazer parte"
          grupos={emDia}
          meuId={jogador.id}
          bloqueado={exclusaoPendente}
        />
        <SecaoGrupos
          titulo="Aguardando renovação"
          sub="Incentive o grupo a continuar jogando no próximo mês."
          grupos={paraRenovar}
          meuId={jogador.id}
          bloqueado={exclusaoPendente}
        />
        <SecaoGrupos
          titulo="Aguardando novo jogo"
          sub="Que tal combinar a próxima com essa galera?"
          grupos={aguardandoNovoJogo}
          meuId={jogador.id}
          bloqueado={exclusaoPendente}
        />
      </ScrollView>

      <Rodape
        exclusaoPendente={exclusaoPendente}
        reativando={reativando}
        onReativar={() => void reativarConta()}
        onboardingConcluido={onboardingConcluido}
        temGrupo={temGrupo}
        onComecar={() => router.push("/onboarding")}
        onCriarGrupo={() => router.push("/criar-grupo")}
      />
      {menu}
    </SafeAreaView>
  );
}

function TopoMenu({ onMenu }: { onMenu: () => void }) {
  return (
    <View style={styles.topo}>
      <Pressable hitSlop={12} onPress={onMenu}>
        <Text style={styles.engrenagem}>⚙</Text>
      </Pressable>
    </View>
  );
}

function HeroSemOnboarding({ nome }: { nome: string }) {
  return (
    <>
      <View style={styles.heroBloco}>
        <Eyebrow>Você chegou</Eyebrow>
        <Text style={styles.hero}>{nome}, seu racha começa aqui.</Text>
        <Text style={styles.paragrafo}>
          Junta a galera, marca o dia e deixa o app dividir os times. Leva menos de dois
          minutos.
        </Text>
      </View>

      <View style={styles.bloco}>
        <Text style={styles.rotuloSecao}>Como funciona</Text>
        <View style={styles.passos}>
          <PassoComoFunciona
            numero="01"
            titulo="Cria o grupo"
            texto="Racha toda semana ou uma partida avulsa."
            cor="teal"
          />
          <PassoComoFunciona
            numero="02"
            titulo="Chama a turma"
            texto="Cada um confirma presença pelo próprio celular."
            cor="teal"
          />
          <PassoComoFunciona
            numero="03"
            titulo="Bola rolando"
            texto="Times equilibrados pelo score, cronômetro e gols ao vivo."
            cor="orange"
            ultimo
          />
        </View>
        <View style={styles.selos}>
          <Selo texto="Score 0 a 100" cor="teal" />
          <Selo texto="Enquete" cor="teal" />
          <Selo texto="Modo ao vivo" cor="orange" />
          <Selo texto="Resenha" cor="orange" />
        </View>
      </View>
    </>
  );
}

function HeroSemGrupo({ nome }: { nome: string }) {
  return (
    <>
      <View style={styles.heroBloco}>
        <View style={styles.linhaEntre}>
          <Text style={styles.rotuloSecao}>{rotuloDoDia(new Date())}</Text>
          <View style={styles.chip}>
            <Text style={styles.chipTexto}>Tour concluído</Text>
          </View>
        </View>
        <Text style={styles.hero}>De volta, {nome}. Falta só o grupo.</Text>
        <Text style={styles.paragrafo}>
          Você já sabe como funciona. Agora escolhe por onde entrar.
        </Text>
      </View>

      <View style={styles.bloco}>
        <Text style={styles.rotuloSecao}>Dois caminhos</Text>
        <View style={styles.caminhos}>
          <CartaoCaminho
            emoji="📲"
            titulo="Já te chamaram"
            texto="Peça o link pra quem organiza e entre no grupo."
            chamada="Entrar por convite"
            cor="teal"
            onPress={() =>
              router.push({ pathname: "/em-breve", params: { titulo: "Entrar por convite" } })
            }
          />
          <CartaoCaminho
            emoji="➕"
            titulo="Ninguém chamou"
            texto="Monte o seu racha e chame a turma você mesmo."
            chamada="Criar grupo"
            cor="orange"
            onPress={() => router.push("/criar-grupo")}
          />
        </View>
      </View>

      <View style={styles.bloco}>
        <Text style={styles.rotuloSecao}>Seu painel vai ficar assim</Text>
        <View style={styles.esqueletoCaixa}>
          <LinhaEsqueleto selo="Quinta" cor="teal" />
          <View style={styles.divisor} />
          <LinhaEsqueleto selo="Check-in" cor="orange" />
        </View>
        <Text style={styles.notaCentral}>
          Seus grupos, check-ins e times aparecem aqui.
        </Text>
      </View>
    </>
  );
}

function BannerExclusao() {
  return (
    <View style={styles.bannerExclusao}>
      <Text style={styles.bannerExclusaoTitulo}>Conta marcada para exclusão</Text>
      <Text style={styles.bannerExclusaoTexto}>
        Enquanto o pedido estiver na fila você não consegue abrir seus grupos. Reative pra
        voltar ao normal.
      </Text>
    </View>
  );
}

function SecaoGrupos({
  titulo,
  sub,
  grupos,
  meuId,
  bloqueado,
}: {
  titulo: string;
  sub: string;
  grupos: Grupo[];
  meuId: string;
  bloqueado: boolean;
}) {
  if (grupos.length === 0) return null;
  return (
    <View style={styles.bloco}>
      <Text style={styles.rotuloSecao}>{titulo}</Text>
      <Text style={styles.paragrafo}>{sub}</Text>
      <View style={styles.listaGrupos}>
        {grupos.map((g) => (
          <CardGrupo key={g.id} grupo={g} meuId={meuId} bloqueado={bloqueado} />
        ))}
      </View>
    </View>
  );
}

function CardGrupo({
  grupo,
  meuId,
  bloqueado,
}: {
  grupo: Grupo;
  meuId: string;
  bloqueado: boolean;
}) {
  const papel = meuPapelNoGrupo(grupo, meuId);
  const info = proximaPartidaInfo(grupo);
  const hoje = info ? ehHoje(info.data) : false;
  const precisaAtencao = aguardandoRenovacao(grupo) || avulsoAguardandoNovoJogo(grupo);

  const corpo = (
    <>
      <View style={styles.cardTopo}>
        <Text style={styles.cardNome} numberOfLines={1}>
          {grupo.nome}
        </Text>
        {papel !== "MEMBRO" && (
          <View style={styles.badge}>
            <Text style={styles.badgeTexto}>{papel === "DONO" ? "Dono" : "Admin"}</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardSub}>
        {grupo.esporte} · {grupo.tipo === "RECORRENTE" ? "Semanal" : "Avulso"}
      </Text>
      <View style={styles.cardRodape}>
        {info ? (
          <>
            {hoje ? (
              <View style={styles.hojePill}>
                <Text style={styles.hojePillTexto}>hoje</Text>
              </View>
            ) : (
              <Text style={styles.cardData}>Próxima: {formatarDataPartida(info.data.toISOString())}</Text>
            )}
            {hoje && (
              <Text style={styles.cardDataHoje}>{formatarDataPartida(info.data.toISOString())}</Text>
            )}
            {info.checkinDisponivel && (
              <View style={styles.checkin}>
                <View style={styles.checkinPonto} />
                <Text style={styles.checkinTexto}>Check-in</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.cardAtencao}>
            {grupo.tipo === "RECORRENTE" ? "Aguardando renovação" : "Aguardando novo jogo"}
          </Text>
        )}
      </View>
    </>
  );

  if (bloqueado) {
    return <View style={[styles.card, styles.cardBloqueado, precisaAtencao && styles.cardAtencaoBorda]}>{corpo}</View>;
  }
  return (
    <Pressable
      style={[styles.card, precisaAtencao && styles.cardAtencaoBorda]}
      onPress={() => router.push(`/grupos/${grupo.id}`)}
    >
      {corpo}
    </Pressable>
  );
}

function Rodape({
  exclusaoPendente,
  reativando,
  onReativar,
  onboardingConcluido,
  temGrupo,
  onComecar,
  onCriarGrupo,
}: {
  exclusaoPendente: boolean;
  reativando: boolean;
  onReativar: () => void;
  onboardingConcluido: boolean;
  temGrupo: boolean;
  onComecar: () => void;
  onCriarGrupo: () => void;
}) {
  let nota: string;
  let botao: React.ReactNode;

  if (exclusaoPendente) {
    nota = "Sua conta está marcada para exclusão. Reative para voltar a usar o app normalmente.";
    botao = (
      <BotaoLaranja
        titulo={reativando ? "Reativando..." : "Reativar minha conta"}
        onPress={onReativar}
        carregando={reativando}
      />
    );
  } else if (!onboardingConcluido && !temGrupo) {
    nota = "Veja como funciona em 3 passos.";
    botao = <BotaoLaranja titulo="Começar" onPress={onComecar} />;
  } else if (temGrupo) {
    nota = "Crie outro grupo pra organizar os jogos e chamar a galera.";
    botao = <BotaoLaranja titulo="Criar grupo" onPress={onCriarGrupo} />;
  } else {
    nota = "Crie um grupo pra organizar os jogos e chamar a galera.";
    botao = <BotaoLaranja titulo="Criar grupo" onPress={onCriarGrupo} />;
  }

  return (
    <View style={styles.rodape}>
      <Text style={styles.rodapeNota}>{nota}</Text>
      {botao}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  topo: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 20, paddingTop: 4 },
  engrenagem: { fontSize: 22, color: cores.slate400 },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 170, gap: 24 },

  bloco: { gap: 8 },
  heroBloco: { gap: 10, borderBottomWidth: 1, borderBottomColor: cores.linhaSutil, paddingBottom: 20 },
  h1: { fontSize: 24, fontWeight: "700", color: cores.branco },
  hero: { fontSize: 28, lineHeight: 33, fontWeight: "700", color: cores.branco },
  paragrafo: { fontSize: 14, lineHeight: 21, color: cores.slate400 },
  rotuloSecao: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: cores.slate500,
    textTransform: "uppercase",
  },
  passos: { marginTop: 4 },
  selos: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  linhaEntre: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipTexto: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: cores.teal,
    textTransform: "uppercase",
  },
  caminhos: { flexDirection: "row", gap: 12, marginTop: 4 },
  esqueletoCaixa: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.linhaSutil,
    borderStyle: "dashed",
    backgroundColor: cores.superficieSutil,
    padding: 16,
    gap: 14,
    marginTop: 4,
  },
  divisor: { height: 1, backgroundColor: cores.linhaSutil },
  notaCentral: { fontSize: 12, lineHeight: 18, color: cores.slate500, textAlign: "center", marginTop: 4 },

  avisoBox: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 18,
    gap: 6,
    alignItems: "center",
  },

  bannerExclusao: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.ambarBorda,
    backgroundColor: cores.ambarFundo,
    padding: 16,
    gap: 6,
  },
  bannerExclusaoTitulo: { fontSize: 14, fontWeight: "700", color: cores.ambar },
  bannerExclusaoTexto: { fontSize: 13, lineHeight: 19, color: cores.slate300 },

  listaGrupos: { gap: 12, marginTop: 4 },
  card: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    borderLeftWidth: 3,
    borderLeftColor: cores.teal,
    backgroundColor: cores.cardFundo,
    padding: 14,
    gap: 4,
  },
  cardBloqueado: { opacity: 0.5 },
  cardAtencaoBorda: { borderLeftColor: cores.ambar },
  cardTopo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardNome: { fontSize: 16, fontWeight: "700", color: cores.branco, flexShrink: 1 },
  badge: {
    backgroundColor: cores.avisoFundo,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeTexto: { fontSize: 11, fontWeight: "700", color: cores.teal },
  cardSub: { fontSize: 13, color: cores.slate400, textTransform: "capitalize" },
  cardRodape: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: cores.linhaSutil,
    paddingTop: 8,
    flexWrap: "wrap",
  },
  cardData: { fontSize: 13, color: cores.slate400 },
  cardDataHoje: { fontSize: 13, fontWeight: "700", color: cores.branco },
  cardAtencao: { fontSize: 13, fontWeight: "600", color: cores.ambar },
  hojePill: {
    backgroundColor: cores.orange,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  hojePillTexto: { fontSize: 11, fontWeight: "600", color: cores.dark },
  checkin: { flexDirection: "row", alignItems: "center", gap: 5, marginLeft: "auto" },
  checkinPonto: { width: 6, height: 6, borderRadius: 3, backgroundColor: cores.teal },
  checkinTexto: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: cores.teal,
    textTransform: "uppercase",
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
    gap: 10,
  },
  rodapeNota: { fontSize: 13, color: cores.slate400, textAlign: "center" },
});
