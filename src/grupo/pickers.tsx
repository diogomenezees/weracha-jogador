import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import { ModalCartao } from "@/grupo/modais";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Clock, type LucideIcon } from "@/ui/Icone";
import { DIAS_SEMANA } from "@/partidas";
import { cores, raio } from "@/tema";

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Seletores de data / hora / duração / dia da semana, reusados por "Criar
// grupo", pelo modal "Adicionar partida" da tela do grupo e pelo perfil. O site
// usa <input type=date/time> + <select>; no RN todos são modais próprios com o
// tema do app (o diálogo nativo do sistema vem cinza e não dá pra pintar).

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

/**
 * `iso` = "AAAA-MM-DD". `titulo` = cabeçalho do modal (padrão: o `label`, ou "Data").
 * `minIso` / `maxIso` = primeira e última data escolhíveis: as de fora ficam apagadas
 * no calendário.
 */
export function SeletorData({
  iso,
  onChange,
  label = "Data",
  titulo,
  minIso,
  maxIso,
}: {
  iso: string;
  onChange: (iso: string) => void;
  label?: string;
  titulo?: string;
  minIso?: string;
  maxIso?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [ano, mes, dia] = partesData(iso);

  const rotulo = `${doisDigitos(dia)}/${doisDigitos(mes)}/${ano}`;

  return (
    <>
      <Campo label={label} valor={rotulo} onPress={() => setAberto(true)} />
      {/* Monta só aberto: cada abertura começa da data atual do campo. */}
      {aberto && (
        <ModalData
          titulo={titulo ?? (label || "Data")}
          iso={iso}
          minIso={minIso}
          maxIso={maxIso}
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

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const INICIAIS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const ALTURA_DIA = 40;
const ALTURA_ANO = 44;
const GAP_ANO = 8;
const COLUNAS_ANO = 4;

// Mesmo desenho do ModalHora e do ModalDiaSemana: valor em destaque no topo, seleção
// ao toque e Cancelar/Confirmar. Tocar em "Mês Ano" troca pra grade de anos (a data de
// nascimento do perfil fica a décadas de distância, mês a mês seria inviável).
function ModalData({
  titulo,
  iso,
  minIso,
  maxIso,
  onFechar,
  onConfirmar,
}: {
  titulo: string;
  iso: string;
  minIso?: string;
  maxIso?: string;
  onFechar: () => void;
  onConfirmar: (iso: string) => void;
}) {
  // "AAAA-MM-DD" compara certo como texto. Se o campo ficou com uma data fora do
  // limite (ex.: tela aberta de um dia pro outro), o modal abre na data válida mais próxima.
  const inicial = minIso && iso < minIso ? minIso : maxIso && iso > maxIso ? maxIso : iso;
  const [a0, m0, d0] = partesData(inicial);
  const [sel, setSel] = useState({ ano: a0, mes: m0, dia: d0 });
  const [visao, setVisao] = useState({ ano: a0, mes: m0 });
  const [escolhendoAno, setEscolhendoAno] = useState(false);

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const ehHoje = (d: number) =>
    visao.ano === anoAtual && visao.mes === hoje.getMonth() + 1 && d === hoje.getDate();
  const ehSelecionado = (d: number) =>
    visao.ano === sel.ano && visao.mes === sel.mes && d === sel.dia;
  const isoDe = (ano: number, mes: number, dia: number) => `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
  const foraDoLimite = (d: number) => {
    const atual = isoDe(visao.ano, visao.mes, d);
    return (!!minIso && atual < minIso) || (!!maxIso && atual > maxIso);
  };
  const [minAno, minMes] = minIso ? partesData(minIso) : [-Infinity, 0];
  const [maxAno, maxMes] = maxIso ? partesData(maxIso) : [Infinity, 0];
  const noMesMinimo = visao.ano * 12 + visao.mes <= minAno * 12 + minMes;
  const noMesMaximo = visao.ano * 12 + visao.mes >= maxAno * 12 + maxMes;

  // Semana começa no domingo (igual DIAS_SEMANA). Sempre 6 linhas: o modal não pula
  // de altura ao trocar de mês.
  const primeiroDiaSemana = new Date(visao.ano, visao.mes - 1, 1).getDay();
  const diasNoMes = new Date(visao.ano, visao.mes, 0).getDate();
  const celulas: (number | null)[] = Array.from({ length: 42 }, (_, i) => {
    const d = i - primeiroDiaSemana + 1;
    return d >= 1 && d <= diasNoMes ? d : null;
  });
  const semanas = Array.from({ length: 6 }, (_, i) => celulas.slice(i * 7, i * 7 + 7));

  function mudarMes(delta: number) {
    setVisao(({ ano, mes }) => {
      const novo = new Date(ano, mes - 1 + delta, 1);
      return { ano: novo.getFullYear(), mes: novo.getMonth() + 1 };
    });
  }

  const anos = Array.from({ length: 106 }, (_, i) => anoAtual - 100 + i).filter((a) => a >= minAno && a <= maxAno);
  const scrollAnosRef = useRef<ScrollView>(null);
  const semanaSel = new Date(sel.ano, sel.mes - 1, sel.dia).getDay();

  return (
    <ModalCartao aberto onFechar={onFechar}>
      <View style={styles.modalListaTituloLinha}>
        <Calendar size={18} color={cores.teal} />
        <Text style={styles.modalListaTitulo}>{titulo}</Text>
      </View>
      <View style={styles.dataDestaque}>
        <Text style={styles.dataGrande}>
          {doisDigitos(sel.dia)}/{doisDigitos(sel.mes)}/{sel.ano}
        </Text>
        <Text style={styles.dataSemana}>{capitalizar(DIAS_SEMANA[semanaSel] ?? "")}</Text>
      </View>

      <View style={styles.dataCabecalho}>
        {escolhendoAno ? (
          <View style={styles.dataSeta} />
        ) : (
          <Pressable
            style={[styles.dataSeta, noMesMinimo && styles.dataSetaDesligada]}
            hitSlop={6}
            disabled={noMesMinimo}
            onPress={() => mudarMes(-1)}
          >
            <ChevronLeft size={18} color={cores.slate300} />
          </Pressable>
        )}
        <Pressable style={styles.dataTitulo} onPress={() => setEscolhendoAno((v) => !v)}>
          <Text style={styles.dataTituloTexto}>
            {escolhendoAno ? "Escolha o ano" : `${MESES[visao.mes - 1]} ${visao.ano}`}
          </Text>
          <ChevronDown
            size={14}
            color={cores.teal}
            style={escolhendoAno ? { transform: [{ rotate: "180deg" }] } : undefined}
          />
        </Pressable>
        {escolhendoAno ? (
          <View style={styles.dataSeta} />
        ) : (
          <Pressable
            style={[styles.dataSeta, noMesMaximo && styles.dataSetaDesligada]}
            hitSlop={6}
            disabled={noMesMaximo}
            onPress={() => mudarMes(1)}
          >
            <ChevronRight size={18} color={cores.slate300} />
          </Pressable>
        )}
      </View>

      {escolhendoAno ? (
        <ScrollView
          ref={scrollAnosRef}
          style={styles.anosLista}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          // Abre com o ano em vista no meio da lista.
          onLayout={() =>
            scrollAnosRef.current?.scrollTo({
              y: Math.max(
                0,
                (Math.floor(Math.max(0, anos.indexOf(visao.ano)) / COLUNAS_ANO) - 2) * (ALTURA_ANO + GAP_ANO)
              ),
              animated: false,
            })
          }
        >
          <View style={styles.anosGrade}>
            {anos.map((a) => (
              <Pressable
                key={a}
                style={[styles.anoChip, a === visao.ano && styles.diaChipAtivo]}
                onPress={() => {
                  setVisao((v) => ({ ...v, ano: a }));
                  setEscolhendoAno(false);
                }}
              >
                <Text style={[styles.anoChipTexto, a === visao.ano && styles.diaChipTextoAtivo]}>{a}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.diasBloco}>
          <View style={styles.diasLinha}>
            {INICIAIS_SEMANA.map((l, i) => (
              <Text key={i} style={styles.diaInicial}>
                {l}
              </Text>
            ))}
          </View>
          {semanas.map((semana, i) => (
            <View key={i} style={styles.diasLinha}>
              {semana.map((d, j) =>
                d === null ? (
                  <View key={j} style={styles.diaCelula} />
                ) : (
                  <Pressable
                    key={j}
                    style={[styles.diaCelula, styles.diaBotao, ehSelecionado(d) && styles.diaChipAtivo]}
                    disabled={foraDoLimite(d)}
                    onPress={() => setSel({ ano: visao.ano, mes: visao.mes, dia: d })}
                  >
                    <Text
                      style={[
                        styles.diaNumero,
                        ehHoje(d) && styles.diaNumeroHoje,
                        ehSelecionado(d) && styles.diaChipTextoAtivo,
                        foraDoLimite(d) && styles.diaNumeroBloqueado,
                      ]}
                    >
                      {d}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.horaAcoes}>
        <Pressable style={styles.horaCancelar} onPress={onFechar}>
          <Text style={styles.horaCancelarTexto}>Cancelar</Text>
        </Pressable>
        <Pressable
          style={styles.horaConfirmar}
          onPress={() => onConfirmar(isoDe(sel.ano, sel.mes, sel.dia))}
        >
          <Text style={styles.horaConfirmarTexto}>Confirmar</Text>
        </Pressable>
      </View>
    </ModalCartao>
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
      {/* Monta só aberto: cada abertura começa do dia atual do campo. */}
      {aberto && (
        <ModalDiaSemana
          dia={dia}
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

// Mesmo desenho do ModalHora: valor escolhido em destaque no topo, grade de dias pra
// tocar e Cancelar/Confirmar. Nada muda no campo até confirmar.
function ModalDiaSemana({
  dia,
  onFechar,
  onConfirmar,
}: {
  dia: number;
  onFechar: () => void;
  onConfirmar: (dia: number) => void;
}) {
  const [escolhido, setEscolhido] = useState(dia);

  return (
    <ModalCartao aberto onFechar={onFechar}>
      <View style={styles.modalListaTituloLinha}>
        <Calendar size={18} color={cores.teal} />
        <Text style={styles.modalListaTitulo}>Dia da semana</Text>
      </View>
      <Text style={styles.modalListaDescricao}>
        Toda semana, nesse dia, o grupo recebe uma partida nova automaticamente, no horário definido abaixo.
      </Text>
      <Text style={styles.diaGrande}>{capitalizar(DIAS_SEMANA[escolhido] ?? "")}</Text>
      <View style={styles.diaGrade}>
        {DIAS_SEMANA.map((nome, i) => (
          <Pressable
            key={nome}
            style={[styles.diaChip, i === escolhido && styles.diaChipAtivo]}
            onPress={() => setEscolhido(i)}
          >
            <Text style={[styles.diaChipTexto, i === escolhido && styles.diaChipTextoAtivo]}>
              {nome.slice(0, 3)}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.horaAcoes}>
        <Pressable style={styles.horaCancelar} onPress={onFechar}>
          <Text style={styles.horaCancelarTexto}>Cancelar</Text>
        </Pressable>
        <Pressable style={styles.horaConfirmar} onPress={() => onConfirmar(escolhido)}>
          <Text style={styles.horaConfirmarTexto}>Confirmar</Text>
        </Pressable>
      </View>
    </ModalCartao>
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
  diaGrande: {
    fontSize: 34,
    fontWeight: "700",
    color: cores.teal,
    textAlign: "center",
  },
  // 4 + 3: a última linha fica centralizada.
  diaGrade: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  diaChip: {
    flexBasis: "23%",
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: cores.superficieSutil,
  },
  diaChipAtivo: { borderColor: cores.teal, backgroundColor: cores.avisoFundo },
  diaChipTexto: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.8,
    color: cores.slate400,
    textTransform: "uppercase",
  },
  diaChipTextoAtivo: { color: cores.branco, fontWeight: "700" },
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
  dataDestaque: { alignItems: "center", gap: 2 },
  dataGrande: { fontSize: 32, fontWeight: "700", color: cores.teal, letterSpacing: 1 },
  dataSemana: { fontSize: 13, color: cores.slate400 },
  dataCabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dataSeta: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  dataSetaDesligada: { opacity: 0.3 },
  dataTitulo: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10 },
  dataTituloTexto: { fontSize: 15, fontWeight: "700", color: cores.branco },
  diasBloco: { gap: 4 },
  diasLinha: { flexDirection: "row", gap: 4 },
  diaInicial: {
    flex: 1,
    height: 20,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: cores.slate500,
  },
  diaCelula: { flex: 1, height: ALTURA_DIA },
  diaBotao: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "transparent",
  },
  diaNumero: { fontSize: 15, color: cores.slate300 },
  diaNumeroHoje: { color: cores.teal, fontWeight: "700" },
  diaNumeroBloqueado: { color: cores.slate500, opacity: 0.4 },
  // Mesma altura do bloco de dias (iniciais + 6 semanas), pra o modal não pular ao alternar.
  anosLista: { height: 20 + 6 * ALTURA_DIA + 6 * 4 },
  anosGrade: { flexDirection: "row", flexWrap: "wrap", gap: GAP_ANO },
  anoChip: {
    flexBasis: "23%",
    height: ALTURA_ANO,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: cores.superficieSutil,
  },
  anoChipTexto: { fontSize: 15, color: cores.slate400 },
});
