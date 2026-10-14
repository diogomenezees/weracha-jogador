import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/ui/Texto";
import { Lock, Minus, Plus, Star } from "@/ui/Icone";
import { ModalCartao } from "@/grupo/modais";
import { definirPosicao, definirScore, listarPosicoes } from "@/api/jogadores";
import { mensagemDoErro } from "@/mensagens-erro";
import { scoreCongelado } from "@/partidas";
import { cores, raio } from "@/tema";
import type { Grupo, PosicaoEsporte } from "@/contrato/tipos";
import type { OpcoesRequisicao } from "@/api/cliente";

// O próprio jogador ajusta o score e a posição dele num grupo, sem sair da tela
// (card "Meu score" dos Atalhos do grupo). Espelha
// weracha-site/components/dialog-meu-score.tsx: mesmas rotas do perfil
// (PUT .../membros/{id}/score e .../posicao) e mesma regra: sem ser admin, o
// score congela 1h antes da próxima partida (a posição não congela). O servidor
// decide de verdade; aqui é só o indício.
//
// Sem lib de slider no app: −/+ repetem enquanto o dedo fica apertado. Monte
// com `key` mudando a cada abertura, pra o formulário nascer com os valores
// atuais do grupo.

const SCORE_MIN = 0;
const SCORE_MAX = 100;

// Referência pra autoavaliação, nas faixas já decididas pro futuro sistema de
// estrelas (weracha-site/docs/pendente/02-sistema-score-estrelas.md, seção 3).
const FAIXAS: { min: number; nome: string; descricao: string }[] = [
  { min: 85, nome: "Jogador caro", descricao: "Joga em outro nível, todo time quer ele" },
  { min: 70, nome: "Bom de bola", descricao: "Categoria boa, resolve" },
  { min: 40, nome: "Mediano", descricao: "Joga a posição direitinho" },
  { min: 20, nome: "Ainda aprendendo", descricao: "Pegando o jogo" },
  { min: 0, nome: "Iniciante", descricao: "Primeiros jogos, só ganhando rodagem" },
];

function faixaDoScore(score: number) {
  return FAIXAS.find((f) => score >= f.min) ?? FAIXAS[FAIXAS.length - 1];
}

// Próxima partida não cancelada cujo horário ainda não chegou: a mesma regra do
// servidor pro congelamento (proximaPartidaDoGrupo em lib/actions/autorizacao.ts
// do site). Não usa `proximaPartida` de @/grupos, que ignora a partida assim que
// a janela de check-in abre.
function proximaPartidaPeloHorario(grupo: Grupo): Date | null {
  const agora = Date.now();
  const futuras = grupo.partidas
    .filter((p) => !p.cancelada && new Date(p.data).getTime() >= agora)
    .map((p) => new Date(p.data).getTime())
    .sort((a, b) => a - b);
  return futuras[0] !== undefined ? new Date(futuras[0]) : null;
}

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

export function ModalMeuScore({
  aberto,
  onFechar,
  grupo,
  jogadorId,
  chamarApi,
  onSalvo,
}: {
  aberto: boolean;
  onFechar: () => void;
  grupo: Grupo;
  jogadorId: string;
  chamarApi: ChamarApi;
  onSalvo: (novo: { score: number; posicaoId: string | null }) => void;
}) {
  const [score, setScore] = useState(grupo.meuScore);
  const [posicaoId, setPosicaoId] = useState<string | null>(grupo.meuPosicaoId);
  const [posicoes, setPosicoes] = useState<PosicaoEsporte[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const repeticao = useRef<ReturnType<typeof setInterval> | null>(null);

  const souAdmin = grupo.meuPapel === "ADMIN";
  const congelado = !souAdmin && scoreCongelado(proximaPartidaPeloHorario(grupo));
  const faixa = faixaDoScore(score);
  const posicaoEscolhida = posicoes.find((p) => p.id === posicaoId);

  useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    listarPosicoes(chamarApi, grupo.esporte)
      .then((lista) => ativo && setPosicoes(lista))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [aberto, chamarApi, grupo.esporte]);

  // Para a repetição do −/+ se o modal desmontar com o dedo ainda apertado.
  useEffect(
    () => () => {
      if (repeticao.current) clearInterval(repeticao.current);
    },
    []
  );

  function passo(delta: number) {
    setScore((v) => Math.min(SCORE_MAX, Math.max(SCORE_MIN, v + delta)));
  }
  // Segurar o dedo no −/+ continua andando, pra ir de 50 a 90 sem 40 toques.
  function iniciarRepeticao(delta: number) {
    pararRepeticao();
    repeticao.current = setInterval(() => passo(delta), 70);
  }
  function pararRepeticao() {
    if (repeticao.current) clearInterval(repeticao.current);
    repeticao.current = null;
  }

  async function salvar() {
    const mudouScore = !congelado && score !== grupo.meuScore;
    const mudouPosicao = posicaoId !== grupo.meuPosicaoId;
    if (!mudouScore && !mudouPosicao) {
      onFechar();
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      if (mudouPosicao) await definirPosicao(chamarApi, grupo.id, jogadorId, posicaoId);
      if (mudouScore) await definirScore(chamarApi, grupo.id, jogadorId, score);
      onSalvo({ score: mudouScore ? score : grupo.meuScore, posicaoId });
      onFechar();
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setSalvando(false);
    }
  }

  const botaoPasso = (delta: number) => {
    const Icone = delta < 0 ? Minus : Plus;
    const desativado =
      congelado || (delta < 0 ? score <= SCORE_MIN : score >= SCORE_MAX);
    return (
      <Pressable
        onPress={() => passo(delta)}
        onLongPress={() => iniciarRepeticao(delta)}
        onPressOut={pararRepeticao}
        delayLongPress={350}
        disabled={desativado}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={delta < 0 ? "Diminuir score" : "Aumentar score"}
        style={({ pressed }) => [
          styles.passo,
          pressed && styles.pressionado,
          desativado && styles.desativado,
        ]}
      >
        <Icone size={18} color={cores.slate300} />
      </Pressable>
    );
  };

  return (
    <ModalCartao aberto={aberto} onFechar={onFechar}>
      <View style={styles.eyebrowLinha}>
        <Star size={16} color={cores.teal} />
        <Text style={styles.eyebrow}>Meu score</Text>
      </View>
      <Text style={styles.titulo} numberOfLines={1}>
        {grupo.nome}
      </Text>
      <Text style={styles.descricao}>
        O score vai de 0 a 100 e é o que equilibra os times no sorteio. Quanto mais real, mais
        parelho fica o jogo.
      </Text>

      <View style={styles.caixaScore}>
        <View style={styles.linhaScore}>
          {botaoPasso(-1)}
          <View style={styles.centro}>
            <Text style={styles.valor}>{score}</Text>
            <Text style={styles.faixaNome}>{faixa.nome}</Text>
            <Text style={styles.faixaDescricao}>{faixa.descricao}</Text>
          </View>
          {botaoPasso(1)}
        </View>
        {congelado ? (
          <View style={styles.congelado}>
            <Lock size={14} color={cores.slate400} />
            <Text style={styles.congeladoTexto}>
              O score fica travado a partir de 1h antes da partida. Se precisar mudar, fale com
              o admin do grupo.
            </Text>
          </View>
        ) : null}
      </View>

      {/* Posição só quando o esporte tem posições cadastradas. */}
      {posicoes.length > 0 ? (
        <View style={styles.posicaoBloco}>
          <Text style={styles.posicaoRotulo}>Sua posição nesse grupo</Text>
          <View style={styles.pilulas}>
            {[{ id: null, nome: "Nenhuma" } as { id: string | null; nome: string }, ...posicoes].map(
              (p) => {
                const ativa = p.id === posicaoId;
                return (
                  <Pressable
                    key={p.id ?? "nenhuma"}
                    onPress={() => setPosicaoId(p.id)}
                    style={[styles.pilula, ativa && styles.pilulaAtiva]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ativa }}
                  >
                    <Text style={[styles.pilulaTexto, ativa && styles.pilulaTextoAtiva]}>
                      {p.nome}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>
          {posicaoEscolhida?.descricao ? (
            <Text style={styles.posicaoDescricao}>{posicaoEscolhida.descricao}</Text>
          ) : null}
        </View>
      ) : null}

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      <View style={styles.acoes}>
        <Pressable style={styles.btnSecundario} onPress={onFechar} disabled={salvando}>
          <Text style={styles.btnSecundarioTexto}>Cancelar</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPrimario, salvando && styles.desativado]}
          onPress={() => void salvar()}
          disabled={salvando}
        >
          {salvando ? (
            <ActivityIndicator color={cores.dark} />
          ) : (
            <Text style={styles.btnPrimarioTexto}>Salvar</Text>
          )}
        </Pressable>
      </View>
    </ModalCartao>
  );
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
  titulo: { fontSize: 18, fontWeight: "700", color: cores.branco, paddingRight: 32 },
  descricao: { fontSize: 14, lineHeight: 20, color: cores.slate400 },

  caixaScore: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  linhaScore: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  passo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(31, 179, 163, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressionado: { backgroundColor: "rgba(255,255,255,0.06)" },
  desativado: { opacity: 0.4 },
  centro: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  valor: { fontSize: 40, lineHeight: 44, fontWeight: "700", color: cores.branco },
  faixaNome: { marginTop: 4, fontSize: 14, fontWeight: "600", color: cores.teal },
  faixaDescricao: { fontSize: 12, color: cores.slate400, textAlign: "center" },
  congelado: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  congeladoTexto: { flex: 1, fontSize: 12, lineHeight: 17, color: cores.slate400 },

  posicaoBloco: { gap: 8, marginTop: 4 },
  posicaoRotulo: { fontSize: 14, color: cores.slate300 },
  pilulas: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pilula: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(31, 179, 163, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pilulaAtiva: { backgroundColor: cores.teal, borderColor: cores.teal },
  pilulaTexto: { fontSize: 13, color: cores.slate300 },
  pilulaTextoAtiva: { color: cores.dark, fontWeight: "700" },
  posicaoDescricao: { fontSize: 12, lineHeight: 17, color: cores.slate400 },

  erro: { fontSize: 13, color: cores.erroTexto },
  acoes: { flexDirection: "row", gap: 10, marginTop: 6 },
  btnSecundario: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecundarioTexto: { fontSize: 15, fontWeight: "600", color: cores.branco },
  btnPrimario: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimarioTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
});
