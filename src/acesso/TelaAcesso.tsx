import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Check } from "@/ui/Icone";
import { MenuAcoes } from "@/grupo/MenuAcoes";
import { PODE_ESCOLHER_SERVIDOR, rotuloDoAmbiente, type Ambiente } from "@/config/servidor";
import { abrirNoNavegador, URL_CONTATO, URL_PRIVACIDADE, URL_TERMOS } from "@/config/links";
import { useSessao } from "@/sessao/contexto";
import { cores, tipografia } from "@/tema";
import {
  Aviso,
  BotaoPrimario,
  CaixaErro,
  CampoComRotulo,
  CampoSenha,
  Cartao,
  Eyebrow,
  LinkBotao,
} from "@/acesso/ui";
import { useFluxoAcesso } from "@/acesso/useFluxoAcesso";

const AVISO_SPAM_APOS = 1;

function formatarCooldown(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return seg > 0 ? `${min}min ${seg}s` : `${min}min`;
}

export function TelaAcesso() {
  const { estado, ambiente, urlBase, entrar, trocarAmbiente, chamarApi } = useSessao();
  const f = useFluxoAcesso({ urlBase, entrar, chamarApi });
  const [servidorAberto, setServidorAberto] = useState(false);

  // Rede de segurança: `concluirLogin` é quem sempre navega explícito quando a
  // sessão vira "logado" (destino do convite, ou /painel no caso comum) — mas
  // se esta instância da tela ficar órfã numa pilha com mais de um /login
  // empilhado (dois convites abertos em sequência, sem terminar o primeiro
  // login antes de abrir o segundo), o `concluirLogin` *dela* nunca é chamado
  // e ela ficaria presa no spinner pra sempre. Depois de um tempo generoso sem
  // ninguém ter navegado, cai no /painel por conta própria.
  useEffect(() => {
    if (estado.fase !== "logado") return;
    const t = setTimeout(() => router.replace("/painel"), 8000);
    return () => clearTimeout(t);
  }, [estado.fase]);

  if (estado.fase === "logado") {
    // Não tem <Redirect> automático de propósito: `entrar()` já deixa a sessão
    // "logado" antes de `concluirLogin` terminar de decidir pra onde ir (aceite
    // de termos, convite pendente...), então um redirect automático aqui
    // dispararia cedo demais e brigaria com a navegação de verdade. É
    // `concluirLogin` quem sempre chama `router.replace` explícito no fim —
    // pro destino do convite, ou pro /painel no caso comum — então esta tela só
    // precisa segurar alguma coisa na tela enquanto isso não acontece (o
    // `useEffect` acima é só a rede de segurança pra instância órfã).
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <View style={styles.centroCarregando}>
          <ActivityIndicator color={cores.teal} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Menu próprio (MenuAcoes) no lugar do Alert nativo, no padrão do resto do app.
  const opcoesServidor: Ambiente[] = ["producao", "local"];
  const itensServidor = opcoesServidor.map((op) => ({
    rotulo: rotuloDoAmbiente(op) + (op === ambiente ? " (atual)" : ""),
    Icone: op === ambiente ? Check : undefined,
    onPress: () => {
      if (op !== ambiente) void trocarAmbiente(op);
    },
  }));
  function escolherServidor() {
    setServidorAberto(true);
  }

  const subtitulo =
    f.passo === "reset"
      ? "Digite o código que enviamos por SMS e escolha uma senha nova."
      : f.passo === "codigo"
        ? "Enviamos um código de 6 dígitos por SMS pro número digitado."
        : f.passo === "verificar"
          ? "Confirme que esse telefone é seu pra continuar."
          : "Você entra com telefone e senha, sem e-mail. Se for a primeira vez, a conta é criada na hora.";

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Cartao>
            <View>
              <Eyebrow>Acesso</Eyebrow>
              <Text style={tipografia.titulo}>{f.titulo}</Text>
              <Text style={[tipografia.subtitulo, styles.subtitulo]}>{subtitulo}</Text>
            </View>

            <CampoComRotulo
              rotulo="Telefone"
              value={f.telefone}
              onChangeText={f.aoMudarTelefone}
              placeholder="(11) 90000-0000"
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={15}
              editable={!f.codigoEnviado && !f.ocupado}
            />

            {/* Passo: verificar telefone (pedir SMS) */}
            {f.passo === "verificar" && (
              <>
                {f.status?.estado === "novo" && (
                  <CampoComRotulo
                    rotulo="Seu nome"
                    value={f.nome}
                    onChangeText={f.setNome}
                    placeholder="Como te chamam no racha"
                    autoCapitalize="words"
                    editable={!f.ocupado}
                  />
                )}
                <Aviso>Vamos te mandar um código de 6 dígitos por SMS.</Aviso>
                {f.erro ? <CaixaErro>{f.erro}</CaixaErro> : null}
                <BotaoPrimario
                  titulo="Verificar telefone"
                  onPress={() => void f.enviarCodigo()}
                  carregando={f.ocupado}
                />
              </>
            )}

            {/* Passo: confirmar código (login) */}
            {f.passo === "codigo" && (
              <>
                <Aviso>Enviamos um código de 6 dígitos por SMS pro número digitado.</Aviso>
                {f.tentativasEnvio > AVISO_SPAM_APOS && (
                  <Aviso>
                    Não chegou? Veja a caixa de spam e apps de bloqueio de SMS. Se não
                    vier, fale com o organizador do grupo.
                  </Aviso>
                )}
                <CampoComRotulo
                  rotulo="Código"
                  value={f.codigo}
                  onChangeText={(v) => f.setCodigo(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!f.ocupado}
                />
                {f.erro ? <CaixaErro>{f.erro}</CaixaErro> : null}
                <BotaoPrimario
                  titulo="Confirmar código"
                  onPress={() => void f.confirmarCodigo()}
                  carregando={f.ocupado}
                />
                <View style={styles.linhaLinks}>
                  <LinkBotao titulo="Corrigir número" onPress={f.corrigirNumero} />
                  <LinkBotao
                    titulo={
                      f.cooldownReenvio > 0
                        ? `Reenviar em ${formatarCooldown(f.cooldownReenvio)}`
                        : "Reenviar código"
                    }
                    onPress={() => void f.enviarCodigo()}
                    desabilitado={f.cooldownReenvio > 0 || f.ocupado}
                  />
                </View>
              </>
            )}

            {/* Passo: senha (entrar / criar senha) */}
            {f.passo === "senha" && f.status && (
              <>
                {f.status.estado === "sem_senha" && (
                  <Aviso>Telefone confirmado. Crie uma senha pra acessar sua conta.</Aviso>
                )}
                {f.status.estado === "novo" && (
                  <Aviso>Telefone confirmado! Agora é só criar sua senha.</Aviso>
                )}
                {f.status.estado === "com_senha" && f.status.precisaAssinarTermos && (
                  <Aviso>
                    Atualizamos os Termos de Uso e a Política de Privacidade. Confirme
                    pra continuar.
                  </Aviso>
                )}

                <CampoSenha
                  rotulo={f.criandoSenha ? "Nova senha" : "Senha"}
                  value={f.senha}
                  onChangeText={f.setSenha}
                  placeholder="Pelo menos 6 caracteres"
                  autoComplete={f.criandoSenha ? "password-new" : "current-password"}
                  mostrar={f.mostrarSenha}
                  onAlternar={() => f.setMostrarSenha(!f.mostrarSenha)}
                  editable={!f.ocupado}
                />

                {f.criandoSenha && (
                  <CampoSenha
                    rotulo="Confirmar senha"
                    value={f.confirmarSenha}
                    onChangeText={f.setConfirmarSenha}
                    placeholder="Repita a senha"
                    mostrar={f.mostrarSenha}
                    onAlternar={() => f.setMostrarSenha(!f.mostrarSenha)}
                    editable={!f.ocupado}
                  />
                )}

                {f.status.estado === "com_senha" && (
                  <LinkBotao titulo="Esqueci minha senha" onPress={f.irParaReset} />
                )}

                {f.precisaAceitarTermos && (
                  <Pressable
                    style={styles.termos}
                    onPress={() => f.setAceitouTermos(!f.aceitouTermos)}
                  >
                    <View style={[styles.checkbox, f.aceitouTermos && styles.checkboxMarcado]}>
                      {f.aceitouTermos ? <Check size={13} color={cores.dark} /> : null}
                    </View>
                    <Text style={[tipografia.corpo, styles.termosTexto]}>
                      Li e concordo com os{" "}
                      <Text
                        style={styles.termosLink}
                        onPress={() => abrirNoNavegador(URL_TERMOS)}
                      >
                        Termos de Uso
                      </Text>{" "}
                      e a{" "}
                      <Text
                        style={styles.termosLink}
                        onPress={() => abrirNoNavegador(URL_PRIVACIDADE)}
                      >
                        Política de Privacidade
                      </Text>
                      .
                    </Text>
                  </Pressable>
                )}

                {f.erro ? <CaixaErro>{f.erro}</CaixaErro> : null}
                <BotaoPrimario
                  titulo={f.rotuloBotaoSenha}
                  onPress={() => void f.enviar()}
                  carregando={f.ocupado}
                />
              </>
            )}

            {/* Passo: reset (esqueci minha senha) */}
            {f.passo === "reset" && (
              <>
                <Aviso>Enviamos um código de 6 dígitos por SMS pro número digitado.</Aviso>
                {f.tentativasEnvio > AVISO_SPAM_APOS && (
                  <Aviso>
                    Não chegou? Veja a caixa de spam e apps de bloqueio de SMS. Se não
                    vier, fale com o administrador do site.
                  </Aviso>
                )}
                <CampoComRotulo
                  rotulo="Código"
                  value={f.codigo}
                  onChangeText={(v) => f.setCodigo(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!f.ocupado}
                />
                <CampoSenha
                  rotulo="Nova senha"
                  value={f.senha}
                  onChangeText={f.setSenha}
                  placeholder="Pelo menos 6 caracteres"
                  autoComplete="password-new"
                  mostrar={f.mostrarSenha}
                  onAlternar={() => f.setMostrarSenha(!f.mostrarSenha)}
                  editable={!f.ocupado}
                />
                <CampoSenha
                  rotulo="Confirmar nova senha"
                  value={f.confirmarSenha}
                  onChangeText={f.setConfirmarSenha}
                  placeholder="Repita a senha"
                  mostrar={f.mostrarSenha}
                  onAlternar={() => f.setMostrarSenha(!f.mostrarSenha)}
                  editable={!f.ocupado}
                />
                {f.erro ? <CaixaErro>{f.erro}</CaixaErro> : null}
                {f.mostrarIrParaLogin ? (
                  <LinkBotao titulo="Ir pro login" onPress={f.voltarParaLogin} />
                ) : null}
                <BotaoPrimario
                  titulo="Redefinir e entrar"
                  onPress={() => void f.enviar()}
                  carregando={f.ocupado}
                />
                <View style={styles.linhaLinks}>
                  <LinkBotao titulo="Corrigir número" onPress={f.corrigirNumero} />
                  <LinkBotao
                    titulo={
                      f.cooldownReenvio > 0
                        ? `Reenviar em ${formatarCooldown(f.cooldownReenvio)}`
                        : "Reenviar código"
                    }
                    onPress={() => void f.enviarCodigo()}
                    desabilitado={f.cooldownReenvio > 0 || f.ocupado}
                  />
                </View>
                <LinkBotao titulo="Lembrei minha senha" onPress={f.voltarParaLogin} />
              </>
            )}

            {/* Passo: telefone digitado, aguardando/sem status */}
            {f.passo === "telefone" && f.buscandoStatus && (
              <View style={styles.buscando}>
                <ActivityIndicator color={cores.teal} />
                <Text style={tipografia.subtitulo}>Verificando telefone...</Text>
              </View>
            )}
            {f.passo === "telefone" && f.falhaAoBuscarStatus && (
              <>
                <Aviso>
                  Não deu pra checar esse número agora. Confira a conexão e o
                  servidor aqui embaixo.
                </Aviso>
                <BotaoPrimario titulo="Tentar de novo" onPress={f.tentarStatusDeNovo} />
              </>
            )}
            {f.passo === "telefone" && f.erro ? <CaixaErro>{f.erro}</CaixaErro> : null}
          </Cartao>

          <View style={styles.rodape}>
            <Pressable onPress={() => abrirNoNavegador(URL_CONTATO)} hitSlop={8}>
              <Text style={styles.rodapeLink}>Não consegue entrar? Fale com a gente</Text>
            </Pressable>
            {PODE_ESCOLHER_SERVIDOR ? (
              <Pressable onPress={escolherServidor} disabled={f.ocupado} hitSlop={8}>
                <Text style={styles.servidorTexto}>Servidor: {rotuloDoAmbiente(ambiente)}</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <MenuAcoes
        aberto={servidorAberto}
        titulo="Servidor"
        itens={itensServidor}
        onFechar={() => setServidorAberto(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  centroCarregando: { flex: 1, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 16,
  },
  subtitulo: { marginTop: 8 },
  buscando: { flexDirection: "row", alignItems: "center", gap: 10 },
  linhaLinks: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  termos: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxMarcado: { backgroundColor: cores.orange, borderColor: cores.orange },
  termosTexto: { flex: 1 },
  termosLink: { color: cores.teal, textDecorationLine: "underline" },
  rodape: { alignItems: "center", gap: 10, paddingTop: 8 },
  rodapeLink: { fontSize: 13, color: cores.slate400, textDecorationLine: "underline" },
  servidorTexto: { fontSize: 13, color: cores.slate500 },
});
