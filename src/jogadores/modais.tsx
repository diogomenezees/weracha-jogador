import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { buscarPerfilJogador } from "@/api/jogadores";
import { ModalCartao } from "@/grupo/modais";
import { mensagemDoErro } from "@/mensagens-erro";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { cores, raio } from "@/tema";
import type { JogadorDoGrupo, PerfilJogador, PosicaoEsporte } from "@/contrato/tipos";

type ChamarApi = <T>(
  caminho: string,
  opcoes?: import("@/api/cliente").OpcoesRequisicao
) => Promise<T>;

// ---- Editar score --------------------------------------------------------
export function ModalScore({
  aberto,
  nome,
  scoreAtual,
  salvando,
  erro,
  onSalvar,
  onFechar,
}: {
  aberto: boolean;
  nome: string;
  scoreAtual: number;
  salvando: boolean;
  erro: string | null;
  onSalvar: (score: number) => void;
  onFechar: () => void;
}) {
  // Renderizado só quando aberto (`{scoreDe && <ModalScore .../>}` no parent),
  // então remonta a cada abertura e o valor inicial já é o certo.
  const [valor, setValor] = useState(scoreAtual);

  return (
    <ModalCartao aberto={aberto} onFechar={onFechar}>
      <Text style={styles.eyebrow}>Score</Text>
      <Text style={styles.titulo}>Score de {nome}</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.stepBtn} onPress={() => setValor((v) => Math.max(0, v - 1))}>
          <Text style={styles.stepBtnTexto}>−</Text>
        </Pressable>
        <Text style={styles.stepValor}>{valor}</Text>
        <Pressable style={styles.stepBtn} onPress={() => setValor((v) => Math.min(100, v + 1))}>
          <Text style={styles.stepBtnTexto}>+</Text>
        </Pressable>
      </View>
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      <View style={styles.acoes}>
        <Pressable style={styles.btnSec} onPress={onFechar} disabled={salvando}>
          <Text style={styles.btnSecTexto}>Cancelar</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPri, salvando && styles.inativo]}
          onPress={() => onSalvar(valor)}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator color={cores.dark} />
          ) : (
            <Text style={styles.btnPriTexto}>Salvar</Text>
          )}
        </Pressable>
      </View>
    </ModalCartao>
  );
}

// ---- Editar posição ----------------------------------------------------
export function ModalPosicao({
  aberto,
  nome,
  posicaoAtualId,
  posicoes,
  salvando,
  erro,
  onSalvar,
  onFechar,
}: {
  aberto: boolean;
  nome: string;
  posicaoAtualId: string | null;
  posicoes: PosicaoEsporte[];
  salvando: boolean;
  erro: string | null;
  onSalvar: (posicaoId: string | null) => void;
  onFechar: () => void;
}) {
  return (
    <ModalCartao aberto={aberto} onFechar={onFechar}>
      <Text style={styles.eyebrow}>Posição</Text>
      <Text style={styles.titulo}>Posição de {nome}</Text>
      <ScrollView style={{ maxHeight: 260 }}>
        <Pressable
          style={[styles.opcao, posicaoAtualId === null && styles.opcaoAtiva]}
          onPress={() => onSalvar(null)}
          disabled={salvando}
        >
          <Text style={styles.opcaoTexto}>Sem posição</Text>
        </Pressable>
        {posicoes.map((p) => (
          <Pressable
            key={p.id}
            style={[styles.opcao, posicaoAtualId === p.id && styles.opcaoAtiva]}
            onPress={() => onSalvar(p.id)}
            disabled={salvando}
          >
            <Text style={styles.opcaoTexto}>{p.nome}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      {salvando ? <ActivityIndicator color={cores.teal} /> : null}
    </ModalCartao>
  );
}

// ---- Perfil resumo ---------------------------------------------------------
export function ModalPerfil({
  aberto,
  chamarApi,
  grupoId,
  jogadorId,
  onFechar,
}: {
  aberto: boolean;
  chamarApi: ChamarApi;
  grupoId: string;
  jogadorId: string | null;
  onFechar: () => void;
}) {
  // Remontado por `key={perfilId}` no parent, então os states nascem limpos a
  // cada abertura e o effect só busca (sem setState síncrono).
  const [perfil, setPerfil] = useState<PerfilJogador | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto || !jogadorId) return;
    let vivo = true;
    buscarPerfilJogador(chamarApi, grupoId, jogadorId)
      .then((p) => vivo && setPerfil(p))
      .catch((e) => vivo && setErro(mensagemDoErro(e)));
    return () => {
      vivo = false;
    };
  }, [aberto, jogadorId, grupoId, chamarApi]);

  return (
    <ModalCartao aberto={aberto} onFechar={onFechar}>
      {erro ? (
        <Text style={styles.erro}>{erro}</Text>
      ) : !perfil ? (
        <ActivityIndicator color={cores.teal} />
      ) : (
        <>
          <View style={styles.perfilTopo}>
            <AvatarJogador id={perfil.id} nome={perfil.nome} fotoUrl={perfil.fotoUrl} tamanho={52} />
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo}>{perfil.nome}</Text>
              {perfil.apelido ? <Text style={styles.meta}>{perfil.apelido}</Text> : null}
            </View>
          </View>
          <Text style={styles.meta}>📞 {perfil.telefone}</Text>
          <View style={styles.statsLinha}>
            <Stat n={perfil.totalGrupos} label="grupos" />
            <Stat n={perfil.totalPartidas} label="partidas" />
            <Stat n={perfil.totalGols} label="gols" />
          </View>
        </>
      )}
    </ModalCartao>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statL}>{label}</Text>
    </View>
  );
}

// ---- Transferir dono -----------------------------------------------------
export function ModalTransferirDono({
  aberto,
  candidatos,
  selId,
  onSelId,
  salvando,
  erro,
  onConfirmar,
  onFechar,
}: {
  aberto: boolean;
  candidatos: JogadorDoGrupo[];
  selId: string | null;
  onSelId: (id: string | null) => void;
  salvando: boolean;
  erro: string | null;
  onConfirmar: (novoDonoId: string) => void;
  onFechar: () => void;
}) {
  const setSelId = onSelId;

  return (
    <ModalCartao aberto={aberto} onFechar={onFechar}>
      <Text style={styles.eyebrow}>Mudar de dono</Text>
      <Text style={styles.titulo}>Passar o grupo pra quem?</Text>
      <Text style={styles.meta}>Irreversível por aqui. Você continua admin.</Text>
      {candidatos.length === 0 ? (
        <Text style={styles.meta}>
          Não há outro admin no grupo. Promova alguém a admin antes de transferir.
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 220 }}>
          {candidatos.map((j) => (
            <Pressable
              key={j.id}
              style={[styles.candidato, selId === j.id && styles.opcaoAtiva]}
              onPress={() => setSelId(j.id)}
            >
              <AvatarJogador id={j.id} nome={j.nome} fotoUrl={j.fotoUrl} tamanho={32} />
              <Text style={styles.opcaoTexto}>{j.nome}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      <View style={styles.acoes}>
        <Pressable style={styles.btnSec} onPress={onFechar} disabled={salvando}>
          <Text style={styles.btnSecTexto}>Cancelar</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPri, (!selId || salvando) && styles.inativo]}
          onPress={() => selId && onConfirmar(selId)}
          disabled={!selId || salvando}
        >
          {salvando ? (
            <ActivityIndicator color={cores.dark} />
          ) : (
            <Text style={styles.btnPriTexto}>Transferir</Text>
          )}
        </Pressable>
      </View>
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
  titulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  meta: { fontSize: 13, color: cores.slate400 },
  erro: { fontSize: 13, color: cores.erroTexto },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    overflow: "hidden",
  },
  stepBtn: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  stepBtnTexto: { fontSize: 24, color: cores.teal },
  stepValor: { flex: 1, textAlign: "center", fontSize: 20, fontWeight: "700", color: cores.branco },
  opcao: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: raio.campo,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: cores.superficieSutil,
  },
  opcaoAtiva: { borderColor: cores.teal, backgroundColor: cores.avisoFundo },
  opcaoTexto: { fontSize: 15, color: cores.branco },
  perfilTopo: { flexDirection: "row", alignItems: "center", gap: 12 },
  statsLinha: { flexDirection: "row", gap: 10, marginTop: 4 },
  stat: {
    flex: 1,
    alignItems: "center",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    paddingVertical: 10,
  },
  statN: { fontSize: 18, fontWeight: "700", color: cores.branco },
  statL: { fontSize: 11, color: cores.slate400, textTransform: "uppercase", letterSpacing: 0.5 },
  candidato: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "transparent",
    marginBottom: 4,
  },
  acoes: { flexDirection: "row", gap: 10, marginTop: 4 },
  btnSec: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecTexto: { fontSize: 15, fontWeight: "600", color: cores.branco },
  btnPri: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPriTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
  inativo: { opacity: 0.5 },
});
