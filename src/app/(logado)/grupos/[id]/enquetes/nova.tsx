import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { criarEnquete } from "@/api/enquetes";
import { buscarDadosDoGrupo } from "@/api/grupos";
import { CaixaErro } from "@/acesso/ui";
import { mensagemDoErro } from "@/mensagens-erro";
import { BotaoLaranja } from "@/painel/ui";
import { Navbar } from "@/ui/Navbar";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";

const DURACOES = [
  { label: "1 dia", dias: 1 },
  { label: "3 dias", dias: 3 },
  { label: "1 semana", dias: 7 },
];

type OpcaoForm = { id: string; texto: string };

export default function NovaEnquete() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chamarApi } = useSessao();
  const proxId = useRef(2);

  const [pergunta, setPergunta] = useState("");
  const [opcoes, setOpcoes] = useState<OpcaoForm[]>([
    { id: "o0", texto: "" },
    { id: "o1", texto: "" },
  ]);
  const [duracaoDias, setDuracaoDias] = useState(3);
  const [anonima, setAnonima] = useState(true);
  const [grupoNome, setGrupoNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

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
    if (!pergunta.trim()) {
      setErro("Escreva a pergunta da enquete.");
      return;
    }
    const preenchidas = opcoes.map((o) => o.texto.trim()).filter(Boolean);
    if (preenchidas.length < 2) {
      setErro("Adicione pelo menos duas opções.");
      return;
    }
    setSalvando(true);
    try {
      await criarEnquete(chamarApi, id, {
        pergunta: pergunta.trim(),
        opcoes: preenchidas,
        duracaoDias,
        anonima,
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

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={styles.h1}>Criar enquete</Text>
          {grupoNome ? <Text style={styles.sub}>{grupoNome}</Text> : null}
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Pergunta</Text>
          <TextInput
            style={styles.input}
            value={pergunta}
            onChangeText={setPergunta}
            placeholder="Faça uma pergunta"
            placeholderTextColor={cores.slate500}
          />
        </View>

        <View style={styles.campo}>
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
                style={[styles.input, styles.opcaoInput]}
                value={o.texto}
                onChangeText={(v) => mudarOpcao(o.id, v)}
                placeholder="Adicionar"
                placeholderTextColor={cores.slate500}
              />
              {i >= 2 && (
                <Pressable onPress={() => removerOpcao(o.id)} hitSlop={8}>
                  <Text style={styles.remover}>✕</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Sigilo do voto</Text>
          <Text style={styles.dica}>
            {anonima
              ? "Voto secreto: só a contagem por opção aparece."
              : "Identificada: qualquer membro vê quem votou em cada opção."}
          </Text>
          <View style={styles.toggle}>
            {[
              { v: true, t: "Voto secreto" },
              { v: false, t: "Identificada" },
            ].map(({ v, t }) => (
              <Pressable
                key={t}
                style={[styles.toggleBtn, anonima === v && styles.toggleAtivo]}
                onPress={() => setAnonima(v)}
              >
                <Text style={[styles.toggleTexto, anonima === v && styles.toggleTextoAtivo]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.campo}>
          <Text style={styles.label}>Duração</Text>
          <Text style={styles.dica}>Depois desse prazo a enquete encerra.</Text>
          <View style={styles.toggle}>
            {DURACOES.map((d) => (
              <Pressable
                key={d.dias}
                style={[styles.toggleBtn, duracaoDias === d.dias && styles.toggleAtivo]}
                onPress={() => setDuracaoDias(d.dias)}
              >
                <Text style={[styles.toggleTexto, duracaoDias === d.dias && styles.toggleTextoAtivo]}>
                  {d.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {erro ? <CaixaErro>{erro}</CaixaErro> : null}
      </ScrollView>

      <View style={styles.rodape}>
        <BotaoLaranja titulo="Criar enquete" onPress={() => void salvar()} carregando={salvando} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 130, gap: 20 },
  h1: { fontSize: 24, fontWeight: "700", color: cores.branco },
  sub: { fontSize: 14, color: cores.slate400, marginTop: 2 },
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
  toggle: { flexDirection: "row", gap: 8 },
  toggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleAtivo: { backgroundColor: cores.teal, borderColor: cores.teal },
  toggleTexto: { fontSize: 13, color: cores.slate300 },
  toggleTextoAtivo: { color: cores.dark, fontWeight: "700" },
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
  },
});
