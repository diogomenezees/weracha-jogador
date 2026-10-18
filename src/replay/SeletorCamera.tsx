import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import { cores } from "@/tema";

// Troca de ângulo quando o mesmo gol/lance foi gravado por mais de um We Racha Cam:
// "Câmeras:" + um chip por vídeo, funcionando como radio (só um marcado, a cor teal diz
// qual). Mesmo visual dos chips de câmera da aba Lances (CardsReplay), cada chip do tamanho
// do próprio texto. Quem usa decide onde fica — no card da resenha, à direita do título
// "Resenha" (telas Replays e Resenha); no card de replay do resultado/ao vivo
// (CardsReplay), logo abaixo do vídeo, à direita. Espelha weracha-site/components/seletor-camera.tsx. Com um vídeo só, não
// renderiza nada.
export function SeletorCamera({
  videos,
  ativo,
  onTrocar,
}: {
  videos: { idCamera: string }[];
  ativo: number;
  onTrocar: (indice: number) => void;
}) {
  if (videos.length < 2) return null;
  return (
    <View style={styles.linha} accessibilityRole="radiogroup">
      <Text style={styles.rotulo}>Câmeras:</Text>
      {videos.map((v, i) => {
        const on = i === ativo;
        return (
          <Pressable
            key={`${v.idCamera}-${i}`}
            style={[styles.chip, on && styles.chipOn]}
            onPress={() => onTrocar(i)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
          >
            <Text style={[styles.texto, on && styles.textoOn]}>{v.idCamera}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    // Sempre encostado na direita, inclusive quando quebra pra uma linha só dele.
    marginLeft: "auto",
  },
  rotulo: { fontSize: 12, color: cores.slate400 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipOn: { backgroundColor: cores.teal, borderColor: cores.teal },
  texto: { fontSize: 12, color: cores.slate300 },
  textoOn: { color: cores.dark, fontWeight: "700" },
});
