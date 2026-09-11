import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/ui/Texto";
import { router } from "expo-router";

import type { OpcoesRequisicao } from "@/api/cliente";
import { recuperarSenha, definirSenha } from "@/api/auth";
import { buscarStatusExclusao, confirmarExclusao, enviarCodigoExclusao } from "@/api/conta";
import { formatarTelefoneBR } from "@/contrato/telefone";
import { formatarCooldown } from "@/formato";
import { ModalCartao } from "@/grupo/modais";
import { ChevronRight } from "@/ui/Icone";
import { mensagemDoErro } from "@/mensagens-erro";
import { cores, raio } from "@/tema";
import type { EnvioCodigoSms } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

const AVISO_SPAM_APOS = 1;

// Só no site Local (`simulado`), e mais uma trava de `__DEV__` por garantia: o
// código do SMS simulado não pode chegar num log de build de produção. Mesmo
// padrão de `logSimulado` em src/acesso/useFluxoAcesso.ts.
function logSmsSimulado(r: EnvioCodigoSms) {
  if (__DEV__ && r.simulado && r.mensagemSimulada) {
    console.log(`[SMS simulado] ${r.mensagemSimulada}`);
  }
}

// ── Trocar senha ───────────────────────────────────────────────────────────
// Mesmo fluxo do /esqueci-senha: SMS de recuperação (senha/recuperar) e depois
// código + nova senha (senha/definir, sem Set-Cookie — o app segue com o Bearer
// que já tem). Não pede a senha atual: quem troca por vazamento não sabe a atual.
export function ModalTrocarSenha({
  telefone,
  urlBase,
  onFechar,
  onSucesso,
}: {
  telefone: string;
  urlBase: string;
  onFechar: () => void;
  onSucesso: () => void;
}) {
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [tentativas, setTentativas] = useState(0);
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function enviarCodigo() {
    setErro(null);
    setEnviando(true);
    let r: EnvioCodigoSms;
    try {
      r = await recuperarSenha(urlBase, { telefone });
    } catch (e) {
      setEnviando(false);
      setErro(mensagemDoErro(e));
      return;
    }
    setEnviando(false);
    logSmsSimulado(r);
    setCodigoEnviado(true);
    setCooldown(r.proximoCooldownSeg);
    setTentativas((v) => v + 1);
  }

  async function redefinir() {
    setErro(null);
    if (codigo.trim().length !== 6) {
      setErro("Digite o código de 6 dígitos que enviamos por SMS.");
      return;
    }
    if (novaSenha.length < 6) {
      setErro("A nova senha precisa de pelo menos 6 caracteres.");
      return;
    }
    setSalvando(true);
    try {
      await definirSenha(urlBase, { telefone, senha: novaSenha, codigo: codigo.trim() });
    } catch (e) {
      setSalvando(false);
      setErro(mensagemDoErro(e));
      return;
    }
    setSalvando(false);
    onSucesso();
    onFechar();
  }

  return (
    <ModalCartao aberto onFechar={onFechar}>
      <Text style={styles.eyebrow}>Trocar senha</Text>
      <Text style={styles.titulo}>{codigoEnviado ? "Confirmar código" : "Confirmar telefone"}</Text>
      <Text style={styles.descricao}>
        {codigoEnviado
          ? "Digite o código que enviamos por SMS e escolha a nova senha."
          : `Vamos enviar um código por SMS pro número ${formatarTelefoneBR(telefone)}.`}
      </Text>

      {!codigoEnviado ? (
        <>
          {erro ? <Text style={styles.erro}>{erro}</Text> : null}
          <Pressable
            style={[styles.btnPrimario, enviando && styles.inativo]}
            onPress={() => void enviarCodigo()}
            disabled={enviando}
          >
            {enviando ? (
              <ActivityIndicator color={cores.dark} />
            ) : (
              <Text style={styles.btnPrimarioTexto}>Enviar código</Text>
            )}
          </Pressable>
        </>
      ) : (
        <>
          {tentativas > AVISO_SPAM_APOS ? (
            <Text style={styles.avisoSpam}>
              Ainda não chegou? Veja a pasta de spam ou mensagens bloqueadas do SMS. Se não
              chegar, fale com o organizador do grupo.
            </Text>
          ) : null}
          <TextInput
            placeholder="Código de 6 dígitos"
            placeholderTextColor={cores.slate500}
            value={codigo}
            onChangeText={(t) => setCodigo(t.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
          />
          <View style={styles.senhaLinha}>
            <TextInput
              placeholder="Nova senha"
              placeholderTextColor={cores.slate500}
              value={novaSenha}
              onChangeText={setNovaSenha}
              secureTextEntry={!mostrar}
              style={[styles.input, styles.inputSenha]}
            />
            <Pressable hitSlop={8} onPress={() => setMostrar((v) => !v)}>
              <Text style={styles.link}>{mostrar ? "Ocultar" : "Mostrar"}</Text>
            </Pressable>
          </View>
          {erro ? <Text style={styles.erro}>{erro}</Text> : null}
          <Pressable
            style={[styles.btnPrimario, salvando && styles.inativo]}
            onPress={() => void redefinir()}
            disabled={salvando}
          >
            {salvando ? (
              <ActivityIndicator color={cores.dark} />
            ) : (
              <Text style={styles.btnPrimarioTexto}>Redefinir senha</Text>
            )}
          </Pressable>
          <Pressable
            hitSlop={8}
            disabled={cooldown > 0 || enviando}
            onPress={() => void enviarCodigo()}
          >
            <Text style={[styles.link, styles.linkCentro, (cooldown > 0 || enviando) && styles.inativo]}>
              {cooldown > 0 ? `Reenviar em ${formatarCooldown(cooldown)}` : "Reenviar código"}
            </Text>
          </Pressable>
        </>
      )}

      <Pressable style={styles.btnSecundario} onPress={onFechar}>
        <Text style={styles.btnSecundarioTexto}>Fechar</Text>
      </Pressable>
    </ModalCartao>
  );
}

// ── Excluir meus dados (LGPD) ──────────────────────────────────────────────
// Não apaga na hora: confirma por SMS e cria uma solicitação na fila do admin.
// A conta segue funcionando até ser atendida e dá pra cancelar pelo banner.
export function ModalExcluirConta({
  chamarApi,
  onFechar,
  onSolicitado,
}: {
  chamarApi: ChamarApi;
  onFechar: () => void;
  onSolicitado: () => void;
}) {
  const [carregando, setCarregando] = useState(true);
  const [gruposPendentes, setGruposPendentes] = useState<{ id: string; nome: string }[]>([]);
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [tentativas, setTentativas] = useState(0);
  const [codigo, setCodigo] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await buscarStatusExclusao(chamarApi);
        if (vivo) {
          setGruposPendentes(r.pendencias.grupos);
          setCarregando(false);
        }
      } catch (e) {
        if (vivo) {
          setErro(mensagemDoErro(e));
          setCarregando(false);
        }
      }
    })();
    return () => {
      vivo = false;
    };
  }, [chamarApi]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function enviarCodigo() {
    setErro(null);
    setEnviando(true);
    let r: EnvioCodigoSms;
    try {
      r = await enviarCodigoExclusao(chamarApi);
    } catch (e) {
      setEnviando(false);
      setErro(mensagemDoErro(e));
      return;
    }
    setEnviando(false);
    logSmsSimulado(r);
    setCodigoEnviado(true);
    setCooldown(r.proximoCooldownSeg);
    setTentativas((v) => v + 1);
  }

  async function confirmar() {
    setErro(null);
    if (codigo.trim().length !== 6) {
      setErro("Digite o código de 6 dígitos que enviamos por SMS.");
      return;
    }
    setConfirmando(true);
    try {
      await confirmarExclusao(chamarApi, codigo.trim());
    } catch (e) {
      setConfirmando(false);
      setErro(mensagemDoErro(e));
      return;
    }
    setConfirmando(false);
    onSolicitado();
    onFechar();
  }

  const temPendencia = gruposPendentes.length > 0;

  return (
    <ModalCartao aberto onFechar={onFechar}>
      <Text style={[styles.eyebrow, styles.eyebrowVermelho]}>Excluir meus dados</Text>
      <Text style={styles.titulo}>
        {codigoEnviado
          ? "Confirmar código"
          : temPendencia
            ? "Resolva seus grupos antes"
            : "Excluir meus dados"}
      </Text>

      {carregando ? (
        <ActivityIndicator color={cores.teal} />
      ) : codigoEnviado ? (
        <>
          <Text style={styles.descricao}>
            Digite o código que enviamos por SMS pra confirmar o pedido.
          </Text>
          {tentativas > AVISO_SPAM_APOS ? (
            <Text style={styles.avisoSpam}>
              Ainda não chegou? Veja a pasta de spam do SMS. Se não chegar, fale com o
              organizador do grupo.
            </Text>
          ) : null}
          <TextInput
            placeholder="Código de 6 dígitos"
            placeholderTextColor={cores.slate500}
            value={codigo}
            onChangeText={(t) => setCodigo(t.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
          />
          {erro ? <Text style={styles.erro}>{erro}</Text> : null}
          <Pressable
            style={[styles.btnPrimario, styles.btnDestrutivo, confirmando && styles.inativo]}
            onPress={() => void confirmar()}
            disabled={confirmando}
          >
            {confirmando ? (
              <ActivityIndicator color={cores.branco} />
            ) : (
              <Text style={styles.btnDestrutivoTexto}>Confirmar exclusão</Text>
            )}
          </Pressable>
          <Pressable
            hitSlop={8}
            disabled={cooldown > 0 || enviando}
            onPress={() => void enviarCodigo()}
          >
            <Text style={[styles.link, styles.linkCentro, (cooldown > 0 || enviando) && styles.inativo]}>
              {cooldown > 0 ? `Reenviar em ${formatarCooldown(cooldown)}` : "Reenviar código"}
            </Text>
          </Pressable>
        </>
      ) : temPendencia ? (
        <>
          <Text style={styles.descricao}>
            Você é dono de grupos ativos. Passe cada um pra outra pessoa ou exclua o grupo, e
            volte aqui.
          </Text>
          {gruposPendentes.map((g) => (
            <Pressable
              key={g.id}
              style={styles.grupoPendente}
              onPress={() => {
                onFechar();
                router.push(`/grupos/${g.id}/jogadores`);
              }}
            >
              <Text style={styles.grupoPendenteNome} numberOfLines={1}>
                {g.nome}
              </Text>
              <View style={styles.grupoPendenteAcaoLinha}>
                <Text style={styles.grupoPendenteAcao}>Gerenciar</Text>
                <ChevronRight size={13} color={cores.teal} />
              </View>
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <Text style={styles.descricao}>
            O pedido vai para análise e leva até 5 dias úteis. Sua conta continua funcionando
            nesse período e você pode voltar atrás a qualquer momento.
          </Text>
          <Text style={styles.avisoVermelho}>
            Quando for atendido, seu nome, telefone, foto, apelido, e-mail, data de nascimento
            e senha são apagados de vez e o login para de funcionar.
          </Text>
          {erro ? <Text style={styles.erro}>{erro}</Text> : null}
          <Pressable
            style={[styles.btnPrimario, enviando && styles.inativo]}
            onPress={() => void enviarCodigo()}
            disabled={enviando}
          >
            {enviando ? (
              <ActivityIndicator color={cores.dark} />
            ) : (
              <Text style={styles.btnPrimarioTexto}>Enviar código</Text>
            )}
          </Pressable>
        </>
      )}

      <Pressable style={styles.btnSecundario} onPress={onFechar}>
        <Text style={styles.btnSecundarioTexto}>Fechar</Text>
      </Pressable>
    </ModalCartao>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  eyebrowVermelho: { color: cores.erroTexto },
  titulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  descricao: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  erro: { fontSize: 13, color: cores.erroTexto },
  avisoSpam: {
    fontSize: 12,
    lineHeight: 18,
    color: cores.ambar,
    borderWidth: 1,
    borderColor: cores.ambarBorda,
    backgroundColor: cores.ambarFundo,
    borderRadius: raio.campo,
    padding: 10,
  },
  avisoVermelho: {
    fontSize: 13,
    lineHeight: 19,
    color: cores.erroTexto,
    borderWidth: 1,
    borderColor: cores.erroBorda,
    backgroundColor: cores.erroFundo,
    borderRadius: raio.campo,
    padding: 10,
  },
  input: {
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 14,
    fontSize: 16,
    color: cores.branco,
  },
  senhaLinha: { flexDirection: "row", alignItems: "center", gap: 10 },
  inputSenha: { flex: 1 },
  link: { fontSize: 13, color: cores.teal },
  linkCentro: { textAlign: "center" },
  btnPrimario: {
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimarioTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
  btnDestrutivo: { backgroundColor: "#dc2626" },
  btnDestrutivoTexto: { fontSize: 15, fontWeight: "700", color: cores.branco },
  btnSecundario: {
    height: 46,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  btnSecundarioTexto: { fontSize: 15, fontWeight: "600", color: cores.branco },
  inativo: { opacity: 0.5 },
  grupoPendente: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.linhaSutil,
    backgroundColor: cores.superficieSutil,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  grupoPendenteNome: { flex: 1, fontSize: 14, color: cores.branco },
  grupoPendenteAcaoLinha: { flexDirection: "row", alignItems: "center", gap: 2 },
  grupoPendenteAcao: { fontSize: 12, color: cores.teal },
});
