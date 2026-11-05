import { useCallback, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { router, useFocusEffect } from "expo-router";

import { buscarAvaliacao } from "@/api/avaliacoes";
import type { OpcoesRequisicao } from "@/api/cliente";
import {
  NOTA_MAX,
  NOTA_MIN,
  type EstadoAvaliacao,
} from "@/contrato/avaliacoes";
import { formatarDiaSemanaData, formatarHora } from "@/partidas";
import { ChevronRight, Crown, ThumbsUp } from "@/ui/Icone";
import { Text, FAMILIA_MONO } from "@/ui/Texto";
import { cores, raio } from "@/tema";

// Avaliação pós-partida ("nota da galera") no app: o card do Resultado e a
// bolinha de arrastar da tela de votação. Espelha
// weracha-site/components/avaliacao-galera.tsx.

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

export function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

export function textoFechaEm(iso: string): string {
  const d = new Date(iso);
  return `${formatarDiaSemanaData(d)} às ${formatarHora(d)}`;
}

export function nomeCurto(j: { nome: string; apelido: string | null }): string {
  return j.apelido?.trim() || j.nome.split(" ")[0];
}

// Estado da avaliação de uma partida, buscado pela tela do Resultado e
// repassado pro card e pra pílula. Recarrega ao voltar pra tela (ex.: depois
// de votar). Se falhar (ex.: site antigo sem a rota), fica null e os dois
// somem. Guarda o id junto pra não mostrar o da partida anterior ao trocar de
// data na fileira.
export function useEstadoAvaliacao(
  chamarApi: ChamarApi,
  partidaId: string,
): EstadoAvaliacao | null {
  const [carregado, setCarregado] = useState<{
    id: string;
    estado: EstadoAvaliacao | null;
  } | null>(null);
  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      buscarAvaliacao(chamarApi, partidaId)
        .then((e) => vivo && setCarregado({ id: partidaId, estado: e }))
        .catch(() => vivo && setCarregado({ id: partidaId, estado: null }));
      return () => {
        vivo = false;
      };
    }, [chamarApi, partidaId]),
  );
  return carregado?.id === partidaId ? carregado.estado : null;
}

// Votação aberta e eu já dei nota pra todo mundo (autoavaliação inclusa): o
// card some e fica só a pílula "Avaliou a galera" (Resultado já é carregado).
export function avalieiTodos(estado: EstadoAvaliacao | null): boolean {
  if (!estado || !estado.temSorteio || !estado.aberta || !estado.souJogador) return false;
  return (
    estado.avaliados.every((a) => a.minhaNota !== null) &&
    estado.minhaAutoavaliacao !== null
  );
}

// Pílula na fileira do topo do Resultado, no lugar do card depois de votar.
export function PilulaAvaliouGalera({ estado }: { estado: EstadoAvaliacao | null }) {
  if (!avalieiTodos(estado)) return null;
  return (
    <View style={styles.pilula}>
      <ThumbsUp size={12} color={cores.zinc500} />
      <Text style={styles.pilulaTexto}>Avaliou a galera</Text>
    </View>
  );
}

// Card no topo do Resultado (partida encerrada): convite/progresso enquanto
// falta alguém, ou a minha nota e o Craque da galera depois de fechar.
export function CardAvaliacaoDaGalera({
  grupoId,
  partidaId,
  estado,
}: {
  grupoId: string;
  partidaId: string;
  estado: EstadoAvaliacao | null;
}) {
  if (!estado || !estado.temSorteio) return null;

  const total = estado.avaliados.length;
  const avaliei = estado.avaliados.filter((a) => a.minhaNota !== null).length;

  // Tudo votado: some (a pílula "Avaliou a galera" assume).
  if (estado.aberta && estado.souJogador) {
    if (avalieiTodos(estado)) return null;
    return (
      <Pressable
        style={[styles.card, styles.cardLaranja]}
        onPress={() =>
          router.push(`/grupos/${grupoId}/partidas/${partidaId}/avaliacao`)
        }
      >
        <ThumbsUp size={20} color={cores.orange} />
        <View style={{ flex: 1 }}>
          <Text style={styles.titulo}>
            {avaliei === 0
              ? "Avalie a galera"
              : `Você avaliou ${avaliei} de ${total}`}
          </Text>
          <Text style={styles.sub}>
            Dê a sua nota de 0 a 100. Fecha {textoFechaEm(estado.fechaEm)}.
          </Text>
        </View>
        <ChevronRight size={16} color={cores.orange} />
      </Pressable>
    );
  }

  // Votação fechada: um card só, com a minha nota (só eu vejo). Sem o mínimo de
  // avaliações (inclui partida de antes da avaliação existir) não mostra nada.
  // Fui o Craque da galera: o card vira laranja com a coroa.
  if (!estado.encerrada) return null;
  const minha = estado.minhaNota;
  if (!minha || minha.media === null) return null;
  const souCraque = estado.craqueDaGalera?.id === estado.meuId;

  return (
    <View style={[styles.card, souCraque ? styles.cardLaranja : styles.cardTeal]}>
      {souCraque ? (
        <Crown size={20} color={cores.orange} />
      ) : (
        <ThumbsUp size={20} color={cores.teal} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.titulo}>
          Sua nota da galera: <Text style={styles.numero}>{minha.media}</Text>{" "}
          <Text style={styles.sub}>
            ({plural(minha.quantidade, "avaliação", "avaliações")})
          </Text>
        </Text>
        <Text style={styles.sub}>
          {souCraque ? "Você foi o craque da galera! " : ""}
          {estado.minhaAutoavaliacao !== null
            ? `Você se deu ${estado.minhaAutoavaliacao} (só você vê essa nota).`
            : "(só você vê essa nota)"}
        </Text>
      </View>
    </View>
  );
}

const TAMANHO_BOLINHA = 46;

// Bolinha de arrastar (adesivo de barra dos Stories): arrasta e solta = voto.
// Toque direto num ponto da barra também vale.
export function BarraDeNota({
  valor,
  onMudar,
  onSoltar,
  desabilitado,
}: {
  valor: number;
  onMudar: (v: number) => void;
  onSoltar: (v: number) => void;
  desabilitado?: boolean;
}) {
  // Largura da barra (onLayout). O `x` do gesto já vem relativo à barra.
  const [largura, setLargura] = useState(1);

  function valorNoPonto(x: number): number {
    const fracao = Math.min(1, Math.max(0, x / largura));
    return Math.round(NOTA_MIN + fracao * (NOTA_MAX - NOTA_MIN));
  }

  // runOnJS: os callbacks rodam no JS (sem worklet), lendo as props do render
  // atual. minDistance 0: tocar num ponto já move a bolinha; soltar confirma.
  const gesto = Gesture.Pan()
    .runOnJS(true)
    .enabled(!desabilitado)
    .minDistance(0)
    .onBegin((e) => onMudar(valorNoPonto(e.x)))
    .onUpdate((e) => onMudar(valorNoPonto(e.x)))
    .onFinalize((e) => onSoltar(valorNoPonto(e.x)));

  const pct = (valor - NOTA_MIN) / (NOTA_MAX - NOTA_MIN);

  return (
    // Raiz própria do gesture-handler (o app não tem uma global; mesmo jeito da
    // FolhaArrastavel).
    <GestureHandlerRootView style={{ width: "100%", gap: 6 }}>
      <GestureDetector gesture={gesto}>
        <View
          onLayout={(e: LayoutChangeEvent) =>
            setLargura(Math.max(1, e.nativeEvent.layout.width))
          }
          style={[styles.trilhoArea, desabilitado && { opacity: 0.6 }]}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Nota de 0 a 100"
          accessibilityValue={{ min: NOTA_MIN, max: NOTA_MAX, now: valor }}
          accessibilityActions={[
            { name: "increment" },
            { name: "decrement" },
            { name: "activate" },
          ]}
          onAccessibilityAction={(e) => {
            if (desabilitado) return;
            if (e.nativeEvent.actionName === "increment")
              onMudar(Math.min(NOTA_MAX, valor + 5));
            if (e.nativeEvent.actionName === "decrement")
              onMudar(Math.max(NOTA_MIN, valor - 5));
            if (e.nativeEvent.actionName === "activate") onSoltar(valor);
          }}
        >
          <View style={styles.trilho} pointerEvents="none">
            <View style={[styles.faixa, { backgroundColor: "#ef4444" }]} />
            <View style={[styles.faixa, { backgroundColor: cores.ambar }]} />
            <View style={[styles.faixa, { backgroundColor: cores.teal }]} />
          </View>
          <View
            pointerEvents="none"
            style={[
              styles.bolinha,
              { left: `${pct * 100}%`, marginLeft: -TAMANHO_BOLINHA / 2 },
            ]}
          >
            <Text style={styles.bolinhaTexto}>{valor}</Text>
          </View>
        </View>
      </GestureDetector>
      <View style={styles.extremos}>
        <Text style={styles.extremoTexto}>{NOTA_MIN}</Text>
        <Text style={styles.extremoTexto}>{NOTA_MAX}</Text>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: raio.campo,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  cardLaranja: {
    borderColor: cores.laranjaBorda,
    backgroundColor: cores.laranjaFundo,
  },
  pilula: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(113, 113, 122, 0.15)",
  },
  pilulaTexto: { fontSize: 12, color: cores.zinc500 },
  cardTeal: {
    borderColor: cores.avisoBorda,
    backgroundColor: cores.avisoFundo,
  },
  titulo: { fontSize: 14, fontWeight: "600", color: cores.branco },
  sub: { fontSize: 12, fontWeight: "400", color: cores.slate400 },
  numero: {
    fontFamily: FAMILIA_MONO,
    fontSize: 16,
    fontWeight: "700",
    color: cores.branco,
  },

  trilhoArea: { height: 56, justifyContent: "center" },
  trilho: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
  },
  faixa: { flex: 1 },
  bolinha: {
    position: "absolute",
    width: TAMANHO_BOLINHA,
    height: TAMANHO_BOLINHA,
    borderRadius: TAMANHO_BOLINHA / 2,
    borderWidth: 4,
    borderColor: cores.dark,
    backgroundColor: cores.branco,
    alignItems: "center",
    justifyContent: "center",
  },
  bolinhaTexto: {
    fontFamily: FAMILIA_MONO,
    fontSize: 14,
    fontWeight: "700",
    color: cores.dark,
  },
  extremos: { flexDirection: "row", justifyContent: "space-between" },
  extremoTexto: {
    fontFamily: FAMILIA_MONO,
    fontSize: 12,
    color: cores.slate500,
  },
});
