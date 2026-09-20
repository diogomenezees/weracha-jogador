import { type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import type { LucideIcon } from "@/ui/Icone";
import { cores, raio } from "@/tema";

// Peças de UI do /painel e do onboarding, mesmo padrão de src/acesso/ui.tsx.
// Visual portado de weracha-site/app/painel.

type Cor = "teal" | "orange";

export function Eyebrow({ children, cor = "teal" }: { children: ReactNode; cor?: Cor }) {
  return (
    <Text style={[styles.eyebrow, cor === "orange" && { color: cores.orange }]}>{children}</Text>
  );
}

export function BotaoLaranja({
  titulo,
  onPress,
  carregando,
  Icone,
}: {
  titulo: string;
  onPress: () => void;
  carregando?: boolean;
  Icone?: LucideIcon;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={carregando}
      style={[styles.botaoLaranja, carregando && styles.inativo]}
    >
      {carregando ? (
        <ActivityIndicator color={cores.dark} />
      ) : (
        <>
          {Icone && <Icone size={16} color={cores.dark} />}
          <Text style={styles.botaoLaranjaTexto}>{titulo}</Text>
        </>
      )}
    </Pressable>
  );
}

export function BotaoContorno({ titulo, onPress }: { titulo: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.botaoContorno}>
      <Text style={styles.botaoContornoTexto}>{titulo}</Text>
    </Pressable>
  );
}

export function TelaCarregando({ mensagem }: { mensagem: string }) {
  return (
    <View style={styles.centro}>
      <ActivityIndicator size="large" color={cores.teal} />
      <Text style={styles.centroTexto}>{mensagem}</Text>
    </View>
  );
}

export function TelaErro({ mensagem, onTentar }: { mensagem: string; onTentar: () => void }) {
  return (
    <View style={styles.centro}>
      <Text style={styles.erroTexto}>{mensagem}</Text>
      <BotaoLaranja titulo="Tentar de novo" onPress={onTentar} />
    </View>
  );
}

export function Selo({ texto, cor }: { texto: string; cor: Cor }) {
  const c = cor === "teal" ? cores.teal : cores.orange;
  return (
    <View style={[styles.selo, { borderColor: c + "40" }]}>
      <Text style={[styles.seloTexto, { color: c }]}>{texto}</Text>
    </View>
  );
}

export function PassoComoFunciona({
  numero,
  titulo,
  texto,
  cor,
  ultimo,
}: {
  numero: string;
  titulo: string;
  texto: string;
  cor: Cor;
  ultimo?: boolean;
}) {
  const c = cor === "teal" ? cores.teal : cores.orange;
  return (
    <View style={styles.passoLinha}>
      <View style={styles.passoColEsq}>
        <View style={[styles.passoCirculo, { borderColor: c + "70" }]}>
          <Text style={[styles.passoNumero, { color: c }]}>{numero}</Text>
        </View>
        {!ultimo && <View style={styles.passoTraco} />}
      </View>
      <View style={[styles.passoTexto, !ultimo && styles.passoTextoPad]}>
        <Text style={styles.passoTitulo}>{titulo}</Text>
        <Text style={styles.passoDescricao}>{texto}</Text>
      </View>
    </View>
  );
}

export function LinhaEsqueleto({ selo, cor }: { selo: string; cor: Cor }) {
  const c = cor === "teal" ? cores.teal : cores.orange;
  return (
    <View style={styles.esqueletoLinha}>
      <View style={styles.esqueletoAvatar} />
      <View style={styles.esqueletoTextos}>
        <View style={styles.esqueletoBarraGrande} />
        <View style={styles.esqueletoBarraPequena} />
      </View>
      <View style={[styles.selo, { borderColor: c + "40" }]}>
        <Text style={[styles.seloTexto, { color: c }]}>{selo}</Text>
      </View>
    </View>
  );
}

export function CartaoCaminho({
  Icone,
  titulo,
  texto,
  chamada,
  cor,
  onPress,
}: {
  Icone: LucideIcon;
  titulo: string;
  texto: string;
  chamada: string;
  cor: Cor;
  onPress: () => void;
}) {
  const c = cor === "teal" ? cores.teal : cores.orange;
  const fundo = cor === "teal" ? cores.avisoFundo : cores.laranjaFundo;
  return (
    <Pressable style={[styles.caminho, { borderColor: c + "55", backgroundColor: fundo }]} onPress={onPress}>
      <View style={[styles.caminhoIcone, { backgroundColor: c + "26" }]}>
        <Icone size={16} color={c} />
      </View>
      <Text style={styles.caminhoTitulo}>{titulo}</Text>
      <Text style={styles.caminhoTexto}>{texto}</Text>
      <Text style={[styles.caminhoChamada, { color: c }]}>{chamada}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    color: cores.teal,
    textTransform: "uppercase",
  },
  botaoLaranja: {
    height: 52,
    paddingHorizontal: 28,
    flexDirection: "row",
    gap: 8,
    borderRadius: raio.card,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoLaranjaTexto: { color: cores.dark, fontSize: 16, fontWeight: "700" },
  inativo: { opacity: 0.6 },
  botaoContorno: {
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoContornoTexto: { color: cores.branco, fontSize: 14 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  centroTexto: { color: cores.slate400, fontSize: 14 },
  erroTexto: { color: cores.erroTexto, fontSize: 15, textAlign: "center" },
  selo: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  seloTexto: { fontSize: 10, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" },
  passoLinha: { flexDirection: "row", gap: 14 },
  passoColEsq: { alignItems: "center", width: 30 },
  passoCirculo: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  passoNumero: { fontSize: 11, fontWeight: "700" },
  passoTraco: { flex: 1, width: 1, backgroundColor: cores.cardBorda, marginTop: 2 },
  passoTexto: { flex: 1, gap: 2 },
  passoTextoPad: { paddingBottom: 20 },
  passoTitulo: { fontSize: 15, fontWeight: "700", color: cores.branco },
  passoDescricao: { fontSize: 13, lineHeight: 19, color: cores.slate400 },
  esqueletoLinha: { flexDirection: "row", alignItems: "center", gap: 12 },
  esqueletoAvatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: cores.superficieMedia },
  esqueletoTextos: { flex: 1, gap: 6 },
  esqueletoBarraGrande: { height: 8, width: "60%", borderRadius: 4, backgroundColor: cores.superficieMedia },
  esqueletoBarraPequena: { height: 6, width: "40%", borderRadius: 3, backgroundColor: cores.linhaSutil },
  caminho: {
    flex: 1,
    gap: 6,
    borderRadius: raio.card,
    borderWidth: 1,
    padding: 14,
  },
  caminhoIcone: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  caminhoTitulo: { fontSize: 14, fontWeight: "700", color: cores.branco },
  caminhoTexto: { fontSize: 11, lineHeight: 16, color: cores.slate400 },
  caminhoChamada: { fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 },
});
