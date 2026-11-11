import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

import { Text } from "@/ui/Texto";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { ArrowLeftRight, Frown, Star, X } from "@/ui/Icone";
import { useBlurTarget } from "@/ui/BlurTarget";
import { buscarSubstitutos, substituirJogador } from "@/api/partidas";
import { mensagemDoErro } from "@/mensagens-erro";
import type { OpcoesRequisicao } from "@/api/cliente";
import { cores, raio } from "@/tema";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

export type JogadorParaSubstituir = {
  jogadorId: string;
  nome: string;
  fotoUrl: string | null;
  score: number;
  // "Time 3", "Próximos": onde o jogador está agora.
  onde: string;
};

/** "Substituir jogador…" do rascunho do sorteio: porte de
 * `weracha-site/components/dialog-substituir-jogador.tsx`. Quem escolhe o
 * substituto é o sistema: a tela mostra um nome só. O admin confirma, ou diz
 * que esse também não chegou e o modal passa pro próximo da lista (sem nova
 * chamada). Nunca escolhe livremente (troca escolhida a dedo vira panela). */
export function ModalSubstituirJogador({
  chamarApi,
  partidaId,
  sai,
  descrever,
  mostrarScore,
  onFechar,
  onSubstituido,
}: {
  chamarApi: ChamarApi;
  partidaId: string;
  // null = fechado.
  sai: JogadorParaSubstituir | null;
  descrever: (jogadorId: string) => JogadorParaSubstituir | null;
  mostrarScore: boolean;
  onFechar: () => void;
  onSubstituido: () => Promise<void> | void;
}) {
  const blurTarget = useBlurTarget();
  const [substitutos, setSubstitutos] = useState<string[] | null>(null);
  const [indice, setIndice] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const saiId = sai?.jogadorId;
  useEffect(() => {
    if (!saiId) return;
    let vivo = true;
    (async () => {
      setSubstitutos(null);
      setIndice(0);
      setErro(null);
      try {
        const lista = await buscarSubstitutos(chamarApi, partidaId, saiId);
        if (vivo) setSubstitutos(lista);
      } catch (e) {
        if (vivo) {
          setSubstitutos([]);
          setErro(mensagemDoErro(e));
        }
      }
    })();
    return () => {
      vivo = false;
    };
  }, [chamarApi, partidaId, saiId]);

  const candidatoId = substitutos?.[indice];
  const candidato = candidatoId ? descrever(candidatoId) : null;

  async function confirmar() {
    if (!sai || !candidatoId) return;
    setSalvando(true);
    setErro(null);
    try {
      await substituirJogador(chamarApi, partidaId, sai.jogadorId, candidatoId);
      await onSubstituido();
      onFechar();
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setSalvando(false);
    }
  }

  const fechar = () => {
    if (!salvando) onFechar();
  };

  return (
    <Modal visible={!!sai} transparent animationType="fade" onRequestClose={fechar}>
      <BlurView
        intensity={40}
        tint="dark"
        blurMethod="dimezisBlurView"
        blurTarget={blurTarget}
        style={styles.fundo}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={fechar} />
        <Pressable style={styles.cartao} onPress={(e) => e.stopPropagation()}>
          <View style={styles.eyebrowLinha}>
            <ArrowLeftRight size={16} color={cores.teal} />
            <Text style={styles.eyebrow}>Substituir jogador</Text>
          </View>
          <Text style={styles.titulo}>{sai?.nome} não chegou?</Text>
          <Text style={styles.descricao}>
            O sistema escolhe alguém do mesmo nível pra entrar no lugar. {sai?.nome} fica com a vaga
            de quem entrou.
          </Text>

          {substitutos == null ? (
            <View style={styles.caixaNeutra}>
              <ActivityIndicator color={cores.teal} />
            </View>
          ) : !candidato ? (
            !erro && (
              <View style={styles.avisoVazio}>
                <Frown size={20} color={cores.erroTexto} />
                <Text style={styles.avisoVazioTexto}>Não sobrou ninguém pra sugerir.</Text>
              </View>
            )
          ) : (
            <View style={styles.candidato}>
              <AvatarJogador
                id={candidato.jogadorId}
                nome={candidato.nome}
                fotoUrl={candidato.fotoUrl}
                tamanho={40}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.candidatoNome} numberOfLines={1}>
                  {candidato.nome}
                </Text>
                <View style={styles.candidatoMeta}>
                  <Text style={styles.candidatoMetaTexto}>Sai de: {candidato.onde}</Text>
                  {mostrarScore && (
                    <>
                      <Text style={styles.candidatoMetaTexto}>·</Text>
                      <Star size={11} color={cores.slate400} />
                      <Text style={styles.candidatoMetaTexto}>Score {candidato.score}</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          )}

          {erro ? <Text style={styles.erro}>{erro}</Text> : null}

          {candidato ? (
            <View style={styles.acoes}>
              <Pressable
                style={[styles.btnPrimario, salvando && styles.inativo]}
                onPress={() => void confirmar()}
                disabled={salvando}
              >
                {salvando ? (
                  <ActivityIndicator color={cores.dark} />
                ) : (
                  <Text style={styles.btnPrimarioTexto} numberOfLines={1}>
                    Colocar {candidato.nome}
                  </Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.btnSecundario, salvando && styles.inativo]}
                onPress={() => setIndice((i) => i + 1)}
                disabled={salvando}
              >
                <Text style={styles.btnSecundarioTexto} numberOfLines={1}>
                  {candidato.nome} também não chegou
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.btnSecundario} onPress={fechar}>
              <Text style={styles.btnSecundarioTexto}>Fechar</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.fechar}
            onPress={fechar}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Fechar"
          >
            <X size={16} color={cores.slate400} />
          </Pressable>
        </Pressable>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 16,
  },
  cartao: {
    backgroundColor: "#12161f",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 15,
    gap: 10,
  },
  fechar: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrowLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  titulo: { fontSize: 18, fontWeight: "700", color: cores.branco, paddingRight: 28 },
  descricao: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  caixaNeutra: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 18,
    alignItems: "center",
  },
  avisoVazio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.erroBorda,
    backgroundColor: cores.erroFundo,
    padding: 12,
  },
  avisoVazioTexto: { flex: 1, fontSize: 14, lineHeight: 20, color: cores.erroTexto },
  candidato: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(45, 212, 191, 0.3)",
    backgroundColor: "rgba(45, 212, 191, 0.06)",
    padding: 12,
  },
  candidatoNome: { fontSize: 15, fontWeight: "600", color: cores.branco },
  candidatoMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  candidatoMetaTexto: { fontSize: 12, color: cores.slate400 },
  erro: { fontSize: 13, color: cores.erroTexto },
  acoes: { gap: 8, marginTop: 6 },
  btnSecundario: {
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  btnSecundarioTexto: { fontSize: 15, fontWeight: "600", color: cores.branco },
  btnPrimario: {
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.teal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  btnPrimarioTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
  inativo: { opacity: 0.6 },
});
