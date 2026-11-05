import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "@/ui/Texto";

import { buscarEnquete, buscarVotantes, editarPergunta, votar } from "@/api/enquetes";
import { ArrowRight, BarChart3, Check, Clock, Pencil, Share2, Users, X } from "@/ui/Icone";
import { ModalCartao } from "@/grupo/modais";
import { Abas } from "@/partida/ui";
import { mensagemDoErro } from "@/mensagens-erro";
import { formatarDiaSemanaData, formatarHora } from "@/partidas";
import { cores, raio } from "@/tema";
import { CorpoEnqueteLivre, ListaRespostasLivres } from "@/enquetes/EnqueteLivre";
import type {
  Enquete,
  EnqueteComGrupo,
  RespondenteEnquete,
  VotanteEnquete,
} from "@/contrato/tipos";

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
  onIrAoGrupo,
  onEnqueteAtualizada,
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
  /** Quando informado, mostra o botão "Ir ao grupo" (tela global de enquetes). */
  onIrAoGrupo?: () => void;
  /** Versão nova da enquete vinda do polling de 3s: o parent troca na lista. */
  onEnqueteAtualizada?: (e: EnqueteComGrupo) => void;
}) {
  const [aba, setAba] = useState<"votacao" | "votos">("votacao");
  const [votantes, setVotantes] = useState<{
    votantes: Record<string, VotanteEnquete[]>;
    respostas: RespondenteEnquete[];
  } | null>(null);
  const [carregandoVotantes, setCarregandoVotantes] = useState(false);
  const [erroVotantes, setErroVotantes] = useState<string | null>(null);
  const [votando, setVotando] = useState(false);
  const [erroVoto, setErroVoto] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [perguntaEdit, setPerguntaEdit] = useState("");
  const [salvandoPergunta, setSalvandoPergunta] = useState(false);
  const [erroPergunta, setErroPergunta] = useState<string | null>(null);

  // Enquanto o modal está aberto numa enquete ativa, busca a versão nova a
  // cada 3s (nuvem crescendo e votos andando ao vivo). Pausa com o app em
  // segundo plano; só avisa o parent quando algo mudou.
  const enqueteId = enquete?.id;
  const enqueteAtiva = enquete?.ativa ?? false;
  const atualRef = useRef(enquete);
  const onAtualizadaRef = useRef(onEnqueteAtualizada);
  useEffect(() => {
    atualRef.current = enquete;
    onAtualizadaRef.current = onEnqueteAtualizada;
  }, [enquete, onEnqueteAtualizada]);
  useEffect(() => {
    if (!aberto || !enqueteId || !enqueteAtiva) return;
    let vivo = true;
    const timer = setInterval(async () => {
      if (AppState.currentState !== "active") return;
      try {
        const fresca = await buscarEnquete(chamarApi, enqueteId);
        const atual = atualRef.current;
        if (!vivo || atual?.id !== fresca.id) return;
        if (assinaturaEnquete(atual) === assinaturaEnquete(fresca)) return;
        onAtualizadaRef.current?.(fresca);
      } catch {
        // Falha de rede numa rodada: tenta de novo na próxima.
      }
    }, 3000);
    return () => {
      vivo = false;
      clearInterval(timer);
    };
  }, [aberto, enqueteId, enqueteAtiva, chamarApi]);

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

  const livre = enquete.tipo === "LIVRE";

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
    const verbo = enquete.tipo === "LIVRE" ? "Responde" : "Vota";
    const msg = enquete.ativa
      ? `📊 Enquete no grupo ${grupoNome}: "${enquete.pergunta}"\n` +
        `${verbo} até ${formatarDiaSemanaData(new Date(enquete.expiraEm))} às ${formatarHora(new Date(enquete.expiraEm))}.\n\n` +
        `${verbo} aqui:\n${link}`
      : `📊 Enquete encerrada no grupo ${grupoNome}: "${enquete.pergunta}"\n\nConfira o resultado:\n${link}`;
    try {
      await Share.share({ message: msg });
    } catch {
      // cancelou
    }
  }

  return (
    <ModalCartao aberto={aberto} onFechar={fechar}>
      <View style={styles.eyebrowLinha}>
        <BarChart3 size={16} color={enquete.ativa ? cores.teal : cores.slate400} />
        <Text style={[styles.eyebrow, !enquete.ativa && { color: cores.slate400 }]}>
          {enquete.ativa ? "Enquete ativa" : "Enquete encerrada"}
        </Text>
      </View>

      <View style={styles.tituloBloco}>
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
      {!editando && grupoNome ? (
        <View style={styles.grupoLinha}>
          <Users size={12} color={cores.slate400} />
          <Text style={styles.grupoNome} numberOfLines={1}>
            {grupoNome}
          </Text>
        </View>
      ) : null}
      </View>
      {erroPergunta ? <Text style={styles.erro}>{erroPergunta}</Text> : null}

      <Text style={styles.meta}>
        Criada por {enquete.criadoPorNome} · {enquete.totalVotos}{" "}
        {livre
          ? enquete.totalVotos === 1
            ? "resposta"
            : "respostas"
          : enquete.totalVotos === 1
            ? "voto"
            : "votos"}
      </Text>

      {!enquete.anonima && (
        // Mesmo componente de abas da tela de Resultado.
        <Abas
          opcoes={[
            { chave: "votacao", rotulo: "Votação" },
            { chave: "votos", rotulo: "Votos" },
          ]}
          valor={aba}
          onChange={(v) => (v === "votos" ? void abrirVotos() : setAba("votacao"))}
        />
      )}

      {(aba === "votacao" || enquete.anonima) && livre ? (
        <CorpoEnqueteLivre
          enquete={enquete}
          souAdmin={souAdmin}
          chamarApi={chamarApi}
          onAtualizar={async () => {
            setVotantes(null);
            await onRecarregar();
          }}
        />
      ) : aba === "votacao" || enquete.anonima ? (
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
              {livre ? (
                <ListaRespostasLivres respostas={votantes?.respostas ?? []} />
              ) : (() => {
                const lista = enquete.opcoes.flatMap((o) =>
                  (votantes?.votantes[o.id] ?? []).map((v) => ({ ...v, opcaoTexto: o.texto }))
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

      <View style={styles.acoes}>
        {onIrAoGrupo ? (
          <Pressable
            style={styles.irAoGrupo}
            onPress={() => {
              fechar();
              onIrAoGrupo();
            }}
          >
            <ArrowRight size={16} color={cores.branco} />
            <Text style={styles.irAoGrupoTexto}>Ir ao grupo</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.compartilhar} onPress={() => void compartilhar()}>
          <Share2 size={16} color={cores.dark} />
          <Text style={styles.compartilharTexto}>Compartilhar</Text>
        </Pressable>
      </View>
    </ModalCartao>
  );
}

// O que muda numa enquete enquanto o modal está aberto.
function assinaturaEnquete(e: Enquete): string {
  return JSON.stringify([e.pergunta, e.ativa, e.totalVotos, e.opcoes, e.nuvem, e.minhaResposta]);
}

const styles = StyleSheet.create({
  eyebrowLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
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
  tituloBloco: { gap: 2 },
  grupoLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  grupoNome: { flexShrink: 1, fontSize: 14, color: cores.slate400 },
  meta: { fontSize: 13, color: cores.slate400 },
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
  acoes: { flexDirection: "row", gap: 8, marginTop: 4 },
  irAoGrupo: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(31,179,163,0.3)",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  irAoGrupoTexto: { fontSize: 15, color: cores.branco },
  compartilhar: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  compartilharTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
});
