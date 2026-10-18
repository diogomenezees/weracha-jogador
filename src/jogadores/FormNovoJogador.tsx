import { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/ui/Texto";

import { adicionarMembro, buscarJogadorPorTelefone, buscarSugestaoScore } from "@/api/jogadores";
import { CaixaErro } from "@/acesso/ui";
import { formatarTelefoneBR, normalizarTelefone } from "@/contrato/telefone";
import { mensagemDoErro } from "@/mensagens-erro";
import { BotaoLaranja } from "@/painel/ui";
import { cores, raio } from "@/tema";
import { FolhaArrastavel } from "@/ui/FolhaArrastavel";
import { Lock, UserPlus } from "@/ui/Icone";
import type { MembroGrupo } from "@/contrato/tipos";

type ChamarApi = <T>(
  caminho: string,
  opcoes?: import("@/api/cliente").OpcoesRequisicao
) => Promise<T>;

// Adicionar jogador ao grupo. Espelha weracha-site/components/formulario-novo-jogador.tsx:
// resolve o telefone (jogador existente trava o nome + traz score sugerido);
// o score é sempre editável (é por grupo; mexeu nele, grava como ADMIN).
// Folha de baixo arrastável só pelo topo (barrinha + título), pra não brigar
// com os campos; fechar por qualquer caminho descarta o que foi digitado, a não
// ser com `manterRascunho` (painel "Adicionar jogador" do Times/Ao vivo: se sair
// um gol no meio do cadastro, o admin fecha, marca e reabre com tudo digitado).
export function FormNovoJogador({
  aberto,
  chamarApi,
  grupoId,
  esporte,
  descricao = "Cadastre pra facilitar o check-in nas próximas partidas.",
  manterRascunho = false,
  onFechar,
  onAdicionado,
}: {
  aberto: boolean;
  chamarApi: ChamarApi;
  grupoId: string;
  esporte: string;
  descricao?: string;
  manterRascunho?: boolean;
  onFechar: () => void;
  onAdicionado: (membro: MembroGrupo) => void;
}) {
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [score, setScore] = useState(50);
  const [scoreDefinido, setScoreDefinido] = useState(false);
  // O admin mexeu no score: grava como ADMIN em vez de PADRAO.
  const [scoreAlterado, setScoreAlterado] = useState(false);
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
    setScoreAlterado(false);
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
      setScoreAlterado(false);
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
      setScoreAlterado(false);
      setTelefoneVerificado(true);
    } catch {
      // falha de rede na busca: deixa o admin tentar de novo digitando
      consultadoRef.current = null;
    }
  }

  async function salvar(fechar: (depois?: () => void) => void) {
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
        origemScore: scoreAlterado ? "ADMIN" : "PADRAO",
      });
      fechar(() => {
        // Cadastro feito: o rascunho já foi usado, não reabre com ele.
        if (manterRascunho) resetar();
        onAdicionado(membro);
      });
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setEnviando(false);
    }
  }

  function mudarScore(valor: number) {
    setScore(Math.min(100, Math.max(0, valor)));
    setScoreAlterado(true);
  }

  return (
    <FolhaArrastavel
      aberto={aberto}
      arrastarPor="topo"
      onFechar={() => {
        if (!manterRascunho) resetar();
        onFechar();
      }}
      topo={
        <View style={styles.topo}>
          <View style={styles.eyebrowLinha}>
            <UserPlus size={16} color={cores.teal} />
            <Text style={styles.eyebrow}>Adicionar jogador</Text>
          </View>
          <Text style={styles.desc}>{descricao}</Text>
        </View>
      }
    >
      {(fechar) => (
        <View style={styles.corpo}>

          {/* Jogador já cadastrado: o cadeado no nome basta, sem frase embaixo. */}
          <View>
            <TextInput
              style={[styles.input, existenteId !== null && styles.inputTravado]}
              value={nome}
              onChangeText={setNome}
              placeholder="Nome"
              placeholderTextColor={cores.slate500}
              editable={existenteId === null}
            />
            {existenteId !== null && (
              <View style={styles.cadeado} pointerEvents="none">
                <Lock size={16} color={cores.slate500} />
              </View>
            )}
          </View>
          <TextInput
            style={styles.input}
            value={telefone}
            onChangeText={aoMudarTelefone}
            placeholder="Telefone: (11) 99999-8888"
            placeholderTextColor={cores.slate500}
            keyboardType="phone-pad"
            maxLength={15}
          />

          {/* Score sempre editável: o score é por grupo, então o admin define
              o deste grupo já no vínculo (o sugerido de outro grupo é só o
              ponto de partida). Linha única: de onde veio à esquerda, valor à
              direita. */}
          {telefoneVerificado && (
            <View style={styles.scoreLinha}>
              <View style={styles.scoreInfo}>
                <Text style={styles.label}>Score</Text>
                <Text style={styles.nota} numberOfLines={1}>
                  {scoreAlterado
                    ? "Definido por você"
                    : scoreDefinido
                      ? "Veio de outro grupo"
                      : "Valor padrão"}
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => mudarScore(score - 1)}>
                  <Text style={styles.stepBtnTexto}>−</Text>
                </Pressable>
                <TextInput
                  style={styles.stepValor}
                  value={String(score)}
                  onChangeText={(v) => {
                    const dig = v.replace(/\D/g, "");
                    mudarScore(dig === "" ? 0 : Number(dig));
                  }}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                />
                <Pressable style={styles.stepBtn} onPress={() => mudarScore(score + 1)}>
                  <Text style={styles.stepBtnTexto}>+</Text>
                </Pressable>
              </View>
            </View>
          )}

          {erro ? <CaixaErro>{erro}</CaixaErro> : null}

          <View style={styles.acoes}>
            <Pressable style={styles.btnSec} onPress={() => fechar()}>
              <Text style={styles.btnSecTexto}>Voltar</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <BotaoLaranja titulo="Salvar" onPress={() => void salvar(fechar)} carregando={enviando} />
            </View>
          </View>
        </View>
      )}
    </FolhaArrastavel>
  );
}

const styles = StyleSheet.create({
  topo: { gap: 6, paddingHorizontal: 4, paddingBottom: 14 },
  corpo: { gap: 12, paddingHorizontal: 4 },
  eyebrowLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
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
  inputTravado: { borderStyle: "dashed", color: cores.slate400, paddingRight: 36 },
  cadeado: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" },
  nota: { fontSize: 12, color: cores.slate400 },
  label: { fontSize: 13, fontWeight: "600", color: cores.slate300 },
  scoreLinha: { flexDirection: "row", alignItems: "center", gap: 12 },
  scoreInfo: { flex: 1, gap: 2 },
  stepper: {
    width: 150,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    overflow: "hidden",
  },
  stepBtn: { width: 44, height: 46, alignItems: "center", justifyContent: "center" },
  stepBtnTexto: { fontSize: 22, color: cores.teal },
  stepValor: {
    flex: 1,
    height: 46,
    padding: 0,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: cores.branco,
  },
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
