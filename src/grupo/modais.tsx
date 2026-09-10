import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { cores, raio } from "@/tema";

// Modais reusados pela tela do grupo. Cartão centralizado sobre um fundo
// escurecido, no mesmo espírito do DialogConfirmar / Dialog do site.

function Base({
  aberto,
  onFechar,
  children,
}: {
  aberto: boolean;
  onFechar: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={aberto} transparent animationType="fade" onRequestClose={onFechar}>
      <Pressable style={styles.fundo} onPress={onFechar}>
        <Pressable style={styles.cartao} onPress={(e) => e.stopPropagation()}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function ModalConfirmar({
  aberto,
  eyebrow,
  titulo,
  descricao,
  confirmarLabel = "Confirmar",
  cancelarLabel = "Cancelar",
  destrutivo = false,
  ocupado = false,
  erro,
  onConfirmar,
  onFechar,
}: {
  aberto: boolean;
  eyebrow: string;
  titulo: string;
  descricao: ReactNode;
  confirmarLabel?: string;
  cancelarLabel?: string;
  destrutivo?: boolean;
  ocupado?: boolean;
  erro?: string | null;
  onConfirmar: () => void;
  onFechar: () => void;
}) {
  return (
    <Base aberto={aberto} onFechar={onFechar}>
      <Text style={[styles.eyebrow, destrutivo && { color: cores.erroTexto }]}>{eyebrow}</Text>
      <Text style={styles.titulo}>{titulo}</Text>
      {typeof descricao === "string" ? (
        <Text style={styles.descricao}>{descricao}</Text>
      ) : (
        descricao
      )}
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      <View style={styles.acoes}>
        <Pressable style={styles.btnSecundario} onPress={onFechar} disabled={ocupado}>
          <Text style={styles.btnSecundarioTexto}>{cancelarLabel}</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPrimario, destrutivo && styles.btnDestrutivo, ocupado && styles.inativo]}
          onPress={onConfirmar}
          disabled={ocupado}
        >
          {ocupado ? (
            <ActivityIndicator color={destrutivo ? cores.branco : cores.dark} />
          ) : (
            <Text style={[styles.btnPrimarioTexto, destrutivo && { color: cores.branco }]}>
              {confirmarLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </Base>
  );
}

export function ModalTexto({
  aberto,
  eyebrow,
  titulo,
  descricao,
  placeholder,
  valor,
  onChangeValor,
  salvarLabel = "Salvar",
  ocupado = false,
  erro,
  destrutivo = false,
  multiline = true,
  onSalvar,
  onFechar,
}: {
  aberto: boolean;
  eyebrow: string;
  titulo: string;
  descricao?: string;
  placeholder?: string;
  valor: string;
  onChangeValor: (v: string) => void;
  salvarLabel?: string;
  ocupado?: boolean;
  erro?: string | null;
  destrutivo?: boolean;
  multiline?: boolean;
  onSalvar: () => void;
  onFechar: () => void;
}) {
  return (
    <Base aberto={aberto} onFechar={onFechar}>
      <Text style={[styles.eyebrow, destrutivo && { color: cores.erroTexto }]}>{eyebrow}</Text>
      <Text style={styles.titulo}>{titulo}</Text>
      {descricao ? <Text style={styles.descricao}>{descricao}</Text> : null}
      <TextInput
        value={valor}
        onChangeText={onChangeValor}
        placeholder={placeholder}
        placeholderTextColor={cores.slate500}
        multiline={multiline}
        style={[styles.textarea, !multiline && styles.textinput]}
        editable={!ocupado}
      />
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      <View style={styles.acoes}>
        <Pressable style={styles.btnSecundario} onPress={onFechar} disabled={ocupado}>
          <Text style={styles.btnSecundarioTexto}>Cancelar</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPrimario, ocupado && styles.inativo]}
          onPress={onSalvar}
          disabled={ocupado}
        >
          {ocupado ? (
            <ActivityIndicator color={cores.dark} />
          ) : (
            <Text style={styles.btnPrimarioTexto}>{salvarLabel}</Text>
          )}
        </Pressable>
      </View>
    </Base>
  );
}

export function ModalCartao({
  aberto,
  onFechar,
  children,
}: {
  aberto: boolean;
  onFechar: () => void;
  children: ReactNode;
}) {
  return (
    <Base aberto={aberto} onFechar={onFechar}>
      {children}
    </Base>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 24,
  },
  cartao: {
    backgroundColor: "#12161f",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 22,
    gap: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  titulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  descricao: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  erro: { fontSize: 13, color: cores.erroTexto },
  textarea: {
    minHeight: 96,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    padding: 12,
    fontSize: 15,
    color: cores.branco,
    textAlignVertical: "top",
  },
  textinput: { minHeight: 0, height: 48, textAlignVertical: "center" },
  acoes: { flexDirection: "row", gap: 10, marginTop: 6 },
  btnSecundario: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecundarioTexto: { fontSize: 15, fontWeight: "600", color: cores.branco },
  btnPrimario: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDestrutivo: { backgroundColor: "#dc2626" },
  btnPrimarioTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
  inativo: { opacity: 0.6 },
});
