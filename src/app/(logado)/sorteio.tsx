import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { sortearTimes, type JogadorSorteado } from "@/sorteio";
import { cores, raio } from "@/tema";
import { ArrowRight, Shuffle, Star } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { ScrollTeclado } from "@/ui/ScrollTeclado";
import { TituloTela } from "@/ui/TituloTela";

const MIN_TIMES = 2;
const MAX_TIMES = 8;

export default function Sorteio() {
  // Sem folga embaixo, a barra de botões do Android fica em cima do último item.
  const insets = useSafeAreaInsets();
  const [nomesTexto, setNomesTexto] = useState("");
  const [numTimes, setNumTimes] = useState(2);
  const [sortearCapitao, setSortearCapitao] = useState(false);
  const [times, setTimes] = useState<JogadorSorteado[][] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const nomes = nomesTexto
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);

  function gerar() {
    if (nomes.length < numTimes) {
      setErro(`Adicione pelo menos ${numTimes} jogadores pra formar ${numTimes} times.`);
      return;
    }
    setErro(null);
    setTimes(sortearTimes({ nomes, numTimes, sortearCapitao }));
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Painel" />
      <ScrollTeclado
        contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cabecalho}>
          <TituloTela Icone={Shuffle}>Organizar pessoas</TituloTela>
          <Text style={styles.sub}>
            Sorteio rápido e local. Nada aqui é salvo na sua conta.
          </Text>
        </View>

        {times === null ? (
          <View style={styles.bloco}>
            <View style={styles.campo}>
              <Text style={styles.rotulo}>
                Jogadores{nomes.length > 0 ? ` (${nomes.length})` : ""}
              </Text>
              <TextInput
                value={nomesTexto}
                onChangeText={setNomesTexto}
                placeholder={"Um nome por linha\nEx.: Lucas\nRafael\nBruno"}
                placeholderTextColor={cores.slate500}
                multiline
                style={styles.textarea}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.campo}>
              <Text style={styles.rotulo}>Quantos times</Text>
              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepBtn}
                  disabled={numTimes <= MIN_TIMES}
                  onPress={() => setNumTimes((n) => Math.max(MIN_TIMES, n - 1))}
                >
                  <Text style={[styles.stepBtnTexto, numTimes <= MIN_TIMES && styles.stepOff]}>
                    −
                  </Text>
                </Pressable>
                <Text style={styles.stepValor}>{numTimes}</Text>
                <Pressable
                  style={styles.stepBtn}
                  disabled={numTimes >= MAX_TIMES}
                  onPress={() => setNumTimes((n) => Math.min(MAX_TIMES, n + 1))}
                >
                  <Text style={[styles.stepBtnTexto, numTimes >= MAX_TIMES && styles.stepOff]}>
                    +
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.campo}>
              <Text style={styles.rotulo}>Capitão</Text>
              <View style={styles.segmentos}>
                {[
                  { valor: false, rotulo: "Sem capitão" },
                  { valor: true, rotulo: "Sortear capitão" },
                ].map((op) => (
                  <Pressable
                    key={String(op.valor)}
                    style={[styles.seg, sortearCapitao === op.valor && styles.segOn]}
                    onPress={() => setSortearCapitao(op.valor)}
                  >
                    <Text
                      style={[styles.segTexto, sortearCapitao === op.valor && styles.segTextoOn]}
                    >
                      {op.rotulo}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <CartaoCriarGrupo />

            {erro && <Text style={styles.erro}>{erro}</Text>}

            <Pressable style={styles.botaoLaranja} onPress={gerar}>
              <Text style={styles.botaoLaranjaTexto}>Gerar times</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.bloco}>
            <View style={styles.grade}>
              {times.map((time, i) => (
                <Time key={i} numero={i + 1} jogadores={time} cor={i % 2 === 0 ? "teal" : "orange"} />
              ))}
            </View>
            <View style={styles.acoes}>
              <Pressable style={styles.botaoContorno} onPress={() => setTimes(null)}>
                <Text style={styles.botaoContornoTexto}>Editar jogadores</Text>
              </Pressable>
              <Pressable
                style={styles.botaoLaranjaFlex}
                onPress={() => setTimes(sortearTimes({ nomes, numTimes, sortearCapitao }))}
              >
                <Text style={styles.botaoLaranjaTexto}>Sortear de novo</Text>
              </Pressable>
            </View>
            <CartaoCriarGrupo />
          </View>
        )}

      </ScrollTeclado>
    </SafeAreaView>
  );
}

// Convite pra criar um grupo. O botão é só contorno (sem fundo) de propósito: nessa tela a
// ação principal é sortear, e um botão cheio aqui brigaria com "Gerar times".
function CartaoCriarGrupo() {
  return (
    <View style={styles.cta}>
      <View style={styles.ctaTopo}>
        <View style={styles.ctaIcone}>
          <Star size={20} color={cores.teal} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaEyebrow}>Vai além do sorteio</Text>
          <Text style={styles.ctaTitulo}>Times equilibrados de verdade</Text>
        </View>
      </View>
      <Text style={styles.ctaTexto}>
        Crie um grupo e o app monta os times pelo score, pela presença e pelo histórico de cada
        jogador. Sem mais time capengando.
      </Text>
      <Pressable style={styles.ctaBotao} onPress={() => router.push("/criar-grupo")}>
        <Text style={styles.ctaBotaoTexto}>Criar meu grupo</Text>
        <ArrowRight size={18} color={cores.teal} />
      </Pressable>
    </View>
  );
}

function Time({
  numero,
  jogadores,
  cor,
}: {
  numero: number;
  jogadores: JogadorSorteado[];
  cor: "teal" | "orange";
}) {
  const c = cor === "teal" ? cores.teal : cores.orange;
  return (
    <View style={styles.time}>
      <View style={styles.timeTopo}>
        <Text style={[styles.timeRotulo, { color: c }]}>Time {numero}</Text>
        <Text style={[styles.timeRotulo, { color: c }]}>· {jogadores.length}</Text>
      </View>
      {jogadores.map((j, i) => (
        <View key={`${i}-${j.nome}`} style={styles.jogadorLinha}>
          {j.capitao ? (
            <Text style={[styles.capitao, { color: c }]}>★</Text>
          ) : (
            <View style={[styles.bolinha, { backgroundColor: c }]} />
          )}
          <Text style={styles.jogadorNome} numberOfLines={1}>
            {j.nome}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 18 },
  cabecalho: { gap: 4 },
  h1: { fontSize: 24, fontWeight: "700", color: cores.branco },
  sub: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  bloco: { gap: 16 },
  campo: { gap: 6 },
  rotulo: { fontSize: 13, fontWeight: "600", color: cores.slate300 },
  textarea: {
    minHeight: 150,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    padding: 12,
    fontSize: 15,
    lineHeight: 22,
    color: cores.branco,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    overflow: "hidden",
  },
  stepBtn: { width: 52, height: 48, alignItems: "center", justifyContent: "center" },
  stepBtnTexto: { fontSize: 22, color: cores.teal },
  stepOff: { opacity: 0.3 },
  stepValor: { flex: 1, minWidth: 44, textAlign: "center", fontSize: 17, fontWeight: "700", color: cores.branco },
  segmentos: { flexDirection: "row", gap: 8 },
  seg: {
    flex: 1,
    height: 44,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.superficieSutil,
    alignItems: "center",
    justifyContent: "center",
  },
  segOn: { backgroundColor: cores.teal, borderColor: cores.teal },
  segTexto: { fontSize: 13, fontWeight: "600", color: cores.slate300 },
  segTextoOn: { color: cores.dark },
  erro: {
    fontSize: 13,
    color: cores.erroTexto,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.erroBorda,
    backgroundColor: cores.erroFundo,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  botaoLaranja: {
    height: 50,
    borderRadius: raio.card,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoLaranjaFlex: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoLaranjaTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
  botaoContorno: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoContornoTexto: { fontSize: 14, fontWeight: "600", color: cores.branco },
  grade: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  time: {
    width: "47%",
    flexGrow: 1,
    borderRadius: raio.campo,
    backgroundColor: cores.superficieMedia,
    padding: 12,
    gap: 2,
  },
  timeTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  timeRotulo: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  jogadorLinha: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
  bolinha: { width: 6, height: 6, borderRadius: 3 },
  capitao: { fontSize: 12, width: 6, textAlign: "center" },
  jogadorNome: { flex: 1, fontSize: 14, color: cores.branco },
  acoes: { flexDirection: "row", gap: 10 },
  cta: {
    gap: 12,
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    backgroundColor: cores.avisoFundo,
    padding: 16,
  },
  ctaTopo: { flexDirection: "row", alignItems: "center", gap: 12 },
  ctaIcone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(31, 179, 163, 0.15)",
  },
  ctaEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: cores.teal,
    textTransform: "uppercase",
  },
  ctaTitulo: { fontSize: 17, fontWeight: "700", color: cores.branco, marginTop: 2 },
  ctaTexto: { fontSize: 14, lineHeight: 20, color: cores.slate300 },
  ctaBotao: {
    height: 46,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.teal,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBotaoTexto: { fontSize: 15, fontWeight: "700", color: cores.teal },
});
