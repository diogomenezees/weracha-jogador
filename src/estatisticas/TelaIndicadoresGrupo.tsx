import { useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";

import { Text, FAMILIA_MONO } from "@/ui/Texto";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { ModalPerfil } from "@/jogadores/modais";
import { GraficoGolsPorJogo } from "@/estatisticas/GraficoGolsPorJogo";
import {
  BarChart3,
  CalendarCheck,
  ChevronRight,
  Flame,
  Goal,
  MessageCircle,
  MessageSquareText,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Video,
  Zap,
  type LucideIcon,
} from "@/ui/Icone";
import { formatarMedia } from "@/estatisticas";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import {
  CHAVE_GERAL,
  type DadosIndicadoresDoGrupo,
  type JogadorEmPartida,
} from "@/contrato/tipos";

// Corpo da tela de indicadores do grupo: chips de período (o mês corrente vem
// selecionado), resumo, destaques do grupo (mesmo cálculo do painel), gráfico de
// gols por jogo e repercussão (Beta). Trocar o chip pede o período ao servidor
// (a rota cuida disso). Espelha weracha-site/components/tela-indicadores-grupo.tsx.

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

function formatarDiaMes(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function TituloSecao({
  Icone,
  titulo,
  lateral,
}: {
  Icone: LucideIcon;
  titulo: string;
  lateral?: ReactNode;
}) {
  return (
    <View style={styles.tituloSecao}>
      <Icone size={16} color={cores.teal} />
      <Text style={styles.tituloSecaoTexto}>{titulo}</Text>
      {lateral}
    </View>
  );
}

// Ordem de leitura dos destaques (duas colunas): Fiéis e Revelação, Em alta e
// Noite histórica, Artilheiro e Melhor média, Abre o placar e Primeiro a
// confirmar. Rótulo fora da lista (Resenheiro, Gol mais comentado) vai pro fim,
// na ordem em que entrou.
const ORDEM_DESTAQUES = [
  "Fiéis",
  "Revelação",
  "Em alta",
  "Noite histórica",
  "Artilheiro",
  "Melhor média",
  "Abre o placar",
  "Primeiro a confirmar",
];

function posicaoNaOrdem(rotulo: string): number {
  const i = ORDEM_DESTAQUES.indexOf(rotulo);
  return i < 0 ? ORDEM_DESTAQUES.length : i;
}

type CardDestaque = {
  rotulo: string;
  Icone: LucideIcon;
  // null: card de contagem (Fiéis), sem jogador e sem toque.
  jogador: JogadorEmPartida | null;
  valor: string;
  detalhe: string;
  // Sem rota: abre o perfil do jogador (modal).
  rota?: Href;
};

function GradeDestaques({
  cards,
  onPerfil,
}: {
  cards: CardDestaque[];
  onPerfil: (jogadorId: string) => void;
}) {
  return (
    <View style={styles.grade}>
      {cards.map(({ rotulo, Icone, jogador: j, valor, detalhe, rota }) => (
        <Pressable
          key={rotulo}
          disabled={!j && !rota}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressionado]}
          onPress={() => (rota ? router.push(rota) : j && onPerfil(j.id))}
        >
          <View style={styles.cardRotuloLinha}>
            <Icone size={14} color={cores.teal} />
            <Text style={styles.cardRotulo} numberOfLines={1}>
              {rotulo}
            </Text>
          </View>
          <View style={styles.cardLinha}>
            {j ? (
              <AvatarJogador id={j.id} nome={j.nome} fotoUrl={j.fotoUrl} tamanho={36} />
            ) : (
              <View style={[styles.avatarContagem, { width: 36, height: 36 }]}>
                <Users size={16} color={cores.teal} />
              </View>
            )}
            <View style={styles.flex1}>
              {j ? (
                <Text style={styles.cardNome} numberOfLines={1}>
                  {j.nome}
                </Text>
              ) : null}
              <Text style={[styles.cardValor, !j && styles.cardValorContagem]}>{valor}</Text>
              <Text style={styles.cardDetalhe} numberOfLines={1}>
                {detalhe}
              </Text>
            </View>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export function TelaIndicadoresGrupo({
  dados,
  periodoCarregando,
  aoTrocarPeriodo,
}: {
  dados: DadosIndicadoresDoGrupo;
  periodoCarregando: string | null;
  aoTrocarPeriodo: (periodo: string) => void;
}) {
  const { chamarApi } = useSessao();
  const [perfilAberto, setPerfilAberto] = useState<string | null>(null);
  const grupoId = dados.grupo.id;
  const ehGeral = dados.periodo === CHAVE_GERAL;
  const periodoAtual = dados.periodos.find((p) => p.chave === dados.periodo) ?? dados.periodos[0];
  const nomeDoPeriodo = ehGeral
    ? "desde sempre"
    : `em ${periodoAtual.rotulo.replace(/\/\d\d$/, "").toLowerCase()}`;

  const doPeriodo = ehGeral ? dados.partidas : dados.partidas.filter((p) => p.mes === dados.periodo);
  const jogos = doPeriodo.length;
  const gols = doPeriodo.reduce((s, p) => s + p.gols, 0);
  const presentes = doPeriodo.reduce((s, p) => s + p.presentes, 0);

  const d = dados.destaques;
  const destaquesDeJogo: CardDestaque[] = [];
  if (d.artilheiro)
    destaquesDeJogo.push({
      rotulo: "Artilheiro",
      Icone: Goal,
      jogador: d.artilheiro.jogador,
      valor: plural(d.artilheiro.gols, "gol", "gols"),
      detalhe: `em ${plural(d.artilheiro.jogos, "jogo", "jogos")}`,
    });
  if (d.fieis)
    destaquesDeJogo.push({
      rotulo: "Fiéis",
      Icone: CalendarCheck,
      jogador: null,
      valor: plural(d.fieis.quantidade, "jogador", "jogadores"),
      detalhe: "em todos os jogos",
    });
  if (d.melhorConversao)
    destaquesDeJogo.push({
      rotulo: "Melhor média",
      Icone: Target,
      jogador: d.melhorConversao.jogador,
      valor: `${formatarMedia(d.melhorConversao.gols / d.melhorConversao.jogos)} gol/jogo`,
      detalhe: `${plural(d.melhorConversao.gols, "gol", "gols")} em ${plural(d.melhorConversao.jogos, "jogo", "jogos")}`,
    });
  if (d.noiteHistorica)
    destaquesDeJogo.push({
      rotulo: "Noite histórica",
      Icone: Flame,
      jogador: d.noiteHistorica.jogador,
      valor: plural(d.noiteHistorica.gols, "gol", "gols"),
      detalhe: `em ${formatarDiaMes(d.noiteHistorica.data)}`,
      rota: `/grupos/${grupoId}/partidas/${d.noiteHistorica.partidaId}/resultado`,
    });
  if (d.revelacao)
    destaquesDeJogo.push({
      rotulo: "Revelação",
      Icone: Sparkles,
      jogador: d.revelacao.jogador,
      valor: plural(d.revelacao.gols, "gol", "gols"),
      detalhe: `estreou no mês, ${plural(d.revelacao.jogos, "jogo", "jogos")}`,
    });
  if (d.emAlta)
    destaquesDeJogo.push({
      rotulo: "Em alta",
      Icone: TrendingUp,
      jogador: d.emAlta.jogador,
      valor: `+${plural(d.emAlta.gols - d.emAlta.golsMesAnterior, "gol", "gols")}`,
      detalhe: `de ${d.emAlta.golsMesAnterior} para ${d.emAlta.gols} no mês`,
    });
  if (d.abreOPlacar)
    destaquesDeJogo.push({
      rotulo: "Abre o placar",
      Icone: Zap,
      jogador: d.abreOPlacar.jogador,
      valor: plural(d.abreOPlacar.vezes, "vez", "vezes"),
      detalhe: "fez o 1º gol do jogo",
    });
  if (d.primeiroAConfirmar)
    destaquesDeJogo.push({
      rotulo: "Primeiro a confirmar",
      Icone: UserCheck,
      jogador: d.primeiroAConfirmar.jogador,
      valor: plural(d.primeiroAConfirmar.vezes, "vez", "vezes"),
      detalhe: "1º no check-in",
    });

  destaquesDeJogo.sort((a, b) => posicaoNaOrdem(a.rotulo) - posicaoNaOrdem(b.rotulo));

  const destaquesDaResenha: CardDestaque[] = [];
  if (d.resenheiro)
    destaquesDaResenha.push({
      rotulo: "Resenheiro",
      Icone: MessageSquareText,
      jogador: d.resenheiro.jogador,
      valor: plural(d.resenheiro.comentarios, "comentário", "comentários"),
      detalhe: "na resenha",
    });
  if (d.golMaisComentado)
    destaquesDaResenha.push({
      rotulo: "Gol mais comentado",
      Icone: MessageCircle,
      jogador: d.golMaisComentado.jogador,
      valor: plural(d.golMaisComentado.comentarios, "comentário", "comentários"),
      detalhe: `gol de ${formatarDiaMes(d.golMaisComentado.data)}`,
      rota: `/grupos/${grupoId}/resenha?video=${d.golMaisComentado.pedidoReplayId}`,
    });

  return (
    <View style={styles.container}>
      <View style={styles.filtroLinha}>
        <Text style={styles.filtroRotulo}>Meses</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {dados.periodos.map((p) => {
            const ativo = p.chave === dados.periodo;
            const carregando = p.chave === periodoCarregando;
            return (
              <Pressable
                key={p.chave}
                disabled={!!periodoCarregando}
                style={[styles.chip, ativo && styles.chipAtivo]}
                onPress={() => !ativo && aoTrocarPeriodo(p.chave)}
              >
                {carregando ? (
                  <ActivityIndicator size={10} color={cores.teal} />
                ) : p.emAndamento ? (
                  <View style={[styles.ponto, ativo ? styles.pontoAtivo : styles.pontoInativo]} />
                ) : null}
                <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{p.rotuloCurto}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.container, periodoCarregando ? styles.carregando : null]}>
        <View>
          <TituloSecao Icone={BarChart3} titulo="Resumo" />
          <View style={styles.resumo}>
            <View style={styles.resumoItem}>
              <Text style={styles.resumoNumero}>{jogos}</Text>
              <Text style={styles.resumoRotulo}>{jogos === 1 ? "jogo" : "jogos"}</Text>
            </View>
            <View style={styles.resumoItem}>
              <Text style={styles.resumoNumero}>{gols}</Text>
              <Text style={styles.resumoRotulo}>
                {gols === 1 ? "gol" : "gols"}
                {jogos > 0 ? ` · ${formatarMedia(gols / jogos)}/jogo` : ""}
              </Text>
            </View>
            <View style={styles.resumoItem}>
              <Text style={styles.resumoNumero}>
                {jogos > 0 ? formatarMedia(presentes / jogos) : "0"}
              </Text>
              <Text style={styles.resumoRotulo}>presentes por jogo</Text>
            </View>
          </View>
        </View>

        {jogos === 0 ? (
          <View style={styles.vazio}>
            <Text style={styles.vazioTexto}>
              {periodoAtual.emAndamento
                ? "Ainda não teve jogo neste mês. Os destaques aparecem depois da primeira partida."
                : "Nenhum jogo do grupo nesse período."}
            </Text>
          </View>
        ) : destaquesDeJogo.length > 0 ? (
          <View>
            <TituloSecao Icone={Star} titulo={`Destaques ${nomeDoPeriodo}`} />
            <GradeDestaques cards={destaquesDeJogo} onPerfil={setPerfilAberto} />
          </View>
        ) : null}

        {/* O gráfico é a visão geral do grupo (independe do mês): o mês
            escolhido fica em destaque. */}
        {dados.partidas.length > 0 && (
          <View>
            <TituloSecao Icone={BarChart3} titulo="Gols por jogo" />
            <GraficoGolsPorJogo
              jogos={dados.partidas}
              mesDestacado={ehGeral ? null : dados.periodo}
              descrever={(p) => plural(p.presentes, "presente", "presentes")}
              rotuloMedia="média do grupo"
            />
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.linkArtilheiros, pressed && styles.cardPressionado]}
          onPress={() => router.push(`/grupos/${grupoId}/artilheiros`)}
        >
          <Goal size={20} color={cores.teal} />
          <View style={styles.flex1}>
            <Text style={styles.linkTitulo}>Ranking completo de artilheiros</Text>
            <Text style={styles.linkSub}>Todos os gols do grupo, por mês</Text>
          </View>
          <ChevronRight size={16} color={cores.slate500} />
        </Pressable>

        {destaquesDaResenha.length > 0 && (
          <View>
            {/* Depende dos replays do We Racha Cam, que nem todo grupo tem. */}
            <TituloSecao
              Icone={Video}
              titulo="Repercussão"
              lateral={<Text style={styles.beta}>Beta</Text>}
            />
            <GradeDestaques cards={destaquesDaResenha} onPerfil={setPerfilAberto} />
          </View>
        )}
      </View>

      {/* key: remonta a cada jogador, pro modal nascer limpo (ver ModalPerfil). */}
      <ModalPerfil
        key={perfilAberto ?? "fechado"}
        aberto={perfilAberto !== null}
        chamarApi={chamarApi}
        grupoId={grupoId}
        jogadorId={perfilAberto}
        onFechar={() => setPerfilAberto(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 28 },
  carregando: { opacity: 0.6 },
  flex1: { flex: 1, minWidth: 0 },

  filtroLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  filtroRotulo: {
    fontFamily: FAMILIA_MONO,
    fontSize: 11,
    letterSpacing: 1,
    color: cores.slate400,
    textTransform: "uppercase",
  },
  chips: { gap: 6, paddingRight: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipAtivo: { backgroundColor: cores.teal, borderColor: cores.teal },
  chipTexto: { fontSize: 12, color: cores.slate300 },
  chipTextoAtivo: { color: cores.dark, fontWeight: "700" },
  ponto: { width: 4, height: 4, borderRadius: 2 },
  pontoAtivo: { backgroundColor: cores.dark },
  pontoInativo: { backgroundColor: cores.teal },

  tituloSecao: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  tituloSecaoTexto: {
    fontFamily: FAMILIA_MONO,
    fontSize: 12,
    letterSpacing: 1,
    color: cores.teal,
    textTransform: "uppercase",
  },
  beta: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: cores.ambar,
    borderWidth: 1,
    borderColor: cores.ambarBorda,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },

  resumo: {
    flexDirection: "row",
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: "rgba(242, 140, 30, 0.25)",
    backgroundColor: "rgba(242, 140, 30, 0.07)",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  resumoItem: { flex: 1, alignItems: "center" },
  resumoNumero: { fontSize: 24, lineHeight: 28, fontWeight: "700", color: cores.branco },
  resumoRotulo: { marginTop: 4, fontSize: 11, color: cores.slate400, textAlign: "center" },

  vazio: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  vazioTexto: { fontSize: 14, lineHeight: 20, color: cores.slate400, textAlign: "center" },

  grade: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: cores.cardFundo,
    padding: 12,
  },
  cardPressionado: { backgroundColor: cores.superficieMedia },
  cardRotuloLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardRotulo: { flexShrink: 1, fontSize: 11, fontWeight: "500", color: cores.slate300 },
  cardLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardNome: { fontSize: 14, fontWeight: "600", color: cores.branco },
  cardValor: { fontSize: 12, fontWeight: "600", color: cores.teal },
  cardValorContagem: { fontSize: 14 },
  avatarContagem: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(31, 179, 163, 0.15)",
  },
  cardDetalhe: { fontSize: 11, color: cores.slate500 },

  linkArtilheiros: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkTitulo: { fontSize: 14, fontWeight: "600", color: cores.branco },
  linkSub: { fontSize: 12, color: cores.slate400 },
});
