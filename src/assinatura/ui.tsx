import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { router } from "expo-router";

import type { EstadoProGrupo, ResumoPro } from "@/contrato/tipos";
import { cores, raio } from "@/tema";
import { ChevronRight, Cloud, Crown, HeartHandshake } from "@/ui/Icone";
import { Text } from "@/ui/Texto";
import { useDialogos } from "@/ui/Dialogos";

// Selo PRO, banner de assinatura e card de entrada da tela Assinatura. Espelham
// weracha-site/components/{selo-pro,banner-pro}.tsx. Quem decide SE aparece é o
// servidor (bannerPro da tela do grupo, ResumoPro); estes componentes só desenham.
// Vocabulário: "patrocinador". Spec: weracha-site/docs/pendente/01-assinatura-pro.md.

export function dataCurta(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function textoDoPatrocinio(pro: EstadoProGrupo, meuId?: string): string {
  if (pro.origem === "CORTESIA") return "Cortesia do We Racha";
  if (pro.patrocinador) {
    return pro.patrocinador.id === meuId ? "Patrocinado por você" : `Patrocinado por ${pro.patrocinador.nome}`;
  }
  return "Grupo Pro";
}

// Badge laranja forte abaixo do nome do grupo. Tocar mostra quem patrocina.
// Some com a cobrança desligada no /admin (aí todo grupo é Pro).
export function SeloPro({
  pro,
  meuId,
  style,
}: {
  pro: EstadoProGrupo | null | undefined;
  meuId?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { avisar } = useDialogos();
  if (!pro?.pro || pro.origem === "COBRANCA_DESLIGADA") return null;
  const texto = textoDoPatrocinio(pro, meuId) + (pro.ate ? `. Pro até ${dataCurta(pro.ate)}.` : ".");
  return (
    <Pressable
      onPress={() => avisar("Grupo Pro", texto, { eyebrow: "Assinatura", Icone: Crown })}
      accessibilityRole="button"
      accessibilityLabel={`Grupo Pro. ${texto}`}
      hitSlop={8}
      style={[styles.selo, style]}
    >
      <Crown size={11} color={cores.branco} />
      <Text style={styles.seloTexto}>PRO</Text>
    </Pressable>
  );
}

export function BannerPro({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={() => router.push("/assinatura")} style={[styles.banner, style]}>
      <Cloud size={20} color={cores.orange} />
      <View style={styles.flex}>
        <Text style={styles.bannerTitulo}>Seja o patrocinador dos replays do seu grupo</Text>
        <Text style={styles.bannerTexto}>
          Com o Pro, cada gol gravado vai pra nuvem e a galera toda assiste, comenta e baixa.
        </Text>
      </View>
      <ChevronRight size={16} color={cores.orange} />
    </Pressable>
  );
}

// Card fixo da tela Assinatura (painel acima de "Seus grupos", perfil). Muda o
// texto com a situação; vira o banner pra quem ainda não tem Pro em nenhum grupo.
export function CardAssinatura({ resumo, style }: { resumo: ResumoPro | null; style?: StyleProp<ViewStyle> }) {
  if (!resumo?.mostrarEntradas) return null;
  if (resumo.mostrarBannerGeral) return <BannerPro style={style} />;
  const Icone = resumo.ehPatrocinador ? HeartHandshake : Crown;
  const titulo = resumo.ehPatrocinador
    ? `Você patrocina ${resumo.vagas.usadas} de ${resumo.vagas.max} grupos`
    : "Seu grupo é Pro";
  const texto = resumo.ehPatrocinador
    ? "Veja seus grupos e patrocine outros."
    : "Os gols do racha vão pra nuvem. Veja a assinatura.";
  return (
    <Pressable onPress={() => router.push("/assinatura")} style={[styles.card, style]}>
      <Icone size={20} color={cores.orange} />
      <View style={styles.flex}>
        <Text style={styles.bannerTitulo}>{titulo}</Text>
        <Text style={styles.cardTexto}>{texto}</Text>
      </View>
      <ChevronRight size={16} color={cores.slate500} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  selo: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: cores.orange,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  seloTexto: { color: cores.branco, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(242,140,30,0.4)",
    backgroundColor: "rgba(242,140,30,0.1)",
    borderRadius: raio.card,
    padding: 14,
  },
  bannerTitulo: { color: cores.branco, fontSize: 14, fontWeight: "600" },
  bannerTexto: { color: cores.slate300, fontSize: 12, marginTop: 2 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: raio.card,
    padding: 14,
  },
  cardTexto: { color: cores.slate400, fontSize: 12, marginTop: 2 },
});
