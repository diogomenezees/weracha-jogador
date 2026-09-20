import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { enviarContato } from "@/api/contato";
import { mensagemDoErro } from "@/mensagens-erro";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import {
  ArrowLeft,
  Building2,
  CircleCheck,
  CircleQuestionMark,
  Handshake,
  Mail,
  Send,
  Wrench,
  type LucideIcon,
} from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { ScrollTeclado } from "@/ui/ScrollTeclado";
import { TituloTela } from "@/ui/TituloTela";

const TITULO_MAX = 120;
const DESCRICAO_MAX = 4000;

// Mesmos motivos da /contato do site: o chip preenche o título e o campo segue livre.
const MOTIVOS: { label: string; Icone: LucideIcon; titulo: string }[] = [
  { label: "Estabelecimento", Icone: Building2, titulo: "Sugestão de estabelecimento" },
  { label: "Parceria", Icone: Handshake, titulo: "Proposta de parceria" },
  { label: "Ajuda com o app", Icone: Wrench, titulo: "Ajuda com o app" },
  { label: "Dúvida", Icone: CircleQuestionMark, titulo: "Dúvida sobre o funcionamento" },
];

// Contato / ouvidoria (versão logada). Nome e telefone vêm da conta, então só título e
// mensagem. `?motivo=Parceria` (vindo de "Indicar parceria") já abre com o chip marcado.
export default function Contato() {
  // Sem folga embaixo, a barra de botões do Android fica em cima do último item.
  const insets = useSafeAreaInsets();
  const { chamarApi } = useSessao();
  const { motivo } = useLocalSearchParams<{ motivo?: string }>();

  const [titulo, setTitulo] = useState(
    () => MOTIVOS.find((m) => m.label === motivo)?.titulo ?? ""
  );
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const pronto = titulo.trim().length > 0 && descricao.trim().length > 0;

  async function enviar() {
    if (!pronto || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await enviarContato(chamarApi, { titulo: titulo.trim(), descricao: descricao.trim() });
      setEnviado(true);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar voltar="Painel" />
        <View style={styles.sucesso}>
          <View style={styles.sucessoIcone}>
            <CircleCheck size={30} color={cores.teal} />
          </View>
          <Text style={styles.sucessoTitulo}>Muito obrigado pelo contato!</Text>
          <Text style={styles.sucessoTexto}>
            Se for preciso, entraremos em contato pelo telefone da sua conta. Por enquanto não há
            retorno automático por aqui.
          </Text>
          <Pressable style={styles.botao} onPress={() => router.replace("/painel")}>
            <ArrowLeft size={18} color={cores.dark} />
            <Text style={styles.botaoTexto}>Voltar ao painel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
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
            <TituloTela Icone={Mail}>Contato</TituloTela>
            <Text style={styles.sub}>
              Estabelecimento, parceria, dúvida sobre o funcionamento ou ajuda com o app: manda sua
              mensagem que ela cai direto pro administrador do We Racha.
            </Text>
          </View>

          {/* Grade 2x2, cada motivo com metade da largura (igual ao site). */}
          <View style={styles.chips}>
            {[MOTIVOS.slice(0, 2), MOTIVOS.slice(2, 4)].map((linha, i) => (
              <View key={i} style={styles.chipsLinha}>
                {linha.map(({ label, Icone, titulo: sugestao }) => {
                  const ativo = titulo === sugestao;
                  return (
                    <Pressable
                      key={label}
                      style={[styles.chip, ativo && styles.chipOn]}
                      onPress={() => setTitulo(sugestao)}
                    >
                      <Icone size={20} color={ativo ? cores.teal : cores.slate400} />
                      <Text style={[styles.chipTexto, ativo && styles.chipTextoOn]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.campo}>
            <Text style={styles.rotulo}>Título</Text>
            <TextInput
              value={titulo}
              onChangeText={setTitulo}
              maxLength={TITULO_MAX}
              placeholder="Título do contato"
              placeholderTextColor={cores.slate500}
              style={styles.input}
            />
          </View>

          <View style={styles.campo}>
            <Text style={styles.rotulo}>Mensagem</Text>
            <TextInput
              value={descricao}
              onChangeText={setDescricao}
              maxLength={DESCRICAO_MAX}
              placeholder="Conte com detalhes o que você precisa"
              placeholderTextColor={cores.slate500}
              multiline
              textAlignVertical="top"
              style={styles.textarea}
            />
          </View>

          {erro && <Text style={styles.erro}>{erro}</Text>}

          <Pressable
            style={[styles.botao, (!pronto || enviando) && styles.botaoOff]}
            disabled={!pronto || enviando}
            onPress={() => void enviar()}
          >
            <Send size={18} color={cores.dark} />
            <Text style={styles.botaoTexto}>{enviando ? "Enviando..." : "Enviar mensagem"}</Text>
          </Pressable>
        </ScrollTeclado>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 18 },
  cabecalho: { gap: 4 },
  sub: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  chips: { gap: 12 },
  chipsLinha: { flexDirection: "row", gap: 12 },
  chip: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: 16,
  },
  chipOn: { borderColor: cores.teal, backgroundColor: "rgba(31, 179, 163, 0.1)" },
  chipTexto: { fontSize: 12, fontWeight: "500", color: cores.slate300, textAlign: "center" },
  chipTextoOn: { color: cores.branco },
  campo: { gap: 6 },
  rotulo: { fontSize: 13, fontWeight: "600", color: cores.slate300 },
  input: {
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 14,
    fontSize: 15,
    color: cores.branco,
  },
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
  erro: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.erroBorda,
    backgroundColor: cores.erroFundo,
    padding: 12,
    fontSize: 13,
    color: cores.erroTexto,
  },
  botao: {
    height: 50,
    borderRadius: raio.card,
    backgroundColor: cores.orange,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  botaoOff: { opacity: 0.5 },
  botaoTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
  sucesso: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 24 },
  sucessoIcone: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(31, 179, 163, 0.15)",
  },
  sucessoTitulo: { fontSize: 22, fontWeight: "700", color: cores.branco, textAlign: "center" },
  sucessoTexto: { fontSize: 14, lineHeight: 21, color: cores.slate400, textAlign: "center" },
});
