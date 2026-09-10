import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { DIAS_SEMANA } from "@/partidas";
import { cores, raio } from "@/tema";

// Seletores de data / hora / duração / dia da semana, reusados por "Criar
// grupo" e pelo modal "Adicionar partida" da tela do grupo. O site usa
// <input type=date/time> + <select>; no RN a data e a hora vão por
// DateTimePicker (dialog no Android, spinner num Modal no iOS).

function Campo({ label, valor, onPress }: { label: string; valor: string; onPress: () => void }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.caixa} onPress={onPress}>
        <Text style={styles.valor}>{valor}</Text>
      </Pressable>
    </View>
  );
}

function partesData(iso: string): [number, number, number] {
  const [a, m, d] = iso.split("-").map(Number);
  return [a, m, d];
}

/** `iso` = "AAAA-MM-DD". */
export function SeletorData({
  iso,
  onChange,
  label = "Data",
}: {
  iso: string;
  onChange: (iso: string) => void;
  label?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [ano, mes, dia] = partesData(iso);
  const valorData = new Date(ano, mes - 1, dia);

  function aplicar(d: Date) {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    onChange(`${d.getFullYear()}-${mm}-${dd}`);
  }

  const rotulo = `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${ano}`;

  return (
    <>
      <Campo label={label} valor={rotulo} onPress={() => setAberto(true)} />
      {aberto && Platform.OS === "android" && (
        <DateTimePicker
          value={valorData}
          mode="date"
          onChange={(_, d) => {
            setAberto(false);
            if (d) aplicar(d);
          }}
        />
      )}
      {Platform.OS === "ios" && (
        <ModalPicker aberto={aberto} onFechar={() => setAberto(false)}>
          <DateTimePicker
            value={valorData}
            mode="date"
            display="inline"
            themeVariant="dark"
            onChange={(_, d) => d && aplicar(d)}
          />
        </ModalPicker>
      )}
    </>
  );
}

/** `hhmm` = "HH:MM". */
export function SeletorHora({
  hhmm,
  onChange,
  label = "Início",
}: {
  hhmm: string;
  onChange: (hhmm: string) => void;
  label?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [h, m] = hhmm.split(":").map(Number);
  const valor = new Date(2000, 0, 1, h || 0, m || 0);

  function aplicar(d: Date) {
    onChange(
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    );
  }

  return (
    <>
      <Campo label={label} valor={hhmm} onPress={() => setAberto(true)} />
      {aberto && Platform.OS === "android" && (
        <DateTimePicker
          value={valor}
          mode="time"
          is24Hour
          onChange={(_, d) => {
            setAberto(false);
            if (d) aplicar(d);
          }}
        />
      )}
      {Platform.OS === "ios" && (
        <ModalPicker aberto={aberto} onFechar={() => setAberto(false)}>
          <DateTimePicker
            value={valor}
            mode="time"
            is24Hour
            display="spinner"
            themeVariant="dark"
            onChange={(_, d) => d && aplicar(d)}
          />
        </ModalPicker>
      )}
    </>
  );
}

export function SeletorDuracao({
  min,
  onChange,
}: {
  min: number;
  onChange: (min: number) => void;
}) {
  const passo = 15;
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>Duração</Text>
      <View style={styles.stepper}>
        <Pressable
          style={styles.stepBtn}
          onPress={() => onChange(Math.max(passo, min - passo))}
        >
          <Text style={styles.stepBtnTexto}>−</Text>
        </Pressable>
        <Text style={styles.stepValor}>{min} min</Text>
        <Pressable style={styles.stepBtn} onPress={() => onChange(min + passo)}>
          <Text style={styles.stepBtnTexto}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function SeletorDiaSemana({
  dia,
  onChange,
}: {
  dia: number;
  onChange: (dia: number) => void;
}) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>Dia da semana</Text>
      <View style={styles.dias}>
        {DIAS_SEMANA.map((nome, i) => (
          <Pressable
            key={nome}
            style={[styles.diaChip, i === dia && styles.diaChipAtivo]}
            onPress={() => onChange(i)}
          >
            <Text style={[styles.diaTexto, i === dia && styles.diaTextoAtivo]}>
              {nome.charAt(0).toUpperCase() + nome.slice(1, 3)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ModalPicker({
  aberto,
  onFechar,
  children,
}: {
  aberto: boolean;
  onFechar: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={aberto} transparent animationType="fade" onRequestClose={onFechar}>
      <Pressable style={styles.modalFundo} onPress={onFechar}>
        <Pressable style={styles.modalCartao} onPress={(e) => e.stopPropagation()}>
          {children}
          <Pressable style={styles.modalOk} onPress={onFechar}>
            <Text style={styles.modalOkTexto}>Pronto</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  campo: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: cores.slate300 },
  caixa: {
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  valor: { fontSize: 16, color: cores.branco },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    overflow: "hidden",
  },
  stepBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  stepBtnTexto: { fontSize: 22, color: cores.teal },
  stepValor: { flex: 1, textAlign: "center", fontSize: 15, color: cores.branco },
  dias: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  diaChip: {
    minWidth: 44,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    alignItems: "center",
  },
  diaChipAtivo: { backgroundColor: cores.teal, borderColor: cores.teal },
  diaTexto: { fontSize: 13, color: cores.slate300 },
  diaTextoAtivo: { color: cores.dark, fontWeight: "700" },
  modalFundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 24 },
  modalCartao: { backgroundColor: cores.dark, borderRadius: raio.card, padding: 16, gap: 12 },
  modalOk: {
    height: 44,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOkTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
});
