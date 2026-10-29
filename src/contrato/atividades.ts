// ─────────────────────────────────────────────────────────────────────────────
// CONTRATO COPIADO DO SITE. Fonte: weracha-site/lib/atividades.ts.
// "Atividades recentes" (painel e tela do grupo): tipos e textos puros.
// ─────────────────────────────────────────────────────────────────────────────

import type { JogadorEmPartida } from "./tipos";

// Mudança de um valor de configuração da partida. `null` em limite = sem limite.
export type MudancaDe<T> = { de: T; para: T };

export type MudancasConfiguracao = {
  checkinAbreHorasAntes: MudancaDe<number> | null;
  limiteCheckins: MudancaDe<number | null> | null;
};

type BaseAtividade = {
  // Único dentro da lista (serve de key).
  id: string;
  grupoId: string;
  grupoNome: string;
  criadoEm: string;
};

// Cliente que não conhece um `tipo` (app antigo recebendo tipo novo) deve
// ignorar o item.
export type AtividadeGrupo = BaseAtividade &
  (
    | {
        // Replay comentado (o que "Atividades recentes" mostrava sozinho antes).
        tipo: "COMENTARIO";
        pedidoReplayId: string;
        replayTipo: "GOL" | "LANCE";
        // Quem fez o gol (null pra LANCE).
        jogadorNome: string | null;
        totalComentarios: number;
        ultimoComentario: {
          autorNome: string;
          autorFotoUrl: string | null;
          // Vazio quando o autor está bloqueado por quem lê.
          texto: string;
          bloqueado: boolean;
        };
      }
    | { tipo: "ENQUETE"; enqueteId: string; pergunta: string; autor: JogadorEmPartida }
    | {
        // Dedo duro. `autor` = quem mudou; `alvo` = de quem é o score (igual ao
        // autor na autoavaliação). `de`/`para` vêm null pra quem não pode ver o
        // score do alvo (não é admin, o grupo não liberou "todos veem o score"
        // e o score não é dele).
        tipo: "SCORE";
        autor: JogadorEmPartida;
        alvo: JogadorEmPartida;
        de: number | null;
        para: number | null;
      }
    | ({ tipo: "CONFIGURACAO"; autor: JogadorEmPartida } & MudancasConfiguracao)
    | {
        // Entrou pelo link de convite (adicionado pelo admin não aparece).
        // `voltou` = já tinha sido do grupo e saiu.
        tipo: "ENTROU_POR_CONVITE";
        autor: JogadorEmPartida;
        voltou: boolean;
      }
  );

// Resposta de GET /api/v1/grupos/{grupoId}/atividades?pagina= (10 por página).
export type PaginaDeAtividades = {
  grupoNome: string;
  atividades: AtividadeGrupo[];
  temMais: boolean;
};

export function nomeDeExibicao(j: { nome: string; apelido: string | null }): string {
  return j.apelido?.trim() || j.nome;
}

function descreverLimite(limite: number | null): string {
  return limite == null ? "sem limite de jogadores" : `limite de ${limite} jogadores`;
}

// "check-in abre 12h antes e limite de 20 jogadores". Texto visível: nada de
// travessão (regra do CLAUDE.md).
export function descreverMudancasConfiguracao(m: MudancasConfiguracao): string {
  const partes: string[] = [];
  if (m.checkinAbreHorasAntes) {
    partes.push(`check-in abre ${m.checkinAbreHorasAntes.para}h antes`);
  }
  if (m.limiteCheckins) partes.push(descreverLimite(m.limiteCheckins.para));
  return partes.join(" e ");
}

// Frase do score sem o nome de quem mudou (o título/linha já tem):
// "mudou o próprio score de 50 pra 70" / "mudou o score de Fulano".
export function descreverMudancaDeScore(a: {
  autorId: string;
  alvo: { id: string; nome: string; apelido: string | null };
  de: number | null;
  para: number | null;
}): string {
  const deQuem = a.autorId === a.alvo.id ? "o próprio score" : `o score de ${nomeDeExibicao(a.alvo)}`;
  const valores = a.de != null && a.para != null ? ` de ${a.de} pra ${a.para}` : "";
  return `mudou ${deQuem}${valores}`;
}
