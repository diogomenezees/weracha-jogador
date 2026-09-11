import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import { cores, raio } from "@/tema";

// Action sheet de baixo, no lugar do menu "mais opções" (dropdown) do site. O
// `Alert.alert` do RN só mostra 3 botões no Android, então um menu com várias
// ações precisa ser um Modal próprio.

export type ItemMenu = {
  rotulo: string;
  onPress: () => void;
  destrutivo?: boolean;
};

export function MenuAcoes({
  aberto,
  titulo,
  itens,
  onFechar,
}: {
  aberto: boolean;
  titulo?: string;
  itens: ItemMenu[];
  onFechar: () => void;
}) {
  return (
    <Modal visible={aberto} transparent animationType="fade" onRequestClose={onFechar}>
      <Pressable style={styles.fundo} onPress={onFechar}>
        <Pressable style={styles.folha} onPress={(e) => e.stopPropagation()}>
          {titulo ? <Text style={styles.titulo}>{titulo}</Text> : null}
          {itens.map((item, i) => (
            <Pressable
              key={item.rotulo}
              style={[styles.item, i > 0 && styles.itemBorda]}
              onPress={() => {
                onFechar();
                item.onPress();
              }}
            >
              <Text style={[styles.itemTexto, item.destrutivo && styles.destrutivo]}>
                {item.rotulo}
              </Text>
            </Pressable>
          ))}
          <View style={styles.divisor} />
          <Pressable style={styles.item} onPress={onFechar}>
            <Text style={styles.fechar}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  folha: {
    backgroundColor: "#12161f",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
  },
  titulo: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    color: cores.slate500,
    textTransform: "uppercase",
    paddingVertical: 10,
    textAlign: "center",
  },
  item: { paddingVertical: 15 },
  itemBorda: { borderTopWidth: 1, borderTopColor: cores.linhaSutil },
  itemTexto: { fontSize: 16, color: cores.branco, textAlign: "center" },
  destrutivo: { color: cores.erroTexto },
  divisor: { height: 8 },
  fechar: {
    fontSize: 16,
    fontWeight: "700",
    color: cores.slate400,
    textAlign: "center",
    borderRadius: raio.campo,
  },
});
