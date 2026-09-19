import { type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { AvatarJogador } from "@/ui/AvatarJogador";
import { ChevronLeft, Eye, EyeOff, Shield, Star, Users, type LucideIcon } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { cores, raio } from "@/tema";

// Peças compartilhadas pelas 4 telas do ciclo da partida (check-in, configurar,
// ao vivo, resultado). Visual portado do site: fundo escuro, eyebrow mono teal,
// cards com borda teal, botão laranja.

// O ciclo da partida é tela de foco: por padrão o voltar fica no rodapé
// (Rodape / AvisoPartida), com o cabeçalho padronizado só com a marca + o
// menu. `voltar` é o opt-in pra uma tela do ciclo que já migrou pro padrão
// das outras telas (voltar no header, nomeando o destino).
export function TelaPartida({
  voltar,
  children,
}: {
  voltar?: string;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar={voltar} />
      {children}
    </SafeAreaView>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Cabecalho({
  titulo,
  Icone,
  grupoNome,
  descricao,
  direita,
}: {
  titulo: string;
  Icone?: LucideIcon;
  grupoNome: string;
  descricao?: string | null;
  direita?: ReactNode;
}) {
  return (
    <View style={styles.cabecalho}>
      <View style={{ flex: 1 }}>
        <View style={styles.tituloComIcone}>
          {Icone ? <Icone size={20} color={cores.branco} /> : null}
          <Text style={styles.h1}>{titulo}</Text>
        </View>
        <View style={styles.subLinha}>
          <Users size={12} color={cores.slate400} />
          <Text style={styles.sub} numberOfLines={1}>
            {grupoNome}
            {descricao ? `  ·  ${descricao.replace(/\s*\n\s*/g, " ")}` : ""}
          </Text>
        </View>
      </View>
      {direita}
    </View>
  );
}

/** Tela de aviso simples (partida não encontrada / cancelada / fora da janela). */
export function AvisoPartida({
  mensagem,
  destino,
  rotuloDestino = "Voltar",
}: {
  mensagem: string;
  destino: string;
  rotuloDestino?: string;
}) {
  return (
    <View style={styles.centro}>
      <Text style={styles.avisoTexto}>{mensagem}</Text>
      <Pressable style={styles.linkVoltar} onPress={() => router.replace(destino as never)}>
        <ChevronLeft size={16} color={cores.teal} />
        <Text style={styles.linkVoltarTexto}>{rotuloDestino}</Text>
      </Pressable>
    </View>
  );
}

export function Stepper({
  valor,
  onChange,
  min = 0,
  max = 99,
  desativado,
}: {
  valor: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  desativado?: boolean;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        style={styles.stepBtn}
        disabled={desativado || valor <= min}
        onPress={() => onChange(Math.max(min, valor - 1))}
      >
        <Text style={[styles.stepBtnTexto, (desativado || valor <= min) && styles.stepOff]}>−</Text>
      </Pressable>
      <Text style={styles.stepValor}>{valor}</Text>
      <Pressable
        style={styles.stepBtn}
        disabled={desativado || valor >= max}
        onPress={() => onChange(Math.min(max, valor + 1))}
      >
        <Text style={[styles.stepBtnTexto, (desativado || valor >= max) && styles.stepOff]}>+</Text>
      </Pressable>
    </View>
  );
}

export function ToggleScore({ ligado, onToggle }: { ligado: boolean; onToggle: () => void }) {
  // Fragment de propósito, não View: precisa entrar como dois irmãos soltos
  // na linha de ações (junto do grupo de ordenação), igual ao check-in — um
  // wrapper View aninhado aqui já fez o texto "Score:" quebrar de linha
  // (medida de largura do Yoga com um nível a mais de flex row dentro de row).
  return (
    <>
      <Text style={styles.toggleScoreRotulo}>Score:</Text>
      <Pressable
        accessibilityLabel={ligado ? "Ocultar score dos jogadores" : "Mostrar score dos jogadores"}
        style={[styles.toggleScore, ligado && styles.toggleScoreOn]}
        onPress={onToggle}
      >
        {ligado ? <Eye size={16} color={cores.dark} /> : <EyeOff size={16} color={cores.slate400} />}
      </Pressable>
    </>
  );
}

export function SegOrdenacao<T extends string>({
  opcoes,
  valor,
  onChange,
  expandir,
}: {
  opcoes: { chave: T; rotulo: string; Icone?: LucideIcon }[];
  valor: T;
  onChange: (v: T) => void;
  /** Distribui os botões pelos 100% da largura do container, em vez do padrão (largura pelo conteúdo). */
  expandir?: boolean;
}) {
  return (
    <View style={styles.seg}>
      {opcoes.map((o) => (
        <Pressable
          key={o.chave}
          style={[styles.segBtn, expandir && styles.segBtnExpandido, valor === o.chave && styles.segBtnOn]}
          onPress={() => onChange(o.chave)}
        >
          {o.Icone ? (
            <o.Icone size={14} color={valor === o.chave ? cores.dark : cores.slate400} />
          ) : null}
          <Text style={[styles.segTexto, valor === o.chave && styles.segTextoOn]}>{o.rotulo}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Abas<T extends string>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: { chave: T; rotulo: string }[];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.abas}>
      {opcoes.map((o) => (
        <Pressable
          key={o.chave}
          style={[styles.aba, valor === o.chave && styles.abaOn]}
          onPress={() => onChange(o.chave)}
        >
          <Text style={[styles.abaTexto, valor === o.chave && styles.abaTextoOn]}>{o.rotulo}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Linha de jogador: avatar + nome/apelido/posição + score opcional + slot à direita. */
export function CardJogadorPartida({
  id,
  nome,
  apelido,
  fotoUrl,
  posicaoNome,
  score,
  mostrarScore,
  souEu,
  direita,
  onAbrirPerfil,
}: {
  id: string;
  nome: string;
  apelido?: string | null;
  fotoUrl?: string | null;
  posicaoNome?: string | null;
  score?: number;
  mostrarScore?: boolean;
  souEu?: boolean;
  direita?: ReactNode;
  onAbrirPerfil?: () => void;
}) {
  const itensLinha2: ReactNode[] = [];
  if (apelido) {
    itensLinha2.push(<Text style={styles.cardLinha2Texto}>{apelido}</Text>);
  }
  if (posicaoNome) {
    itensLinha2.push(
      <View style={styles.cardLinha2Item}>
        <Shield size={11} color={cores.slate400} />
        <Text style={styles.cardLinha2Texto}>{posicaoNome}</Text>
      </View>
    );
  }
  if (mostrarScore && score != null) {
    itensLinha2.push(
      <View style={styles.cardLinha2Item}>
        <Star size={11} color={cores.slate400} />
        <Text style={styles.cardLinha2Texto}>Score {score}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.card, souEu && styles.cardEu]}>
      <Pressable style={styles.cardEsq} onPress={onAbrirPerfil} disabled={!onAbrirPerfil}>
        <AvatarJogador id={id} nome={nome} fotoUrl={fotoUrl} tamanho={38} anel={souEu ? "teal" : undefined} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardNome} numberOfLines={1}>
            {nome}
          </Text>
          {itensLinha2.length > 0 && (
            <View style={styles.cardLinha2}>
              {itensLinha2.map((item, i) => (
                <View key={i} style={styles.cardLinha2Item}>
                  {i > 0 && <Text style={styles.cardLinha2Separador}>·</Text>}
                  {item}
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
      {direita}
    </View>
  );
}

/** Rodapé fixo: botão de voltar nomeado à esquerda + ação primária à direita. */
export function Rodape({
  voltarRotulo,
  onVoltar,
  primario,
  erro,
}: {
  voltarRotulo?: string;
  onVoltar?: () => void;
  primario?: ReactNode;
  erro?: string | null;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.rodape, { paddingBottom: 14 + insets.bottom }]}>
      {erro ? <Text style={styles.rodapeErro}>{erro}</Text> : null}
      <View style={styles.rodapeLinha}>
        {onVoltar && (
          <Pressable style={styles.rodapeVoltar} onPress={onVoltar}>
            <ChevronLeft size={16} color={cores.branco} />
            <Text style={styles.rodapeVoltarTexto}>{voltarRotulo ?? "Voltar"}</Text>
          </Pressable>
        )}
        {primario}
      </View>
    </View>
  );
}

export function BotaoPrimario({
  titulo,
  onPress,
  desativado,
  cor = "orange",
  Icone,
}: {
  titulo: string;
  onPress: () => void;
  desativado?: boolean;
  cor?: "orange" | "red" | "teal";
  Icone?: LucideIcon;
}) {
  const fundo = cor === "red" ? "#dc2626" : cor === "teal" ? cores.teal : cores.orange;
  const texto = cor === "red" ? cores.branco : cores.dark;
  return (
    <Pressable
      style={[styles.primario, { backgroundColor: fundo }, desativado && styles.primarioOff]}
      onPress={onPress}
      disabled={desativado}
    >
      {Icone ? <Icone size={16} color={texto} /> : null}
      <Text style={[styles.primarioTexto, { color: texto }]}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  // Sem padding próprio: agora `Cabecalho` entra como primeiro filho do
  // ScrollView de cada tela (rola junto com o resto), então herda o
  // paddingHorizontal/paddingTop do `contentContainerStyle` do scroll, igual
  // toda outra seção da tela — evitar padding duplicado (24 daqui + 16 do
  // scroll) que desalinharia o título do resto do conteúdo.
  cabecalho: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tituloComIcone: { flexDirection: "row", alignItems: "center", gap: 8 },
  h1: { fontSize: 24, fontWeight: "700", color: cores.branco },
  subLinha: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  sub: { flexShrink: 1, fontSize: 13, color: cores.slate400 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  avisoTexto: { fontSize: 14, color: cores.slate400, textAlign: "center", lineHeight: 20 },
  linkVoltar: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 6 },
  linkVoltarTexto: { fontSize: 14, color: cores.branco, textDecorationLine: "underline" },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    overflow: "hidden",
  },
  stepBtn: { width: 40, height: 36, alignItems: "center", justifyContent: "center" },
  stepBtnTexto: { fontSize: 20, color: cores.teal },
  stepOff: { opacity: 0.3 },
  stepValor: { minWidth: 34, textAlign: "center", fontSize: 16, fontWeight: "700", color: cores.branco },

  toggleScoreRotulo: { fontSize: 13, fontWeight: "500", color: cores.slate300 },
  toggleScore: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
  },
  toggleScoreOn: { backgroundColor: cores.teal, borderColor: cores.teal },

  seg: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    overflow: "hidden",
  },
  segBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    height: 32,
  },
  segBtnExpandido: { flex: 1 },
  segBtnOn: { backgroundColor: cores.teal },
  segTexto: { fontSize: 12, fontWeight: "600", color: cores.slate400 },
  segTextoOn: { color: cores.dark },

  abas: { flexDirection: "row", gap: 4, backgroundColor: cores.superficieMedia, borderRadius: 10, padding: 4 },
  aba: { flex: 1, height: 34, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  abaOn: { backgroundColor: cores.teal },
  abaTexto: { fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: cores.slate400 },
  abaTextoOn: { color: cores.dark },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardEu: { borderColor: cores.teal, borderWidth: 2 },
  cardEsq: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  cardNome: { fontSize: 15, fontWeight: "600", color: cores.branco },
  cardLinha2: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 1, gap: 4 },
  cardLinha2Item: { flexDirection: "row", alignItems: "center", gap: 3 },
  cardLinha2Texto: { fontSize: 12, color: cores.slate400 },
  cardLinha2Separador: { fontSize: 12, color: cores.slate400 },

  rodape: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: cores.cardBorda,
    backgroundColor: cores.dark,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 8,
  },
  rodapeLinha: { flexDirection: "row", gap: 8 },
  rodapeErro: { fontSize: 13, color: cores.erroTexto, textAlign: "center" },
  rodapeVoltar: {
    minWidth: 96,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    flexDirection: "row",
    gap: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rodapeVoltarTexto: { fontSize: 15, color: cores.branco },
  primario: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primarioOff: { opacity: 0.5 },
  primarioTexto: { fontSize: 15, fontWeight: "700" },
});
