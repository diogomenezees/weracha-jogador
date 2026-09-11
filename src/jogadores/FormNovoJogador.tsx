import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { adicionarMembro, buscarJogadorPorTelefone, buscarSugestaoScore } from "@/api/jogadores";
import { CaixaErro } from "@/acesso/ui";
import { formatarTelefoneBR, normalizarTelefone } from "@/contrato/telefone";
import { mensagemDoErro } from "@/mensagens-erro";
import { BotaoLaranja } from "@/painel/ui";
import { cores, raio } from "@/tema";
import type { MembroGrupo } from "@/contrato/tipos";

type ChamarApi = <T>(
  caminho: string,
  opcoes?: import("@/api/cliente").OpcoesRequisicao
) => Promise<T>;

// Adicionar jogador ao grupo. Espelha weracha-site/components/formulario-novo-jogador.tsx:
// resolve o telefone (jogador existente trava o nome + traz score sugerido);
// jogador novo precisa do admin confirmar que conhece o nível pra editar o score.
export function FormNovoJogador({
  aberto,
  chamarApi,
  grupoId,
  esporte,
  onFechar,
  onAdicionado,
}: {
  aberto: boolean;
  chamarApi: ChamarApi;
  grupoId: string;
  esporte: string;
  onFechar: () => void;
  onAdicionado: (membro: MembroGrupo) => void;
}) {
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [score, setScore] = useState(50);
  const [scoreDefinido, setScoreDefinido] = useState(false);
  const [scoreConhecido, setScoreConhecido] = useState(false);
  const [existenteId, setExistenteId] = useState<string | null>(null);
  const [telefoneVerificado, setTelefoneVerificado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const consultadoRef = useRef<string | null>(null);

  function resetar() {
    setTelefone("");
    setNome("");
    setScore(50);
    setScoreDefinido(false);
    setScoreConhecido(false);
    setExistenteId(null);
    setTelefoneVerificado(false);
    setErro(null);
    consultadoRef.current = null;
  }

  async function aoMudarTelefone(valor: string) {
    setErro(null);
    const fmt = formatarTelefoneBR(valor);
    setTelefone(fmt);
    const dig = normalizarTelefone(fmt);
    if (dig.length < 11) {
      consultadoRef.current = null;
      setExistenteId(null);
      setScoreDefinido(false);
      setScoreConhecido(false);
      setTelefoneVerificado(false);
      return;
    }
    if (dig === consultadoRef.current) return;
    consultadoRef.current = dig;
    setTelefoneVerificado(false);
    try {
      const { jogador } = await buscarJogadorPorTelefone(chamarApi, dig);
      if (jogador) {
        setExistenteId(jogador.id);
        setNome(jogador.nome);
        const info = await buscarSugestaoScore(chamarApi, jogador.id, esporte);
        setScore(info.score);
        setScoreDefinido(info.definido);
      } else {
        setExistenteId(null);
        setScoreDefinido(false);
        setScore(50);
      }
      setScoreConhecido(false);
      setTelefoneVerificado(true);
    } catch {
      // falha de rede na busca: deixa o admin tentar de novo digitando
      consultadoRef.current = null;
    }
  }

  async function salvar() {
    setErro(null);
    if (normalizarTelefone(telefone).length < 11) {
      setErro("Digite um telefone válido, com DDD.");
      return;
    }
    if (!telefoneVerificado) {
      setErro("Aguarde a verificação do telefone.");
      return;
    }
    if (!nome.trim()) {
      setErro("Dê um nome para o jogador.");
      return;
    }
    setEnviando(true);
    try {
      const membro = await adicionarMembro(chamarApi, grupoId, {
        telefone,
        nome: nome.trim(),
        score,
        origemScore: scoreConhecido ? "ADMIN" : "PADRAO",
      });
      resetar();
      onAdicionado(membro);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setEnviando(false);
    }
  }

  const mostrarInputScore = scoreDefinido || scoreConhecido;

  return (
    <Modal
      visible={aberto}
      transparent
      animationType="slide"
      onRequestClose={() => {
        resetar();
        onFechar();
      }}
    >
      <View style={styles.fundo}>
        <Pressable
          style={styles.fundoToque}
          onPress={() => {
            resetar();
            onFechar();
          }}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.folha}
        >
          <Text style={styles.eyebrow}>Adicionar jogador</Text>
          <Text style={styles.desc}>
            Cadastre pra facilitar o check-in nas próximas partidas.
          </Text>

          <TextInput
            style={[styles.input, existenteId !== null && styles.inputTravado]}
            value={nome}
            onChangeText={setNome}
            placeholder="Nome"
            placeholderTextColor={cores.slate500}
            editable={existenteId === null}
          />
          <TextInput
            style={styles.input}
            value={telefone}
            onChangeText={aoMudarTelefone}
            placeholder="Telefone: (11) 99999-8888"
            placeholderTextColor={cores.slate500}
            keyboardType="phone-pad"
            maxLength={15}
          />
          {existenteId !== null && (
            <Text style={styles.nota}>Esse telefone já pertence a um jogador cadastrado.</Text>
          )}

          {telefoneVerificado && (
            <View style={styles.scoreBloco}>
              {mostrarInputScore ? (
                <>
                  <Text style={styles.label}>Score</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => !scoreDefinido && setScore((v) => Math.max(0, v - 1))}
                      disabled={scoreDefinido}
                    >
                      <Text style={styles.stepBtnTexto}>−</Text>
                    </Pressable>
                    <Text style={styles.stepValor}>{score}</Text>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => !scoreDefinido && setScore((v) => Math.min(100, v + 1))}
                      disabled={scoreDefinido}
                    >
                      <Text style={styles.stepBtnTexto}>+</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.nota}>
                    {scoreDefinido
                      ? "Score sugerido a partir de outro grupo desse esporte."
                      : "Você marcou que conhece o nível do jogador."}
                  </Text>
                </>
              ) : (
                <>
                  <Pressable style={styles.definirScore} onPress={() => setScoreConhecido(true)}>
                    <Text style={styles.definirScoreTexto}>Definir o score agora</Text>
                  </Pressable>
                  <Text style={styles.nota}>
                    O jogador ainda não tem score real em nenhum outro grupo desse esporte.
                  </Text>
                </>
              )}
            </View>
          )}

          {erro ? <CaixaErro>{erro}</CaixaErro> : null}

          <View style={styles.acoes}>
            <Pressable
              style={styles.btnSec}
              onPress={() => {
                resetar();
                onFechar();
              }}
            >
              <Text style={styles.btnSecTexto}>Voltar</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <BotaoLaranja titulo="Salvar" onPress={() => void salvar()} carregando={enviando} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  fundoToque: { flex: 1 },
  folha: {
    backgroundColor: "#12161f",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 20,
    paddingBottom: 30,
    gap: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  desc: { fontSize: 13, color: cores.slate400 },
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
  inputTravado: { borderStyle: "dashed", color: cores.slate400 },
  nota: { fontSize: 12, color: cores.slate400 },
  label: { fontSize: 13, fontWeight: "600", color: cores.slate300 },
  scoreBloco: { gap: 8 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    overflow: "hidden",
  },
  stepBtn: { width: 48, height: 46, alignItems: "center", justifyContent: "center" },
  stepBtnTexto: { fontSize: 22, color: cores.teal },
  stepValor: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: cores.branco },
  definirScore: {
    height: 46,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: cores.avisoBorda,
    alignItems: "center",
    justifyContent: "center",
  },
  definirScoreTexto: { fontSize: 15, color: cores.slate400 },
  acoes: { flexDirection: "row", gap: 10, marginTop: 4 },
  btnSec: {
    width: 80,
    height: 52,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecTexto: { fontSize: 15, fontWeight: "600", color: cores.branco },
});
