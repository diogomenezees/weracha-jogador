import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import { MESES_COMUNICADOS } from "@/contrato/expiracaoReplays";
import { ModalCartao } from "@/grupo/modais";
import { cores, raio } from "@/tema";
import { CircleAlert, Heart, Hourglass } from "@/ui/Icone";

// "!" à direita da descrição da Resenha: abre um modal explicando que os replays expiram
// e que o ❤ guarda por mais tempo (na aba Favoritos de quem favoritou). Quem usa decide quando mostrar (só com vídeo no grupo).
// Espelha weracha-site/components/ajuda-expiracao-replays.tsx.
export function AjudaExpiracao() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Pressable
        hitSlop={10}
        onPress={() => setAberto(true)}
        accessibilityRole="button"
        accessibilityLabel="Por quanto tempo os vídeos ficam guardados"
        style={styles.botao}
      >
        <CircleAlert size={16} color={cores.slate400} />
      </Pressable>
      <ModalExpiracao aberto={aberto} onFechar={() => setAberto(false)} />
    </>
  );
}

// O modal sozinho, aberto também pelo banner do feed (BannerExpiracao.tsx).
export function ModalExpiracao({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  return (
    <ModalCartao aberto={aberto} onFechar={onFechar}>
      <View style={styles.eyebrowLinha}>
        <Hourglass size={16} color={cores.ambar} />
        <Text style={styles.eyebrow}>Replays</Text>
      </View>
      <Text style={styles.titulo}>Os vídeos não ficam pra sempre</Text>
      <Text style={styles.desc}>Guarde nos favoritos os que você não quer perder.</Text>
      <View style={styles.opcao}>
        <View style={styles.opcaoTopo}>
          <View style={[styles.icone, { backgroundColor: cores.ambarFundo }]}>
            <Hourglass size={16} color={cores.ambar} />
          </View>
          <Text style={styles.opcaoTitulo}>Duram {MESES_COMUNICADOS} meses</Text>
        </View>
        <Text style={styles.opcaoTexto}>
          Replays com mais de {MESES_COMUNICADOS} meses somem automaticamente. Antes, o
          card avisa quantos dias faltam.
        </Text>
      </View>
      <View style={styles.opcao}>
        <View style={styles.opcaoTopo}>
          <View style={[styles.icone, { backgroundColor: "rgba(242, 140, 30, 0.15)" }]}>
            <Heart size={16} color={cores.favorito} />
          </View>
          <Text style={styles.opcaoTitulo}>Favoritou, fica guardado</Text>
        </View>
        <Text style={styles.opcaoTexto}>
          Toque no coração do vídeo: o seu gol, o de um amigo ou um lance. Depois de{" "}
          {MESES_COMUNICADOS} meses ele sai do grupo, mas continua pra você na aba Favoritos da
          tela Replays.
        </Text>
      </View>
      <Pressable style={[styles.botaoLaranja, { marginTop: 4 }]} onPress={onFechar}>
        <Text style={styles.botaoLaranjaTexto}>Entendi</Text>
      </Pressable>
    </ModalCartao>
  );
}

const styles = StyleSheet.create({
  botao: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrowLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: cores.ambar,
    textTransform: "uppercase",
  },
  titulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  desc: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  opcao: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
    gap: 6,
  },
  opcaoTopo: { flexDirection: "row", alignItems: "center", gap: 8 },
  icone: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  opcaoTitulo: { fontSize: 14, fontWeight: "600", color: cores.branco },
  opcaoTexto: { fontSize: 14, lineHeight: 19, color: cores.slate400 },
  botaoLaranja: {
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoLaranjaTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
});
