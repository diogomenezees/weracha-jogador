import { useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";

import { Text } from "@/ui/Texto";
import { tokenDeConvite } from "@/convites";
import { Navbar } from "@/ui/Navbar";
import { ClipboardPaste, Globe, Link } from "@/ui/Icone";
import { cores, raio, tipografia } from "@/tema";

// Entrada por convite manual, plano B do link. O caminho normal é tocar no link e o
// app abrir direto em /convite/[token] (App Links, assetlinks.json). Esta tela serve
// quando isso falha: o link foi tocado antes de instalar o app, ou abriu no
// navegador. Aceita o link inteiro ou só o código; extrai o token e reusa a tela
// /convite/[token], que com sessão ativa já mostra o nome do grupo e o botão de entrar.
export default function EntrarPorConvite() {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [preenchidoSozinho, setPreenchidoSozinho] = useState(false);
  // Espelho de "o campo tem texto", lido no efeito assíncrono sem pegar estado velho.
  const campoPreenchido = useRef(false);

  // Se já tem um link de convite copiado, preenche o campo sozinho: ao abrir a
  // tela e ao voltar pro app (a pessoa foi no WhatsApp copiar o link). Só link com
  // "convite/", nunca um texto qualquer copiado, e só com o campo vazio.
  useEffect(() => {
    let ativo = true;
    async function olharAreaDeTransferencia() {
      try {
        if (!(await Clipboard.hasStringAsync())) return;
        const copiado = await Clipboard.getStringAsync();
        if (!ativo || campoPreenchido.current) return;
        if (!/convite\//i.test(copiado) || !tokenDeConvite(copiado)) return;
        campoPreenchido.current = true;
        setTexto(copiado.trim());
        setPreenchidoSozinho(true);
        setErro(null);
      } catch {
        // Sem acesso à área de transferência: segue o botão "Colar".
      }
    }
    void olharAreaDeTransferencia();
    const assinatura = AppState.addEventListener("change", (estado) => {
      if (estado === "active") void olharAreaDeTransferencia();
    });
    return () => {
      ativo = false;
      assinatura.remove();
    };
  }, []);

  function continuar() {
    const token = tokenDeConvite(texto);
    if (!token) {
      setErro(
        "Não reconheci esse convite. Cole o link inteiro ou só o código do final dele. Se não der certo, peça um link novo pro admin do grupo."
      );
      return;
    }
    setErro(null);
    router.push({ pathname: "/convite/[token]", params: { token } });
  }

  async function colar() {
    const t = await Clipboard.getStringAsync();
    if (t) {
      setTexto(t.trim());
      campoPreenchido.current = true;
      setErro(null);
      setPreenchidoSozinho(false);
    }
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Painel" />
      <View style={styles.conteudo}>
        <View style={styles.cabecalho}>
          <Text style={tipografia.titulo}>Entrar por convite</Text>
          <Text style={styles.sub}>Recebeu o link do grupo? Tem dois jeitos.</Text>
        </View>

        <View style={styles.jeitos}>
          <View style={[styles.jeito, styles.jeitoDestaque]}>
            <View style={[styles.jeitoIcone, { backgroundColor: cores.teal + "26" }]}>
              <Link size={16} color={cores.teal} />
            </View>
            <Text style={styles.jeitoTitulo}>Toque no link</Text>
            <Text style={styles.jeitoTexto}>Ele abre direto no app.</Text>
          </View>

          <View style={styles.jeito}>
            <View style={[styles.jeitoIcone, { backgroundColor: cores.superficieMedia }]}>
              <Globe size={16} color={cores.slate300} />
            </View>
            <Text style={styles.jeitoTitulo}>Abriu no navegador?</Text>
            <Text style={styles.jeitoTexto}>Copie o link e cole aqui embaixo.</Text>
          </View>
        </View>

        <View style={styles.campo}>
          <TextInput
            value={texto}
            onChangeText={(v) => {
              setTexto(v);
              campoPreenchido.current = v.trim().length > 0;
              setErro(null);
              setPreenchidoSozinho(false);
            }}
            placeholder="Link ou código do convite"
            placeholderTextColor={cores.slate500}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Pressable onPress={() => void colar()} hitSlop={8} style={styles.botaoColar}>
            <ClipboardPaste size={15} color={cores.teal} />
            <Text style={styles.colar}>Colar</Text>
          </Pressable>
        </View>

        {preenchidoSozinho && !erro ? (
          <Text style={styles.dica}>Achamos um link de convite copiado. É só continuar.</Text>
        ) : null}
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
  conteudo: { flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 18 },
  cabecalho: { gap: 6 },
  sub: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  // Mesmo formato dos cards lado a lado do painel ("Dois caminhos", src/painel/ui.tsx).
  jeitos: { flexDirection: "row", gap: 12 },
  jeito: {
    flex: 1,
    gap: 6,
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.linhaSutil,
    backgroundColor: cores.cardFundo,
    padding: 14,
  },
  jeitoDestaque: { borderColor: cores.avisoBorda, backgroundColor: cores.avisoFundo },
  jeitoIcone: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  jeitoTitulo: { fontSize: 14, fontWeight: "700", color: cores.branco },
  jeitoTexto: { fontSize: 11, lineHeight: 16, color: cores.slate400 },
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
  botaoColar: { flexDirection: "row", alignItems: "center", gap: 5 },
  colar: { fontSize: 14, fontWeight: "600", color: cores.teal },
  dica: { fontSize: 13, lineHeight: 19, color: cores.teal, marginTop: -8 },
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
