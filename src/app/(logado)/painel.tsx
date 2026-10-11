import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { cancelarExclusao } from "@/api/conta";
import { buscarPainel } from "@/api/painel";
import { rotuloDoDia } from "@/formato";
import { mensagemDoErro } from "@/mensagens-erro";
import { LogIn, Plus } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import {
  BotaoContorno,
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
import { useDialogos } from "@/ui/Dialogos";
import {
  AcoesRapidas,
  AtividadesRecentes,
  DestaquesDosGrupos,
  ProximoJogo,
  SeusGrupos,
} from "@/painel/secoes";
import { cores, raio } from "@/tema";
import type { DadosDoPainel } from "@/contrato/tipos";

export default function Painel() {
  const { estado, chamarApi, recarregarPerfil } = useSessao();
  const { avisar } = useDialogos();
  const insets = useSafeAreaInsets();
  const jogador = estado.fase === "logado" ? estado.jogador : null;
  const primeiroNome = jogador?.nome.split(" ")[0] ?? "";

  const [dados, setDados] = useState<DadosDoPainel | null>(null);
  // "Agora" das seções (check-in aberto, "há 5 min"): fixado a cada carga.
  const [carregadoEm, setCarregadoEm] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [reativando, setReativando] = useState(false);

  // Uma chamada traz tudo do painel (GET /api/v1/painel), inclusive se a
  // conta está com exclusão pendente.
  const carregar = useCallback(async () => {
    const [, painel] = await Promise.all([recarregarPerfil(), buscarPainel(chamarApi)]);
    setDados(painel);
    setCarregadoEm(Date.now());
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

  async function reativarConta() {
    setReativando(true);
    try {
      await cancelarExclusao(chamarApi);
      // Com a exclusão pendente o servidor não manda as outras seções; recarrega.
      await carregar();
    } catch (e) {
      avisar("Não deu pra reativar", mensagemDoErro(e));
    } finally {
      setReativando(false);
    }
  }

  if (!jogador || (carregando && dados === null)) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar />
        <TelaCarregando mensagem="Carregando seu painel..." />
      </SafeAreaView>
    );
  }

  if (erro && dados === null) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar />
        <TelaErro mensagem={erro} onTentar={() => void recarregar("botao")} />
      </SafeAreaView>
    );
  }

  const grupos = dados?.grupos ?? [];
  const temGrupo = grupos.length > 0;
  const exclusaoPendente = dados?.exclusaoPendente ?? false;
  const onboardingConcluido = !!jogador.onboardingConcluidoEm;
  // Com grupo, "Criar grupo" fica no fim de "Seus grupos" e o rodapé fixo
  // some — ele só volta pra reativar a conta.
  const comRodape = exclusaoPendente || !temGrupo;

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: comRodape ? 230 + insets.bottom : 32 + insets.bottom },
        ]}
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

        {temGrupo && exclusaoPendente && <BannerExclusao />}
        {temGrupo && dados && !exclusaoPendente && dados.proximoJogo && (
          <ProximoJogo jogo={dados.proximoJogo} agora={carregadoEm} />
        )}
        {temGrupo && dados && !exclusaoPendente && (
          <AcoesRapidas ultimoResultado={dados.ultimoResultado} />
        )}
        {temGrupo && dados && !exclusaoPendente && (
          <DestaquesDosGrupos destaques={dados.destaques} />
        )}
        {temGrupo && (
          <SeusGrupos
            grupos={grupos}
            bloqueado={exclusaoPendente}
            onboardingConcluido={onboardingConcluido}
          />
        )}
        {temGrupo && dados && !exclusaoPendente && dados.atividadesRecentes.length > 0 && (
          <AtividadesRecentes atividades={dados.atividadesRecentes} agora={carregadoEm} />
        )}
      </ScrollView>

      {comRodape && (
        <Rodape
          exclusaoPendente={exclusaoPendente}
          reativando={reativando}
          onReativar={() => void reativarConta()}
          onboardingConcluido={onboardingConcluido}
          onComecar={() => router.push("/onboarding")}
          onSorteio={() => router.push("/sorteio")}
          onCriarGrupo={() => router.push("/criar-grupo")}
        />
      )}
    </SafeAreaView>
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
          <Selo texto="Artilheiros" cor="teal" />
          <Selo texto="Modo ao vivo" cor="orange" />
          <Selo texto="Replays" cor="orange" />
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
            Icone={LogIn}
            titulo="Já te chamaram"
            texto="Toque no link de convite que te mandaram: ele abre direto no app. Se não abrir, cole o link aqui."
            chamada="Colar o convite"
            cor="teal"
            onPress={() => router.push("/entrar-por-convite")}
          />
          <CartaoCaminho
            Icone={Plus}
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

function Rodape({
  exclusaoPendente,
  reativando,
  onReativar,
  onboardingConcluido,
  onComecar,
  onSorteio,
  onCriarGrupo,
}: {
  exclusaoPendente: boolean;
  reativando: boolean;
  onReativar: () => void;
  onboardingConcluido: boolean;
  onComecar: () => void;
  onSorteio: () => void;
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
  } else if (!onboardingConcluido) {
    nota = "Veja os dois jeitos de começar.";
    botao = <BotaoLaranja titulo="Começar" onPress={onComecar} />;
  } else {
    // Tour feito e sem grupo: sorteio avulso ou grupo, igual o rodapé do site.
    nota = "Crie um grupo pra organizar os jogos e chamar a galera.";
    botao = (
      <>
        <BotaoContorno titulo="Sorteio rápido" onPress={onSorteio} />
        <BotaoLaranja titulo="Criar grupo" onPress={onCriarGrupo} Icone={Plus} />
      </>
    );
  }

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.rodape, { paddingBottom: 14 + insets.bottom }]}>
      <Text style={styles.rodapeNota}>{nota}</Text>
      {botao}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 28 },

  bloco: { gap: 4 },
  heroBloco: { gap: 10, borderBottomWidth: 1, borderBottomColor: cores.linhaSutil, paddingBottom: 20 },
  h1: { fontSize: 24, fontWeight: "700", color: cores.branco },
  hero: { fontSize: 28, lineHeight: 33, fontWeight: "700", color: cores.branco },
  paragrafo: { fontSize: 14, lineHeight: 21, color: cores.slate400 },
  rotuloSecao: {
    fontSize: 13,
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

  rodape: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: cores.cardBorda,
    backgroundColor: cores.dark,
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 10,
  },
  rodapeNota: { fontSize: 13, color: cores.slate400, textAlign: "center" },
});
