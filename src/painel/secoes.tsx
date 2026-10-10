import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { Text, FAMILIA_MONO } from "@/ui/Texto";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { SeloPapel } from "@/ui/SeloPapel";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Goal,
  MapPin,
  Medal,
  MessageCircle,
  Shuffle,
  Star,
  Target,
  TriangleAlert,
  Trophy,
  Users,
  Video,
  Zap,
  type LucideIcon,
} from "@/ui/Icone";
import { ehHoje, formatarDataPartida } from "@/formato";
import { abreviarDiaSemana, formatarDiaSemanaData, formatarHora } from "@/partidas";
import { cores, raio } from "@/tema";
import type {
  AtividadeRecentePainel,
  DestaquePainel,
  DestaquesPainel,
  GrupoPainel,
  ProximoJogoPainel,
  UltimoResultadoPainel,
} from "@/contrato/tipos";

// Seções do /painel com grupo. Espelha weracha-site/app/painel/page.tsx:
// toda seção = TituloSecao (fora da caixa, sempre igual) + um formato:
//   • destaque  — só o Próximo jogo (card com borda esquerda teal);
//   • carrossel — Ações rápidas e Destaques (cards soltos, rolagem horizontal
//                 cortada na margem da tela);
//   • lista     — Atividades recentes (uma caixa, linhas com divisória);
//   • cards     — Seus grupos (um card por grupo, com abas Ativos/Aguardando).
// Cor: teal = estrutura/informação; laranja = "agora"/ação; âmbar = alerta.

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

function formatarDiaMes(data: Date): string {
  return `${String(data.getDate()).padStart(2, "0")}/${String(data.getMonth() + 1).padStart(2, "0")}`;
}

// "há 5 min", "há 3 h", "ontem", "12/09" — relativo ao carregamento da tela.
function tempoDesde(iso: string, agora: number): string {
  const data = new Date(iso);
  const min = Math.floor((agora - data.getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `há ${horas} h`;
  if (horas < 48) return "ontem";
  return formatarDiaMes(data);
}

function TituloSecao({
  Icone,
  titulo,
  lateral,
}: {
  Icone: LucideIcon;
  titulo: string;
  // Selo opcional alinhado à direita do título (ex.: "Check-in aberto").
  lateral?: ReactNode;
}) {
  return (
    <View style={styles.tituloSecao}>
      <View style={styles.tituloSecaoEsq}>
        <Icone size={16} color={cores.teal} />
        <Text style={styles.tituloSecaoTexto}>{titulo}</Text>
      </View>
      {lateral}
    </View>
  );
}

function Carrossel({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carrossel}
    >
      {children}
    </ScrollView>
  );
}

// ── Próximo jogo ─────────────────────────────────────────────────────────────

export function ProximoJogo({ jogo, agora }: { jogo: ProximoJogoPainel; agora: number }) {
  const data = new Date(jogo.data);
  const hoje = ehHoje(data);
  const abre = new Date(jogo.checkinAbreEm);
  const checkinAberto = agora >= abre.getTime() && agora <= new Date(jogo.checkinFechaEm).getTime();
  const antesDeAbrir = agora < abre.getTime();
  const quandoAbre = ehHoje(abre)
    ? `às ${formatarHora(abre)}`
    : `${abreviarDiaSemana(abre.getDay())} ${formatarHora(abre)}`;

  const selo = checkinAberto ? (
    <View style={[styles.seloTitulo, styles.seloAberto]}>
      <View style={styles.pontoTeal} />
      <Text style={[styles.seloTituloTexto, { color: cores.teal }]}>Check-in aberto</Text>
    </View>
  ) : antesDeAbrir ? (
    <View style={[styles.seloTitulo, styles.seloContorno]}>
      <Text style={[styles.seloTituloTexto, { color: cores.slate400 }]}>
        Check-in abre {quandoAbre}
      </Text>
    </View>
  ) : null;

  return (
    <View>
      <TituloSecao Icone={CalendarDays} titulo="Próximo jogo" lateral={selo} />
      <View style={styles.destaque}>
        <Pressable style={styles.linhaGrupo} onPress={() => router.push(`/grupos/${jogo.grupoId}`)}>
          <View style={styles.flex1}>
            <Text style={styles.destaqueNome} numberOfLines={1}>
              {jogo.grupoNome}
            </Text>
            <Text style={styles.destaqueSub}>
              {jogo.esporte} · {jogo.tipo === "RECORRENTE" ? "Semanal" : "Avulso"}
            </Text>
          </View>
          <ChevronRight size={20} color={cores.slate500} />
        </Pressable>

        <View style={styles.infos}>
          <View style={styles.info}>
            <Calendar size={16} color={hoje ? cores.orange : cores.slate400} />
            <Text style={hoje ? styles.infoHoje : styles.infoTexto}>
              {hoje ? "Hoje" : formatarDiaSemanaData(data)}
            </Text>
          </View>
          <View style={styles.info}>
            <Clock size={16} color={cores.slate400} />
            <Text style={styles.infoTexto}>{formatarHora(data)}</Text>
          </View>
          {jogo.quadraNome && (
            <View style={[styles.info, styles.encolhe]}>
              <MapPin size={16} color={cores.slate400} />
              <Text style={[styles.infoTexto, styles.encolhe]} numberOfLines={1}>
                {jogo.quadraNome}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.destaqueRodape}>
          {checkinAberto ? (
            <>
              <View style={styles.info}>
                <Users size={16} color={cores.teal} />
                <Text style={styles.confirmados}>
                  {plural(jogo.confirmados, "confirmado", "confirmados")}
                </Text>
              </View>
              {!jogo.euConfirmado ? (
                <Pressable
                  style={[styles.botao, { backgroundColor: cores.orange }]}
                  onPress={() => router.push(`/grupos/${jogo.grupoId}/partidas/${jogo.partidaId}/checkin`)}
                >
                  <Check size={16} color={cores.dark} />
                  <Text style={[styles.botaoTexto, { color: cores.dark }]}>Fazer check-in</Text>
                </Pressable>
              ) : jogo.temResultado ? (
                <Pressable
                  style={[styles.botao, { backgroundColor: "#ef4444" }]}
                  onPress={() => router.push(`/grupos/${jogo.grupoId}/partidas/${jogo.partidaId}/ao-vivo`)}
                >
                  <View style={styles.pontoBranco} />
                  <Text style={[styles.botaoTexto, { color: cores.branco }]}>Ao vivo</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.botao, { backgroundColor: "#10b981" }]}
                  onPress={() => router.push(`/grupos/${jogo.grupoId}/partidas/${jogo.partidaId}/checkin`)}
                >
                  <Check size={16} color={cores.dark} />
                  <Text style={[styles.botaoTexto, { color: cores.dark }]}>Presença confirmada</Text>
                  <ArrowRight size={16} color={cores.dark} />
                </Pressable>
              )}
            </>
          ) : (
            <Pressable
              style={[styles.botao, styles.botaoContorno]}
              onPress={() => router.push(`/grupos/${jogo.grupoId}`)}
            >
              <Text style={[styles.botaoTexto, styles.botaoContornoTexto]}>Ver grupo</Text>
              <ArrowRight size={16} color={cores.branco} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// ── Ações rápidas ────────────────────────────────────────────────────────────

type AcaoRapida = { titulo: string; subtitulo: string; Icone: LucideIcon; rota: string | null };

// Atalhos pras telas gerais do menu. "Resultados" abre direto o resultado
// mais recente entre todos os grupos; sem nenhum ainda, fica desativado.
export function AcoesRapidas({ ultimoResultado }: { ultimoResultado: UltimoResultadoPainel | null }) {
  const acoes: AcaoRapida[] = [
    {
      titulo: "Resultados",
      subtitulo: ultimoResultado
        ? `Jogo de ${formatarDiaMes(new Date(ultimoResultado.data))}`
        : "Nenhum ainda",
      Icone: Trophy,
      rota: ultimoResultado
        ? `/grupos/${ultimoResultado.grupoId}/partidas/${ultimoResultado.partidaId}/resultado`
        : null,
    },
    { titulo: "Enquetes", subtitulo: "Vote e acompanhe", Icone: BarChart3, rota: "/enquetes" },
    { titulo: "Artilheiros", subtitulo: "Quem mais marcou", Icone: Medal, rota: "/artilheiros" },
    { titulo: "Replays", subtitulo: "Seus gols em vídeo", Icone: Video, rota: "/replays" },
    { titulo: "Sorteio rápido", subtitulo: "Times na hora", Icone: Shuffle, rota: "/sorteio" },
  ];

  return (
    <View>
      <TituloSecao Icone={Zap} titulo="Ações rápidas" />
      <Carrossel>
        {acoes.map(({ titulo, subtitulo, Icone, rota }) => (
          <Pressable
            key={titulo}
            disabled={!rota}
            onPress={() => rota && router.push(rota as never)}
            style={[styles.card, styles.acao, !rota && styles.desativado]}
          >
            <Icone size={20} color={rota ? cores.teal : cores.slate500} />
            <Text style={styles.acaoTitulo}>{titulo}</Text>
            <Text style={styles.acaoSub}>{subtitulo}</Text>
          </Pressable>
        ))}
      </Carrossel>
    </View>
  );
}

// ── Destaques dos grupos ─────────────────────────────────────────────────────

type CardDestaque = {
  rotulo: string;
  Icone: LucideIcon;
  destaque: DestaquePainel;
  valor: string;
  detalhe: string;
};

// Um jogador por métrica, somando todos os grupos (cálculo no servidor).
// Métrica sem ninguém qualificado some; sem nenhuma, a seção inteira some.
export function DestaquesDosGrupos({ destaques }: { destaques: DestaquesPainel }) {
  const cards: CardDestaque[] = [];
  if (destaques.artilheiro) {
    const d = destaques.artilheiro;
    cards.push({
      rotulo: "Artilheiro",
      Icone: Goal,
      destaque: d,
      valor: plural(d.gols, "gol", "gols"),
      detalhe: `em ${plural(d.jogos, "jogo", "jogos")}`,
    });
  }
  if (destaques.melhorConversao) {
    const d = destaques.melhorConversao;
    cards.push({
      rotulo: "Melhor média",
      Icone: Target,
      destaque: d,
      valor: `${(d.gols / d.jogos).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} gol/jogo`,
      detalhe: `${plural(d.gols, "gol", "gols")} em ${plural(d.jogos, "jogo", "jogos")}`,
    });
  }
  if (destaques.maisPresente) {
    const d = destaques.maisPresente;
    cards.push({
      rotulo: "Mais presente",
      Icone: CalendarCheck,
      destaque: d,
      valor: plural(d.jogos, "jogo", "jogos"),
      detalhe: plural(d.gols, "gol", "gols"),
    });
  }
  if (cards.length === 0) return null;

  return (
    <View>
      <TituloSecao Icone={Star} titulo="Destaques dos grupos" />
      <Carrossel>
        {cards.map(({ rotulo, Icone, destaque, valor, detalhe }) => {
          const j = destaque.jogador;
          return (
            <View key={rotulo} style={[styles.card, styles.cardDestaque]}>
              <View style={styles.info}>
                <Icone size={14} color={cores.teal} />
                <Text style={styles.destaqueRotulo}>{rotulo}</Text>
              </View>
              <View style={styles.linhaAvatar}>
                <AvatarJogador id={j.id} nome={j.nome} fotoUrl={j.fotoUrl} tamanho={44} />
                <View style={styles.flex1}>
                  <Text style={styles.destaqueJogador} numberOfLines={1}>
                    {j.apelido ?? j.nome}
                  </Text>
                  <Text style={styles.destaqueValor}>{valor}</Text>
                  <Text style={styles.destaqueDetalhe}>{detalhe}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </Carrossel>
    </View>
  );
}

// ── Seus grupos ──────────────────────────────────────────────────────────────

function CardGrupo({ grupo, bloqueado }: { grupo: GrupoPainel; bloqueado: boolean }) {
  const data = grupo.proximaPartida ? new Date(grupo.proximaPartida.data) : null;
  const hoje = data ? ehHoje(data) : false;
  const precisaAtencao = grupo.situacao !== "ATIVO";

  const corpo = (
    <>
      <View style={styles.flex1}>
        <View style={styles.cardGrupoTopo}>
          <View style={[styles.info, styles.encolhe]}>
            <Users size={14} color={cores.branco} />
            <Text style={styles.cardGrupoNome} numberOfLines={1}>
              {grupo.nome}
            </Text>
          </View>
          <SeloPapel papel={grupo.papel} />
        </View>
        <Text style={styles.cardGrupoSub}>
          {grupo.esporte} · {grupo.tipo === "RECORRENTE" ? "Semanal" : "Avulso"}
        </Text>
        {grupo.quadraNome && (
          <View style={[styles.info, styles.margemTopo]}>
            <MapPin size={14} color={cores.slate400} />
            <Text style={[styles.cardGrupoQuadra, styles.encolhe]} numberOfLines={1}>
              {grupo.quadraNome}
            </Text>
          </View>
        )}
        <View style={styles.cardGrupoRodape}>
          {data ? (
            <>
              {hoje ? (
                <View style={styles.hojePill}>
                  <Text style={styles.hojePillTexto}>hoje</Text>
                </View>
              ) : (
                <Calendar size={16} color={cores.orange} />
              )}
              <Text style={hoje ? styles.dataHoje : styles.dataTexto}>
                {hoje ? "" : "Próxima: "}
                {formatarDataPartida(data.toISOString())}
              </Text>
              {grupo.proximaPartida?.checkinDisponivel && (
                <View style={styles.checkin}>
                  <View style={styles.pontoTeal} />
                  <Text style={styles.checkinTexto}>Check-in</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <TriangleAlert size={16} color={cores.ambar} />
              <Text style={styles.atencaoTexto}>
                {grupo.situacao === "AGUARDANDO_RENOVACAO"
                  ? "Aguardando renovação"
                  : "Aguardando novo jogo"}
              </Text>
            </>
          )}
        </View>
      </View>
      <ChevronRight size={20} color={cores.slate500} />
    </>
  );

  const estilo = [styles.cardGrupo, precisaAtencao && styles.cardGrupoAtencao];
  if (bloqueado) return <View style={[estilo, styles.desativado]}>{corpo}</View>;
  return (
    <Pressable style={estilo} onPress={() => router.push(`/grupos/${grupo.id}`)}>
      {corpo}
    </Pressable>
  );
}

// Cards separados, em abas "Ativos" e "Aguardando". Quando só uma das abas
// tem grupo (o caso comum), as abas somem e a lista aparece direto.
export function SeusGrupos({ grupos, bloqueado }: { grupos: GrupoPainel[]; bloqueado: boolean }) {
  const ativos = grupos.filter((g) => g.situacao === "ATIVO");
  const aguardando = grupos.filter((g) => g.situacao !== "ATIVO");
  const comAbas = ativos.length > 0 && aguardando.length > 0;
  const [aba, setAba] = useState<"ativos" | "aguardando">("ativos");
  const abaEfetiva = ativos.length === 0 ? "aguardando" : comAbas ? aba : "ativos";
  const lista = abaEfetiva === "ativos" ? ativos : aguardando;

  return (
    <View>
      <TituloSecao Icone={Users} titulo="Seus grupos" />
      {comAbas && (
        <View style={styles.abas}>
          {(
            [
              ["ativos", "Ativos", ativos.length],
              ["aguardando", "Aguardando", aguardando.length],
            ] as const
          ).map(([valor, rotulo, total]) => {
            const selecionada = abaEfetiva === valor;
            return (
              <Pressable
                key={valor}
                onPress={() => setAba(valor)}
                style={[styles.aba, selecionada && styles.abaSelecionada]}
              >
                <Text style={[styles.abaTexto, selecionada && { color: cores.teal }]}>{rotulo}</Text>
                <View
                  style={[
                    styles.abaContador,
                    valor === "aguardando" && { backgroundColor: cores.ambarFundo },
                  ]}
                >
                  <Text
                    style={[
                      styles.abaContadorTexto,
                      valor === "aguardando" && { color: cores.ambar },
                    ]}
                  >
                    {total}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      <View style={styles.listaGrupos}>
        {lista.map((g) => (
          <CardGrupo key={g.id} grupo={g} bloqueado={bloqueado} />
        ))}
      </View>
      {abaEfetiva === "aguardando" && !bloqueado && (
        <Text style={styles.aviso}>
          Renove ou marque um novo jogo pra continuar jogando com essa galera.
        </Text>
      )}
    </View>
  );
}

// ── Atividades recentes ──────────────────────────────────────────────────────

// Últimos replays comentados (resenha) de todos os grupos. O toque abre a
// resenha do grupo já rolada até o vídeo (?video=), sem abrir a resposta.
export function AtividadesRecentes({
  atividades,
  agora,
}: {
  atividades: AtividadeRecentePainel[];
  agora: number;
}) {
  return (
    <View>
      <TituloSecao Icone={MessageCircle} titulo="Atividades recentes" />
      <View style={styles.lista}>
        {atividades.map((a, i) => {
          const c = a.ultimoComentario;
          const titulo =
            a.tipo === "GOL" ? `Gol de ${a.jogadorNome ?? "jogador"}` : "Lance importante";
          return (
            <Pressable
              key={a.pedidoReplayId}
              style={[styles.linhaLista, i > 0 && styles.divisoria]}
              onPress={() => router.push(`/grupos/${a.grupoId}/resenha?video=${a.pedidoReplayId}`)}
            >
              <AvatarJogador
                nome={c.autorNome}
                fotoUrl={c.bloqueado ? null : c.autorFotoUrl}
                tamanho={36}
              />
              <View style={styles.flex1}>
                <View style={styles.linhaEntre}>
                  <Text style={[styles.atividadeTitulo, styles.encolhe]} numberOfLines={1}>
                    {titulo}
                  </Text>
                  <Text style={styles.atividadeTempo}>{tempoDesde(c.criadoEm, agora)}</Text>
                </View>
                <Text style={styles.atividadeTexto} numberOfLines={1}>
                  {c.bloqueado ? (
                    <Text style={styles.italico}>Comentário de usuário bloqueado</Text>
                  ) : (
                    <>
                      <Text style={styles.atividadeAutor}>{c.autorNome}:</Text> {c.texto}
                    </>
                  )}
                </Text>
                <Text style={styles.atividadeMeta} numberOfLines={1}>
                  {a.grupoNome} · {plural(a.totalComentarios, "comentário", "comentários")}
                </Text>
              </View>
              <ChevronRight size={16} color={cores.slate500} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const CARD = {
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.1)",
  backgroundColor: cores.cardFundo,
} as const;

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  encolhe: { flexShrink: 1, minWidth: 0 },
  margemTopo: { marginTop: 6 },
  linhaEntre: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  info: { flexDirection: "row", alignItems: "center", gap: 6 },
  desativado: { opacity: 0.5 },

  tituloSecao: {
    minHeight: 24,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  tituloSecaoEsq: { flexDirection: "row", alignItems: "center", gap: 6 },
  tituloSecaoTexto: {
    fontFamily: FAMILIA_MONO,
    fontSize: 12,
    letterSpacing: 1,
    color: cores.teal,
    textTransform: "uppercase",
  },
  seloTitulo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 1,
  },
  seloAberto: { backgroundColor: "rgba(31, 179, 163, 0.15)" },
  seloContorno: { borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.15)" },
  seloTituloTexto: {
    fontFamily: FAMILIA_MONO,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  pontoTeal: { width: 6, height: 6, borderRadius: 3, backgroundColor: cores.teal },
  pontoBranco: { width: 6, height: 6, borderRadius: 3, backgroundColor: cores.branco },

  carrossel: { gap: 8 },
  card: CARD,

  // Próximo jogo
  destaque: {
    borderTopRightRadius: raio.card,
    borderBottomRightRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    borderLeftWidth: 3,
    borderLeftColor: cores.teal,
    backgroundColor: cores.cardFundo,
    padding: 16,
  },
  linhaGrupo: { flexDirection: "row", alignItems: "center", gap: 8 },
  destaqueNome: { fontSize: 19, fontWeight: "700", color: cores.branco },
  destaqueSub: { fontSize: 14, color: cores.slate400 },
  infos: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 16, rowGap: 6, marginTop: 12 },
  infoTexto: { fontSize: 14, color: cores.slate300 },
  infoHoje: { fontSize: 14, fontWeight: "600", color: cores.orange },
  destaqueRodape: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    gap: 12,
  },
  confirmados: { fontSize: 14, fontWeight: "600", color: cores.teal },
  botao: {
    height: 44,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  botaoTexto: { fontSize: 14, fontWeight: "600" },
  botaoContorno: { borderWidth: 1, borderColor: "rgba(31, 179, 163, 0.3)" },
  botaoContornoTexto: { color: cores.branco, fontWeight: "500" },

  // Ações rápidas
  acao: { width: 104, alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 12 },
  acaoTitulo: { fontSize: 13, fontWeight: "600", color: cores.branco, textAlign: "center" },
  acaoSub: { fontSize: 11, lineHeight: 15, color: cores.slate400, textAlign: "center" },

  // Destaques
  cardDestaque: { width: 176, padding: 12, gap: 8 },
  destaqueRotulo: { fontSize: 11, fontWeight: "500", color: cores.slate300 },
  linhaAvatar: { flexDirection: "row", alignItems: "center", gap: 10 },
  destaqueJogador: { fontSize: 14, fontWeight: "600", color: cores.branco },
  destaqueValor: { fontSize: 12, fontWeight: "600", color: cores.teal },
  destaqueDetalhe: { fontSize: 11, color: cores.slate500 },

  // Seus grupos
  abas: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  aba: {
    flex: 1,
    height: 32,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  abaSelecionada: { backgroundColor: "rgba(31, 179, 163, 0.15)" },
  abaTexto: { fontSize: 12, fontWeight: "500", color: cores.slate400 },
  abaContador: { borderRadius: 999, paddingHorizontal: 6, backgroundColor: "rgba(255, 255, 255, 0.1)" },
  abaContadorTexto: { fontSize: 10, color: cores.slate300 },
  listaGrupos: { gap: 12 },
  aviso: { marginTop: 12, fontSize: 12, color: cores.slate400 },
  cardGrupo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopRightRadius: raio.card,
    borderBottomRightRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    borderLeftWidth: 3,
    borderLeftColor: cores.teal,
    backgroundColor: cores.cardFundo,
    padding: 14,
  },
  cardGrupoAtencao: { borderLeftColor: cores.ambar },
  cardGrupoTopo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardGrupoNome: { fontSize: 16, fontWeight: "600", color: cores.branco, flexShrink: 1 },
  cardGrupoSub: { fontSize: 14, color: cores.slate400 },
  cardGrupoQuadra: { fontSize: 12, color: cores.slate400 },
  cardGrupoRodape: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  dataTexto: { fontSize: 14, color: cores.slate400 },
  dataHoje: { fontSize: 14, fontWeight: "600", color: cores.branco },
  hojePill: { backgroundColor: cores.orange, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  hojePillTexto: { fontSize: 12, fontWeight: "600", color: cores.dark },
  checkin: { flexDirection: "row", alignItems: "center", gap: 5, marginLeft: "auto" },
  checkinTexto: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: cores.teal,
    textTransform: "uppercase",
  },
  atencaoTexto: { fontSize: 14, fontWeight: "600", color: cores.ambar },

  // Atividades recentes
  lista: {
    overflow: "hidden",
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  linhaLista: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  divisoria: { borderTopWidth: 1, borderTopColor: cores.linhaSutil },
  atividadeTitulo: { fontSize: 14, fontWeight: "600", color: cores.branco },
  atividadeTempo: { fontSize: 11, color: cores.slate500 },
  atividadeTexto: { fontSize: 12, color: cores.slate400 },
  atividadeAutor: { fontSize: 12, color: cores.slate300 },
  italico: { fontSize: 12, fontStyle: "italic", color: cores.slate400 },
  atividadeMeta: { marginTop: 2, fontSize: 11, color: cores.slate500 },
});
