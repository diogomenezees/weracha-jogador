import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/ui/Texto";

import { buscarVotantes, editarPergunta, votar } from "@/api/enquetes";
import { Check, Clock, Pencil, Share2, X } from "@/ui/Icone";
import { ModalCartao } from "@/grupo/modais";
import { mensagemDoErro } from "@/mensagens-erro";
import { formatarDiaSemanaData, formatarHora } from "@/partidas";
import { cores, raio } from "@/tema";
import type { Enquete, VotanteEnquete } from "@/contrato/tipos";

type ChamarApi = <T>(
  caminho: string,
  opcoes?: import("@/api/cliente").OpcoesRequisicao
) => Promise<T>;

export function ModalEnquete({
  enquete,
  aberto,
  onFechar,
  chamarApi,
  meuId,
  souAdmin,
  linkCompartilhar,
  grupoNome,
  onRecarregar,
}: {
  enquete: Enquete | null;
  aberto: boolean;
  onFechar: () => void;
  chamarApi: ChamarApi;
  meuId: string | null;
  souAdmin: boolean;
  /** URL base pro compartilhar. */
  linkCompartilhar: string;
  grupoNome: string;
  /** Recarrega a lista no parent (que re-passa a enquete fresca por prop). */
  onRecarregar: () => Promise<void>;
}) {
  const [aba, setAba] = useState<"votacao" | "votos">("votacao");
  const [votantes, setVotantes] = useState<Record<string, VotanteEnquete[]> | null>(null);
  const [carregandoVotantes, setCarregandoVotantes] = useState(false);
  const [erroVotantes, setErroVotantes] = useState<string | null>(null);
  const [votando, setVotando] = useState(false);
  const [erroVoto, setErroVoto] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [perguntaEdit, setPerguntaEdit] = useState("");
  const [salvandoPergunta, setSalvandoPergunta] = useState(false);
  const [erroPergunta, setErroPergunta] = useState<string | null>(null);

  function fechar() {
    setAba("votacao");
    setVotantes(null);
    setErroVotantes(null);
    setErroVoto(null);
    setEditando(false);
    setErroPergunta(null);
    onFechar();
  }

  if (!enquete) return <ModalCartao aberto={aberto} onFechar={fechar}>{null}</ModalCartao>;

  const podeEditar =
    (enquete.criadoPor === meuId || souAdmin) && enquete.ativa && enquete.totalVotos === 0;

  async function abrirVotos() {
    if (!enquete) return;
    setAba("votos");
    if (votantes) return;
    setCarregandoVotantes(true);
    setErroVotantes(null);
    try {
      setVotantes(await buscarVotantes(chamarApi, enquete.id));
    } catch (e) {
      setErroVotantes(mensagemDoErro(e));
    } finally {
      setCarregandoVotantes(false);
    }
  }

  async function handleVotar(opcaoId: string) {
    if (!enquete || votando || !enquete.ativa) return;
    setVotando(true);
    setErroVoto(null);
    try {
      await votar(chamarApi, enquete.id, opcaoId);
      setVotantes(null);
      await onRecarregar();
    } catch (e) {
      setErroVoto(mensagemDoErro(e));
    } finally {
      setVotando(false);
    }
  }

  async function salvarPergunta() {
    if (!enquete) return;
    const t = perguntaEdit.trim();
    if (!t) {
      setErroPergunta("A pergunta não pode ficar em branco.");
      return;
    }
    if (t === enquete.pergunta) {
      setEditando(false);
      return;
    }
    setSalvandoPergunta(true);
    setErroPergunta(null);
    try {
      await editarPergunta(chamarApi, enquete.id, t);
      await onRecarregar();
      setEditando(false);
    } catch (e) {
      setErroPergunta(mensagemDoErro(e));
    } finally {
      setSalvandoPergunta(false);
    }
  }

  async function compartilhar() {
    if (!enquete) return;
    const link = `${linkCompartilhar}?enquete=${enquete.id}`;
    const msg = enquete.ativa
      ? `📊 Enquete no grupo ${grupoNome}: "${enquete.pergunta}"\n` +
        `Vota até ${formatarDiaSemanaData(new Date(enquete.expiraEm))} às ${formatarHora(new Date(enquete.expiraEm))}.\n\n` +
        `Vota aqui:\n${link}`
      : `📊 Enquete encerrada no grupo ${grupoNome}: "${enquete.pergunta}"\n\nConfira o resultado:\n${link}`;
    try {
      await Share.share({ message: msg });
    } catch {
      // cancelou
    }
  }

  return (
    <ModalCartao aberto={aberto} onFechar={fechar}>
      <Text style={[styles.eyebrow, !enquete.ativa && { color: cores.slate400 }]}>
        {enquete.ativa ? "Enquete ativa" : "Enquete encerrada"}
      </Text>

      {editando ? (
        <View style={styles.editLinha}>
          <TextInput
            style={styles.editInput}
            value={perguntaEdit}
            onChangeText={setPerguntaEdit}
            editable={!salvandoPergunta}
            autoFocus
          />
          <Pressable onPress={() => void salvarPergunta()} disabled={salvandoPergunta}>
            <Check size={18} color="#10b981" />
          </Pressable>
          <Pressable onPress={() => setEditando(false)} disabled={salvandoPergunta}>
            <X size={16} color={cores.slate400} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.perguntaLinha}>
          <Text style={styles.pergunta}>{enquete.pergunta}</Text>
          {podeEditar && (
            <Pressable
              hitSlop={8}
              onPress={() => {
                setPerguntaEdit(enquete.pergunta);
                setErroPergunta(null);
                setEditando(true);
              }}
            >
              <Pencil size={15} color={cores.slate400} />
            </Pressable>
          )}
        </View>
      )}
      {erroPergunta ? <Text style={styles.erro}>{erroPergunta}</Text> : null}

      <Text style={styles.meta}>
        Criada por {enquete.criadoPorNome} · {enquete.totalVotos}{" "}
        {enquete.totalVotos === 1 ? "voto" : "votos"}
      </Text>

      {!enquete.anonima && (
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, aba === "votacao" && styles.tabAtiva]}
            onPress={() => setAba("votacao")}
          >
            <Text style={[styles.tabTexto, aba === "votacao" && styles.tabTextoAtivo]}>Votação</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, aba === "votos" && styles.tabAtiva]}
            onPress={() => void abrirVotos()}
          >
            <Text style={[styles.tabTexto, aba === "votos" && styles.tabTextoAtivo]}>Votos</Text>
          </Pressable>
        </View>
      )}

      {aba === "votacao" || enquete.anonima ? (
        <View style={styles.opcoes}>
          {enquete.opcoes.map((o) => {
            const pct = enquete.totalVotos > 0 ? Math.round((o.votos / enquete.totalVotos) * 100) : 0;
            return (
              <Pressable
                key={o.id}
                style={[styles.opcao, o.votueiEu && styles.opcaoVotada]}
                onPress={() => void handleVotar(o.id)}
                disabled={!enquete.ativa || votando}
              >
                <View style={[styles.barra, { width: `${pct}%` }]} />
                <View style={styles.opcaoLinha}>
                  {o.votueiEu ? <Check size={13} color={cores.teal} /> : null}
                  <Text style={styles.opcaoTexto} numberOfLines={1}>
                    {o.texto}
                  </Text>
                  <Text style={styles.opcaoPct}>
                    {pct}% · {o.votos}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.votosBox}>
          {carregandoVotantes ? (
            <ActivityIndicator color={cores.teal} />
          ) : erroVotantes ? (
            <Text style={styles.erro}>{erroVotantes}</Text>
          ) : (
            <ScrollView style={{ maxHeight: 200 }}>
              {(() => {
                const lista = enquete.opcoes.flatMap((o) =>
                  (votantes?.[o.id] ?? []).map((v) => ({ ...v, opcaoTexto: o.texto }))
                );
                if (lista.length === 0)
                  return <Text style={styles.meta}>Ninguém votou ainda.</Text>;
                return lista.map((v) => (
                  <View key={v.jogadorId + v.opcaoTexto} style={styles.votoLinha}>
                    <Text style={styles.votoNome} numberOfLines={1}>
                      {v.nome}
                    </Text>
                    <Text style={styles.votoOpcao} numberOfLines={1}>
                      {v.opcaoTexto}
                    </Text>
                  </View>
                ));
              })()}
            </ScrollView>
          )}
        </View>
      )}

      <View style={styles.prazoLinha}>
        <Clock size={13} color={cores.slate400} />
        <Text style={styles.prazo}>
          {enquete.ativa ? "Encerra" : "Encerrou"}{" "}
          {formatarDiaSemanaData(new Date(enquete.expiraEm))} às{" "}
          {formatarHora(new Date(enquete.expiraEm))}
        </Text>
      </View>

      {erroVoto ? <Text style={styles.erro}>{erroVoto}</Text> : null}

      <Pressable style={styles.compartilhar} onPress={() => void compartilhar()}>
        <Share2 size={16} color={cores.dark} />
        <Text style={styles.compartilharTexto}>Compartilhar</Text>
      </Pressable>
    </ModalCartao>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  perguntaLinha: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  pergunta: { flex: 1, fontSize: 18, fontWeight: "700", color: cores.branco },
  editLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  editInput: {
    flex: 1,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: "700",
    color: cores.branco,
  },
  meta: { fontSize: 13, color: cores.slate400 },
  tabs: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: cores.superficieSutil,
    borderRadius: raio.campo,
    padding: 3,
  },
  tab: { flex: 1, paddingVertical: 6, borderRadius: 6, alignItems: "center" },
  tabAtiva: { backgroundColor: cores.teal },
  tabTexto: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: cores.slate400,
    textTransform: "uppercase",
  },
  tabTextoAtivo: { color: cores.dark },
  opcoes: { gap: 8 },
  opcao: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: cores.superficieSutil,
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: "hidden",
  },
  opcaoVotada: { borderColor: cores.teal, backgroundColor: cores.avisoFundo },
  barra: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(31,179,163,0.12)",
  },
  opcaoLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  opcaoTexto: { flex: 1, fontSize: 14, color: cores.branco },
  opcaoPct: { fontSize: 12, color: cores.slate400 },
  votosBox: { minHeight: 60, justifyContent: "center" },
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
  votoOpcao: {
    fontSize: 11,
    color: cores.slate400,
    backgroundColor: cores.superficieSutil,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    maxWidth: 130,
  },
  prazoLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  prazo: { fontSize: 13, color: cores.slate400 },
  erro: { fontSize: 13, color: cores.erroTexto },
  compartilhar: {
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  compartilharTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
});
