import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/ui/Texto";

import { alternarPalavraOculta, responder } from "@/api/enquetes";
import { Check, EyeOff, Send } from "@/ui/Icone";
import { mensagemDoErro } from "@/mensagens-erro";
import { cores, raio } from "@/tema";
import {
  LIMITE_CARACTERES_RESPOSTA,
  type Enquete,
  type PalavraNuvem,
  type RespondenteEnquete,
} from "@/contrato/tipos";

// Enquete de resposta livre (nuvem de palavras) dentro do ModalEnquete. Espelha
// weracha-site/components/enquete-livre.tsx.

type ChamarApi = <T>(
  caminho: string,
  opcoes?: import("@/api/cliente").OpcoesRequisicao
) => Promise<T>;

// Peso 1 (menos citada) a 5 (mais citada). No fundo escuro, "mais escura" vira
// "mais forte": cinza apagado → branco → teal. Mesmos tamanhos do site.
const ESTILO_POR_PESO = {
  1: { fontSize: 13, fontWeight: "500", color: cores.slate500 },
  2: { fontSize: 16, fontWeight: "500", color: cores.slate400 },
  3: { fontSize: 20, fontWeight: "600", color: cores.slate200 },
  4: { fontSize: 25, fontWeight: "700", color: cores.branco },
  5: { fontSize: 31, fontWeight: "700", color: cores.teal },
} as const;

export function NuvemDePalavras({
  nuvem,
  moderando,
  onAlternar,
  ocupada,
}: {
  nuvem: PalavraNuvem[];
  moderando: boolean;
  onAlternar?: (p: PalavraNuvem) => void;
  ocupada?: string | null;
}) {
  // Fora do modo moderar, palavra escondida não aparece nem pro admin.
  const visiveis = moderando ? nuvem : nuvem.filter((p) => !p.oculta);
  if (visiveis.length === 0) {
    return <Text style={styles.vazio}>Ninguém respondeu ainda. Seja o primeiro.</Text>;
  }
  return (
    <View style={styles.nuvem}>
      {visiveis.map((p) =>
        moderando ? (
          <Pressable
            key={p.chave}
            onPress={() => onAlternar?.(p)}
            disabled={ocupada === p.chave}
            style={[
              styles.palavraModerando,
              p.oculta && styles.palavraOcultaBorda,
              ocupada === p.chave && { opacity: 0.4 },
            ]}
          >
            <Text style={p.oculta ? styles.palavraOculta : ESTILO_POR_PESO[p.peso]}>{p.texto}</Text>
          </Pressable>
        ) : (
          <Text key={p.chave} style={ESTILO_POR_PESO[p.peso]}>
            {p.texto}
          </Text>
        )
      )}
    </View>
  );
}

// Nuvem fictícia pro exemplo do "Criar enquete" (já na ordem de exibição:
// as maiores no meio).
const NUVEM_EXEMPLO: PalavraNuvem[] = [
  ["Lucas", 1],
  ["Johnny", 2],
  ["Gabriel", 3],
  ["Mateus", 5],
  ["Diogo", 4],
  ["O goleiro", 2],
  ["Neguinho", 1],
].map(([texto, peso]) => ({
  chave: String(texto).toLowerCase(),
  texto: String(texto),
  contagem: Number(peso),
  peso: peso as PalavraNuvem["peso"],
  oculta: false,
}));

// Prévia mostrada no "Criar enquete" quando o tipo é Resposta livre, pra quem
// cria ver como o resultado vai ficar. Espelha o ExemploNuvem do site.
export function ExemploNuvem() {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.exemploLabel}>Exemplo</Text>
      <View style={styles.caixaNuvem}>
        <NuvemDePalavras nuvem={NUVEM_EXEMPLO} moderando={false} />
      </View>
      <Text style={styles.dica}>Quanto mais gente escreve a mesma coisa, maior a palavra fica.</Text>
    </View>
  );
}

export function CorpoEnqueteLivre({
  enquete,
  souAdmin,
  chamarApi,
  onAtualizar,
}: {
  enquete: Enquete;
  souAdmin: boolean;
  chamarApi: ChamarApi;
  /** Recarrega a lista no parent (que re-passa a enquete fresca por prop). */
  onAtualizar: () => Promise<void>;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [moderando, setModerando] = useState(false);
  const [ocupada, setOcupada] = useState<string | null>(null);

  const ocultas = enquete.nuvem.filter((p) => p.oculta).length;

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      await responder(chamarApi, enquete.id, t);
      setTexto("");
      await onAtualizar();
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setEnviando(false);
    }
  }

  async function alternar(p: PalavraNuvem) {
    setOcupada(p.chave);
    setErro(null);
    try {
      await alternarPalavraOculta(chamarApi, enquete.id, p.chave, !p.oculta);
      await onAtualizar();
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setOcupada(null);
    }
  }

  return (
    <View style={styles.corpo}>
      {enquete.minhaResposta !== null ? (
        <View style={styles.minhaLinha}>
          <Check size={14} color={cores.teal} />
          <Text style={styles.meta}>Sua resposta:</Text>
          <Text style={styles.minha} numberOfLines={1}>
            {enquete.minhaResposta}
          </Text>
        </View>
      ) : enquete.ativa ? (
        <View style={{ gap: 4 }}>
          <View style={styles.respostaLinha}>
            <TextInput
              style={styles.input}
              value={texto}
              onChangeText={(v) => setTexto(v.slice(0, LIMITE_CARACTERES_RESPOSTA))}
              maxLength={LIMITE_CARACTERES_RESPOSTA}
              editable={!enviando}
              placeholder="Sua resposta"
              placeholderTextColor={cores.slate500}
              returnKeyType="send"
              onSubmitEditing={() => void enviar()}
            />
            <Pressable
              style={[styles.enviar, (!texto.trim() || enviando) && { opacity: 0.4 }]}
              onPress={() => void enviar()}
              disabled={!texto.trim() || enviando}
              accessibilityLabel="Enviar resposta"
            >
              {enviando ? (
                <ActivityIndicator size="small" color={cores.dark} />
              ) : (
                <Send size={16} color={cores.dark} />
              )}
            </Pressable>
          </View>
          <View style={styles.dicaLinha}>
            <Text style={styles.dica}>Só dá pra responder uma vez.</Text>
            <Text style={styles.dica}>
              {[...texto].length}/{LIMITE_CARACTERES_RESPOSTA}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.caixaNuvem}>
        <NuvemDePalavras
          nuvem={enquete.nuvem}
          moderando={moderando}
          onAlternar={(p) => void alternar(p)}
          ocupada={ocupada}
        />
      </View>

      {souAdmin && enquete.nuvem.length > 0 ? (
        <View style={styles.moderarLinha}>
          <Text style={[styles.dica, { flex: 1 }]}>
            {moderando
              ? "Toque numa palavra pra esconder ou mostrar de novo."
              : ocultas > 0
                ? `${ocultas} ${ocultas === 1 ? "palavra escondida" : "palavras escondidas"}`
                : ""}
          </Text>
          <Pressable style={styles.moderarBotao} onPress={() => setModerando((m) => !m)} hitSlop={6}>
            {moderando ? (
              <Check size={14} color={cores.slate400} />
            ) : (
              <EyeOff size={14} color={cores.slate400} />
            )}
            <Text style={styles.moderarTexto}>{moderando ? "Pronto" : "Esconder palavras"}</Text>
          </Pressable>
        </View>
      ) : null}

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </View>
  );
}

// Aba "Votos" de enquete LIVRE identificada: nome e resposta. Escondida aparece
// como "Escondida" (o admin ainda vê o texto, riscado).
export function ListaRespostasLivres({ respostas }: { respostas: RespondenteEnquete[] }) {
  if (respostas.length === 0) return <Text style={styles.meta}>Ninguém respondeu ainda.</Text>;
  return (
    <>
      {respostas.map((r) => (
        <View key={r.jogadorId} style={styles.votoLinha}>
          <Text style={styles.votoNome} numberOfLines={1}>
            {r.nome}
          </Text>
          <Text
            style={[
              styles.votoResposta,
              r.oculta && { color: cores.erroTexto },
              r.oculta && r.texto !== null && { textDecorationLine: "line-through" },
            ]}
            numberOfLines={1}
          >
            {r.texto ?? "Escondida"}
          </Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  corpo: { gap: 8 },
  exemploLabel: { fontSize: 13, fontWeight: "600", color: cores.slate300 },
  minhaLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  minha: { flexShrink: 1, fontSize: 14, fontWeight: "600", color: cores.branco },
  meta: { fontSize: 13, color: cores.slate400 },
  respostaLinha: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    height: 44,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 12,
    fontSize: 15,
    color: cores.branco,
  },
  enviar: {
    width: 44,
    height: 44,
    borderRadius: raio.campo,
    backgroundColor: cores.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  dicaLinha: { flexDirection: "row", justifyContent: "space-between" },
  dica: { fontSize: 12, color: cores.slate500 },
  caixaNuvem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: cores.superficieSutil,
    paddingHorizontal: 6,
    paddingVertical: 12,
  },
  nuvem: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    columnGap: 12,
    rowGap: 2,
  },
  vazio: { fontSize: 13, color: cores.slate500, textAlign: "center", paddingVertical: 12 },
  palavraModerando: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    paddingHorizontal: 4,
  },
  palavraOcultaBorda: { borderColor: "rgba(248,113,113,0.4)" },
  palavraOculta: { fontSize: 13, color: cores.erroTexto, textDecorationLine: "line-through" },
  moderarLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  moderarBotao: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  moderarTexto: { fontSize: 12, color: cores.slate400 },
  erro: { fontSize: 13, color: cores.erroTexto },
  votoLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: cores.linhaSutil,
  },
  votoNome: { flex: 1, fontSize: 14, color: cores.branco },
  votoResposta: {
    fontSize: 11,
    color: cores.slate400,
    backgroundColor: cores.superficieSutil,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    maxWidth: 150,
  },
});
