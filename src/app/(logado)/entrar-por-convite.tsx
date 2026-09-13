import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";

import { Text } from "@/ui/Texto";
import { tokenDeConvite } from "@/convites";
import { Navbar } from "@/ui/Navbar";
import { cores, raio, tipografia } from "@/tema";

// Entrada por convite manual: quem recebeu o link no WhatsApp cola aqui, em vez de
// depender do deep link abrir o app (que só funciona depois do EAS Build com os
// fingerprints certos). Extrai o token e reusa a tela /convite/[token], que com
// sessão ativa já mostra o nome do grupo e o botão de entrar.
export default function EntrarPorConvite() {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function continuar() {
    const token = tokenDeConvite(texto);
    if (!token) {
      setErro(
        "Não reconheci esse link. Cole o link completo que você recebeu, ou peça um novo pro admin do grupo."
      );
      return;
    }
    setErro(null);
    router.push({ pathname: "/convite/[token]", params: { token } });
  }

  async function colar() {
    const t = await Clipboard.getStringAsync();
    if (t) {
      setTexto(t);
      setErro(null);
    }
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Painel" />
      <View style={styles.conteudo}>
        <View style={styles.cabecalho}>
          <Text style={tipografia.titulo}>Entrar por convite</Text>
          <Text style={styles.sub}>
            Cole o link de convite que te mandaram. Ele começa com weracha.app/convite.
          </Text>
        </View>

        <View style={styles.campo}>
          <TextInput
            value={texto}
            onChangeText={(v) => {
              setTexto(v);
              setErro(null);
            }}
            placeholder="weracha.app/convite/..."
            placeholderTextColor={cores.slate500}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Pressable onPress={() => void colar()} hitSlop={8}>
            <Text style={styles.colar}>Colar</Text>
          </Pressable>
        </View>

        {erro ? <Text style={styles.erro}>{erro}</Text> : null}

        <Pressable style={styles.botao} onPress={continuar}>
          <Text style={styles.botaoTexto}>Continuar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  conteudo: { flex: 1, paddingHorizontal: 24, paddingTop: 16, gap: 18 },
  cabecalho: { gap: 6 },
  sub: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  campo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 12,
  },
  input: { flex: 1, height: 48, fontSize: 15, color: cores.branco },
  colar: { fontSize: 14, fontWeight: "600", color: cores.teal },
  erro: {
    fontSize: 13,
    lineHeight: 19,
    color: cores.erroTexto,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.erroBorda,
    backgroundColor: cores.erroFundo,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  botao: {
    height: 50,
    borderRadius: raio.card,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
});
