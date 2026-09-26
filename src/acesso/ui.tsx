import { type ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import { Text } from "@/ui/Texto";

import { cores, raio, tipografia } from "@/tema";
import { ChevronDown, Eye, EyeOff } from "@/ui/Icone";

// Peças de UI da tela de acesso, espelhando o site (weracha-site/app/login e
// /esqueci-senha): card com borda teal, eyebrow com barrinha laranja, campos
// h-12, caixa de aviso teal, caixa de erro vermelha, botão laranja.

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <View style={styles.eyebrowLinha}>
      <View style={styles.eyebrowBarra} />
      <Text style={tipografia.eyebrow}>{children}</Text>
    </View>
  );
}

export function Cartao({ children }: { children: ReactNode }) {
  return <View style={styles.cartao}>{children}</View>;
}

export function Campo(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={cores.slate500}
      {...props}
      style={[styles.campo, props.style]}
    />
  );
}

export function CampoComRotulo({
  rotulo,
  ...props
}: TextInputProps & { rotulo: string }) {
  return (
    <View style={styles.campoBloco}>
      <Text style={tipografia.rotulo}>{rotulo}</Text>
      <Campo {...props} />
    </View>
  );
}

/**
 * Telefone com o país na frente, no formato de "select" (bandeira + DDI). Por
 * enquanto só existe o Brasil: o toque em `onPais` abre um menu com essa
 * única opção, pra deixar claro que o app é só pra números brasileiros.
 */
export function CampoTelefone({
  rotulo,
  onPais,
  ...props
}: TextInputProps & { rotulo: string; onPais: () => void }) {
  const inativo = props.editable === false;
  return (
    <View style={styles.campoBloco}>
      <Text style={tipografia.rotulo}>{rotulo}</Text>
      <View style={[styles.campo, styles.campoComAcessorio]}>
        <Pressable
          onPress={onPais}
          disabled={inativo}
          hitSlop={4}
          style={styles.pais}
          accessibilityRole="button"
          accessibilityLabel="País: Brasil, +55"
        >
          <Text style={styles.bandeira}>🇧🇷</Text>
          <Text style={styles.ddi}>+55</Text>
          <ChevronDown size={14} color={cores.slate500} />
        </Pressable>
        <View style={styles.divisor} />
        <TextInput
          placeholderTextColor={cores.slate500}
          {...props}
          style={[styles.campoInterno, props.style]}
        />
      </View>
    </View>
  );
}

export function CampoSenha({
  rotulo,
  mostrar,
  onAlternar,
  ...props
}: TextInputProps & { rotulo: string; mostrar: boolean; onAlternar: () => void }) {
  const Olho = mostrar ? EyeOff : Eye;
  return (
    <View style={styles.campoBloco}>
      <Text style={tipografia.rotulo}>{rotulo}</Text>
      <View style={[styles.campo, styles.campoComAcessorio, styles.campoSenha]}>
        <TextInput
          placeholderTextColor={cores.slate500}
          secureTextEntry={!mostrar}
          autoCapitalize="none"
          autoCorrect={false}
          {...props}
          style={[styles.campoInterno, props.style]}
        />
        <Pressable
          onPress={onAlternar}
          hitSlop={8}
          style={styles.olho}
          accessibilityRole="button"
          accessibilityLabel={mostrar ? "Ocultar senha" : "Mostrar senha"}
        >
          <Olho size={20} color={cores.slate400} />
        </Pressable>
      </View>
    </View>
  );
}

export function Aviso({ children }: { children: ReactNode }) {
  return (
    <View style={styles.aviso}>
      <View style={styles.avisoPonto} />
      <Text style={[tipografia.corpo, styles.avisoTexto]}>{children}</Text>
    </View>
  );
}

export function CaixaErro({ children }: { children: ReactNode }) {
  return (
    <View style={styles.erro}>
      <Text style={styles.erroTexto}>{children}</Text>
    </View>
  );
}

export function BotaoPrimario({
  titulo,
  onPress,
  carregando,
  desabilitado,
}: {
  titulo: string;
  onPress: () => void;
  carregando?: boolean;
  desabilitado?: boolean;
}) {
  const inativo = carregando || desabilitado;
  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [
        styles.botao,
        pressed && styles.botaoPressionado,
        inativo && styles.botaoInativo,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={cores.dark} />
      ) : (
        <Text style={styles.botaoTexto}>{titulo}</Text>
      )}
    </Pressable>
  );
}

export function LinkBotao({
  titulo,
  onPress,
  desabilitado,
}: {
  titulo: string;
  onPress: () => void;
  desabilitado?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={desabilitado} hitSlop={8}>
      <Text style={[styles.link, desabilitado && styles.linkInativo]}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrowLinha: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  eyebrowBarra: { width: 26, height: 1, backgroundColor: cores.orange },
  cartao: {
    width: "100%",
    maxWidth: 380,
    alignSelf: "center",
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    // Mesma cor do fundo da tela: o cartão se destaca só pela borda teal.
    backgroundColor: cores.dark,
    paddingHorizontal: 16,
    paddingVertical: 22,
    gap: 16,
  },
  campoBloco: { gap: 6 },
  campo: {
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 16,
    fontSize: 16,
    color: cores.branco,
  },
  campoComAcessorio: { flexDirection: "row", alignItems: "center" },
  campoInterno: { flex: 1, height: "100%", fontSize: 16, color: cores.branco, padding: 0 },
  campoSenha: { paddingRight: 4 },
  olho: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  pais: { flexDirection: "row", alignItems: "center", gap: 6, height: "100%" },
  bandeira: { fontSize: 18 },
  ddi: { fontSize: 16, color: cores.branco, fontWeight: "500" },
  divisor: { width: 1, height: 22, backgroundColor: cores.campoBorda, marginHorizontal: 12 },
  aviso: {
    flexDirection: "row",
    gap: 10,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    backgroundColor: cores.avisoFundo,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avisoPonto: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: cores.teal,
    marginTop: 6,
  },
  avisoTexto: { flex: 1 },
  erro: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.erroBorda,
    backgroundColor: cores.erroFundo,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  erroTexto: { color: cores.erroTexto, fontSize: 14, lineHeight: 20 },
  botao: {
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoInativo: { opacity: 0.6 },
  botaoPressionado: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  botaoTexto: { color: cores.dark, fontSize: 16, fontWeight: "700" },
  link: { color: cores.slate400, fontSize: 14 },
  linkInativo: { opacity: 0.5 },
});
