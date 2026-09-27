import { StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import { cores } from "@/tema";

// Selo do papel no grupo. Mesmas cores do PapelBadge do site
// (weracha-site/components/papel-badge.tsx): DONO teal escuro, ADMIN laranja,
// MEMBRO cinza. Usar este em todo lugar que mostra o papel, pra não divergir.

const SELOS = {
  DONO: { rotulo: "DONO", fundo: cores.tealDark, texto: cores.branco },
  ADMIN: { rotulo: "ADMIN", fundo: cores.orange, texto: cores.dark },
  MEMBRO: { rotulo: "MEMBRO", fundo: cores.slate300, texto: cores.dark },
} as const;

export type PapelExibicao = keyof typeof SELOS;

export function SeloPapel({ papel }: { papel: PapelExibicao }) {
  const selo = SELOS[papel];
  return (
    <View style={[styles.selo, { backgroundColor: selo.fundo }]}>
      <Text style={[styles.texto, { color: selo.texto }]}>{selo.rotulo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: { borderRadius: 999, paddingHorizontal: 6, height: 16, justifyContent: "center" },
  texto: { fontSize: 9, fontWeight: "600", letterSpacing: 0.3 },
});
