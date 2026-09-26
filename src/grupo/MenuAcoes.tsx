import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import { cores, raio } from "@/tema";
import { FolhaArrastavel } from "@/ui/FolhaArrastavel";
import type { LucideIcon } from "@/ui/Icone";

// Menu "mais opções" do app, no lugar do dropdown do site (o `Alert.alert`
// do RN só mostra 3 botões no Android). Bottom sheet arrastável pela folha
// inteira (ver src/ui/FolhaArrastavel.tsx), itens agrupados num cartão. O
// item escolhido roda a ação depois da folha sair, pra não empilhar este
// Modal com o próximo que a ação costuma abrir (confirmação, edição).

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
  IconeTitulo,
  itens,
  onFechar,
}: {
  aberto: boolean;
  titulo?: string;
  /** Ícone ao lado do título (ex.: Users no menu do grupo). */
  IconeTitulo?: LucideIcon;
  itens: ItemMenu[];
  onFechar: () => void;
}) {
  return (
    <FolhaArrastavel
      aberto={aberto}
      onFechar={onFechar}
      topo={
        titulo ? (
          <View style={styles.tituloLinha}>
            {IconeTitulo ? <IconeTitulo size={16} color={cores.slate400} /> : null}
            <Text style={styles.titulo} numberOfLines={1}>
              {titulo}
            </Text>
          </View>
        ) : null
      }
    >
      {(fechar) => (
        <View style={styles.lista}>
          {itens.map((item, i) => (
            <Pressable
              key={item.rotulo}
              style={({ pressed }) => [
                styles.item,
                i > 0 && styles.itemComDivisor,
                pressed && styles.itemPressionado,
              ]}
              onPress={() => fechar(item.onPress)}
            >
              <View style={styles.itemIcone}>
                {item.Icone ? (
                  <item.Icone
                    size={18}
                    color={item.cor ?? (item.destrutivo ? cores.destrutivoIcone : cores.slate300)}
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
        </View>
      )}
    </FolhaArrastavel>
  );
}

const styles = StyleSheet.create({
  tituloLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingBottom: 12,
  },
  titulo: { flexShrink: 1, fontSize: 15, fontWeight: "600", color: cores.slate400 },
  // Itens agrupados num cartão, como as action sheets do iOS / Material 3.
  lista: {
    borderRadius: raio.campo + 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  itemComDivisor: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.08)" },
  itemPressionado: { backgroundColor: "rgba(255,255,255,0.06)" },
  itemIcone: { width: 20, alignItems: "center" },
  itemTexto: { flex: 1, fontSize: 16, fontWeight: "600", color: cores.slate200 },
  itemTextoDestrutivo: { color: cores.destrutivoTexto },
});
