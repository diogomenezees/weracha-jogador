import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { Text, FAMILIA_MONO } from "@/ui/Texto";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { Carrossel } from "@/ui/Carrossel";
import { ModalPerfil } from "@/jogadores/modais";
import { useSessao } from "@/sessao/contexto";
import { SeloPapel } from "@/ui/SeloPapel";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Goal,
  MapPin,
  Medal,
  MessageCircle,
  MessageSquareText,
  Plus,
  Shuffle,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Users,
  Video,
  Zap,
  type LucideIcon,
} from "@/ui/Icone";
import { ehHoje, formatarDataPartida } from "@/formato";
import {
  abreviarDiaSemana,
  formatarContagemRegressiva,
  formatarDiaSemanaData,
  formatarHora,
  nomeDoMes,
} from "@/partidas";
import { cores, raio } from "@/tema";
import type {
  AtividadeRecentePainel,
  JogadorEmPartida,
  DestaquesPainel,
  GrupoPainel,
  MeusIndicadoresPainel,
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
      {/* O card fala do JOGO (quando, onde, check-in); nome/esporte/tipo do grupo
          ficam com "Seus grupos". Mesmo layout do site. */}
      <View style={styles.destaque}>
        <View style={styles.linhaJogo}>
          {/* Folhinha de calendário (laranja quando é hoje). */}
          <View style={[styles.folhinha, hoje && styles.folhinhaHoje]}>
            <Text style={[styles.folhinhaRotulo, { color: hoje ? cores.orange : cores.teal }]}>
              {hoje ? "Hoje" : abreviarDiaSemana(data.getDay())}
            </Text>
            <Text style={styles.folhinhaDia}>{data.getDate()}</Text>
            <Text style={[styles.folhinhaRotulo, { color: hoje ? cores.orange : cores.teal }]}>
              {nomeDoMes(data.getMonth()).slice(0, 3)}
            </Text>
          </View>
          <View style={styles.flex1}>
            <Text style={styles.jogoTitulo} numberOfLines={1}>
              {hoje ? "Hoje" : formatarDiaSemanaData(data).split(",")[0]} às {formatarHora(data)}
            </Text>
            {jogo.quadraNome && (
              <View style={[styles.infoQuebra, styles.margemLinha]}>
                <MapPin size={14} color={cores.slate400} style={styles.iconeLinha20} />
                <Text style={[styles.infoTexto, styles.linha20, styles.encolhe]}>
                  {jogo.quadraNome}
                </Text>
              </View>
            )}
            {/* Quadra e contagem quebram a linha (encolhe) num celular estreito em
                vez de passar por baixo do botão "Grupo"; o ícone fica na 1ª linha. */}
            <View style={[styles.infoQuebra, styles.margemLinha]}>
              <Clock
                size={14}
                color={hoje ? cores.orange : cores.teal}
                style={styles.iconeLinha16}
              />
              <Text
                style={[
                  styles.contagem,
                  styles.linha16,
                  styles.encolhe,
                  { color: hoje ? cores.orange : cores.teal },
                ]}
              >
                {formatarContagemRegressiva(data, new Date(agora))}
              </Text>
            </View>
            {/* Confirmados só com o check-in aberto (antes disso é sempre 0). */}
            {checkinAberto && (
              <View style={[styles.info, styles.margemLinha]}>
                <Users size={14} color={cores.teal} />
                <Text style={styles.confirmados}>
                  {plural(jogo.confirmados, "confirmado", "confirmados")}
                </Text>
              </View>
            )}
          </View>
          {!checkinAberto && (
            // Teal preenchido: chama atenção sem usar o laranja, que fica
            // reservado pro "Fazer check-in" (a troca de cor avisa que abriu).
            <Pressable
              style={styles.botaoGrupo}
              onPress={() => router.push(`/grupos/${jogo.grupoId}`)}
            >
              <Text style={styles.botaoGrupoTexto}>Grupo</Text>
              <ChevronRight size={14} color={cores.dark} />
            </Pressable>
          )}
        </View>

        {/* Com o check-in aberto o card ganha o rodapé com o botão de 3 estados. */}
        {checkinAberto && (
          <View style={styles.destaqueRodape}>
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
          </View>
        )}
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
  jogador: JogadorEmPartida;
  valor: string;
  detalhe: string;
  // Toque: perfil do jogador (modal, pelo grupo onde ele mais aparece) ou, no
  // "Gol mais comentado", o vídeo na resenha do grupo.
  acao: { tipo: "perfil"; grupoId: string } | { tipo: "video"; grupoId: string; pedidoReplayId: string };
};

// ── Meus indicadores ─────────────────────────────────────────────────────────

// Os números do próprio jogador (geral, todos os grupos), enxutos de propósito.
// O card inteiro leva pra /estatisticas, onde ficam os filtros de grupo e mês.
// Espelha MeusIndicadores de weracha-site/app/painel/page.tsx.
export function MeusIndicadores({ indicadores }: { indicadores: MeusIndicadoresPainel }) {
  const ultimo = indicadores.ultimoJogo;
  const comparacao =
    ultimo && ultimo.mediaAntes !== null
      ? ultimo.gols > ultimo.mediaAntes
        ? "acima"
        : ultimo.gols < ultimo.mediaAntes
          ? "abaixo"
          : "na"
      : null;
  const seq = indicadores.sequencia;
  const maxGols = Math.max(1, ...indicadores.ultimosGols);
  const ALTURA_BARRAS = 56;

  return (
    <View>
      <TituloSecao
        Icone={Activity}
        titulo="Meus indicadores"
        lateral={
          <Pressable
            hitSlop={8}
            style={styles.info}
            onPress={() => router.push("/indicadores")}
          >
            <Text style={styles.verTudo}>Ver tudo</Text>
            <ChevronRight size={14} color={cores.slate400} />
          </Pressable>
        }
      />
      <Pressable
        style={({ pressed }) => [styles.indicadores, pressed && styles.indicadoresPressionado]}
        onPress={() => router.push("/indicadores")}
      >
        <View style={styles.indicadoresTopo}>
          <View style={styles.encolhe}>
            <View style={styles.numeroLinha}>
              <Text style={styles.numeroGrande}>{indicadores.golsNoMes}</Text>
              <Text style={styles.numeroUnidade}>
                {indicadores.golsNoMes === 1 ? "gol" : "gols"}
              </Text>
            </View>
            <Text style={styles.indicadoresSub}>
              em {indicadores.mesRotulo} · {plural(indicadores.jogosNoMes, "jogo", "jogos")}
            </Text>
          </View>
          {/* Mini gráfico: gols dos últimos jogos, o mais recente em laranja. */}
          <View
            style={[styles.miniBarras, { height: ALTURA_BARRAS }]}
            accessible
            accessibilityLabel={`Gols nos últimos ${indicadores.ultimosGols.length} jogos: ${indicadores.ultimosGols.join(", ")}`}
          >
            {indicadores.ultimosGols.map((g, i) => (
              <View
                key={i}
                style={[
                  styles.miniBarra,
                  {
                    height:
                      g === 0 ? 3 : Math.max(0.12, g / maxGols) * ALTURA_BARRAS,
                    backgroundColor:
                      i === indicadores.ultimosGols.length - 1
                        ? cores.orange
                        : "rgba(31, 179, 163, 0.5)",
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.indicadoresChips}>
          {ultimo && (
            <View style={styles.chipIndicador}>
              {comparacao === "acima" ? (
                <TrendingUp size={14} color={cores.verde} />
              ) : comparacao === "abaixo" ? (
                <TrendingDown size={14} color={cores.ambar} />
              ) : (
                <Goal size={14} color={cores.teal} />
              )}
              <Text style={styles.chipIndicadorTexto}>
                Último jogo:{" "}
                <Text style={styles.chipIndicadorForte}>{plural(ultimo.gols, "gol", "gols")}</Text>
                {comparacao && comparacao !== "na" ? (
                  <Text style={styles.chipIndicadorFraco}> ({comparacao} da média)</Text>
                ) : null}
              </Text>
            </View>
          )}
          {seq && seq.tipo === "MARCANDO" && seq.jogos >= 2 ? (
            <View style={[styles.chipIndicador, styles.chipIndicadorLaranja]}>
              <Flame size={14} color={cores.orange} />
              <Text style={[styles.chipIndicadorTexto, styles.chipIndicadorTextoLaranja]}>
                {seq.jogos} jogos seguidos marcando
              </Text>
            </View>
          ) : seq && seq.tipo === "JEJUM" && seq.jogos >= 2 ? (
            <View style={styles.chipIndicador}>
              <Clock size={14} color={cores.slate400} />
              <Text style={styles.chipIndicadorTexto}>{seq.jogos} jogos sem marcar</Text>
            </View>
          ) : (
            <View style={styles.chipIndicador}>
              <Target size={14} color={cores.teal} />
              <Text style={styles.chipIndicadorTexto}>
                {plural(indicadores.golsTotal, "gol", "gols")} em{" "}
                {plural(indicadores.jogosTotal, "jogo", "jogos")}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
}

// Um jogador por métrica, somando todos os grupos (cálculo no servidor).
// Métrica sem ninguém qualificado some; sem nenhuma, a seção inteira some.
export function DestaquesDosGrupos({ destaques }: { destaques: DestaquesPainel }) {
  const cards: CardDestaque[] = [];
  const perfil = (grupoId: string) => ({ tipo: "perfil" as const, grupoId });
  if (destaques.artilheiro) {
    const d = destaques.artilheiro;
    cards.push({
      rotulo: "Artilheiro",
      Icone: Goal,
      jogador: d.jogador,
      valor: plural(d.gols, "gol", "gols"),
      detalhe: `em ${plural(d.jogos, "jogo", "jogos")}`,
      acao: perfil(d.grupoId),
    });
  }
  if (destaques.melhorConversao) {
    const d = destaques.melhorConversao;
    cards.push({
      rotulo: "Melhor média",
      Icone: Target,
      jogador: d.jogador,
      valor: `${(d.gols / d.jogos).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} gol/jogo`,
      detalhe: `${plural(d.gols, "gol", "gols")} em ${plural(d.jogos, "jogo", "jogos")}`,
      acao: perfil(d.grupoId),
    });
  }
  if (destaques.maisPresente) {
    const d = destaques.maisPresente;
    cards.push({
      rotulo: "Mais presente",
      Icone: CalendarCheck,
      jogador: d.jogador,
      valor: plural(d.jogos, "jogo", "jogos"),
      detalhe: plural(d.gols, "gol", "gols"),
      acao: perfil(d.grupoId),
    });
  }
  if (destaques.noiteHistorica) {
    const d = destaques.noiteHistorica;
    cards.push({
      rotulo: "Noite histórica",
      Icone: Flame,
      jogador: d.jogador,
      valor: plural(d.gols, "gol", "gols"),
      detalhe: `em ${formatarDiaMes(new Date(d.data))}`,
      acao: perfil(d.grupoId),
    });
  }
  if (destaques.resenheiro) {
    const d = destaques.resenheiro;
    cards.push({
      rotulo: "Resenheiro",
      Icone: MessageSquareText,
      jogador: d.jogador,
      valor: plural(d.comentarios, "comentário", "comentários"),
      detalhe: "na resenha",
      acao: perfil(d.grupoId),
    });
  }
  if (destaques.golMaisComentado) {
    const d = destaques.golMaisComentado;
    cards.push({
      rotulo: "Gol mais comentado",
      Icone: MessageCircle,
      jogador: d.jogador,
      valor: plural(d.comentarios, "comentário", "comentários"),
      detalhe: `gol de ${formatarDiaMes(new Date(d.data))}`,
      acao: { tipo: "video", grupoId: d.grupoId, pedidoReplayId: d.pedidoReplayId },
    });
  }

  // Toque no card de jogador abre o mesmo modal de perfil das telas do grupo
  // (grupos, partidas e gols).
  const { chamarApi } = useSessao();
  const [aberto, setAberto] = useState<{ grupoId: string; jogadorId: string } | null>(null);

  if (cards.length === 0) return null;

  return (
    <View>
      {/* Os destaques são do mês corrente (cálculo no servidor): o selo deixa
          claro que o placar zera a cada mês. */}
      <TituloSecao
        Icone={Star}
        titulo="Destaques dos grupos"
        lateral={
          <View style={[styles.seloTitulo, styles.seloContorno]}>
            <Text style={[styles.seloTituloTexto, { color: cores.slate400 }]}>
              {nomeDoMes(new Date().getMonth())}
            </Text>
          </View>
        }
      />
      <Carrossel>
        {cards.map(({ rotulo, Icone, jogador: j, valor, detalhe, acao }) => (
          <Pressable
            key={rotulo}
            style={[styles.card, styles.cardDestaque]}
            onPress={() =>
              acao.tipo === "perfil"
                ? setAberto({ grupoId: acao.grupoId, jogadorId: j.id })
                : router.push(`/grupos/${acao.grupoId}/resenha?video=${acao.pedidoReplayId}`)
            }
          >
            <View style={styles.info}>
              <Icone size={14} color={cores.teal} />
              <Text style={styles.destaqueRotulo}>{rotulo}</Text>
            </View>
            <View style={styles.linhaAvatar}>
              <AvatarJogador id={j.id} nome={j.nome} fotoUrl={j.fotoUrl} tamanho={44} />
              <View style={styles.flex1}>
                <Text style={styles.destaqueJogador} numberOfLines={1}>
                  {j.nome}
                </Text>
                <Text style={styles.destaqueValor}>{valor}</Text>
                <Text style={styles.destaqueDetalhe}>{detalhe}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </Carrossel>
      {/* key: remonta a cada jogador, pro modal nascer limpo (ver ModalPerfil). */}
      <ModalPerfil
        key={aberto?.jogadorId ?? "fechado"}
        aberto={aberto !== null}
        chamarApi={chamarApi}
        grupoId={aberto?.grupoId ?? ""}
        jogadorId={aberto?.jogadorId ?? null}
        onFechar={() => setAberto(null)}
      />
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
export function SeusGrupos({
  grupos,
  bloqueado,
  onboardingConcluido,
}: {
  grupos: GrupoPainel[];
  bloqueado: boolean;
  onboardingConcluido: boolean;
}) {
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
      {abaEfetiva === "aguardando" && !bloqueado && (
        <Text style={styles.aviso}>Renove ou crie uma nova partida pra continuar jogando.</Text>
      )}
      <View style={styles.listaGrupos}>
        {lista.map((g) => (
          <CardGrupo key={g.id} grupo={g} bloqueado={bloqueado} />
        ))}
      </View>
      {/* Quem já tem grupo raramente cria outro: o atalho mora aqui, embaixo
          da lista, em vez de ocupar o rodapé fixo (ver Rodape em painel.tsx).
          Quem entrou num grupo por convite e ainda não viu o tour ganha o
          "Começar" (o tour termina na escolha de criar grupo ou sortear). */}
      {!bloqueado && (
        <Pressable
          style={({ pressed }) => [styles.criarGrupo, pressed && styles.criarGrupoPressionado]}
          onPress={() => router.push(onboardingConcluido ? "/criar-grupo" : "/onboarding")}
        >
          <View style={styles.criarGrupoIcone}>
            <Plus size={16} color={cores.orange} />
          </View>
          <View style={styles.flex1}>
            <Text style={styles.criarGrupoTitulo}>
              {onboardingConcluido ? "Criar grupo" : "Começar"}
            </Text>
            <Text style={styles.criarGrupoTexto}>
              {onboardingConcluido
                ? "Organize outro racha e chame a galera."
                : "Veja os dois jeitos de começar o seu racha."}
            </Text>
          </View>
          <ChevronRight size={16} color={cores.orange} />
        </Pressable>
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
  linhaJogo: { flexDirection: "row", alignItems: "center", gap: 12 },
  folhinha: {
    width: 64,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(31, 179, 163, 0.3)",
    backgroundColor: "rgba(31, 179, 163, 0.08)",
  },
  folhinhaHoje: { borderColor: "rgba(242, 140, 30, 0.5)", backgroundColor: "rgba(242, 140, 30, 0.1)" },
  folhinhaRotulo: { fontFamily: FAMILIA_MONO, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  folhinhaDia: { fontSize: 26, lineHeight: 30, fontWeight: "700", color: cores.branco },
  jogoTitulo: { fontSize: 16, fontWeight: "700", color: cores.branco },
  margemLinha: { marginTop: 4 },
  infoTexto: { fontSize: 14, color: cores.slate300 },
  contagem: { fontSize: 12, fontWeight: "500" },
  // Linha de info que pode quebrar: ícone alinhado ao centro da 1ª linha.
  infoQuebra: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  linha20: { lineHeight: 20 },
  iconeLinha20: { marginTop: 3 },
  linha16: { lineHeight: 16 },
  iconeLinha16: { marginTop: 1 },
  botaoGrupo: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: cores.teal,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  botaoGrupoTexto: { fontSize: 12, fontWeight: "600", color: cores.dark },
  destaqueRodape: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    gap: 12,
  },
  confirmados: { fontSize: 12, fontWeight: "600", color: cores.teal },
  botao: {
    height: 44,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  botaoTexto: { fontSize: 14, fontWeight: "600" },

  // Ações rápidas
  acao: { width: 104, alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 12 },
  acaoTitulo: { fontSize: 13, fontWeight: "600", color: cores.branco, textAlign: "center" },
  acaoSub: { fontSize: 11, lineHeight: 15, color: cores.slate400, textAlign: "center" },

  // Meus indicadores
  verTudo: { fontSize: 12, fontWeight: "500", color: cores.slate400 },
  indicadores: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: "rgba(242, 140, 30, 0.25)",
    backgroundColor: "rgba(242, 140, 30, 0.07)",
    padding: 16,
  },
  indicadoresPressionado: { borderColor: "rgba(242, 140, 30, 0.5)" },
  indicadoresTopo: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
  },
  numeroLinha: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  numeroGrande: { fontSize: 48, lineHeight: 52, fontWeight: "700", color: cores.branco },
  numeroUnidade: { fontSize: 14, fontWeight: "600", color: cores.orange },
  indicadoresSub: { marginTop: 4, fontSize: 12, color: cores.slate400 },
  miniBarras: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  miniBarra: { width: 10, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  indicadoresChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  chipIndicador: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  chipIndicadorLaranja: { backgroundColor: "rgba(242, 140, 30, 0.15)" },
  chipIndicadorTexto: { fontSize: 11, color: cores.slate200 },
  chipIndicadorTextoLaranja: { color: cores.orange, fontWeight: "500" },
  chipIndicadorForte: { fontSize: 11, fontWeight: "600", color: cores.slate200 },
  chipIndicadorFraco: { fontSize: 11, color: cores.slate400 },

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
  aviso: { marginBottom: 12, fontSize: 12, color: cores.slate400 },
  criarGrupo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: raio.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(242, 140, 30, 0.4)",
    backgroundColor: "rgba(242, 140, 30, 0.05)",
  },
  criarGrupoPressionado: { backgroundColor: cores.laranjaFundo },
  criarGrupoIcone: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(242, 140, 30, 0.15)",
  },
  criarGrupoTitulo: { fontSize: 14, fontWeight: "600", color: cores.branco },
  criarGrupoTexto: { fontSize: 12, color: cores.slate400 },
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
