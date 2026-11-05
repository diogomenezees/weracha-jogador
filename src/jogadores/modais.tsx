import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "@/ui/Texto";

import { buscarPerfilGeralJogador, buscarPerfilJogador } from "@/api/jogadores";
import { CalendarDays, Goal, Shield, Star, Users, type LucideIcon } from "@/ui/Icone";
import { ModalCartao } from "@/grupo/modais";
import { mensagemDoErro } from "@/mensagens-erro";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { GraficoGolsPorJogo } from "@/estatisticas/GraficoGolsPorJogo";
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
      <View style={styles.eyebrowLinha}>
        <Star size={16} color={cores.teal} />
        <Text style={styles.eyebrow}>Editar score</Text>
      </View>
      <Text style={styles.titulo}>{nome}</Text>
      <Text style={styles.descricao}>
        Score desse jogador só nesse grupo, não afeta os outros grupos dele.
      </Text>
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
      <View style={styles.eyebrowLinha}>
        <Shield size={16} color={cores.teal} />
        <Text style={styles.eyebrow}>Editar posição</Text>
      </View>
      <Text style={styles.titulo}>{nome}</Text>
      <Text style={styles.descricao}>
        Posição desse jogador só nesse grupo. É opcional e pode ser removida a qualquer hora.
      </Text>
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
  /** null = perfil GERAL do jogador, somando todos os grupos (telas de
   * artilheiros). */
  grupoId: string | null;
  jogadorId: string | null;
  onFechar: () => void;
}) {
  // Remontado por `key={perfilId}` no parent, então os states nascem limpos a
  // cada abertura e o effect só busca (sem setState síncrono).
  const [perfil, setPerfil] = useState<PerfilJogador | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  // Abas pra o modal não crescer na vertical: números gerais ou gráfico. Uma
  // página por vez (cada uma com a própria altura). Troca tocando na aba ou
  // deslizando o dedo pro lado (só no app; no site, arrasto em modal travava).
  const [aba, setAba] = useState<"resumo" | "gols">("resumo");
  // Arrasto claramente horizontal troca a aba no fim do gesto. Em cima das
  // colunas do gráfico quem pega é a rolagem dele (filho, perguntado antes).
  const [gesto] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => true,
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -40) setAba("gols");
        else if (g.dx > 40) setAba("resumo");
      },
    })
  );

  useEffect(() => {
    if (!aberto || !jogadorId) return;
    let vivo = true;
    (grupoId
      ? buscarPerfilJogador(chamarApi, grupoId, jogadorId)
      : buscarPerfilGeralJogador(chamarApi, jogadorId)
    )
      .then((p) => vivo && setPerfil(p))
      .catch((e) => vivo && setErro(mensagemDoErro(e)));
    return () => {
      vivo = false;
    };
  }, [aberto, jogadorId, grupoId, chamarApi]);

  const temGrafico = (perfil?.jogos?.length ?? 0) > 0;

  return (
    <ModalCartao aberto={aberto} onFechar={onFechar}>
      {erro ? (
        <Text style={styles.erro}>{erro}</Text>
      ) : !perfil ? (
        <ActivityIndicator color={cores.teal} />
      ) : (
        // Um bloco só: o ModalCartao tem gap entre filhos, que somava com as
        // margens abaixo e deixava o modal bem mais alto que o do site.
        <View>
          {/* Igual o DialogPerfilJogador do site: avatar grande, nome/apelido/
              telefone em três tons, e um card só com as 3 estatísticas divididas. */}
          <View style={styles.perfilTopo}>
            <AvatarJogador
              id={perfil.id}
              nome={perfil.nome}
              fotoUrl={perfil.fotoUrl}
              tamanho={64}
            />
            <View style={styles.perfilTextos}>
              <Text style={styles.perfilNome} numberOfLines={1}>
                {perfil.nome}
              </Text>
              {perfil.apelido ? (
                <Text style={styles.perfilApelido} numberOfLines={1}>
                  {perfil.apelido}
                </Text>
              ) : null}
              <Text style={styles.perfilTelefone} numberOfLines={1} selectable>
                {perfil.telefone}
              </Text>
            </View>
          </View>
          {/* Abas só quando há gráfico (sem jogo no grupo, ou servidor antigo
              sem o campo: só o resumo). Igual o site. */}
          <View {...(temGrafico ? gesto.panHandlers : {})}>
            {temGrafico ? (
              <View style={styles.abas} accessibilityRole="tablist">
                {(
                  [
                    ["resumo", "Resumo"],
                    ["gols", "Gols por jogo"],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <Pressable
                    key={valor}
                    style={[styles.aba, aba === valor && styles.abaAtiva]}
                    onPress={() => setAba(valor)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: aba === valor }}
                  >
                    <Text style={[styles.abaTexto, aba === valor && styles.abaTextoAtivo]}>
                      {rotulo}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {aba === "resumo" || !temGrafico ? (
              <View style={[styles.statsCard, temGrafico && styles.depoisDasAbas]}>
                <Stat icon={Users} n={perfil.totalGrupos} label="Grupos" />
                <Stat icon={CalendarDays} n={perfil.totalPartidas} label="Partidas" divisor />
                <Stat icon={Goal} n={perfil.totalGols} label="Gols" divisor />
              </View>
            ) : (
              // Mesmo gráfico da Performance, só deste grupo, mais baixo.
              <View style={styles.depoisDasAbas}>
                <GraficoGolsPorJogo
                  jogos={perfil.jogos!}
                  mesDestacado={null}
                  rotuloMedia="média"
                  lista={false}
                  altura={ALTURA_GRAFICO}
                  compacto
                />
              </View>
            )}
          </View>

          {perfil.ultimoJogoEm ? (
            <Text style={styles.ultimoJogo}>
              Último jogo em{" "}
              {new Date(perfil.ultimoJogoEm).toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}
            </Text>
          ) : null}
        </View>
      )}
    </ModalCartao>
  );
}

function Stat({
  icon: Icon,
  n,
  label,
  divisor,
}: {
  icon: LucideIcon;
  n: number;
  label: string;
  divisor?: boolean;
}) {
  return (
    <View style={[styles.stat, divisor && styles.statDivisor]}>
      <Icon size={16} color={cores.teal} />
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statL}>{label}</Text>
    </View>
  );
}

// Gráfico do modal mais baixo que o da Performance (140).
const ALTURA_GRAFICO = 80;

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
  eyebrowLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  titulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  descricao: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
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
  // Perfil: espelha components/dialog-perfil-jogador.tsx do site.
  perfilTopo: { flexDirection: "row", alignItems: "center", gap: 16, paddingRight: 24 },
  perfilTextos: { flex: 1, minWidth: 0, gap: 2 },
  perfilNome: { fontSize: 18, lineHeight: 22, fontWeight: "600", color: cores.branco },
  perfilApelido: { fontSize: 14, lineHeight: 18, color: cores.slate400 },
  perfilTelefone: { fontSize: 14, lineHeight: 18, color: cores.slate500 },
  statsCard: {
    flexDirection: "row",
    marginTop: 10,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 12,
  },
  stat: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 4 },
  statDivisor: { borderLeftWidth: 1, borderLeftColor: "rgba(31, 179, 163, 0.1)" },
  statN: { fontSize: 18, fontWeight: "700", color: cores.branco },
  statL: { fontSize: 10, letterSpacing: 0.8, color: cores.teal, textTransform: "uppercase" },
  abas: {
    flexDirection: "row",
    gap: 4,
    marginTop: 12,
    padding: 4,
    borderRadius: raio.campo,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  aba: {
    flex: 1,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  abaAtiva: { backgroundColor: "rgba(31,179,163,0.2)" },
  abaTexto: { fontSize: 12, fontWeight: "600", color: cores.slate400 },
  abaTextoAtivo: { color: cores.branco },
  depoisDasAbas: { marginTop: 8 },
  // Última informação do modal, pequena e à direita.
  ultimoJogo: {
    marginTop: 8,
    fontSize: 11,
    color: cores.slate500,
    textAlign: "right",
  },
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
