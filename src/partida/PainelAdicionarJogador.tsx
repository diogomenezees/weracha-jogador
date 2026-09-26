import { useEffect, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/ui/Texto";

import type { OpcoesRequisicao } from "@/api/cliente";
import { buscarApoioDaPartida, fazerCheckinDeJogador } from "@/api/checkins";
import { CaixaErro } from "@/acesso/ui";
import { FormNovoJogador } from "@/jogadores/FormNovoJogador";
import { mensagemDoErro } from "@/mensagens-erro";
import { CardJogadorPartida } from "@/partida/ui";
import { cores, raio } from "@/tema";
import { FolhaArrastavel } from "@/ui/FolhaArrastavel";
import { UserPlus } from "@/ui/Icone";
import type { DadosDeApoioDaPartida } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// "Adicionar jogador" dos menus das telas Times e Ao vivo: faz o check-in de
// quem chegou com o jogo rolando sem sair da tela (o admin fica de olho no
// placar). Espelha weracha-site/components/painel-adicionar-jogador.tsx: a
// mesma busca do elenco da tela de check-in + o mesmo FormNovoJogador pra quem
// ainda não é do grupo.
//
// O pai mantém este componente montado: a busca e o rascunho do cadastro
// (`manterRascunho`) sobrevivem a fechar a folha, pra o admin poder sair no
// meio, marcar um gol e voltar de onde parou.
export function PainelAdicionarJogador({
  aberto,
  chamarApi,
  grupoId,
  esporte,
  partidaId,
  onFechar,
  onAdicionado,
}: {
  aberto: boolean;
  chamarApi: ChamarApi;
  grupoId: string;
  esporte: string;
  partidaId: string;
  onFechar: () => void;
  onAdicionado: () => void;
}) {
  const [apoio, setApoio] = useState<DadosDeApoioDaPartida | null>(null);
  const [busca, setBusca] = useState("");
  const [formNovo, setFormNovo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Recarrega o elenco a cada abertura: alguém pode ter feito check-in por
  // outro celular desde a última vez.
  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    buscarApoioDaPartida(chamarApi, partidaId)
      .then((d) => {
        if (vivo) setApoio(d);
      })
      .catch((e) => {
        if (vivo) setErro(mensagemDoErro(e));
      });
    return () => {
      vivo = false;
    };
  }, [aberto, chamarApi, partidaId]);

  async function fazerCheckin(jogadorId: string, fechar?: (depois?: () => void) => void) {
    setErro(null);
    setEnviando(true);
    try {
      await fazerCheckinDeJogador(chamarApi, partidaId, jogadorId);
    } catch (e) {
      setErro(mensagemDoErro(e));
      return;
    } finally {
      setEnviando(false);
    }
    setBusca("");
    setApoio(null);
    if (fechar) fechar(onAdicionado);
    else onAdicionado();
  }

  const presentesIds = new Set(apoio?.checkins.map((c) => c.jogadorId) ?? []);
  const jogadorPorId = new Map(apoio?.jogadores.map((j) => [j.id, j]) ?? []);
  const posicaoNomePorId = new Map(apoio?.posicoes.map((p) => [p.id, p.nome]) ?? []);
  const posicaoNomePorJogador = new Map(
    (apoio?.membros ?? []).map((m) => [
      m.jogadorId,
      m.posicaoId ? posicaoNomePorId.get(m.posicaoId) : undefined,
    ])
  );
  const alvo = busca.trim().toLowerCase();
  const resultadosBusca = alvo
    ? (apoio?.membros ?? [])
        .filter((m) => !presentesIds.has(m.jogadorId))
        .map((m) => jogadorPorId.get(m.jogadorId))
        .filter((j) => !!j)
        .filter(
          (j) =>
            j.nome.toLowerCase().includes(alvo) ||
            (j.apelido?.toLowerCase().includes(alvo) ?? false)
        )
    : [];

  return (
    <>
      <FolhaArrastavel
        aberto={aberto}
        arrastarPor="topo"
        onFechar={onFechar}
        topo={
          <View style={styles.topo}>
            <View style={styles.eyebrowLinha}>
              <UserPlus size={16} color={cores.teal} />
              <Text style={styles.eyebrow}>Adicionar jogador</Text>
            </View>
            <Text style={styles.desc}>
              Os times já foram definidos. Quem entrar agora vai pra lista de próximos, o
              resultado não muda.
            </Text>
          </View>
        }
      >
        {(fechar) => (
          <View style={styles.corpo}>
            <TextInput
              placeholder="Buscar jogador pelo nome ou apelido..."
              placeholderTextColor={cores.slate500}
              value={busca}
              onChangeText={(v) => {
                setErro(null);
                setBusca(v);
              }}
              style={styles.input}
            />
            {alvo !== "" &&
              resultadosBusca.map((j) => (
                <Pressable
                  key={j.id}
                  disabled={enviando}
                  onPress={() => void fazerCheckin(j.id, fechar)}
                >
                  <CardJogadorPartida
                    id={j.id}
                    nome={j.nome}
                    apelido={j.apelido}
                    fotoUrl={j.fotoUrl}
                    posicaoNome={posicaoNomePorJogador.get(j.id)}
                  />
                </Pressable>
              ))}
            {alvo !== "" && apoio && resultadosBusca.length === 0 && (
              <Text style={styles.semResultado}>Nenhum jogador com esse nome no elenco.</Text>
            )}
            {erro && <CaixaErro>{erro}</CaixaErro>}
            {/* Um Modal por vez: fecha esta folha e só então abre o formulário. */}
            <Pressable
              style={styles.cadastrarBtn}
              onPress={() => fechar(() => setFormNovo(true))}
            >
              <Text style={styles.cadastrarBtnTexto}>Cadastrar novo jogador</Text>
            </Pressable>
          </View>
        )}
      </FolhaArrastavel>

      <FormNovoJogador
        aberto={formNovo}
        chamarApi={chamarApi}
        grupoId={grupoId}
        esporte={esporte}
        descricao="Cadastre e já faça o check-in. Os times já foram definidos, esse jogador entra na lista de próximos."
        manterRascunho
        onFechar={() => setFormNovo(false)}
        onAdicionado={(membro) => void fazerCheckin(membro.jogadorId)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  topo: { gap: 6, paddingHorizontal: 4, paddingBottom: 14 },
  corpo: { gap: 10, paddingHorizontal: 4 },
  eyebrowLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  desc: { fontSize: 13, color: cores.slate400 },
  input: {
    height: 46,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 12,
    fontSize: 15,
    color: cores.branco,
  },
  semResultado: { fontSize: 13, color: cores.slate400, textAlign: "center" },
  cadastrarBtn: {
    height: 46,
    borderRadius: raio.campo,
    backgroundColor: cores.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  cadastrarBtnTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
});
