import { useCallback, useEffect, useRef, useState } from "react";

import {
  confirmarCodigoTelefone,
  definirSenha,
  enviarCodigoTelefone,
  recuperarSenha,
  statusTelefone,
} from "@/api/auth";
import { aceitarTermos as aceitarTermosApi } from "@/api/termos";
import { processarConvite } from "@/api/convites";
import { lerConvitePendente, limparConvitePendente } from "@/acesso/convitePendente";
import type { OpcoesRequisicao } from "@/api/cliente";
import { formatarTelefoneBR, normalizarTelefone } from "@/contrato/telefone";
import { mensagemDoErro } from "@/mensagens-erro";
import type { StatusTelefone } from "@/contrato/tipos";

// Máquina de estado da tela de acesso, espelhando weracha-site/app/login/page.tsx
// (+ a parte de /esqueci-senha). Um passo de cada vez, decidido pelo `status` do
// telefone:
//   novo       → verificar telefone (nome + SMS) → criar senha + termos
//   sem_senha  → verificar telefone (SMS) → criar senha + termos
//   com_senha  → digitar senha  (ou "Esqueci minha senha" → SMS → nova senha)
//
// Diferença pro site: onde o site chama POST /auth/sessao (cria senha + cookie),
// o app chama POST /auth/senha/definir (sem cookie) e depois `entrar()` do
// contexto, que pega o Bearer por /auth/token.

const SENHA_MIN = 6;

function logSimulado(mensagemSimulada?: string) {
  if (__DEV__ && mensagemSimulada) {
    // Não é credencial persistente: é o código do SMS simulado do site Local,
    // pra dar pra testar sem SMS real.
    console.log(`[SMS simulado] ${mensagemSimulada}`);
  }
}

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

type Deps = {
  urlBase: string;
  entrar: (telefone: string, senha: string) => Promise<void>;
  chamarApi: ChamarApi;
};

function telefoneValidado(status: StatusTelefone | null): boolean {
  if (!status || status.estado === "novo") return false;
  return status.validado;
}

function precisaAceitarTermos(status: StatusTelefone | null): boolean {
  if (!status) return false;
  if (status.estado === "com_senha") return status.precisaAssinarTermos;
  return true; // novo / sem_senha nunca assinaram
}

export function useFluxoAcesso({ urlBase, entrar, chamarApi }: Deps) {
  const [telefone, setTelefone] = useState("");
  const [status, setStatus] = useState<StatusTelefone | null>(null);
  const [buscandoStatus, setBuscandoStatus] = useState(false);
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [modo, setModo] = useState<"login" | "reset">("login");
  const [codigo, setCodigo] = useState("");
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [validadoNestaSessao, setValidadoNestaSessao] = useState(false);
  const [cooldownReenvio, setCooldownReenvio] = useState(0);
  const [tentativasEnvio, setTentativasEnvio] = useState(0);

  const [ocupado, setOcupado] = useState(false);

  const digitos = normalizarTelefone(telefone);
  const buscaId = useRef(0);

  // Contagem regressiva do cooldown de reenvio.
  useEffect(() => {
    if (cooldownReenvio <= 0) return;
    const t = setTimeout(() => setCooldownReenvio((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldownReenvio]);

  const resetarFluxo = useCallback(() => {
    setStatus(null);
    setBuscandoStatus(false);
    setNome("");
    setSenha("");
    setConfirmarSenha("");
    setAceitouTermos(false);
    setModo("login");
    setCodigo("");
    setCodigoEnviado(false);
    setValidadoNestaSessao(false);
    setCooldownReenvio(0);
    setTentativasEnvio(0);
    setErro(null);
  }, []);

  const aoMudarTelefone = useCallback(
    (valor: string) => {
      // Formata e CAPA em 11 dígitos já na entrada (igual o site). Sem isso, um
      // 12º dígito entra no state, `dig.length` nunca volta a ser 11 e a tela
      // trava sem buscar o status nem pedir senha/nome.
      const formatado = formatarTelefoneBR(valor);
      setTelefone(formatado);
      resetarFluxo();

      const dig = normalizarTelefone(formatado);
      if (dig.length < 11) return;

      const id = ++buscaId.current;
      setBuscandoStatus(true);
      statusTelefone(urlBase, dig)
        .then((s) => {
          if (id === buscaId.current) {
            setStatus(s);
            setBuscandoStatus(false);
          }
        })
        .catch(() => {
          // Sem status a tela mostra "não deu pra checar". Um erro de rede aqui
          // (roda a cada telefone completo) não vira mensagem de erro vermelha.
          if (id === buscaId.current) {
            setStatus(null);
            setBuscandoStatus(false);
          }
        });
    },
    [urlBase, resetarFluxo]
  );

  const corrigirNumero = useCallback(() => {
    setTelefone("");
    resetarFluxo();
  }, [resetarFluxo]);

  // `alvo` é passado explícito por `irParaReset` (não dá pra confiar no `modo`
  // do state, que ainda não atualizou nesse mesmo tick).
  const dispararSms = useCallback(
    async (alvo: "login" | "reset") => {
      setErro(null);
      if (alvo === "login" && status?.estado === "novo" && !nome.trim()) {
        setErro("Digite seu nome pra criar a conta.");
        return;
      }
      setOcupado(true);
      try {
        const resultado =
          alvo === "reset"
            ? await recuperarSenha(urlBase, { telefone: digitos })
            : await enviarCodigoTelefone(urlBase, {
                telefone: digitos,
                nome: status?.estado === "novo" ? nome.trim() : undefined,
              });
        logSimulado(resultado.mensagemSimulada);
        setCodigoEnviado(true);
        setCooldownReenvio(resultado.proximoCooldownSeg);
        setTentativasEnvio((v) => v + 1);
      } catch (e) {
        setErro(mensagemDoErro(e));
      } finally {
        setOcupado(false);
      }
    },
    [status, nome, urlBase, digitos]
  );

  const enviarCodigo = useCallback(() => dispararSms(modo), [dispararSms, modo]);

  const confirmarCodigo = useCallback(async () => {
    setErro(null);
    if (codigo.trim().length !== 6) {
      setErro("Digite o código de 6 dígitos que enviamos por SMS.");
      return;
    }
    setOcupado(true);
    try {
      await confirmarCodigoTelefone(urlBase, { telefone: digitos, codigo: codigo.trim() });
      setValidadoNestaSessao(true);
      setCodigo("");
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setOcupado(false);
    }
  }, [codigo, urlBase, digitos]);

  const concluirLogin = useCallback(
    async (senhaFinal: string, registrarAceite: boolean) => {
      await entrar(digitos, senhaFinal);
      if (registrarAceite) {
        try {
          await aceitarTermosApi(chamarApi);
        } catch {
          // Best-effort: a sessão já está aberta. O site cobra o aceite de novo
          // no próximo boot se isto falhar.
        }
      }
      // Veio de um link de convite (tela /convite/[token] abriu deslogada e
      // mandou pra cá): agora que tem Bearer, entra no grupo. Best-effort — o
      // <Redirect> da tela cai em /grupos de qualquer forma.
      const convite = lerConvitePendente();
      if (convite) {
        try {
          await processarConvite(chamarApi, convite.token, convite);
        } catch {
          // Convite pode ter sido revogado no meio; a conta já foi criada/logada.
        }
        limparConvitePendente();
      }
    },
    [entrar, digitos, chamarApi]
  );

  const enviar = useCallback(async () => {
    setErro(null);

    // Sub-fluxo "Esqueci minha senha": código + nova senha.
    if (modo === "reset") {
      if (codigo.trim().length !== 6) {
        setErro("Digite o código de 6 dígitos que enviamos por SMS.");
        return;
      }
      if (senha.length < SENHA_MIN) {
        setErro(`A senha precisa de pelo menos ${SENHA_MIN} caracteres.`);
        return;
      }
      if (senha !== confirmarSenha) {
        setErro("As senhas não coincidem.");
        return;
      }
      setOcupado(true);
      try {
        await definirSenha(urlBase, { telefone: digitos, senha, codigo: codigo.trim() });
        await concluirLogin(senha, false);
      } catch (e) {
        setErro(mensagemDoErro(e));
      } finally {
        setOcupado(false);
      }
      return;
    }

    if (!status) {
      setErro("Digite um telefone válido, com DDD.");
      return;
    }

    const criandoSenha = status.estado === "novo" || status.estado === "sem_senha";

    if (senha.length < SENHA_MIN) {
      setErro(`A senha precisa de pelo menos ${SENHA_MIN} caracteres.`);
      return;
    }
    if (criandoSenha && senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (precisaAceitarTermos(status) && !aceitouTermos) {
      setErro("Você precisa aceitar os Termos de Uso e a Política de Privacidade pra continuar.");
      return;
    }

    setOcupado(true);
    try {
      if (criandoSenha) {
        await definirSenha(urlBase, { telefone: digitos, senha });
      }
      await concluirLogin(senha, precisaAceitarTermos(status) && aceitouTermos);
    } catch (e) {
      // Senha errada numa conta com_senha volta aqui. Mensagem clara pelo código.
      setErro(mensagemDoErro(e));
    } finally {
      setOcupado(false);
    }
  }, [
    modo,
    codigo,
    senha,
    confirmarSenha,
    status,
    aceitouTermos,
    urlBase,
    digitos,
    concluirLogin,
  ]);

  const irParaReset = useCallback(() => {
    setModo("reset");
    setErro(null);
    setSenha("");
    setConfirmarSenha("");
    setCodigo("");
    setCodigoEnviado(false);
    void dispararSms("reset");
  }, [dispararSms]);

  const voltarParaLogin = useCallback(() => {
    setModo("login");
    setErro(null);
    setCodigo("");
    setCodigoEnviado(false);
    setSenha("");
    setConfirmarSenha("");
  }, []);

  // --- Derivados que a view usa ---------------------------------------------
  const validado = telefoneValidado(status) || validadoNestaSessao;
  const precisaVerificar = modo === "login" && status !== null && !validado;
  const telefoneCompleto = normalizarTelefone(telefone).length === 11;
  // 11 dígitos, terminou de buscar e não veio status = servidor fora do ar / sem
  // rede. A view mostra um aviso em vez de deixar a tela "travada" sem explicação.
  const falhaAoBuscarStatus =
    modo === "login" && telefoneCompleto && !buscandoStatus && status === null;
  const criandoSenha = status?.estado === "novo" || status?.estado === "sem_senha";

  const passo: "telefone" | "verificar" | "codigo" | "senha" | "reset" =
    modo === "reset"
      ? "reset"
      : !status
        ? "telefone"
        : precisaVerificar && !codigoEnviado
          ? "verificar"
          : precisaVerificar && codigoEnviado
            ? "codigo"
            : "senha";

  const titulo =
    passo === "reset"
      ? "Redefinir senha"
      : passo === "telefone"
        ? "Entrar"
        : passo === "verificar"
          ? status?.estado === "novo"
            ? "Criar conta"
            : "Verificar telefone"
          : passo === "codigo"
            ? "Confirmar código"
            : status?.estado === "com_senha"
              ? "Entrar"
              : "Criar senha";

  const rotuloBotaoSenha =
    status?.estado === "novo"
      ? "Criar conta"
      : status?.estado === "sem_senha"
        ? "Criar senha e entrar"
        : "Entrar";

  return {
    // campos
    telefone,
    nome,
    senha,
    confirmarSenha,
    codigo,
    mostrarSenha,
    aceitouTermos,
    // estado
    status,
    passo,
    titulo,
    rotuloBotaoSenha,
    criandoSenha,
    buscandoStatus,
    falhaAoBuscarStatus,
    tentarStatusDeNovo: () => aoMudarTelefone(telefone),
    precisaAceitarTermos: precisaAceitarTermos(status),
    codigoEnviado,
    cooldownReenvio,
    tentativasEnvio,
    ocupado,
    erro,
    // setters
    setNome,
    setSenha,
    setConfirmarSenha,
    setCodigo,
    setMostrarSenha,
    setAceitouTermos,
    // ações
    aoMudarTelefone,
    corrigirNumero,
    enviarCodigo,
    confirmarCodigo,
    enviar,
    irParaReset,
    voltarParaLogin,
  };
}
