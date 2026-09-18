import { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { Text } from "@/ui/Texto";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ModalCartao } from "@/grupo/modais";
import { Calendar } from "@/ui/Icone";
import { DIAS_SEMANA } from "@/partidas";
import { cores, raio } from "@/tema";
import { useBlurTarget } from "@/ui/BlurTarget";

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
          // "spinner" no Android é o diálogo clássico (sem o cabeçalho azul do
          // Material Design), pra combinar com o resto do app em vez de puxar
          // a cor padrão do sistema.
          display="spinner"
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
            accentColor={cores.teal}
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
          display="spinner"
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
  const passo = 5;
  const minimo = 10;
  const maximo = 300; // 5 horas
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>Duração</Text>
      <View style={styles.stepper}>
        <Pressable
          style={styles.stepBtn}
          onPress={() => onChange(Math.max(minimo, min - passo))}
        >
          <Text style={styles.stepBtnTexto}>−</Text>
        </Pressable>
        <Text style={styles.stepValor}>{min} min</Text>
        <Pressable style={styles.stepBtn} onPress={() => onChange(Math.min(maximo, min + passo))}>
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
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Campo label="Dia da semana" valor={capitalizar(DIAS_SEMANA[dia] ?? "")} onPress={() => setAberto(true)} />
      <ModalCartao aberto={aberto} onFechar={() => setAberto(false)}>
        <View style={styles.modalListaTituloLinha}>
          <Calendar size={18} color={cores.teal} />
          <Text style={styles.modalListaTitulo}>Dia da semana</Text>
        </View>
        <Text style={styles.modalListaDescricao}>
          Toda semana, nesse dia, o grupo recebe uma partida nova automaticamente, no
          horário definido abaixo.
        </Text>
        <ScrollView style={{ maxHeight: 280 }}>
          {DIAS_SEMANA.map((nome, i) => (
            <Pressable
              key={nome}
              style={[styles.opcao, i === dia && styles.opcaoAtiva]}
              onPress={() => {
                onChange(i);
                setAberto(false);
              }}
            >
              <Text style={styles.opcaoTexto}>{capitalizar(nome)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </ModalCartao>
    </>
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
  const blurTarget = useBlurTarget();
  return (
    <Modal visible={aberto} transparent animationType="fade" onRequestClose={onFechar}>
      <BlurView
        intensity={40}
        tint="dark"
        blurMethod="dimezisBlurView"
        blurTarget={blurTarget}
        style={styles.modalFundo}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onFechar} />
        <Pressable style={styles.modalCartao} onPress={(e) => e.stopPropagation()}>
          {children}
          <Pressable style={styles.modalOk} onPress={onFechar}>
            <Text style={styles.modalOkTexto}>Pronto</Text>
          </Pressable>
        </Pressable>
      </BlurView>
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
  modalListaTituloLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalListaTitulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  modalListaDescricao: { fontSize: 14, lineHeight: 20, color: cores.slate400, marginBottom: 6 },
  opcao: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: raio.campo,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  opcaoAtiva: { borderColor: cores.teal, backgroundColor: cores.avisoFundo },
  opcaoTexto: { fontSize: 15, color: cores.branco },
  modalFundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 24 },
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
