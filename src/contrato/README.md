# `src/contrato/` — o pedaço do site copiado à mão

Nível 1 do compartilhamento site↔app ("copiar com disciplina"), decidido no doc
do app (era doc 10 §3 / doc 11 do repo do site). **Não** é um pacote npm, **não**
é submodule: é cópia literal, com este README apontando pra origem.

| Arquivo | Fonte no repo do site | O que é |
|---|---|---|
| `codigos-erro.ts` | `weracha-site/lib/api/codigosErro.ts` | Enum estável de `codigo` de erro + status HTTP por código |
| `tipos.ts` | `weracha-site/docs/especificacao/16-api-v1.md` (`Parceiro`) + `weracha-site/app/api/v1/**` + `weracha-site/lib/auth-tipos.ts` + `weracha-site/lib/jogadoresSeguro.ts` (`MeuPerfil`) + `weracha-site/lib/services/exclusaoConta.ts` (`DadosDaTelaExclusaoConta`) + `weracha-site/lib/artilheiros.ts` (`DadosArtilheiros` e tipos) + `weracha-site/lib/services/resenha.ts` (`FeedResenha`, `BlocoFeedResenha`, `ComentarioResenha`) + `weracha-site/lib/services/enquetes.ts` (`Enquete`, `EnquetesDoGrupo`, …) + `weracha-site/lib/services/{membros,perfilJogador}.ts` + `lib/db/schema.ts` (`MembroGrupo`, `PosicaoEsporte`, `CheckIn`, `ConfiguracaoPartida`, `PreAlocacaoPartida`, `CorGrupo`, `ResultadoSalvo`, `EstadoAoVivo`) + `weracha-site/lib/services/checkins.ts` (`DadosDeApoioDaPartida`, `TipoPagamento`) + `weracha-site/lib/services/aoVivo.ts` (`EstadoAoVivoCompleto`, `GolComVideos`, `MeuReplay`) + `weracha-site/lib/services/campanhas.ts` (`CampanhaNoAr`) + `weracha-site/lib/services/painel.ts` (`DadosDoPainel` e tipos) + `weracha-site/lib/indicadoresGrupo.ts` (`DadosIndicadoresDoGrupo`) + `weracha-site/lib/estatisticas.ts` (`DadosEstatisticas`, `JogoDoJogador`, `MeusIndicadoresPainel`; as funções puras ficam em `src/estatisticas.ts`) | Request/response das rotas que o app consome (inclui `StatusTelefone`/`EnvioCodigoSms` do fluxo de acesso e o ciclo da partida) |
| `telefone.ts` | `weracha-site/lib/telefone.ts` | Helpers puros de telefone (normalizar/formatar) |
| `bannersDoFeed.ts` | `weracha-site/lib/bannersDoFeed.ts` | Onde entram os banners entre os vídeos (Resenha, Meus replays): qual espaço é do Instagram (e os textos dele) e qual é de campanha de parceiro |
| `expiracaoReplays.ts` | `weracha-site/lib/expiracaoReplays.ts` | Regra da expiração dos replays (3 meses comunicados, 4 de verdade, data de início) e os textos do selo/banner |
| `atividades.ts` | `weracha-site/lib/atividades.ts` | "Atividades recentes" (painel e tela do grupo): tipos por `tipo` e os textos do dedo duro e da mudança da partida |

## Regras

1. **Só contrato e helper puro.** Nada de componente React (o do site é DOM),
   código de servidor, Zod, Drizzle, nem nada com dependência pesada.
2. **Ao mudar no site, reflita aqui e rode `npm test`.** O teste
   `__tests__/contrato-codigos-erro.test.ts` trava a lista de códigos e quebra
   no desalinho.
3. **Gatilho pra virar pacote `@weracha/contrato` (Nível 2):** primeiro bug de
   drift em produção, ou terceira vez editando o mesmo trecho copiado.
