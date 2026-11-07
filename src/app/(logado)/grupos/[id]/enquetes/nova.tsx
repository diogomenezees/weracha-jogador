import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { criarEnquete } from "@/api/enquetes";
import { buscarDadosDoGrupo } from "@/api/grupos";
import { CaixaErro } from "@/acesso/ui";
import { mensagemDoErro } from "@/mensagens-erro";
import { BotaoLaranja } from "@/painel/ui";
import { Navbar } from "@/ui/Navbar";
import { ScrollTeclado } from "@/ui/ScrollTeclado";
import { TriangleAlert, Users, X } from "@/ui/Icone";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type { TipoEnquete } from "@/contrato/tipos";
import { Abas } from "@/partida/ui";
import { ExemploNuvem } from "@/enquetes/EnqueteLivre";

const DURACOES = [
  { label: "1 dia", dias: 1 },
  { label: "3 dias", dias: 3 },
  { label: "1 semana", dias: 7 },
];

type OpcaoForm = { id: string; texto: string };

type CampoComErro = "pergunta" | "opcoes" | "sigilo" | "duracao";

export default function NovaEnquete() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chamarApi } = useSessao();
  const insets = useSafeAreaInsets();
  const proxId = useRef(2);

  const [pergunta, setPergunta] = useState("");
  const [opcoes, setOpcoes] = useState<OpcaoForm[]>([
    { id: "o0", texto: "" },
    { id: "o1", texto: "" },
  ]);
  const [tipo, setTipo] = useState<TipoEnquete>("OPCOES");
  const [duracaoDias, setDuracaoDias] = useState<number | null>(null);
  const [anonima, setAnonima] = useState<boolean | null>(null);
  const [grupoNome, setGrupoNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroCampo, setErroCampo] = useState<{ campo: CampoComErro; mensagem: string } | null>(
    null
  );
  const rolagemRef = useRef<ScrollView | null>(null);
  const perguntaRef = useRef<TextInput>(null);
  // Posição (y) de cada campo dentro da rolagem, medida no onLayout.
  const posicaoDoCampo = useRef<Partial<Record<CampoComErro, number>>>({});

  // Mesmo padrão do criar-grupo.tsx: borda vermelha + mensagem embaixo do
  // primeiro campo com problema, rolando até ele.
  function apontarCampo(campo: CampoComErro, mensagem: string) {
    setErroCampo({ campo, mensagem });
    const y = posicaoDoCampo.current[campo] ?? 0;
    rolagemRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
    if (campo === "pergunta") setTimeout(() => perguntaRef.current?.focus(), 350);
  }

  function limparErroDo(campo: CampoComErro) {
    setErroCampo((atual) => (atual?.campo === campo ? null : atual));
  }

  useEffect(() => {
    let vivo = true;
    buscarDadosDoGrupo(chamarApi, id)
      .then((d) => vivo && setGrupoNome(d.grupo?.nome ?? ""))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [chamarApi, id]);

  function mudarOpcao(idOpcao: string, valor: string) {
    limparErroDo("opcoes");
    setOpcoes((prev) => {
      const prox = prev.map((o) => (o.id === idOpcao ? { ...o, texto: valor } : o));
      const ultima = prox[prox.length - 1];
      if (ultima.id === idOpcao && valor.trim() !== "") {
        prox.push({ id: `o${proxId.current++}`, texto: "" });
      }
      return prox;
    });
  }

  function removerOpcao(idOpcao: string) {
    setOpcoes((prev) => prev.filter((o) => o.id !== idOpcao));
  }

  function mover(idOpcao: string, dir: -1 | 1) {
    setOpcoes((prev) => {
      const i = prev.findIndex((o) => o.id === idOpcao);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const prox = [...prev];
      [prox[i], prox[j]] = [prox[j], prox[i]];
      return prox;
    });
  }

  async function salvar() {
    setErro(null);
    setErroCampo(null);
    if (!pergunta.trim()) {
      apontarCampo("pergunta", "Escreva a pergunta da enquete.");
      return;
    }
    const preenchidas = opcoes.map((o) => o.texto.trim()).filter(Boolean);
    if (tipo === "OPCOES" && preenchidas.length < 2) {
      apontarCampo("opcoes", "Adicione pelo menos duas opções.");
      return;
    }
    if (anonima === null) {
      apontarCampo("sigilo", "Escolha o sigilo do voto.");
      return;
    }
    if (duracaoDias === null) {
      apontarCampo("duracao", "Escolha a duração da enquete.");
      return;
    }
    setSalvando(true);
    try {
      await criarEnquete(chamarApi, id, {
        pergunta: pergunta.trim(),
        ...(tipo === "OPCOES" ? { opcoes: preenchidas } : {}),
        duracaoDias,
        anonima,
        tipo,
      });
      router.replace(`/grupos/${id}/enquetes`);
    } catch (e) {
      setErro(mensagemDoErro(e));
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Enquetes" />

      <ScrollTeclado
        rolagemRef={rolagemRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={styles.h1}>Criar enquete</Text>
          {grupoNome ? (
            <View style={styles.subLinha}>
              <Users size={12} color={cores.slate400} />
              <Text style={styles.sub} numberOfLines={1}>
                {grupoNome}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={styles.campo}
          onLayout={(e) => (posicaoDoCampo.current.pergunta = e.nativeEvent.layout.y)}
        >
          <Text style={styles.label}>Pergunta</Text>
          <TextInput
            ref={perguntaRef}
            style={[styles.input, erroCampo?.campo === "pergunta" && styles.inputErro]}
            value={pergunta}
            onChangeText={(v) => {
              setPergunta(v);
              limparErroDo("pergunta");
            }}
            placeholder="Faça uma pergunta"
            placeholderTextColor={cores.slate500}
          />
          {erroCampo?.campo === "pergunta" && <MensagemCampo texto={erroCampo.mensagem} />}
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Tipo de resposta</Text>
          <Text style={styles.dica}>
            {tipo === "OPCOES"
              ? "Opções: cada um escolhe uma das opções que você escrever."
              : "Resposta livre: cada um escreve a própria resposta."}
          </Text>
          <Abas
            opcoes={[
              { chave: "OPCOES", rotulo: "Opções" },
              { chave: "LIVRE", rotulo: "Resposta livre" },
            ]}
            valor={tipo}
            onChange={setTipo}
          />
        </View>

        {tipo === "LIVRE" && <ExemploNuvem />}

        {tipo === "OPCOES" && (
          <View
            style={styles.campo}
            onLayout={(e) => (posicaoDoCampo.current.opcoes = e.nativeEvent.layout.y)}
          >
            <Text style={styles.label}>Opções</Text>
            {opcoes.map((o, i) => (
              <View key={o.id} style={styles.opcaoLinha}>
                <View style={styles.setas}>
                  <Pressable onPress={() => mover(o.id, -1)} disabled={i === 0}>
                    <Text style={[styles.seta, i === 0 && styles.setaOff]}>▲</Text>
                  </Pressable>
                  <Pressable onPress={() => mover(o.id, 1)} disabled={i === opcoes.length - 1}>
                    <Text style={[styles.seta, i === opcoes.length - 1 && styles.setaOff]}>▼</Text>
                  </Pressable>
                </View>
                <TextInput
                  style={[
                    styles.input,
                    styles.opcaoInput,
                    erroCampo?.campo === "opcoes" && !o.texto.trim() && i < 2 && styles.inputErro,
                  ]}
                  value={o.texto}
                  onChangeText={(v) => mudarOpcao(o.id, v)}
                  placeholder="Adicionar"
                  placeholderTextColor={cores.slate500}
                />
                {i >= 2 && (
                  <Pressable onPress={() => removerOpcao(o.id)} hitSlop={8}>
                    <X size={16} color={cores.slate400} />
                  </Pressable>
                )}
              </View>
            ))}
            {erroCampo?.campo === "opcoes" && <MensagemCampo texto={erroCampo.mensagem} />}
          </View>
        )}

        <View
          style={styles.campo}
          onLayout={(e) => (posicaoDoCampo.current.sigilo = e.nativeEvent.layout.y)}
        >
          <Text style={styles.label}>Sigilo do voto</Text>
          <Text style={styles.dica}>
            {anonima === null
              ? "Escolha se o grupo pode ver quem respondeu o quê."
              : tipo === "LIVRE"
              ? anonima
                ? "Voto secreto: só a nuvem de palavras aparece."
                : "Identificada: qualquer membro vê o que cada um respondeu."
              : anonima
                ? "Voto secreto: só a contagem por opção aparece."
                : "Identificada: qualquer membro vê quem votou em cada opção."}
          </Text>
          <View style={erroCampo?.campo === "sigilo" && styles.abasErro}>
            <Abas
              opcoes={[
                { chave: "secreto", rotulo: "Voto secreto" },
                { chave: "identificada", rotulo: "Identificada" },
              ]}
              valor={anonima === null ? null : anonima ? "secreto" : "identificada"}
              onChange={(v) => {
                setAnonima(v === "secreto");
                limparErroDo("sigilo");
              }}
            />
          </View>
          {erroCampo?.campo === "sigilo" && <MensagemCampo texto={erroCampo.mensagem} />}
        </View>

        <View
          style={styles.campo}
          onLayout={(e) => (posicaoDoCampo.current.duracao = e.nativeEvent.layout.y)}
        >
          <Text style={styles.label}>Duração</Text>
          <Text style={styles.dica}>Depois desse prazo a enquete encerra.</Text>
          <View style={erroCampo?.campo === "duracao" && styles.abasErro}>
            <Abas
              opcoes={DURACOES.map((d) => ({ chave: String(d.dias), rotulo: d.label }))}
              valor={duracaoDias === null ? null : String(duracaoDias)}
              onChange={(v) => {
                setDuracaoDias(Number(v));
                limparErroDo("duracao");
              }}
            />
          </View>
          {erroCampo?.campo === "duracao" && <MensagemCampo texto={erroCampo.mensagem} />}
        </View>

        {erro ? <CaixaErro>{erro}</CaixaErro> : null}
      </ScrollTeclado>

      <View style={[styles.rodape, { paddingBottom: 12 + insets.bottom }]}>
        <BotaoLaranja rodape titulo="Criar enquete" onPress={() => void salvar()} carregando={salvando} />
      </View>
    </SafeAreaView>
  );
}

function MensagemCampo({ texto }: { texto: string }) {
  return (
    <View style={styles.mensagemCampo}>
      <TriangleAlert size={14} color={cores.erroTexto} />
      <Text style={styles.mensagemCampoTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inputErro: { borderColor: cores.erroTexto },
  // Borda vermelha em volta da caixa das abas (mesmo raio da caixa).
  abasErro: { borderWidth: 1, borderColor: cores.erroTexto, borderRadius: 11 },
  mensagemCampo: { flexDirection: "row", alignItems: "center", gap: 6 },
  mensagemCampoTexto: { flex: 1, fontSize: 13, color: cores.erroTexto },
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 130, gap: 20 },
  h1: { fontSize: 24, lineHeight: 26, fontWeight: "700", color: cores.branco },
  subLinha: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  sub: { flexShrink: 1, fontSize: 14, color: cores.slate400 },
  campo: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: cores.slate300 },
  dica: { fontSize: 12, color: cores.slate500 },
  input: {
    height: 46,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 12,
    fontSize: 15,
    color: cores.branco,
  },
  opcaoLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  setas: { alignItems: "center" },
  seta: { fontSize: 11, color: cores.slate400, paddingVertical: 2 },
  setaOff: { opacity: 0.25 },
  opcaoInput: { flex: 1 },
  remover: { fontSize: 15, color: cores.slate500 },
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
