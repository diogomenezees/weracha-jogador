import { useEffect } from "react";
import { useRouter, type Href } from "expo-router";
import type { NotificationResponse } from "expo-notifications";

import { registrarTokenPush } from "@/api/push";
import { useSessao } from "@/sessao/contexto";
import {
  carregarNotificacoes,
  marcarTokenPushRegistrado,
  obterTokenPush,
} from "@/notificacoes/registro";

// Ligado no layout de `(logado)/`: só roda com sessão.
// 1. Registra o token deste aparelho no site a cada abertura (e a cada troca de
//    servidor, que muda o `chamarApi`).
// 2. Leva pra tela certa quando a pessoa toca na notificação, inclusive quando
//    o toque abriu o app do zero (ou abriu deslogado e a pessoa logou depois).
export function useNotificacoes(): void {
  const { chamarApi } = useSessao();
  const router = useRouter();

  useEffect(() => {
    let ativo = true;
    (async () => {
      const token = await obterTokenPush();
      if (!token || !ativo) return;
      try {
        await registrarTokenPush(chamarApi, token);
        marcarTokenPushRegistrado(token.token);
      } catch {
        // Best-effort: tenta de novo na próxima abertura.
      }
    })();
    return () => {
      ativo = false;
    };
  }, [chamarApi]);

  useEffect(() => {
    let assinatura: { remove: () => void } | undefined;
    let ativo = true;
    (async () => {
      const N = await carregarNotificacoes();
      if (!N || !ativo) return;

      const abrir = (resposta: NotificationResponse) => {
        const destino = destinoDaNotificacao(resposta.notification.request.content.data);
        // Limpa pra um remount do layout não reabrir a mesma tela.
        N.clearLastNotificationResponse();
        if (destino) router.push(destino);
      };

      const ultima = N.getLastNotificationResponse();
      if (ultima) abrir(ultima);
      assinatura = N.addNotificationResponseReceivedListener(abrir);
    })();
    return () => {
      ativo = false;
      assinatura?.remove();
    };
  }, [router]);
}

// `data` vem do site (lib/services/notificacoes.ts). Tipo desconhecido (app velho
// recebendo gatilho novo) cai no grupo, ou em lugar nenhum.
function destinoDaNotificacao(data: Record<string, unknown> | undefined): Href | null {
  const tipo = typeof data?.tipo === "string" ? data.tipo : undefined;
  const grupoId = typeof data?.grupoId === "string" ? data.grupoId : undefined;
  const partidaId = typeof data?.partidaId === "string" ? data.partidaId : undefined;
  const pedidoReplayId =
    typeof data?.pedidoReplayId === "string" ? data.pedidoReplayId : undefined;
  // Único tipo sem grupo (é de vários): Meus vídeos filtrado nos que vão ser apagados.
  if (tipo === "REPLAYS_EXPIRANDO") return "/replays?expirando=1";
  if (!grupoId) return null;
  if (tipo === "CHECKIN_ABERTO" && partidaId) {
    return `/grupos/${grupoId}/partidas/${partidaId}/checkin`;
  }
  if (tipo === "RESULTADO_DISPONIVEL" && partidaId) {
    return `/grupos/${grupoId}/partidas/${partidaId}/resultado`;
  }
  if (tipo === "NOVA_ENQUETE") {
    return `/grupos/${grupoId}/enquetes`;
  }
  if (tipo === "COMENTARIO_GOL" && pedidoReplayId) {
    // Resenha já rolada até o vídeo comentado (mesmo link do painel).
    return `/grupos/${grupoId}/resenha?video=${pedidoReplayId}`;
  }
  // Dedo duro e jogador novo pelo convite: elenco do grupo.
  // CONFIGURACAO_PARTIDA cai no grupo (padrão).
  if (tipo === "SCORE_ALTERADO" || tipo === "NOVO_JOGADOR") {
    return `/grupos/${grupoId}/jogadores`;
  }
  return `/grupos/${grupoId}`;
}
