import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";

import { cores } from "@/tema";

// Avatar do jogador: foto (expo-image) ou iniciais sobre uma cor derivada do
// nome/id. Porta de weracha-site/components/avatar-jogador.tsx.

const CORES = [
  "#f43f5e",
  "#f59e0b",
  "#10b981",
  "#0ea5e9",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#6366f1",
  "#65a30d",
];

function corPorSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return CORES[Math.abs(hash) % CORES.length];
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function AvatarJogador({
  id,
  nome,
  fotoUrl,
  tamanho = 44,
  anel,
}: {
  id?: string;
  nome: string;
  fotoUrl?: string | null;
  tamanho?: number;
  /** Anel de destaque (2px). "teal" = sou eu, "orange" = 1º lugar. */
  anel?: "teal" | "orange";
}) {
  const dim = {
    width: tamanho,
    height: tamanho,
    borderRadius: tamanho / 2,
    ...(anel
      ? { borderWidth: 2, borderColor: anel === "teal" ? cores.teal : cores.orange }
      : null),
  };

  if (fotoUrl) {
    return <Image source={{ uri: fotoUrl }} style={dim} contentFit="cover" />;
  }

  return (
    <View style={[dim, styles.fallback, { backgroundColor: corPorSeed(id ?? nome) }]}>
      <Text style={[styles.iniciais, { fontSize: tamanho * 0.36 }]}>{iniciais(nome)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center" },
  iniciais: { color: "#fff", fontWeight: "700" },
});
