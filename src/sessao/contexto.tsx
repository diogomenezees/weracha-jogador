import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Device from "expo-device";

import { emitirToken } from "@/api/auth";
import { buscarMeuPerfil, buscarMeuPerfilComToken, concluirOnboarding } from "@/api/perfil";
import { requisicao, type OpcoesRequisicao } from "@/api/cliente";
import { ErroApi } from "@/api/erros";
import {
  AMBIENTE_PADRAO,
  guardarAmbiente,
  lerAmbiente,
  urlBaseDoAmbiente,
  type Ambiente,
} from "@/config/servidor";
import {
  guardarJogador,
  guardarSessao,
  guardarToken,
  lerSessao,
  limparSessao,
} from "@/sessao/armazenamento";
import type { JogadorSessao, MeuPerfil } from "@/contrato/tipos";

type Estado =
  | { fase: "carregando" }
  | { fase: "deslogado" }
  | { fase: "logado"; jogador: MeuPerfil };

type Contexto = {
  estado: Estado;
  ambiente: Ambiente;
  urlBase: string;
  entrar: (telefone: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  trocarAmbiente: (ambiente: Ambiente) => Promise<void>;
  /**
   * Chamada autenticada a `/api/v1/*`. Injeta o Bearer e, num 401, re-loga
   * sozinho com a senha guardada e tenta de novo uma vez. Se o re-login também
   * falhar, limpa a sessão (a UI cai no /login) e levanta o erro.
   */
  chamarApi: <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;
  /** `GET /api/v1/me`: recarrega o perfil, atualiza o estado e o cache. */
  recarregarPerfil: () => Promise<MeuPerfil>;
  /**
   * `POST /api/v1/perfil/onboarding-concluido` e atualiza o `onboardingConcluidoEm`
   * local. Best-effort: um erro de rede não trava o app (o site cobra de novo
   * se preciso).
   */
  marcarOnboardingConcluido: () => Promise<void>;
};

const SessaoContext = createContext<Contexto | null>(null);

function nomeDoAparelho(): string | undefined {
  return Device.deviceName ?? Device.modelName ?? undefined;
}

// Retorno do `POST /auth/token` é o subconjunto de 5 campos; o resto de
// `MeuPerfil` entra como null até o `GET /api/v1/me`.
function perfilParcial(j: JogadorSessao): MeuPerfil {
  return {
    id: j.id,
    telefone: j.telefone,
    nome: j.nome,
    apelido: j.apelido,
    fotoUrl: j.fotoUrl,
    onboardingConcluidoEm: null,
    email: null,
    emailNotificacoes: false,
    dataNascimento: null,
  };
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
  const [ambiente, setAmbiente] = useState<Ambiente>(AMBIENTE_PADRAO);

  // Credenciais vivem só em memória + SecureStore, nunca no state do React.
  const credenciais = useRef<{
    token: string;
    telefone: string;
    senha: string;
    jogador: MeuPerfil;
  } | null>(null);

  const urlBase = useMemo(() => urlBaseDoAmbiente(ambiente), [ambiente]);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [amb, sessao] = await Promise.all([lerAmbiente(), lerSessao()]);
      if (!ativo) return;
      setAmbiente(amb);
      if (sessao) {
        credenciais.current = sessao;
        // Não valida o token no boot: a 1ª chamada real revalida, e o fluxo de
        // 401 já cobre token expirado. O `jogador` vem do cache do último
        // login/refresh (as telas logadas chamam `recarregarPerfil` no mount).
        setEstado({ fase: "logado", jogador: sessao.jogador });
      } else {
        setEstado({ fase: "deslogado" });
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const entrar = useCallback(
    async (telefone: string, senha: string) => {
      const resp = await emitirToken(urlBase, {
        telefone,
        senha,
        nomeDispositivo: nomeDoAparelho(),
      });
      // Já dá pra montar a sessão com o retorno do login; o `GET /api/v1/me`
      // logo em seguida completa o perfil (onboardingConcluidoEm etc.). Se ele
      // falhar (offline, site antigo sem a rota), o login não trava.
      let jogador = perfilParcial(resp.jogador);
      try {
        jogador = await buscarMeuPerfilComToken(urlBase, resp.token);
      } catch {
        // segue com o perfil parcial
      }
      credenciais.current = { token: resp.token, telefone, senha, jogador };
      await guardarSessao({ token: resp.token, telefone, senha, jogador });
      setEstado({ fase: "logado", jogador });
    },
    [urlBase]
  );

  const sair = useCallback(async () => {
    credenciais.current = null;
    await limparSessao();
    setEstado({ fase: "deslogado" });
  }, []);

  const trocarAmbiente = useCallback(
    async (novo: Ambiente) => {
      await guardarAmbiente(novo);
      setAmbiente(novo);
      // Trocar de servidor invalida a sessão do servidor anterior.
      await sair();
    },
    [sair]
  );

  const chamarApi = useCallback(
    async <T,>(caminho: string, opcoes: OpcoesRequisicao = {}): Promise<T> => {
      const cred = credenciais.current;
      if (!cred) throw new ErroApi({ codigo: "NAO_AUTENTICADO", mensagem: "Sem sessão.", status: 401 });

      try {
        return await requisicao<T>(urlBase, caminho, { ...opcoes, token: cred.token });
      } catch (erro) {
        if (!(erro instanceof ErroApi) || erro.status !== 401) throw erro;

        // Token expirado/revogado: re-loga silenciosamente e tenta de novo.
        try {
          const resp = await emitirToken(urlBase, {
            telefone: cred.telefone,
            senha: cred.senha,
            nomeDispositivo: nomeDoAparelho(),
          });
          let jogador = perfilParcial(resp.jogador);
          try {
            jogador = await buscarMeuPerfilComToken(urlBase, resp.token);
          } catch {
            // segue com o perfil parcial
          }
          credenciais.current = { ...cred, token: resp.token, jogador };
          await guardarToken(resp.token);
          await guardarJogador(jogador);
          setEstado({ fase: "logado", jogador });
        } catch {
          await sair();
          throw erro;
        }

        return await requisicao<T>(urlBase, caminho, {
          ...opcoes,
          token: credenciais.current.token,
        });
      }
    },
    [urlBase, sair]
  );

  const recarregarPerfil = useCallback(async (): Promise<MeuPerfil> => {
    const jogador = await buscarMeuPerfil(chamarApi);
    if (credenciais.current) credenciais.current.jogador = jogador;
    await guardarJogador(jogador);
    setEstado({ fase: "logado", jogador });
    return jogador;
  }, [chamarApi]);

  const marcarOnboardingConcluido = useCallback(async (): Promise<void> => {
    await concluirOnboarding(chamarApi);
    const cred = credenciais.current;
    if (!cred) return;
    const jogador: MeuPerfil = {
      ...cred.jogador,
      onboardingConcluidoEm: cred.jogador.onboardingConcluidoEm ?? new Date().toISOString(),
    };
    cred.jogador = jogador;
    await guardarJogador(jogador);
    setEstado({ fase: "logado", jogador });
  }, [chamarApi]);

  const valor = useMemo<Contexto>(
    () => ({
      estado,
      ambiente,
      urlBase,
      entrar,
      sair,
      trocarAmbiente,
      chamarApi,
      recarregarPerfil,
      marcarOnboardingConcluido,
    }),
    [
      estado,
      ambiente,
      urlBase,
      entrar,
      sair,
      trocarAmbiente,
      chamarApi,
      recarregarPerfil,
      marcarOnboardingConcluido,
    ]
  );

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>;
}

export function useSessao(): Contexto {
  const ctx = useContext(SessaoContext);
  if (!ctx) throw new Error("useSessao precisa estar dentro de <SessaoProvider>.");
  return ctx;
}
