import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect } from "expo-router";

import { mensagemDoErro } from "@/mensagens-erro";
import { formatarTelefoneBR, normalizarTelefone } from "@/contrato/telefone";
import { rotuloDoAmbiente, type Ambiente } from "@/config/servidor";
import { useSessao } from "@/sessao/contexto";

export default function Login() {
  const { estado, ambiente, trocarAmbiente, entrar } = useSessao();
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (estado.fase === "logado") return <Redirect href="/grupos" />;

  const digitos = normalizarTelefone(telefone);
  const podeEnviar = digitos.length >= 10 && senha.length > 0 && !enviando;

  async function enviar() {
    setErro(null);
    setEnviando(true);
    try {
      await entrar(digitos, senha);
      // A troca de `estado` pra "logado" redireciona pelo <Redirect> acima.
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setEnviando(false);
    }
  }

  function escolherServidor() {
    const opcoes: Ambiente[] = ["producao", "local"];
    Alert.alert(
      "Servidor",
      "Onde o app deve se conectar.",
      [
        ...opcoes.map((op) => ({
          text: rotuloDoAmbiente(op) + (op === ambiente ? " (atual)" : ""),
          onPress: () => {
            if (op !== ambiente) void trocarAmbiente(op);
          },
        })),
        { text: "Cancelar", style: "cancel" as const },
      ],
      { cancelable: true }
    );
  }

  return (
    <SafeAreaView style={styles.tela}>
      <KeyboardAvoidingView
        style={styles.centro}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.bloco}>
          <Text style={styles.titulo}>We Racha</Text>
          <Text style={styles.subtitulo}>Entre com o telefone e a senha do site.</Text>

          <View style={styles.campo}>
            <Text style={styles.rotulo}>Telefone</Text>
            <TextInput
              style={styles.input}
              value={formatarTelefoneBR(telefone)}
              onChangeText={setTelefone}
              placeholder="(11) 90000-0000"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={16}
              editable={!enviando}
            />
          </View>

          <View style={styles.campo}>
            <Text style={styles.rotulo}>Senha</Text>
            <TextInput
              style={styles.input}
              value={senha}
              onChangeText={setSenha}
              placeholder="Sua senha"
              secureTextEntry
              textContentType="password"
              autoComplete="current-password"
              editable={!enviando}
              onSubmitEditing={() => podeEnviar && void enviar()}
            />
          </View>

          {erro ? <Text style={styles.erro}>{erro}</Text> : null}

          <Pressable
            style={[styles.botao, !podeEnviar && styles.botaoInativo]}
            onPress={() => void enviar()}
            disabled={!podeEnviar}
          >
            {enviando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botaoTexto}>Entrar</Text>
            )}
          </Pressable>

          <Text style={styles.ajuda}>
            Ainda não tem senha? Cadastre pelo site weracha.app e volte aqui.
          </Text>
        </View>

        <Pressable style={styles.servidor} onPress={escolherServidor} disabled={enviando}>
          <Text style={styles.servidorTexto}>Servidor: {rotuloDoAmbiente(ambiente)}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#fff" },
  centro: { flex: 1, justifyContent: "space-between", padding: 24 },
  bloco: { flex: 1, justifyContent: "center", gap: 16 },
  titulo: { fontSize: 32, fontWeight: "700", color: "#111" },
  subtitulo: { fontSize: 15, color: "#555", marginBottom: 8 },
  campo: { gap: 6 },
  rotulo: { fontSize: 13, fontWeight: "600", color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111",
  },
  erro: { color: "#c0261c", fontSize: 14 },
  botao: {
    backgroundColor: "#208AEF",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  botaoInativo: { opacity: 0.5 },
  botaoTexto: { color: "#fff", fontSize: 16, fontWeight: "700" },
  ajuda: { fontSize: 13, color: "#777", textAlign: "center", marginTop: 4 },
  servidor: { alignSelf: "center", padding: 8 },
  servidorTexto: { fontSize: 13, color: "#999" },
});
