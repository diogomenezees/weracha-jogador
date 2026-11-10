import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { router, useFocusEffect, type Href } from "expo-router";

import { buscarAvaliacao } from "@/api/avaliacoes";
import type { OpcoesRequisicao } from "@/api/cliente";
import {
  MINIMO_AVALIACOES_PRA_MEDIA,
  NOTA_MAX,
  NOTA_MIN,
  type EstadoAvaliacao,
} from "@/contrato/avaliacoes";
import { formatarDiaSemanaData, formatarHora } from "@/partidas";
import { AvatarJogador } from "@/ui/AvatarJogador";
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
// card deixa de ser convite e passa a mostrar a minha parcial.
export function avalieiTodos(estado: EstadoAvaliacao | null): boolean {
  if (!estado || !estado.temSorteio || !estado.aberta || !estado.souJogador) return false;
  return (
    estado.avaliados.every((a) => a.minhaNota !== null) &&
    estado.minhaAutoavaliacao !== null
  );
}

// Todos os outros jogadores já me avaliaram: como voto não muda, a nota não muda
// mais até fechar. Aí o texto deixa de dizer "parcial" (sem push; o push segue no
// fechamento das 48h). Critério é "todos me avaliaram", não "todos votaram em
// alguém": quem votou e me pulou ainda pode voltar e me dar nota.
export function notaJaFechadaPraMim(estado: EstadoAvaliacao): boolean {
  const p = estado.minhaNotaParcial;
  const part = estado.participacao;
  return !!p && p.media !== null && !!part && part.total > 0 && p.quantidade >= part.total;
}

// Linha da minha nota enquanto a votação está aberta: "Sua nota parcial: 72" (ou
// "Sua nota final: 72" quando todos já me avaliaram). Abaixo do mínimo a média não
// vem da API: só o aviso do mínimo (hoje 1, então só "Ninguém te avaliou"). Servidor antigo (sem o campo): null.
export function textoNotaParcial(estado: EstadoAvaliacao): string | null {
  const p = estado.minhaNotaParcial;
  if (!p) return null;
  if (p.media !== null) {
    return `${notaJaFechadaPraMim(estado) ? "Sua nota final" : "Sua nota parcial"}: ${p.media}`;
  }
  if (p.quantidade === 0) return "Ninguém te avaliou ainda.";
  return `Sua nota aparece com ${MINIMO_AVALIACOES_PRA_MEDIA} avaliações.`;
}

// "6 jogadores ainda não votaram." Só quem falta (a linha de cima já fala de quem
// me avaliou; "4 de 10 já votaram" ali confundia). Sem contar a mim mesmo (só quem jogou
// recebe `participacao`).
export function textoParticipacao(estado: EstadoAvaliacao): string | null {
  const p = estado.participacao;
  if (!p) return null;
  const faltam = Math.max(0, p.total - p.votaram);
  return faltam === 0
    ? "Todos os jogadores já votaram."
    : faltam === 1
      ? "1 jogador ainda não votou."
      : `${faltam} jogadores ainda não votaram.`;
}

// Craque popular (mais bem avaliado pela galera). "Popular" porque o craque de
// verdade é o artilheiro (decisão de 2026-11-10; antes "Craque da partida").
export function rotuloCraque(parcial: boolean): string {
  return parcial ? "Craque popular (parcial)" : "Craque popular";
}

// Card do craque (de outro jogador) ao lado do meu: só nome e foto, nunca a nota.
// "(parcial)" enquanto a votação está aberta (muda a cada voto). Nome completo
// em destaque e o apelido ao lado, sem destaque.
// Espelha o CardCraque de weracha-site/components/avaliacao-galera.tsx.
// Abre as "Notas da galera" pra quem não jogou, ou pra quem jogou só quando o
// craque sou eu (`href`); senão é só leitura, sem seta.
function CardCraque({
  craque,
  href,
}: {
  craque: NonNullable<EstadoAvaliacao["craque"]>;
  href?: Href;
}) {
  const apelido = craque.apelido?.trim();
  return (
    <Pressable
      style={[styles.card, styles.cardLaranja, styles.cardCraque]}
      disabled={!href}
      onPress={() => href && router.push(href)}
    >
      <AvatarJogador id={craque.id} nome={craque.nome} fotoUrl={craque.fotoUrl} tamanho={32} />
      <View style={{ flex: 1 }}>
        <View style={styles.craqueRotuloLinha}>
          <Crown size={11} color={cores.orange} />
          <Text style={styles.craqueRotulo}>
            {rotuloCraque(craque.parcial)}
          </Text>
        </View>
        <Text style={styles.titulo} numberOfLines={1}>
          {craque.nome}
          {apelido ? <Text style={styles.apelido}> {apelido}</Text> : null}
        </Text>
      </View>
      {href ? <ChevronRight size={16} color={cores.orange} /> : null}
    </Pressable>
  );
}

// Card no topo do Resultado (partida encerrada). Duas peças:
// - o MEU card: pra quem jogou, convite/progresso enquanto falta alguém, a
//   minha parcial depois de votar em todos, ou a minha nota final no fechamento;
//   se EU sou o craque (parcial ou final), ele vira laranja com a coroa; pra quem
//   não jogou, o card de acompanhamento ("A galera está se avaliando");
// - o card do CRAQUE (pra qualquer um do grupo, desde 2026-11-07): nome e foto,
//   parcial durante a votação. Some quando o craque sou eu e meu card já tem a coroa.
// As duas juntas viram um carrossel com espiada (meu card em 90%, arrasta pro
// craque); sozinha, largura inteira. Desde 2026-11-10 os cards levam pra tela "Notas da galera" (o gráfico),
// menos o convite pra votar (abre a votação) e o craque quando não sou eu.
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

  // `craque` é novo; site antigo só manda o legado (e só pro próprio craque).
  const craque = estado.craque ?? null;
  const souCraque = (craque?.id ?? estado.craqueDaGalera?.id) === estado.meuId;

  const hrefNotas = `/grupos/${grupoId}/partidas/${partidaId}/notas` as Href;
  const meu = meuCard(estado, grupoId, partidaId, souCraque, hrefNotas);
  // Meu card com a coroa já diz que o craque sou eu.
  const mostrarCraque = !!craque && !(souCraque && meu?.comCoroa);

  if (!meu && !mostrarCraque) return null;
  if (meu && mostrarCraque) {
    return <CarrosselEspiada itens={[meu.no, <CardCraque key="craque" craque={craque!} href={!estado.souJogador || souCraque ? hrefNotas : undefined} />]} />;
  }
  return meu ? meu.no : <CardCraque craque={craque!} href={!estado.souJogador || souCraque ? hrefNotas : undefined} />;
}

const GAP_CARROSSEL = 8;

// Carrossel com "espiada": cada card em 90% da largura, a pontinha do próximo
// aparece à direita e arrasta pro lado pra ver (meu card → craque). Uma linha de
// altura só (lado a lado em 50/50 quebrava os textos e ficava alto demais).
function CarrosselEspiada({ itens }: { itens: React.ReactNode[] }) {
  const [largura, setLargura] = useState(0);
  const larguraCard = Math.round(largura * 0.9);
  return (
    <View onLayout={(e) => setLargura(e.nativeEvent.layout.width)}>
      {largura > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={larguraCard + GAP_CARROSSEL}
          decelerationRate="fast"
          contentContainerStyle={{ gap: GAP_CARROSSEL }}
        >
          {itens.map((item, i) => (
            <View key={i} style={[styles.itemCarrossel, { width: larguraCard }]}>
              {item}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function meuCard(
  estado: EstadoAvaliacao,
  grupoId: string,
  partidaId: string,
  souCraque: boolean,
  hrefNotas: Href,
): { no: React.ReactNode; comCoroa: boolean } | null {
  if (!estado.souJogador) return cardDeQuemNaoJogou(estado, hrefNotas);

  // Votação aberta e ainda falta gente: convite (ou progresso).
  if (estado.aberta && !avalieiTodos(estado)) {
    const total = estado.avaliados.length;
    const avaliei = estado.avaliados.filter((a) => a.minhaNota !== null).length;
    return {
      comCoroa: false,
      no: (
        <Pressable
          style={[styles.card, styles.cardLaranja, styles.cardCheio]}
          onPress={() => router.push(`/grupos/${grupoId}/partidas/${partidaId}/avaliacao`)}
        >
          <ThumbsUp size={20} color={cores.orange} />
          <View style={{ flex: 1 }}>
            <Text style={styles.titulo}>
              {avaliei === 0 ? "Avalie a galera" : `Você avaliou ${avaliei} de ${total}`}
            </Text>
            <Text style={styles.sub}>
              {/* Uma linha só: sem o "Fecha {data}" (o prazo aparece no fim da votação). */}
              {estado.minhaNotaParcial?.media != null
                ? `Sua nota parcial: ${estado.minhaNotaParcial.media}.`
                : "Dê a sua nota de 0 a 100."}
            </Text>
          </View>
          <ChevronRight size={16} color={cores.orange} />
        </Pressable>
      ),
    };
  }

  // Votação aberta, já votei em todos: a minha parcial.
  if (estado.aberta) {
    const coroa = souCraque && estado.minhaNotaParcial?.media != null;
    return {
      comCoroa: coroa,
      no: (
        <CaixaNota
          href={hrefNotas}
          coroa={coroa}
          titulo={textoNotaParcial(estado) ?? "Você avaliou a galera."}
          auto={estado.minhaAutoavaliacao}
          sub={[coroa ? "Você é o craque popular, por enquanto!" : null, textoParticipacao(estado)]
            .filter(Boolean)
            .join(" ")}
        />
      ),
    };
  }

  // Votação fechada: a minha nota final. Sem o mínimo de avaliações
  // (inclui partida de antes da avaliação existir) não mostra nada.
  const minha = estado.minhaNota;
  if (!estado.encerrada || !minha || minha.media === null) return null;
  return {
    comCoroa: souCraque,
    no: (
      <CaixaNota
        href={hrefNotas}
        coroa={souCraque}
        titulo={`Sua nota final: ${minha.media}`}
        auto={estado.minhaAutoavaliacao}
        sub={souCraque ? "Você foi o craque popular!" : "Veja as notas da galera."}
      />
    ),
  };
}

// Quem é do grupo mas não jogou (desde 2026-11-10): não vota, só acompanha
// quantos já votaram. Toque abre as "Notas da galera" (não a votação, que não é
// dele). Só com a votação aberta: depois de fechar, quem não jogou vê só o craque.
function cardDeQuemNaoJogou(
  estado: EstadoAvaliacao,
  hrefNotas: Href,
): { no: React.ReactNode; comCoroa: boolean } | null {
  const texto = textoAcompanhamento(estado);
  if (!texto) return null;
  return {
    comCoroa: false,
    no: (
      <CaixaNota href={hrefNotas} coroa={false} titulo={texto.titulo} auto={null} sub={texto.sub} />
    ),
  };
}

export function textoAcompanhamento(
  estado: EstadoAvaliacao,
): { titulo: string; sub: string } | null {
  const p = estado.participacao;
  if (!p || p.total === 0) return null;
  const jogadores = plural(p.total, "jogador", "jogadores");
  if (estado.aberta) {
    return {
      titulo: "A galera está se avaliando",
      sub:
        p.votaram === 0
          ? "Ninguém votou ainda."
          : p.votaram >= p.total
            ? "Todos os jogadores já votaram."
            : `${p.votaram} de ${jogadores} já ${p.votaram === 1 ? "votou" : "votaram"}.`,
    };
  }
  // Depois de fechar, quem não jogou não vê a contagem (fica só o craque final).
  return null;
}

// Card da minha nota: teal com joinha, ou laranja com coroa quando sou o craque.
// Nota + selo laranja da autoavaliação na mesma linha (igual o "Valeu!").
// Tocar abre as "Notas da galera".
function CaixaNota({
  href,
  coroa,
  titulo,
  auto,
  sub,
}: {
  href: Href;
  coroa: boolean;
  titulo: string;
  auto: number | null;
  sub: string;
}) {
  return (
    <Pressable
      style={[styles.card, coroa ? styles.cardLaranja : styles.cardTeal, styles.cardCheio]}
      onPress={() => router.push(href)}
    >
      {coroa ? <Crown size={20} color={cores.orange} /> : <ThumbsUp size={20} color={cores.teal} />}
      <View style={{ flex: 1 }}>
        <View style={styles.linhaParcial}>
          <Text style={styles.titulo}>{titulo}</Text>
          {auto !== null && (
            <View style={styles.seloAuto}>
              <Text style={styles.seloAutoTexto}>Você se deu {auto}</Text>
            </View>
          )}
        </View>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      <ChevronRight size={16} color={coroa ? cores.orange : cores.teal} />
    </Pressable>
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
  // Item do carrossel (meu card + craque): o card estica pra mesma altura.
  itemCarrossel: { flexDirection: "row" },
  cardCheio: { flexGrow: 1 },
  cardCraque: { gap: 10, paddingHorizontal: 12, flexGrow: 1 },
  craqueRotuloLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  craqueRotulo: { fontSize: 11, fontWeight: "600", color: cores.orange },
  cardLaranja: {
    borderColor: cores.laranjaBorda,
    backgroundColor: cores.laranjaFundo,
  },
  cardTeal: {
    borderColor: cores.avisoBorda,
    backgroundColor: cores.avisoFundo,
  },
  titulo: { fontSize: 14, fontWeight: "600", color: cores.branco },
  // Apelido do craque ao lado do nome completo, sem destaque.
  apelido: { fontWeight: "400", color: cores.slate400 },
  linhaParcial: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 2 },
  // Selo laranja (cor do ❤) da autoavaliação, igual o da tela "Valeu!".
  seloAuto: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
    backgroundColor: "rgba(242, 140, 30, 0.15)",
  },
  seloAutoTexto: { fontSize: 11, fontWeight: "600", color: cores.orange },
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
