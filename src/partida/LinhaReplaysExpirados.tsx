import { StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import type { ResumoExpiracaoDaPartida } from "@/contrato/tipos";
import { cores, raio } from "@/tema";
import { Hourglass } from "@/ui/Icone";

// Linha discreta no resultado de partida antiga: em vez de marcar gol por gol como
// "expirado" (o replay do gol só some), uma frase única lembra que um dia teve vídeo
// ali. Espelha weracha-site/components/linha-replays-expirados.tsx.
function texto({ expirados, guardados }: ResumoExpiracaoDaPartida): string {
  const parte1 =
    expirados === 1
      ? "1 replay desta partida expirou"
      : `${expirados} replays desta partida expiraram`;
  if (guardados === 0) return `${parte1}.`;
  return `${parte1} e ${guardados === 1 ? "1 foi guardado" : `${guardados} foram guardados`} nos favoritos.`;
}

export function LinhaReplaysExpirados({ resumo }: { resumo: ResumoExpiracaoDaPartida }) {
  return (
    <View style={styles.linha}>
      <Hourglass size={13} color={cores.slate500} />
      <Text style={styles.texto}>{texto(resumo)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  texto: { flex: 1, fontSize: 12, color: cores.slate400 },
});
