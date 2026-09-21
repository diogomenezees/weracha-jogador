import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/ui/Texto";

import { SeletorData } from "@/grupo/pickers";
import { hojeISO } from "@/partidas";
import { Check } from "@/ui/Icone";
import { cores } from "@/tema";

// Peças da tela /perfil. Espelham weracha-site/app/perfil/page.tsx: campos com
// rótulo pequeno acima e linha sutil embaixo (Telefone sem a linha, pra
// reforçar que só ele não muda por aqui).

export function CampoLeitura({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <View style={styles.campo}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <Text style={styles.valorFixo}>{valor}</Text>
      {nota ? <Text style={styles.nota}>{nota}</Text> : null}
    </View>
  );
}

export function CampoTexto({
  rotulo,
  valor,
  onChangeText,
  placeholder,
  erro,
  ...rest
}: {
  rotulo: string;
  valor: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  erro?: string | null;
} & Pick<
  React.ComponentProps<typeof TextInput>,
  "keyboardType" | "autoCapitalize" | "maxLength"
>) {
  return (
    <View style={styles.campo}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <TextInput
        value={valor}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={cores.slate500}
        style={styles.input}
        {...rest}
      />
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </View>
  );
}

// Data de nascimento é opcional. Sem data: "Não informada" + link pra informar.
// Com data: o SeletorData (calendário do app) + link pra remover.
export function CampoDataNascimento({
  iso,
  onChange,
  erro,
}: {
  iso: string | null;
  onChange: (iso: string | null) => void;
  erro?: string | null;
}) {
  if (!iso) {
    return (
      <View style={styles.campo}>
        <Text style={styles.rotulo}>Data de nascimento</Text>
        <View style={styles.linhaEntre}>
          <Text style={styles.valorFixo}>Não informada</Text>
          <Pressable hitSlop={8} onPress={() => onChange(padraoDataNascimento())}>
            <Text style={styles.link}>Informar</Text>
          </Pressable>
        </View>
        <Text style={styles.nota}>
          Opcional. Use sua data real. Não é permitido informar data falsa.
        </Text>
        {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      </View>
    );
  }
  return (
    <View style={styles.campo}>
      <View style={styles.linhaEntre}>
        <Text style={styles.rotulo}>Data de nascimento</Text>
        <Pressable hitSlop={8} onPress={() => onChange(null)}>
          <Text style={styles.link}>Remover</Text>
        </Pressable>
      </View>
      <SeletorData iso={iso} onChange={onChange} label="" titulo="Data de nascimento" maxIso={hojeISO()} />
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </View>
  );
}

export function Checkbox({
  marcado,
  onToggle,
  rotulo,
  desabilitado,
}: {
  marcado: boolean;
  onToggle: () => void;
  rotulo: string;
  desabilitado?: boolean;
}) {
  return (
    <Pressable
      style={styles.checkboxLinha}
      onPress={onToggle}
      disabled={desabilitado}
      hitSlop={6}
    >
      <View
        style={[
          styles.checkboxCaixa,
          marcado && styles.checkboxCaixaOn,
          desabilitado && styles.inativo,
        ]}
      >
        {marcado ? <Check size={12} color={cores.dark} /> : null}
      </View>
      <Text style={[styles.checkboxTexto, desabilitado && styles.inativo]}>{rotulo}</Text>
    </Pressable>
  );
}

// Abre o seletor num ano plausível de maioridade, não em "hoje".
function padraoDataNascimento(): string {
  const [a, m, d] = hojeISO().split("-").map(Number);
  return `${a - 25}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  campo: {
    gap: 4,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: cores.linhaSutil,
  },
  rotulo: { fontSize: 12, color: cores.slate500 },
  valorFixo: { fontSize: 16, color: cores.branco },
  nota: { fontSize: 12, color: cores.slate500 },
  erro: { fontSize: 12, color: cores.erroTexto },
  input: { fontSize: 16, color: cores.branco, paddingVertical: 4 },
  linhaEntre: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  link: { fontSize: 13, color: cores.teal },
  checkboxLinha: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  checkboxCaixa: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCaixaOn: { backgroundColor: cores.teal, borderColor: cores.teal },
  checkboxTexto: { flex: 1, fontSize: 13, color: cores.slate400 },
  inativo: { opacity: 0.4 },
});
