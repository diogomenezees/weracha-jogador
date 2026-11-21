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
// Vocabulário: "patrocinador". Spec: weracha-site/docs/especificacao/20-assinatura-pro.md.

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

// Pílula do plano do grupo, à direita das de esporte/horários e no MESMO formato
// delas, mudando só a cor (decidido 2026-11-20): PRO laranja (tocar mostra quem
// patrocina) e FREE cinza (tocar abre o modal com "Conhecer o Pro").
// Grupo sem Pro ganha o selo FREE. Os dois valem com a cobrança ligada ou não.
export function SeloPro({
  pro,
  meuId,
  style,
  semFree,
}: {
  pro: EstadoProGrupo | null | undefined;
  meuId?: string;
  style?: StyleProp<ViewStyle>;
  // Sem o FREE (ex.: lista da própria tela Assinatura, onde ele levaria pra ela mesma).
  semFree?: boolean;
}) {
  const { avisar, confirmar } = useDialogos();
  // O selo mostra o estado real do grupo (PRO ou FREE), com a chave "Cobrança do
  // Pro" ligada ou não (decidido 2026-11-20). COBRANCA_DESLIGADA só chega de telas
  // que ainda usam o estado de comunicação: aí não desenha nada. null: nada.
  if (!pro || pro.origem === "COBRANCA_DESLIGADA") return null;
  if (!pro.pro) {
    if (semFree) return null;
    // Selo FREE (decidido 2026-11-20): cinza e discreto, no mesmo lugar do PRO.
    // Tocar explica e leva pra assinatura. Espelha SeloFree do site.
    return (
      <Pressable
        onPress={() =>
          confirmar({
            eyebrow: "Assinatura",
            titulo: "Grupo no plano Free",
            descricao: "Com o Pro, cada gol vai pra nuvem pro grupo todo assistir.",
            confirmarLabel: "Conhecer o Pro",
            Icone: Crown,
            onConfirmar: () => router.push("/assinatura"),
          })
        }
        accessibilityRole="button"
        accessibilityLabel="Grupo no plano Free"
        hitSlop={8}
        // Apagado em repouso; pressionado ganha o cinza cheio (igual ao hover do site).
        style={({ pressed }) => [styles.selo, styles.seloFree, pressed && styles.seloFreePressionado, style]}
      >
        {({ pressed }) => (
          <>
            <Crown size={12} color={pressed ? cores.slate300 : cores.zinc500} />
            <Text style={[styles.seloTexto, styles.seloFreeTexto, pressed && styles.seloFreeTextoPressionado]}>
              Free
            </Text>
          </>
        )}
      </Pressable>
    );
  }
  const texto = textoDoPatrocinio(pro, meuId) + (pro.ate ? `. Pro até ${dataCurta(pro.ate)}.` : ".");
  return (
    <Pressable
      onPress={() => avisar("Grupo Pro", texto, { eyebrow: "Assinatura", Icone: Crown })}
      accessibilityRole="button"
      accessibilityLabel={`Grupo Pro. ${texto}`}
      hitSlop={8}
      style={[styles.selo, style]}
    >
      <Crown size={12} color={cores.branco} />
      <Text style={styles.seloTexto}>Pro</Text>
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
  // Mesmo desenho das pílulas da tela do grupo (Horários, quadra).
  selo: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    backgroundColor: cores.orange,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  seloTexto: { color: cores.branco, fontSize: 12, fontWeight: "600" },
  // Em repouso, igual ao infoPill do resultado (data, sorteio).
  seloFree: {
    gap: 4,
    paddingVertical: 5,
    backgroundColor: "rgba(113, 113, 122, 0.15)",
  },
  seloFreePressionado: { backgroundColor: "rgba(255,255,255,0.1)" },
  seloFreeTexto: { color: cores.zinc500, fontWeight: "400" },
  seloFreeTextoPressionado: { color: cores.slate300 },
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
