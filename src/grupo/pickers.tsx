import { useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { Text } from "@/ui/Texto";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ModalCartao } from "@/grupo/modais";
import { Calendar, Clock, type LucideIcon } from "@/ui/Icone";
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
          onValueChange={(_, d) => {
            setAberto(false);
            aplicar(d);
          }}
          onDismiss={() => setAberto(false)}
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
            onValueChange={(_, d) => aplicar(d)}
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

  return (
    <>
      <Campo label={label} valor={hhmm} onPress={() => setAberto(true)} />
      {/* Monta só aberto: cada abertura começa da hora atual do campo. */}
      {aberto && (
        <ModalHora
          titulo={label}
          hhmm={hhmm}
          onFechar={() => setAberto(false)}
          onConfirmar={(novo) => {
            onChange(novo);
            setAberto(false);
          }}
        />
      )}
    </>
  );
}

const ALTURA_ITEM_HORA = 44;
const HORAS = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS = Array.from({ length: 60 }, (_, i) => i);

const doisDigitos = (n: number) => String(n).padStart(2, "0");

// Seletor de hora próprio (duas colunas, hora e minuto), no lugar do diálogo nativo do
// Android: o nativo vem cinza, com botões pretos, e não dá pra pintar com o tema do app.
function ModalHora({
  titulo,
  hhmm,
  onFechar,
  onConfirmar,
}: {
  titulo: string;
  hhmm: string;
  onFechar: () => void;
  onConfirmar: (hhmm: string) => void;
}) {
  const [h0, m0] = hhmm.split(":").map(Number);
  const [hora, setHora] = useState(Number.isFinite(h0) ? h0 : 0);
  const [minuto, setMinuto] = useState(Number.isFinite(m0) ? m0 : 0);

  return (
    <ModalCartao aberto onFechar={onFechar}>
      <View style={styles.modalListaTituloLinha}>
        <Clock size={18} color={cores.teal} />
        <Text style={styles.modalListaTitulo}>{titulo}</Text>
      </View>
      <Text style={styles.horaGrande}>
        {doisDigitos(hora)}:{doisDigitos(minuto)}
      </Text>
      <View style={styles.horaColunas}>
        <ColunaHora rotulo="Hora" valores={HORAS} selecionado={hora} onEscolher={setHora} />
        <ColunaHora rotulo="Minuto" valores={MINUTOS} selecionado={minuto} onEscolher={setMinuto} />
      </View>
      <View style={styles.horaAcoes}>
        <Pressable style={styles.horaCancelar} onPress={onFechar}>
          <Text style={styles.horaCancelarTexto}>Cancelar</Text>
        </Pressable>
        <Pressable
          style={styles.horaConfirmar}
          onPress={() => onConfirmar(`${doisDigitos(hora)}:${doisDigitos(minuto)}`)}
        >
          <Text style={styles.horaConfirmarTexto}>Confirmar</Text>
        </Pressable>
      </View>
    </ModalCartao>
  );
}

function ColunaHora({
  rotulo,
  valores,
  selecionado,
  onEscolher,
}: {
  rotulo: string;
  valores: number[];
  selecionado: number;
  onEscolher: (v: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={styles.horaRotulo}>{rotulo}</Text>
      <ScrollView
        ref={scrollRef}
        style={styles.horaLista}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        // Abre já com o valor atual no meio da lista.
        onLayout={() =>
          scrollRef.current?.scrollTo({
            y: Math.max(0, (selecionado - 2) * ALTURA_ITEM_HORA),
            animated: false,
          })
        }
      >
        {valores.map((v) => (
          <Pressable
            key={v}
            style={[styles.horaItem, v === selecionado && styles.opcaoAtiva]}
            onPress={() => onEscolher(v)}
          >
            <Text style={[styles.horaItemTexto, v === selecionado && styles.horaItemTextoAtivo]}>
              {doisDigitos(v)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
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
      <ModalEscolha
        aberto={aberto}
        onFechar={() => setAberto(false)}
        Icone={Calendar}
        titulo="Dia da semana"
        descricao="Toda semana, nesse dia, o grupo recebe uma partida nova automaticamente, no horário definido abaixo."
        opcoes={DIAS_SEMANA.map((nome) => capitalizar(nome))}
        selecionado={dia}
        onEscolher={onChange}
      />
    </>
  );
}

// Lista de opções num modal (título com ícone, descrição opcional e a opção atual
// destacada em teal). Usado pelo dia da semana e pela escolha de esporte dos
// artilheiros, no lugar do Alert.alert nativo (caixa branca, corta em 3 botões).
export function ModalEscolha({
  aberto,
  onFechar,
  Icone,
  titulo,
  descricao,
  opcoes,
  selecionado,
  onEscolher,
}: {
  aberto: boolean;
  onFechar: () => void;
  Icone: LucideIcon;
  titulo: string;
  descricao?: string;
  /** Rótulos, na ordem; `onEscolher` recebe o índice da opção tocada. */
  opcoes: string[];
  selecionado: number;
  onEscolher: (indice: number) => void;
}) {
  return (
    <ModalCartao aberto={aberto} onFechar={onFechar}>
      <View style={styles.modalListaTituloLinha}>
        <Icone size={18} color={cores.teal} />
        <Text style={styles.modalListaTitulo}>{titulo}</Text>
      </View>
      {descricao ? <Text style={styles.modalListaDescricao}>{descricao}</Text> : null}
      <ScrollView style={{ maxHeight: 280 }}>
        {opcoes.map((rotulo, i) => (
          <Pressable
            key={`${i}-${rotulo}`}
            style={[styles.opcao, i === selecionado && styles.opcaoAtiva]}
            onPress={() => {
              onEscolher(i);
              onFechar();
            }}
          >
            <Text style={styles.opcaoTexto}>{rotulo}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </ModalCartao>
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
  horaGrande: {
    fontSize: 40,
    fontWeight: "700",
    color: cores.teal,
    textAlign: "center",
    letterSpacing: 2,
  },
  horaColunas: { flexDirection: "row", gap: 12 },
  horaRotulo: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: cores.slate400,
    textAlign: "center",
    textTransform: "uppercase",
  },
  horaLista: { height: ALTURA_ITEM_HORA * 5 },
  horaItem: {
    height: ALTURA_ITEM_HORA,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "transparent",
  },
  horaItemTexto: { fontSize: 20, color: cores.slate400 },
  horaItemTextoAtivo: { color: cores.branco, fontWeight: "700" },
  horaAcoes: { flexDirection: "row", gap: 10 },
  horaCancelar: {
    flex: 1,
    height: 46,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    alignItems: "center",
    justifyContent: "center",
  },
  horaCancelarTexto: { fontSize: 15, color: cores.slate300 },
  horaConfirmar: {
    flex: 1,
    height: 46,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  horaConfirmarTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
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
