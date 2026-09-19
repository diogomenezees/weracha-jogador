import { Modal, Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { Text } from "@/ui/Texto";

import { cores, raio } from "@/tema";
import { useBlurTarget } from "@/ui/BlurTarget";
import { X, type LucideIcon } from "@/ui/Icone";

// Action sheet de baixo, no lugar do menu "mais opções" (dropdown) do site. O
// `Alert.alert` do RN só mostra 3 botões no Android, então um menu com várias
// ações precisa ser um Modal próprio. Visual espelha o `DropdownMenuContent`/
// `DropdownMenuItem` do site: título com destaque à esquerda + X pra fechar no
// canto (em vez de um botão "Fechar" separado), ícone à esquerda de cada
// opção, texto alinhado à esquerda.

export type ItemMenu = {
  rotulo: string;
  onPress: () => void;
  Icone?: LucideIcon;
  destrutivo?: boolean;
  /** Cor fixa pro ícone + texto, sobrepondo o padrão/destrutivo (ex.: laranja pra "Compartilhar"). */
  cor?: string;
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
  const blurTarget = useBlurTarget();
  return (
    <Modal visible={aberto} transparent animationType="fade" onRequestClose={onFechar}>
      <BlurView
        intensity={40}
        tint="dark"
        blurMethod="dimezisBlurView"
        blurTarget={blurTarget}
        style={styles.fundo}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} />
        <Pressable style={styles.folha} onPress={(e) => e.stopPropagation()}>
          <View style={styles.cabecalho}>
            {titulo ? (
              <Text style={styles.titulo} numberOfLines={1}>
                {titulo}
              </Text>
            ) : (
              <View />
            )}
            <Pressable
              style={styles.fecharBotao}
              onPress={onFechar}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            >
              <X size={16} color={cores.slate400} />
            </Pressable>
          </View>
          {itens.map((item) => (
            <Pressable
              key={item.rotulo}
              style={styles.item}
              onPress={() => {
                onFechar();
                item.onPress();
              }}
            >
              <View style={styles.itemIcone}>
                {item.Icone ? (
                  <item.Icone
                    size={18}
                    color={item.cor ?? (item.destrutivo ? cores.destrutivoIcone : cores.slate400)}
                  />
                ) : null}
              </View>
              <Text
                style={[
                  styles.itemTexto,
                  item.destrutivo && styles.itemTextoDestrutivo,
                  item.cor ? { color: item.cor } : null,
                ]}
              >
                {item.rotulo}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  folha: {
    backgroundColor: "#12161f",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 34,
    gap: 2,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 12,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: cores.linhaSutil,
  },
  titulo: { flex: 1, fontSize: 17, fontWeight: "700", color: cores.branco },
  fecharBotao: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: raio.campo,
    paddingHorizontal: 8,
    paddingVertical: 13,
  },
  itemIcone: { width: 20, alignItems: "center" },
  itemTexto: { flex: 1, fontSize: 16, fontWeight: "600", color: cores.slate200 },
  itemTextoDestrutivo: { color: cores.destrutivoTexto },
});
