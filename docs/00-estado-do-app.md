# App de jogador: o que já está feito

> Estado do app de jogador (`weracha-jogador/`): o que foi entregue, tela por tela, e a
> preparação que o site fez pra ele. É o equivalente, pro app, do papel de
> `weracha-site/docs/especificacao/`. Ordem cronológica: do scaffold (2026-09-06) até a
> paridade visual com o site (2026-09-20).
>
> **O que falta** (validação em device, EAS Build, fases 5-8 da paridade, lojas, push,
> observabilidade) vive em [`10-app-de-jogador.md`](10-app-de-jogador.md). Este doc descreve o
> que foi construído, **não** o que foi validado em aparelho: o checklist de validação está
> lá.
>
> O contrato que o app consome: [`../../weracha-site/docs/especificacao/16-api-v1.md`](../../weracha-site/docs/especificacao/16-api-v1.md).

---

## Já entregue no repo do site (preparação pré-app)

Nada mais no backend do site bloqueia o app. Tudo isto está em produção:

| Item | Como ficou | Migration / commit |
|---|---|---|
| Varredura de teste `/api/v1/*` como cliente Bearer puro | `pnpm run test:bearer` no site, 97/97 casos, 0 FALHA, roda no `revisar-e-subir` | — |
| Ciclo de vida do token Bearer | hash `sha256` at-rest; token do **app** = 10 dias deslizantes (slide com throttle ~12h), token do **Cam** = sem expiração; colunas `expira_em`/`ultimo_uso_em`/`revogado_em`/`nome_dispositivo`; grandfather (ninguém relogou) | 0063 |
| CSRF: Bearer válido isenta rota pública | `criarRota` pula o check de origem pra qualquer rota (autenticada ou pública) com Bearer válido; navegador sem `Authorization` segue no check | — |
| Anti-abuso de SMS, camada 1 | teto de 5 SMS/24h por telefone (`429 CODIGO_LIMITE_DIARIO`, não envia, contador não zera no sucesso); indicador visual + ação "Liberar novas tentativas" no `/admin/jogadores` | 0064 |
| Anti-abuso de SMS, kill-switch manual | `configuracoes_site.sms_habilitado`, toggle no `/admin`, `503 SMS_DESABILITADO` nos 3 senders | 0065 |
| Rate limiting no `token` e login web | `loginBloqueioSeg` cobre `loginWeb` e `emitirTokenAcesso` (cooldown crescente a partir da 5ª senha errada) | commit `638b334` |
| Código de erro estável | toda falha de `/api/v1/*` volta `{ codigo, mensagem, detalhe? }`; `codigo` é o enum de `lib/api/codigosErro.ts`; status HTTP por código (`STATUS_POR_CODIGO`) | commit `d0e967e` |

## Feito: scaffold do app

- `weracha-jogador/` criado: Expo SDK 57 + expo-router + TypeScript, git próprio.
- Contrato Nível 1 copiado do site pra `src/contrato/` (enum de códigos de erro +
  tipos de request/response + helpers de telefone), com teste que trava a lista.
- Camada de sessão: Bearer + telefone + senha no `expo-secure-store`; re-login
  silencioso em `401`; URL base escolhida em runtime (Local / Produção).

## Feito: fluxo de acesso completo (2026-09-07)

Tela de acesso adaptável (`src/acesso/`), visual portado do site (fundo escuro,
card teal, botão laranja, tokens em `src/tema.ts`). Um passo de cada vez, decidido
pelo `POST /api/v1/auth/telefone/status`:

- **entrar** (`com_senha`) → senha → `entrar()` do contexto (`/auth/token`).
- **criar conta** (`novo`) → nome + SMS (`telefone/codigo` + `telefone/confirmar`)
  → criar senha + aceite dos Termos → `POST /auth/senha/definir` → `entrar()`.
- **criar senha** (`sem_senha`) → SMS → senha + Termos → `senha/definir` → `entrar()`.
- **esqueci a senha** (link em `com_senha`) → `senha/recuperar` → código + nova
  senha → `senha/definir` (com `codigo`) → `entrar()`.
- Aceite dos Termos espelha o site: `GET /termos/status` no login com senha,
  checkbox obrigatório em conta nova / termos atualizados, `POST /termos/aceite`
  logo após o login (best-effort). O texto do checkbox linka pra
  `weracha.app/{termos,privacidade}` (abre no navegador via `expo-web-browser`,
  `src/config/links.ts`) — o conteúdo não é replicado no app.
- Rodapé da tela: "Não consegue entrar? Fale com a gente" abre
  `weracha.app/contato` no navegador (a ouvidoria tem Turnstile, não vale
  replicar o form no app). Mais o seletor de servidor Local/Produção que já
  existia.
- URL base Local: em celular físico o app deriva o IP da máquina de dev do
  `Constants.expoConfig.hostUri` (`src/config/servidor.ts`), sem `adb reverse`.

**Mudança no site que isso exigiu** (ver `16-api-v1.md` §4 + changelog 2026-09-07):
as 4 rotas de auth sem `Set-Cookie` viraram `csrf: false` (o `fetch` do RN não
manda `Origin`/`Sec-Fetch-Site`), e a rota nova `POST /api/v1/auth/senha/definir`
(sem `Set-Cookie`, `definirSenhaCliente` em `lib/services/auth.ts`) cobre criar a
1ª senha e redefinir sem abrir sessão de cookie. `senha/redefinir` segue só-web.

## Feito: regra da rodada ao lado do grupo no Ao vivo (2026-10-23)

Igual ao site: com cronômetro, o cabeçalho do Ao vivo mostra "Amigos do bairro ·
Rodadas de 10 min" (ou "· 10 min ou 2 gols" com meta de gols). No site a regra
saiu do título, que quebrava a linha; no app o título já era só "Ao vivo". Prop
`aoLadoDoGrupo` do `Cabecalho` (`src/partida/ui.tsx`): a regra nunca corta, quem
corta é o nome do grupo e a descrição.

## Feito: campanhas de parceiro mescladas com o banner do Instagram (2026-10-16)

Espelha o site (regra em `14-resenha.md` do site; o cadastro das campanhas é só no
`/admin/parceiros/[id]` do site). Nos mesmos espaços do banner do Instagram, com campanha
no ar, o ciclo é Instagram, todas as campanhas, Instagram de novo (o primeiro é sempre nosso;
era 2 do Instagram pra 1 de parceiro até 2026-10-22).
`src/resenha/BannerCampanha.tsx` (foto do parceiro, nome + "PARCEIRO", texto, "Ver"; abre
o link com `Linking.openURL`), `src/resenha/BannerDoFeed.tsx` (`useCampanhasNoAr` busca
`GET /api/v1/campanhas` uma vez por tela, falha = só Instagram; `BannerDoFeed` escolhe o
banner). FlatLists com `extraData={campanhas}` pra redesenhar quando a busca chega. A regra
`src/contrato/bannerInstagram.ts` virou `src/contrato/bannersDoFeed.ts` (cópia literal de
`weracha-site/lib/bannersDoFeed.ts`), teste em `__tests__/bannersDoFeed.test.ts`. Não rodou
em device ainda.

## Feito: banner do Instagram entre os vídeos (2026-10-14)

Espelha o site (mesmo dia; regra em `14-resenha.md` do site): faixa de divulgação do
`@weracha.app` (`src/resenha/BannerInstagram.tsx`, ícone em `react-native-svg` com o
degradê da marca) intercalada nos cards da Resenha (duas abas) e de Replays. Onde entra e
os 3 textos vêm hoje de `src/contrato/bannersDoFeed.ts` (era `bannerInstagram.ts`): primeiro
a cada 3 vídeos (era 1º depois do 3º e depois a cada 6, 5, 8, 7 até 2026-10-22); lista curta e
completa mostra no fim. Abre
com `Linking.openURL` pra cair no app do Instagram quando instalado.

## Feito: Atalhos do grupo, Indicadores do grupo, artilheiros por grupo (2026-10-11)

Espelha o site (mesmo dia; contrato em `16-api-v1.md`):
- Tela do grupo: o rodapé fixo ficou só com o botão laranja "Gerenciar jogadores · N"
  ("Ver jogadores" pra membro). Artilheiros/Resenha/Enquetes saíram dele e foram pra
  seção **Atalhos do grupo** em carrossel, logo abaixo dos alertas
  (`src/grupo/FuncoesDoGrupo.tsx`, cards na mesma cor): Artilheiros, Indicadores,
  Resenha (Beta), Enquetes e Convidar (só admin, abre o modal de convite).
- **Indicadores do grupo** (`(logado)/grupos/[id]/indicadores.tsx`,
  `GET /api/v1/grupos/{id}/indicadores?periodo=`): chips de mês (abre no corrente),
  resumo (jogos, gols, presentes por jogo), destaques do período (artilheiro, fiéis,
  melhor média, noite histórica, revelação, em alta, abre o placar, primeiro a
  confirmar), gráfico de gols por jogo do grupo, gráfico de mensalistas por mês
  (máximo de mensalistas num jogo do mês, nos meses dos chips; abaixo do link do ranking
  de artilheiros; some se nenhum mês teve mensalista; sem "Ver jogos em lista" nos dois
  gráficos desta tela; 2026-10-16) e Repercussão (Beta: resenheiro, gol mais comentado). Corpo em
  `src/estatisticas/TelaIndicadoresGrupo.tsx`; o gráfico virou genérico
  (`JogoNoGrafico`, `descrever`, `rotuloMedia`).
- Artilheiros (menu): filtro por **grupo** no lugar de esporte (`ModalEscolha`), abre no
  grupo onde o jogador jogou por último (decidido no servidor).
- Painel: "Destaques dos grupos" passou a ser **do mês corrente** (cálculo no servidor),
  com selo do mês no título.
- Conferido no Expo Go: Atalhos do grupo e a tela de Indicadores abrem; resto por validar.

## Feito: Meus indicadores, menu novo, abas da Resenha e selos Beta (2026-10-11)

Espelha o site (mesmo dia; contrato em `16-api-v1.md`, regras da resenha em `14-resenha.md`):
- **Meus indicadores** (`(logado)/indicadores.tsx`, `GET /api/v1/estatisticas`): filtro
  de grupo (`ModalEscolha`, só com 2+ grupos) e de mês; Resumo (gols, gol/jogo, seta de
  tendência), grade Jogos com gol / Noite histórica / Presença / Artilharia, Último jogo,
  gráfico "Gols por jogo" (`react-native-svg`, toque numa coluna mostra o jogo, lista
  "Ver jogos em lista") e Repercussão com selo Beta. Contas puras em `src/estatisticas.ts`
  (cópia de `weracha-site/lib/estatisticas.ts`), corpo em `src/estatisticas/`.
- Painel: card **Meus indicadores** acima dos Destaques (gols do mês, mini barras dos
  últimos 8 jogos, chips do último jogo e da sequência), vindo de
  `DadosDoPainel.meusIndicadores` (opcional no tipo: site antigo não manda).
- Menu: **Início** (antigo "Grupos", ícone casa) em 1º, Perfil em 2º, **Meus
  indicadores** acima de Artilheiros.
- Resenha do grupo com abas **Todos os vídeos** (padrão; todo replay com vídeo,
  comentado ou não) e **Destaques** (só comentados). `?video=` abre em Destaques (e cai
  pra Todos se não achar); paginação de 3 por aba; resposta de outra aba é descartada.
  Grupo sem vídeo: card "Em desenvolvimento" (`src/ui/EmDesenvolvimento.tsx`), também
  usado nos Replays vazios. Selo **Beta** no botão Resenha do rodapé do grupo.
- Rodado no Expo Go (Galaxy, Wi-Fi) contra o site local: Meus indicadores e o selo Beta
  conferidos na tela; resto do fluxo ainda por validar no celular.

## Feito: correção de gol no Ao vivo + card de time com escudo (2026-10-11)

Espelha o site (spec `10-ao-vivo.md`, RN73/RN78):
- Ao vivo: o admin corrige gol **durante o jogo** pelo menu ⋮ de cada gol no
  Histórico (migrar, cancelar, reativar), igual ao Resultado. O Histórico passa a
  trazer os cancelados (`incluirCancelados`). Menu + confirmação + modal de migrar
  viraram `src/partida/CorrecaoDeGols.tsx` (`useCorrecaoDeGols`), usado pelo
  Resultado e pelo Ao vivo.
- Ao vivo: o "−" da lista de artilheiros saiu (fica só "Gol"); `desmarcarGol`
  saiu de `src/api/partidas.ts` (o endpoint segue no site pra builds antigos).
- Resultado: card de time neutro, camiseta pequena ao lado de "TIME X", escudo
  grande à direita preenchido com a cor do colete (contorno cinza sem cor) e
  "Começa com a bola"/"Escolhe o lado da quadra" no rodapé com ícone.
- Painel: "Criar grupo" virou card no fim de "Seus grupos" (sem rodapé fixo com
  grupo); quadra e contagem do Próximo jogo quebram linha.
- Ainda não validado no celular.

## Feito: painel com seções + navegação entre resultados (2026-10-10)

Painel de quem tem grupo (`src/app/(logado)/painel.tsx`, seções em
`src/painel/secoes.tsx`) espelha o `/painel` do site: Próximo jogo (selo de
check-in, confirmados, botão Check-in/Confirmado/Ao vivo), Ações rápidas e
Destaques dos grupos (carrosséis), Seus grupos (abas Ativos/Aguardando, nome da
quadra) e Atividades recentes (últimos replays comentados, abre a resenha com
`?video=`). Tudo numa chamada: `GET /api/v1/painel` (`src/api/painel.ts`,
tipos em `src/contrato/tipos.ts`); o painel não usa mais `/api/v1/grupos` nem
`/conta/exclusao`.
- Resenha do grupo aceita `?video=`: rola até o vídeo (carrega páginas se
  preciso) e destaca o card (`BlocoCard destacado`).
- Resultado de partida finalizada: fileira de datas (`src/partida/FileiraDeDatas.tsx`)
  acima das abas pra pular entre os resultados do grupo (`router.replace`).
- Tela do grupo mostra 5 partidas finalizadas antes do "Ver todas".
- Criar grupo: validação aponta o campo (rola até ele, borda vermelha,
  mensagem embaixo, abre o teclado); `ScrollTeclado` ganhou `rolagemRef`.
- Destaques (até 10 cards): Artilheiro, Melhor média, Fiéis (quantos foram a todos
  os jogos do mês, sem jogador e sem toque; substituiu o Mais presente em
  2026-10-13), Noite histórica, Revelação, Em alta, Abre o placar, Primeiro a
  confirmar, Resenheiro e Gol mais comentado; o card abre o perfil (`ModalPerfil`)
  ou o vídeo na resenha. Regras em `16-api-v1.md` do site.
- Próximo jogo com folhinha de calendário + contagem regressiva; botão "Grupo" ao
  lado e rodapé (confirmados + botão) só com o check-in aberto.
- Tela do grupo: rodapé com Enquetes/Artilheiros/Resenha (ícone ao lado do texto),
  "Adicionar partida" (avulso) no menu; pílulas do grupo e do resultado numa linha
  só com rolagem lateral. `BotaoLaranja` com 48 px (h-12 do site).
- Validado no celular via Expo Go (2026-10-10), com o site local por `adb reverse`.

## Feito: `/painel` + onboarding (2026-09-10)

Área logada agora abre no **`/painel`** (`src/app/(logado)/painel.tsx`,
renomeado de `grupos.tsx`), visual portado de `weracha-site/app/painel/page.tsx`
(tema escuro, rodapé fixo). Três estados iguais aos do site:

- **sem grupo + sem onboarding** → hero "seu racha começa aqui" + "como funciona"
  em 3 passos; rodapé "Começar" → `/onboarding`.
- **sem grupo + onboarding feito** → "De volta, {nome}. Falta só o grupo." + os
  dois caminhos (convite / criar); rodapé "Criar grupo".
- **com grupo** → "Olá, {nome}" + seções "Seus grupos" / "Aguardando renovação" /
  "Aguardando novo jogo" com `CardGrupo` (badge de papel, próxima partida,
  indicador de check-in quando a partida está em andamento).

Carrossel de onboarding em `src/app/(logado)/onboarding.tsx` (swipe + auto-avanço
+ "Pular"), porta de `app/painel/onboarding`.
Concluir/pular → `POST /api/v1/perfil/onboarding-concluido` → volta pro painel.
Em 2026-09-27 foi enxugado pra 2 slides, só sobre a escolha de como começar (Sorteio
rápido x Grupo; o resto do app já está na intro de antes do login), com o palco animado da
intro (`src/ui/PalcoAnimado.tsx`). Termina com a escolha: "Criar um grupo" (`/criar-grupo`) ou
"Fazer um sorteio rápido" (`/sorteio`); "Pular" volta pro painel. Sem auto-concluir.

**Intro antes do login (2026-09-27, fase 0 do roteiro 11):** `/intro` (`src/intro/TelaIntro.tsx`),
3 slides sobre o app como um todo (o racha num lugar só, replays e artilheiros, entrar com
telefone ou convite), no mesmo molde visual do onboarding, com peças de UI espalhadas que
entram animadas e flutuam. Só pra app novo: o `index` manda pra `/intro` quem está deslogado e
nunca viu (flag `weracha.introVista` no SecureStore, que não sai no logout); qualquer login marca
a flag, e o link de convite abre direto `convite/[token]`, sem passar por ela. Auto-avanço de 8s,
sem auto-concluir no último slide ("Começar" leva pro `/login`). O onboarding pós-login segue
focado em quem vai organizar o grupo e usa o mesmo palco animado (`src/ui/PalcoAnimado.tsx`).
Pra rever as duas no Expo Go sem mexer em conta: `exp://<IP-do-PC>:8081/--/intro` e
`.../--/onboarding` (o onboarding marca a conta como concluída ao sair, sem efeito prático).

Banner "conta marcada para exclusão" + "Reativar minha conta" no painel
(`GET`/`DELETE /api/v1/conta/exclusao`).

**Mudança no site que isso exigiu:** rota nova **`GET /api/v1/me`** (retorna o
`MeuPerfil` do `ator`) — o `POST /auth/token` só devolve 5 campos e o painel
decide o rodapé por `onboardingConcluidoEm`. Sem service novo, sem migration
(`16-api-v1.md` §4 + changelog 2026-09-10; adicionada à varredura
`test:bearer`). No app: `MeuPerfil` + `DadosDaTelaExclusaoConta` em
`src/contrato/tipos.ts`; `src/api/{perfil,conta}.ts`; o contexto de sessão
guarda `MeuPerfil` e expõe `recarregarPerfil` / `marcarOnboardingConcluido`
(`src/sessao/`).

## Feito: criar grupo + tela do grupo (2026-09-10)

- **Criar grupo** (`src/app/(logado)/criar-grupo.tsx`): nome, tipo
  (recorrente/avulso), horários recorrentes ou datas avulsas, esporte
  (`GET /api/v1/esportes`). `POST /api/v1/grupos` → `router.replace` pra tela do
  grupo com `?bemVindo=1`, que abre uma vez (só admin) o modal "Agora, traga a galera":
  explica os dois caminhos (link em **Convidar** ou cadastro em **Gerenciar jogadores**),
  sem botão que leve pra essas telas, só "Entendi" (2026-10-15, igual ao site). O modal
  Convidar ganhou "como funciona" em 3 passos + prévia do link que copia ao tocar.
  Quadra fica pra depois (dentro do grupo), igual o site. Pickers de
  data/hora em `src/grupo/pickers.tsx` (novas deps `@react-native-community/
  datetimepicker` + `expo-clipboard`, ambas no Expo Go).
- **Tela do grupo** (`src/app/(logado)/grupos/[id].tsx`, era stub): porta
  completa de `weracha-site/app/grupos/[id]/page.tsx` com **tudo de admin** —
  editar nome/descrição, cancelar (com justificativa) / reativar / excluir
  partida, adicionar partida avulsa, renovar mês, vincular/cadastrar quadra
  (desde 2026-10-14 em tela própria `grupos/[id]/quadra.tsx`, aberta só pelo aviso
  "Cadastre o local do jogo"; o topo do grupo e do resultado mostram pílula do
  esporte (ícone de bola; abre `src/grupo/PilulaEsporte.tsx` com descrição do
  esporte e posições expansíveis) e, se tiver, pílula separada da quadra que abre o
  modal só leitura com nome, selo "Em validação" e endereço),
  convidar jogadores (modal com o nome do grupo, "Link de convite" copia o link
  do grupo sem partida, "Gerar novo convite" regenera com confirmação — igual
  ao site), sair do grupo. Menu "mais opções" virou
  action sheet de baixo (`src/grupo/MenuAcoes.tsx` — `Alert.alert` do RN só
  mostra 3 botões no Android). Desde 2026-09-26 é um bottom sheet arrastável
  (barrinha no topo, arrasta pra baixo pra fechar; gesture-handler + reanimated,
  sem lib de sheet) — vale pra todos os menus do app. A folha em si é
  `src/ui/FolhaArrastavel.tsx`, também usada pelo formulário "Adicionar
  jogador" (arrasta só pelo topo; com teclado aberto o 1º puxão só fecha o
  teclado; fechar descarta o digitado). Modais reusáveis em `src/grupo/modais.tsx`.
  Compartilhar convite = `Share` do RN (texto, sem a imagem que o site gera);
  copiar link = `expo-clipboard`. Helpers de janela de check-in / partida
  portados pra `src/partidas.ts` (sem o fuso SP explícito: o cliente é local).
- **Contrato novo** em `src/contrato/tipos.ts`: `Quadra`, `DadosDaTelaGrupo`,
  `CriarGrupoRequest`, `EsporteOpcao`. APIs em `src/api/{grupos,quadras,partidas}.ts`.

## Feito: artilheiros, resenha, enquetes, gerenciar jogadores (2026-09-10)

As 4 sub-telas do grupo (endpoints verificados por curl no site Local).

- **Artilheiros** (`grupos/[id]/artilheiros.tsx` + global `(logado)/artilheiros.tsx`,
  no menu ⚙ do painel): pódio + chips de mês + ranking + "zerados" + "sou eu".
  Componente compartilhado `src/artilheiros/`. Compartilhar = `Share` só-texto.
  `src/ui/AvatarJogador.tsx` novo (foto via `expo-image`, iniciais coloridas).
- **Resenha** (`grupos/[id]/resenha.tsx`): feed paginado de replays comentados;
  cada card abre um chat modal com polling de 3s (`src/resenha/ChatResenha.tsx`,
  só enquanto `AppState === active`). Vídeo do replay toca embutido no card
  (`PlayerReplay`, `expo-video`). Cada comentário tem um menu ⋯
  (`MenuAcoes`): **Denunciar** (todo mundo, menos o autor; cai na ouvidoria) e **Apagar**
  (autor só nos primeiros 5 min, admin do grupo / dono do site sempre) e **Bloquear usuário**
  (bloqueio pessoal: o servidor devolve os comentários da pessoa como "Mensagem de usuário
  bloqueado"; o menu dessa mensagem oferece **Desbloquear usuário**).
- **Enquetes** (`grupos/[id]/enquetes/{index,nova}.tsx` + global
  `(logado)/enquetes.tsx`): listar/criar/votar (toggle)/editar pergunta/ver
  votantes. `src/enquetes/ModalEnquete.tsx`.
- **Gerenciar jogadores** (`grupos/[id]/jogadores.tsx`): elenco com busca +
  ordenação + score visível/oculto; ⋯ por jogador (editar score/posição,
  promover/rebaixar admin, deixar cargo, mudar de dono, remover); mensalista
  toggle; perfil-resumo; adicionar jogador (`src/jogadores/FormNovoJogador.tsx`
  com busca por telefone + score sugerido). Modais em `src/jogadores/modais.tsx`.
- **Painel ⚙** virou action sheet (`MenuAcoes`) pra caber "Ver artilheiros",
  "Ver enquetes", "Sair".
- **Contrato**: `DadosArtilheiros`, `FeedResenha`/`BlocoFeedResenha`/
  `ComentarioResenha`, `Enquete`/`EnquetesDoGrupo`/…, `MembroGrupo`/
  `PosicaoEsporte`/`JogadorDoGrupo`/`DadosDaTelaJogadoresDoGrupo`/`PerfilJogador`
  em `src/contrato/tipos.ts`. APIs em `src/api/{artilheiros,resenha,enquetes,jogadores}.ts`.
- **Rota `[id]` virou pasta**: `grupos/[id].tsx` → `grupos/[id]/index.tsx` (pra
  conviver com as sub-rotas). Rota `/grupos/{id}` inalterada.

## Feito: ciclo da partida — check-in, configurar, ao vivo, resultado (2026-09-10)

As 4 telas do ciclo da partida. Os botões de partida (`index.tsx`) roteiam direto pras telas reais.

- **Check-in** (`grupos/[id]/partidas/[partidaId]/checkin.tsx`): lista de
  presença com polling 5s (`AppState` ativo). Membro: "Eu vou jogar" + aviso de
  aguardando; se o sorteio saiu e ele já confirmou, vai direto pro resultado.
  Admin: busca no elenco + adicionar, cadastrar novo (`FormNovoJogador`, agora
  devolve o `MembroGrupo` pra fazer o check-in do recém-criado), badge de
  pagamento clicável (`checkins/{id}/pagamento` + `membros/{id}/mensalista`
  juntos), remover check-in de terceiro, toggle Score, ordenação.
- **Configurar** (`.../configurar.tsx`, só admin): modo de sorteio, jogadores
  por time com feedback de times/sobra, paleta de cores (grade de swatches +
  hex manual, **sem** seletor nativo de cor — não tem no Expo Go), fixação de
  time por jogador (`MenuAcoes`), avisos do modo POSIÇÃO. "Iniciar separação" =
  `salvarConfiguracao` + `salvarPreAlocacoes` + `gerarSorteio` (o balanceamento
  roda no servidor; o app só lê `ResultadoSalvo`).
- **Ao vivo** (`.../ao-vivo.tsx`): ticker 1s + polling 3s do `estadoAoVivo`.
  Cronômetro (play/pause, +30s, resetar com o texto condicional, editar
  duração/gols). Abas Artilheiros (marcar/desmarcar gol otimista + cooldown 2s,
  "N gravado", lance importante), Histórico (`PainelGols`, abre na linha do tempo,
  com os replays abertos inline) e Lances (`CardsReplay`, vídeo já no card), a mesma
  experiência do Resultado; a busca só roda quando os contadores do poll mudam. Comemoração "GOOOL!/LANCE!" = fade
  `Animated` (sem confete de partículas).
- **Resultado** (`.../resultado.tsx`): monta o equivalente de
  `dadosDaTelaResultado` no cliente (`src/partida/montarResultado.ts`) — não há
  endpoint agregado. Serve os dois momentos, igual o site:
  - **Durante o jogo**: só a visão "Times" (cor do colete, cinza neutro sem cor
    cadastrada, "começa com a bola" / "escolhe o lado"), rodapé leva pro "Ao
    vivo", menu "⋯" com "Refazer o sorteio" (só admin, some quando encerra).
  - **Depois do jogo** (`partidaEncerrada`): título "Resultado", botão de
    compartilhar (`Share` só-texto), e as abas Times / Artilheiros (agrupado por
    jogador, só consulta) / Histórico (linha do tempo dos gols; é onde o admin,
    dentro de `PRAZO_EDICAO_GOLS_HORAS`, tem o aviso das 24h, "Adicionar gol"
    (qualquer jogador da partida, com ou sem gol; só aumenta, o contador é "gols a
    adicionar" e a API recebe o total; o gol vira "Adicionado por") e
    cancelar/reativar/migrar — `MenuAcoes` por gol; a aba aparece pro admin no
    prazo mesmo sem gol, pra ele poder adicionar o primeiro) / Lances (`CardsReplay`, com a resenha
    embaixo). Artilheiros e Histórico são o mesmo `PainelGols` com
    `modoFixo`, sem botão de alternar (igual o site). Na linha do tempo, o replay de
    um gol **cancelado** também abre (card "Gol cancelado" com quem cancelou, sem
    comentário): serve de prova de que o gol não era do jogador. "Cancelar gol"
    pede confirmação (`ModalConfirmar`), igual o site.
- **Peças compartilhadas**: `src/partida/{ui.tsx,PainelGols.tsx,CardsReplay.tsx,ReplaysDoJogadorInline.tsx,montarResultado.ts}`.
  Helpers `src/aoVivo.ts` (porte de `lib/aoVivo.ts`) + `src/partidas.ts` ganhou
  `partidaAindaNaoComecou`, `dentroDoPrazoDeEdicaoDeGols`,
  `PRAZO_EDICAO_GOLS_HORAS` (24), `sugerirJogadoresPorTime`.
- **Contrato**: `CheckIn`, `JogadorEmPartida`, `DadosDeApoioDaPartida`,
  `ConfiguracaoPartida`, `PreAlocacaoPartida`, `CorGrupo`, `ResultadoSalvo`,
  `EstadoAoVivo`, `EstadoAoVivoCompleto`, `GolComVideos`, `ModoSorteio`,
  `TipoPagamento` em `src/contrato/tipos.ts`. APIs em
  `src/api/{checkins,cores,partidas}.ts` (+ `buscarComentariosEmLote` em
  `src/api/resenha.ts`).
- **Mudança no site**: `GET /api/v1/partidas/{id}/gols` passou a aceitar
  `?incluirCancelados=true` (o serviço já suportava; faltava ler a query). A
  linha do tempo do resultado do app precisa ver o gol cancelado pra reativar.
  Registrado no changelog + §12 de `16-api-v1.md`, + 1 caso na varredura
  `test:bearer`.

## Feito: cabeçalho padronizado com menu lateral (2026-09-10)

Componente `src/ui/Navbar.tsx`, espelho de `weracha-site/components/navbar.tsx`:
marca "We Racha" à esquerda (ou `‹ destino` quando a tela é interna) e um botão
de menu (☰) à direita que abre uma gaveta deslizante da direita. A gaveta lista
as telas principais na mesma ordem do site (Perfil, Grupos, Artilheiros, Replays,
Enquetes, Parcerias, Contato, Sorteio rápido) + rodapé com o servidor atual e
"Sair". As telas ainda não portadas (Perfil, Replays, Parcerias, Sorteio rápido)
abriam `/em-breve` de propósito, para o menu não esconder o que faltava (hoje todas
existem, ver abaixo). A seção de
administração do menu do site fica de fora (as telas `/admin/*` não entram no app).

- `<Navbar />` substituiu os topos ad-hoc (`⚙` do painel + as barras `‹ Painel`
  / `‹ Grupo` / `‹ Enquetes`). O `MenuAcoes` do rodapé do painel saiu.
- Presente em todas as telas logadas. No ciclo da partida (check-in, configurar,
  ao vivo, resultado) entra via `TelaPartida` só com marca + menu: o voltar
  dessas telas de foco continua no rodapé (`Rodape` / `AvisoPartida`).
- Fora: `onboarding.tsx` (fluxo de primeira vez, tem "Pular"/"Vamos lá!" próprios).
- Gaveta = `Modal` com fade + `translateX` animado (`Animated`, mesmo padrão do
  "GOOOL!" do ao vivo). Ícone do menu desenhado com `View`s, sem lib de ícone.

## Feito: tela de Perfil (2026-09-10)

`src/app/(logado)/perfil.tsx` (rota `/perfil`, item "Perfil" do menu da `Navbar`).
Porta de `weracha-site/app/perfil/page.tsx`.

- **Campos**: nome, apelido, data de nascimento (opcional, `SeletorData` nativo),
  e-mail + opt-in de notificação. Telefone é só-leitura. Botão "Salvar" no rodapé
  só aparece quando algo mudou, e faz um `PUT` por campo alterado
  (`/api/v1/perfil/{nome,apelido,email,data-nascimento}`) + `recarregarPerfil`.
- **Foto** (`src/perfil/FotoPerfil.tsx`): `expo-image-picker` (dep nova, plugin
  no `app.json`) → `POST /api/v1/perfil/foto/upload-url` (rota Bearer nova no
  site) → `PUT` do blob direto no R2 → `PUT /api/v1/perfil/foto`. Remover = `PUT`
  com `fotoUrl: null`.
- **Trocar senha** (`src/perfil/modais.tsx` `ModalTrocarSenha`): SMS via
  `senha/recuperar` + `senha/definir` (com código), igual o /esqueci-senha. Não
  pede a senha atual.
- **Excluir meus dados** (`ModalExcluirConta`, exigência da Apple de ter isso
  dentro do app): lista os grupos onde ainda é dono (bloqueia até resolver);
  senão SMS via `conta/exclusao/codigo` + `conta/exclusao` (POST com código).
  Banner "conta marcada para exclusão" + "Reativar" no topo da tela (o mesmo
  `DELETE /api/v1/conta/exclusao` do painel).
- **Score / posição por grupo**: cada grupo lista score + posição; toca e abre
  `ModalScore` / `ModalPosicao` (reusados de `src/jogadores/modais.tsx`) →
  `PUT .../membros/{meuId}/{score,posicao}`. Score fica travado (🔒) de 1h antes
  da próxima partida pra quem não é admin (`scoreCongelado` portado pra
  `src/partidas.ts`).
- **Mudança no site**: rota nova **`POST /api/v1/perfil/foto/upload-url`**
  (presigned R2, Bearer) — o `POST /api/perfil/foto` do site é só-cookie. Os dois
  passaram a usar `gerarUrlUploadFoto` em `lib/services/jogadores.ts`. Sem
  migration, sem código de erro novo. Changelog + §14 de `16-api-v1.md` +
  1 caso na varredura `test:bearer`.

## Feito: tela de Replays (2026-09-10)

`src/app/(logado)/replays.tsx` (rota `/replays`, item "Replays" do menu, com
badge Beta). Porta de `weracha-site/app/replays/page.tsx`, **sem** o pager estilo
Stories do site — lista vertical simples (cards do `BlocoCard`),
mesma decisão da resenha (ver [[weracha_pager_replay_scroll_snap]]).

- `GET /api/v1/replays?pagina=<n>` (`src/api/replays.ts`, tipos `MeuReplay` e
  `PaginaMeusReplays` copiados pro contrato). **Paginado** (2026-09-19): 5 por página,
  `FlatList` com `onEndReached` + botão "Carregar mais (X de Y)", e o pull-to-refresh volta
  pra página 0. Cada replay já traz `totalComentarios` + `comentariosPreview`, então a tela
  não chama mais `buscarComentariosEmLote` (que segue usado no resultado).
- Card (atualizado 2026-09-19): a tela usa o **mesmo `BlocoCard` da resenha**
  (`src/resenha/BlocoCard.tsx`, layout copiado do feed; `ListaMeusReplays` foi
  removida), com a prop `meus`: cabeçalho ganha o nome do grupo, o menu ⋮
  (`MenuAcoes`) ganha "Ir para o grupo" e o botão diz "Comentar" quando ainda não
  há comentário. Vídeo toca embutido (`PlayerReplay`) e "Baixar vídeo" do menu
  salva na Galeria (o ângulo selecionado). Com mais de um vídeo, os chips "Câmeras:"
  (`src/replay/SeletorCamera.tsx`) ficam à direita do título "Resenha" — a troca de
  câmera saiu do menu ⋮ (2026-10-16). `grupoRemovido` esconde atalhos + resenha. Antes era um card
  próprio com "▶ Assistir" e atalhos "Grupo ›" / "Resultado ›".
- `podeComentar` = tem data de nascimento (o servidor faz o gate 18+ de verdade).
  `podeModerar: false` — `/replays` não é escopado a grupo, então não há sinal de
  admin; um master no app só apaga o próprio comentário (janela de 5min).
- **Sem mudança no site** (a rota já existia da fatia 5a).
- **Filtros + botão de baixar à mostra** (2026-10-21, junto com o site): chips "Grupos"
  (só com 2+ grupos) e "Meses" (só com 2+ meses) embaixo do título, via `?grupo=`/`?mes=`
  (opções em `grupos`/`meses` da resposta; `src/ui/FiltroChips.tsx`, mesmo visual dos
  Artilheiros). Filtro sem resultado mostra "Nenhum replay seu nesse filtro" + "Ver todos
  os replays". No card com `meus`, "Baixar vídeo" saiu do menu ⋮ e virou o botão laranja
  (`BotaoBaixarVideo`) embaixo do vídeo; sem item no menu (saiu do grupo), o ⋮ some.
  A Resenha do grupo ganhou o mesmo chip "Meses" acima das abas, filtrando as duas
  (`?mes=` em `buscarFeedResenha`).
- **Favoritos** (2026-10-22, junto com o site; regra em `14-resenha.md` do site): coração
  (`src/replay/BotaoFavorito.tsx`, vermelho preenchido = favorito, cor `cores.favorito`) no
  `BlocoCard` (ao lado do ⋮) e no `CardsReplay` (ao lado da hora). Store único dos ids
  (`GET /api/v1/replays/favoritos/ids`, recarrega se trocar o jogador logado), toque
  otimista. A tela ganhou abas "Meus vídeos" e "Favoritos" (`GET /api/v1/replays/favoritos`,
  `src/api/favoritos.ts`, tipos `PaginaFavoritos`/`ItemFavorito` no contrato); o `BlocoCard`
  ganhou a prop `favoritos` (nome do grupo + "Ir para o grupo" + botão laranja de baixar).

## Feito: aba Artilheiros do resultado no paridade com o site (2026-09-19)

A aba "Artilheiros" da tela de resultado de partida encerrada
(`(logado)/grupos/[id]/partidas/[partidaId]/resultado.tsx`) ganhou o
`src/partida/PainelGols.tsx`, porte de `weracha-site/components/painel-gols.tsx`:
aviso âmbar "É possível ajustar gols até 24h depois do fim da partida" com "Adicionar
gol" e fechar (só admin dentro do prazo), botão agrupado/linha do tempo, toggle de
Score, cards agrupados com "N gols"/"N gravados", linhas da linha do tempo com
"Registrado/Adicionado por", "Movido de…", "Cancelado por", hora (e dia quando difere da
partida), ícone de replay (nuvem/celular/sem) + legenda, e menu ⋮ por linha (cancelar,
migrar, reativar). Tocar num jogador ou numa linha abre os replays dele **inline**
(`ReplaysDoJogadorInline`, sem botão de voltar: o voltar do celular ou trocar de aba fecha; vídeo toca embutido no card). `cameraAtiva` e `golsGravadosPorJogador` vêm de `GET .../ao-vivo`.
Diferença que sobra: cancelar gol no app não pede confirmação (o site pede).

A aba **Lances** e os replays inline usam o `src/partida/CardsReplay.tsx`, porte do
`GolCard` do site: cabeçalho ("Lance importante" + grupo, ou "Gol marcado" + jogador) com
hora completa, vídeo, chips "Câmeras:" à direita (`src/replay/SeletorCamera.tsx`, só com
mais de um vídeo; o "Registrado por" saiu do card e fica só na aba Histórico), "Movido de…",
"Baixar vídeo" (salva na Galeria, `src/replay/baixarReplay.ts`), avisos de "salvo no celular" / "adicionado pelo admin" / "ainda
não chegou", e a resenha embaixo (`src/resenha/RespostaReplay.tsx`: preview dos 2 últimos
comentários + "Comentar"/"Responder"). Lista vertical em vez do pager de Stories do site. O
O Ao vivo usa os mesmos `PainelGols`, `CardsReplay` e `ReplaysDoJogadorInline`, sem
comentários (igual o site); a aba Histórico dele abre na linha do tempo (`modoInicial`).
Com replays abertos inline (Ao vivo e Resultado), o voltar do celular fecha eles e volta
pra lista, em vez de sair da tela (`src/ui/useVoltarDoCelular.ts`, `BackHandler`).

## Feito: tela de Contato nativa, logada (2026-09-19)

`(logado)/contato.tsx` (rota `/contato`, item "Contato" do menu e "Indicar parceria" da
tela de Parcerias, que passa `?motivo=Parceria`). Título + mensagem + chips de motivo, tela de
agradecimento no fim. `POST /api/v1/contato` (`src/api/contato.ts`) **sem Turnstile**: o site
passou a dispensar o captcha em chamada com Bearer e a limitar a 5 mensagens/hora por conta
(`CONTATO_LIMITE_EXCEDIDO`, novo código no contrato). **Falta a versão deslogada** (o link do
login ainda abre `weracha.app/contato` no navegador): precisa de captcha via WebView com uma
página pública do site e de uma rota de contato isenta de CSRF.

## Feito: tela de Parcerias (2026-09-10)

`src/app/(logado)/parcerias.tsx` (rota `/parcerias`, item "Parcerias" do menu).
Porta de `weracha-site/app/parceiros/page.tsx`. `GET /api/v1/parceiros`
(`src/api/parceiros.ts`, tipo `Parceiro` no contrato). Lista com logo
(`expo-image`) + nome + descrição; toca e abre `ModalCartao` com "Visualizar" que
abre o `link` no navegador (`abrirNoNavegador`). "Indicar parceria" abre
`weracha.app/contato?motivo=Parceria`. Sem mudança no site.

## Feito: Sorteio rápido (2026-09-10)

`src/app/(logado)/sorteio.tsx` (rota `/sorteio`, último item do menu). 100%
local, sem API: `src/sorteio.ts` é cópia literal de
`weracha-site/lib/sorteio.ts` (`sortearTimes` + Fisher-Yates), mantida em
sincronia à mão como o resto de `src/contrato/`. Formulário (nomes um por linha,
stepper 2-8 times, toggle "sortear capitão") → grade de times (★ pro capitão),
"Editar jogadores" / "Sortear de novo". CTA no rodapé leva pra `/criar-grupo`.

**Todas as telas do menu da `Navbar` agora existem** — nenhum item cai mais em
`/em-breve`.

## Feito: entrada por convite manual + destino do convite (2026-09-10)

Fecha o último caminho que ainda caía em `/em-breve` (o card "Entrar por convite"
do painel sem grupo) e o item "mapear o `destino`" da seção 3.

- **Tela `/entrar-por-convite`** (`src/app/(logado)/entrar-por-convite.tsx`): campo
  pra colar o link do WhatsApp + botão "Colar" (`expo-clipboard`). `tokenDeConvite`
  em `src/convites.ts` extrai o token da URL completa (`weracha.app/convite/<t>`,
  `weracha://`, `exp://.../--/convite/<t>`) ou do token solto, e a tela reusa
  `/convite/[token]` (que com sessão ativa já mostra o nome do grupo + "Entrar no
  grupo"). O painel (`HeroSemGrupo`) aponta o card "Já te chamaram" pra cá em vez
  do stub. No site esse card é só texto informativo; o app tem o formulário de
  verdade porque o deep link `https://` só resolve depois do EAS Build.
  Desde 2026-09-27 é explicitamente o plano B do link (o caminho normal é tocar no link
  e o app abrir): o texto manda tocar no link primeiro, o campo aceita "link ou código"
  e vem preenchido sozinho se a área de transferência tiver um link com `convite/` (ao
  abrir a tela e ao voltar pro app, só com o campo vazio). O card do painel virou
  "Colar o convite".
- **`destino` do convite** (`rotaDoConvite` em `src/convites.ts`): o
  `POST /api/v1/convites/{token}` devolve `destino` como caminho do site
  (`/grupos/{id}`, `.../partidas/{id}/checkin`, `.../enquetes?enquete={id}`) e as
  rotas do app têm o mesmo formato, então o caminho serve direto (com fallback pra
  `/grupos/{id}` se vier algo fora do padrão). Antes o app ignorava e caía sempre
  em `/painel` / `/grupos`. Agora:
  - `processarConviteEIrParaDestino` (`src/convites.ts`) processa o convite e já
    faz o `router.replace` pro destino — passo comum entre `src/app/convite/
    [token].tsx` (logado toca "Entrar no grupo") e o login vindo de convite
    (`useFluxoAcesso.concluirLogin`). `TelaAcesso` **não tem `<Redirect>`
    automático nenhum**: enquanto `estado.fase === "logado"`, ela só mostra um
    spinner, e é `concluirLogin` quem SEMPRE navega explícito no fim (destino
    do convite se tinha um pendente; `/painel` no caso comum ou se o convite
    falhar). Sem essa exclusividade, um redirect automático dispararia assim
    que `entrar()` muda a sessão pra "logado" (bem antes da chamada de rede do
    convite terminar) e brigaria com a navegação de verdade.
  - O convite pendente (`consumirConvitePendente` em
    `src/acesso/convitePendente.ts`) é lido + limpo, atômico, **uma vez, no
    mount da tela de login** — não dentro de `concluirLogin` — pra um login
    abandonado (usuário volta sem terminar) não deixar o convite vazando pro
    próximo login que completar por essa tela, de conta sem relação nenhuma.
    (Três versões anteriores mais simples — guardar o destino num módulo pra a
    tela ler ao montar; só um `router.replace` "por último ganha"; reler o
    convite pendente dentro do `concluirLogin` em vez de consumir no mount —
    perderam a corrida da navegação ou deixavam o convite vazar pra um login
    não relacionado depois; achados e corrigidos no code review de
    2026-09-13.)
  - `grupos/[id]/enquetes` passou a ler `?enquete=` e abrir a enquete direto.
- Sem mudança no site.

**Limitações aceitas** (achadas no code review, baixa prioridade):
- Se a chamada de `processarConvite` demorar (rede ruim) e o usuário sair da
  tela de carregando pelo botão físico de voltar do Android nesse meio-tempo,
  o `router.replace` pro destino ainda dispara quando a resposta chegar,
  tirando o usuário de onde ele tinha ido. (Não tem affordance de navegação
  nas telas envolvidas enquanto carrega, o que reduz a chance, mas o botão
  físico de voltar não é bloqueado.)
- Consumir o convite pendente no mount usa `useState(() => consumirConvitePendente())`
  (lê + limpa o módulo dentro do inicializador). Não é reentrante: se a tela de
  login duplicar (ex.: abre um convite, toca "Entrar ou criar conta", abre outro
  convite sem terminar o primeiro login, toca de novo — duas instâncias de
  `/login` na pilha) e o usuário completa o login pela instância de cima, a
  instância de baixo nunca chama o próprio `concluirLogin` (nada nela navega) e
  o convite que ela capturou nunca é usado (não vaza pra outra conta, só não é
  aplicado; o usuário pode abrir o link de novo). Pra essa instância órfã não
  ficar presa no spinner pra sempre se o usuário voltar pra ela, `TelaAcesso`
  tem uma rede de segurança: depois de 8s sem ninguém ter navegado com a sessão
  já "logado", cai no `/painel` por conta própria. O mesmo `useState` também
  rodaria duas vezes se o app algum dia ligar `<StrictMode>` (não liga hoje) —
  a segunda chamada acharia o módulo já limpo pela primeira. Nenhum dos dois é
  problema de segurança (não junta a conta errada no grupo errado), só de
  robustez; documentado em vez de perseguido até o fim.

## Feito: paridade visual/funcional com o site, fases 2 a 4 (2026-09-11 a 2026-09-20)

Plano em 8 fases pra fechar as lacunas de fidelidade com o site. As fases 1 (parcial), 5, 6,
7 e 8 seguem em [`10-app-de-jogador.md`](10-app-de-jogador.md). Fora de escopo confirmado:
marketing/SEO, `/admin/*`, páginas legais.

- **Fase 2 (design system), maior parte feita**: fontes Space Grotesk + Geist
  Mono (`src/ui/Texto.tsx` novo, sweep de `import { Text }` em ~45 arquivos,
  `src/app/_layout.tsx` carrega + segura o splash); ícones lucide
  (`src/ui/Icone.tsx` novo, `src/ui/TituloTela.tsx` novo) substituindo emoji/formas
  desenhadas na Navbar, títulos de tela, painel, onboarding, cronômetro do ao
  vivo, tela do grupo (pills + rodapé + cards), resenha, chat, enquetes,
  replays, resultado, checkboxes; confete de gol (`src/partida/Comemoracao.tsx`
  novo, porta `gerarParticulas` do site, 14 partículas em leque via
  `Animated`). Emoji mantido só onde o site também usa (medalhas do pódio,
  comemoração).
  **Ainda sobra** um punhado de glifos menores (steppers `−`/`+`, setas `▾`/`▲`/`▼`
  de dropdown/ordenação em `TelaArtilheiros`/`configurar`/`enquetes/nova`,
  `⋯` em `jogadores.tsx`) — baixa prioridade, ficam pra quando mexer nesses
  arquivos de novo.
- **Fase 3 (feita)**: `/esqueci-senha` (modo `reset` de `src/acesso/`) ganhou
  paridade com `weracha-site/app/esqueci-senha/page.tsx` — aviso de spam depois
  de `AVISO_SPAM_APOS` tentativas (já existia só no passo `codigo`), botão
  "Corrigir número" ao lado de "Reenviar código", e link "Ir pro login" quando
  `senha/recuperar` recusa com `TELEFONE_NAO_VERIFICADO`/`SENHA_NAO_DEFINIDA`
  (`mostrarIrParaLogin` novo em `useFluxoAcesso.ts`, checa `e.codigo` do
  `ErroApi`, não o texto da mensagem como o site faz).
- **Fase 4 (feita em 2026-09-20)**: vídeo embutido.
  `src/replay/PlayerReplay.tsx` (`expo-video`, pôster com play, `VideoView` só monta no
  toque, um por vez; o pôster mostra a capa = 1º quadro do vídeo via
  `generateThumbnailsAsync` do próprio expo-video, gerada numa fila de 1 em 1 e guardada
  por link), `BotaoBaixarVideo` + `baixarReplay.ts` (`expo-file-system` baixa do
  R2 pro cache, `expo-media-library/legacy` grava na Galeria, só escrita/só vídeo).
  Ligado em `CardsReplay` e `BlocoCard`. Deps novas + plugin
  `expo-media-library` em `app.json`: **exige rebuild do dev client/APK** (Expo Go já
  traz `expo-video`). R2 não precisou de mudança (mp4 com `Accept-Ranges` e faststart).
