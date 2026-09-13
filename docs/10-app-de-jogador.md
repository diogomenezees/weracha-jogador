# App de jogador: decisões e backlog

> Documento único do app de jogador (`weracha-jogador/`). Junta o antigo
> `10-app-de-jogador-decisoes-em-aberto.md` + `11-preparacao-pre-app.md` que
> viviam em `weracha-site/docs/pendente/` (o repo do site guarda só um stub agora,
> apontando pra cá).
>
> **O que é:** specs/decisões tomadas mas ainda não implementadas. O contrato que
> o app consome já está pronto e exercitado ponta a ponta em
> [`../../weracha-site/docs/especificacao/16-api-v1.md`](../../weracha-site/docs/especificacao/16-api-v1.md).
> Débito de arquitetura da API que **não** depende do app fica em
> [`../../weracha-site/docs/pendente/09-debitos-tecnicos-api.md`](../../weracha-site/docs/pendente/09-debitos-tecnicos-api.md).

---

## Estado (2026-09-06)

### Já entregue no repo do site (preparação pré-app)

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

### Feito: scaffold do app

- `weracha-jogador/` criado: Expo SDK 57 + expo-router + TypeScript, git próprio.
- Contrato Nível 1 copiado do site pra `src/contrato/` (enum de códigos de erro +
  tipos de request/response + helpers de telefone), com teste que trava a lista.
- Camada de sessão: Bearer + telefone + senha no `expo-secure-store`; re-login
  silencioso em `401`; URL base escolhida em runtime (Local / Produção).

### Feito: fluxo de acesso completo (2026-09-07)

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

**Falta validar:** rodar contra o site Local no Expo Go (device físico com
`adb reverse tcp:3000 tcp:3000`), os 4 caminhos + erros (código errado, cooldown,
senha curta). Fontes (Space Grotesk / Geist Mono) e ícones nos avisos ficaram de
fora pra não adicionar dependência agora.

### Feito: `/painel` + onboarding (2026-09-10)

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

Carrossel de onboarding em `src/app/(logado)/onboarding.tsx` (3 slides, swipe +
auto-avanço de 20s + "Pular"/"Vamos lá!"), porta de `app/painel/onboarding`.
Concluir/pular → `POST /api/v1/perfil/onboarding-concluido` → volta pro painel.

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

**Ficou stub** (tela "em breve", `src/app/(logado)/em-breve.tsx`): "Criar grupo"
e "Entrar por convite". `src/app/(logado)/grupos/[id].tsx` é mínima (nome +
esporte + próxima partida). "Sorteio rápido" do rodapé do site foi deixado de
fora. Fontes/ícones seguem sem dependência nova (emoji + formas).

**Falta validar:** rodar contra o site Local no Expo Go (device físico), os 3
estados do painel + os 3 slides do onboarding + a reativação de conta.

### Feito: criar grupo + tela do grupo (2026-09-10)

- **Criar grupo** (`src/app/(logado)/criar-grupo.tsx`): nome, tipo
  (recorrente/avulso), horários recorrentes ou datas avulsas, esporte
  (`GET /api/v1/esportes`). `POST /api/v1/grupos` → `router.replace` pra tela do
  grupo. Quadra fica pra depois (dentro do grupo), igual o site. Pickers de
  data/hora em `src/grupo/pickers.tsx` (novas deps `@react-native-community/
  datetimepicker` + `expo-clipboard`, ambas no Expo Go).
- **Tela do grupo** (`src/app/(logado)/grupos/[id].tsx`, era stub): porta
  completa de `weracha-site/app/grupos/[id]/page.tsx` com **tudo de admin** —
  editar nome/descrição, cancelar (com justificativa) / reativar / excluir
  partida, adicionar partida avulsa, renovar mês, vincular/cadastrar quadra,
  gerar/regenerar link de convite, sair do grupo. Menu "mais opções" virou
  action sheet de baixo (`src/grupo/MenuAcoes.tsx` — `Alert.alert` do RN só
  mostra 3 botões no Android). Modais reusáveis em `src/grupo/modais.tsx`.
  Compartilhar convite = `Share` do RN (texto, sem a imagem que o site gera);
  copiar link = `expo-clipboard`. Helpers de janela de check-in / partida
  portados pra `src/partidas.ts` (sem o fuso SP explícito: o cliente é local).
- **Ainda stub** (`em-breve.tsx`): as sub-telas do grupo (jogadores, enquetes,
  artilheiros, resenha, check-in, ao vivo, resultado) — o rodapé e os botões de
  check-in levam pra lá. A tela do grupo em si está completa.
- **Contrato novo** em `src/contrato/tipos.ts`: `Quadra`, `DadosDaTelaGrupo`,
  `CriarGrupoRequest`, `EsporteOpcao`. APIs em `src/api/{grupos,quadras,partidas}.ts`.

**Falta validar:** criar os dois tipos de grupo no device, o ciclo de vida de
partida (cancelar/reativar/excluir), vincular quadra, renovar, convite.

### Feito: artilheiros, resenha, enquetes, gerenciar jogadores (2026-09-10)

As 4 sub-telas do grupo (não commitadas; typecheck/lint/jest limpos, endpoints
verificados por curl no site Local). O grupo agora não tem mais botão de rodapé
que caia em `em-breve` (só check-in / ao vivo / resultado das partidas seguem stub).

- **Artilheiros** (`grupos/[id]/artilheiros.tsx` + global `(logado)/artilheiros.tsx`,
  no menu ⚙ do painel): pódio + chips de mês + ranking + "zerados" + "sou eu".
  Componente compartilhado `src/artilheiros/`. Compartilhar = `Share` só-texto.
  `src/ui/AvatarJogador.tsx` novo (foto via `expo-image`, iniciais coloridas).
- **Resenha** (`grupos/[id]/resenha.tsx`): feed paginado de replays comentados;
  cada card abre um chat modal com polling de 3s (`src/resenha/ChatResenha.tsx`,
  só enquanto `AppState === active`). Vídeo do replay = `Linking.openURL` (abre
  no player do sistema; sem `expo-video` por ora). Apagar comentário = long-press.
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

**Falta validar:** tudo em device — votar, comentar (polling), gerenciar elenco,
compartilhar rankings.

### Feito: ciclo da partida — check-in, configurar, ao vivo, resultado (2026-09-10)

As 4 telas do ciclo da partida (não commitadas; typecheck/lint/jest limpos). O
grupo não tem mais nada que caia em `em-breve` — os botões de partida
(`index.tsx`) roteiam direto pras telas reais.

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
  "N gravado", lance importante), Histórico e Lances (`ListaReplays`, busca só
  quando os contadores do poll mudam). Comemoração "GOOOL!/LANCE!" = fade
  `Animated` (sem confete de partículas).
- **Resultado** (`.../resultado.tsx`): monta o equivalente de
  `dadosDaTelaResultado` no cliente (`src/partida/montarResultado.ts`) — não há
  endpoint agregado. Serve os dois momentos, igual o site:
  - **Durante o jogo**: só a visão "Times" (cor do colete, cinza neutro sem cor
    cadastrada, "começa com a bola" / "escolhe o lado"), rodapé leva pro "Ao
    vivo", menu "⋯" com "Refazer o sorteio" (só admin, some quando encerra).
  - **Depois do jogo** (`partidaEncerrada`): título "Resultado", botão de
    compartilhar (`Share` só-texto), e as abas Artilheiros (linha do tempo +
    admin dentro de `PRAZO_EDICAO_GOLS_HORAS`: adicionar gol, cancelar/reativar,
    migrar — `MenuAcoes` por gol) e Lances (`ListaReplays` com comentário via
    `ChatResenha`).
- **Peças compartilhadas**: `src/partida/{ui.tsx,ListaReplays.tsx,montarResultado.ts}`.
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

**Falta validar:** tudo em device contra o site Local — ciclo completo
check-in → sorteio → ao vivo → resultado, correções pós-jogo, cores, fixação de
time, erros (fixação impossível, prazo de edição de gol).

### Feito: cabeçalho padronizado com menu lateral (2026-09-10)

Componente `src/ui/Navbar.tsx`, espelho de `weracha-site/components/navbar.tsx`:
marca "We Racha" à esquerda (ou `‹ destino` quando a tela é interna) e um botão
de menu (☰) à direita que abre uma gaveta deslizante da direita. A gaveta lista
as telas principais na mesma ordem do site (Perfil, Grupos, Artilheiros, Replays,
Enquetes, Parcerias, Contato, Sorteio rápido) + rodapé com o servidor atual e
"Sair". As telas ainda não portadas (Perfil, Replays, Parcerias, Sorteio rápido)
abrem `/em-breve` de propósito, para o menu não esconder o que falta. A seção de
administração do menu do site fica de fora (as telas `/admin/*` não entram no app).

- `<Navbar />` substituiu os topos ad-hoc (`⚙` do painel + as barras `‹ Painel`
  / `‹ Grupo` / `‹ Enquetes`). O `MenuAcoes` do rodapé do painel saiu.
- Presente em todas as telas logadas. No ciclo da partida (check-in, configurar,
  ao vivo, resultado) entra via `TelaPartida` só com marca + menu: o voltar
  dessas telas de foco continua no rodapé (`Rodape` / `AvisoPartida`).
- Fora: `onboarding.tsx` (fluxo de primeira vez, tem "Pular"/"Vamos lá!" próprios).
- Gaveta = `Modal` com fade + `translateX` animado (`Animated`, mesmo padrão do
  "GOOOL!" do ao vivo). Ícone do menu desenhado com `View`s, sem lib de ícone.

**Falta validar:** abrir/fechar a gaveta em device, navegação para cada destino,
o "Sair" (deve cair no `/login` pelo redirect do `(logado)/_layout`).

### Feito: tela de Perfil (2026-09-10)

`src/app/(logado)/perfil.tsx` (rota `/perfil`, item "Perfil" do menu da `Navbar`).
Porta de `weracha-site/app/perfil/page.tsx`. typecheck/lint/jest limpos, não
rodou em device.

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
  `PUT .../membros/{meuId}/{score,posicao}`. Score fica travado (🔒) < 1h antes
  da próxima partida pra quem não é admin (`scoreCongelado` portado pra
  `src/partidas.ts`).
- **Mudança no site**: rota nova **`POST /api/v1/perfil/foto/upload-url`**
  (presigned R2, Bearer) — o `POST /api/perfil/foto` do site é só-cookie. Os dois
  passaram a usar `gerarUrlUploadFoto` em `lib/services/jogadores.ts`. Sem
  migration, sem código de erro novo. Changelog + §14 de `16-api-v1.md` +
  1 caso na varredura `test:bearer`.

**Falta validar:** tudo em device contra o site Local — salvar cada campo, o
upload de foto (o `PUT` do blob no R2 via `fetch` do RN é o ponto de risco: se o
`Content-Length` não bater, o R2 recusa; plano B é `expo-file-system`
`uploadAsync`), trocar senha, pedir exclusão + reativar, editar score/posição.

### Feito: tela de Replays (2026-09-10)

`src/app/(logado)/replays.tsx` (rota `/replays`, item "Replays" do menu, com
badge Beta). Porta de `weracha-site/app/replays/page.tsx`, **sem** o pager estilo
Stories do site — lista vertical simples (`src/replays/ListaMeusReplays.tsx`),
mesma decisão da resenha (ver [[weracha_pager_replay_scroll_snap]]). typecheck/
lint/jest limpos, não rodou em device.

- `GET /api/v1/replays` (`src/api/replays.ts`, tipo `MeuReplay` copiado pro
  contrato) + `buscarComentariosEmLote` (já existia) pros comentários.
- Card: grupo/esporte/data, chips de câmera quando tem mais de uma, "▶ Assistir"
  abre o vídeo no player do sistema (`Linking.openURL`, sem `expo-video`),
  atalhos "Grupo ›" / "Resultado ›", e "💬 Comentar" abre o `ChatResenha` (o
  mesmo modal de polling da resenha). `grupoRemovido` esconde atalhos + resenha.
- `podeComentar` = tem data de nascimento (o servidor faz o gate 18+ de verdade).
  `podeModerar: false` — `/replays` não é escopado a grupo, então não há sinal de
  admin; um master no app só apaga o próprio comentário (janela de 5min).
- **Sem mudança no site** (a rota já existia da fatia 5a).

### Feito: tela de Parcerias (2026-09-10)

`src/app/(logado)/parcerias.tsx` (rota `/parcerias`, item "Parcerias" do menu).
Porta de `weracha-site/app/parceiros/page.tsx`. `GET /api/v1/parceiros`
(`src/api/parceiros.ts`, tipo `Parceiro` no contrato). Lista com logo
(`expo-image`) + nome + descrição; toca e abre `ModalCartao` com "Visualizar" que
abre o `link` no navegador (`abrirNoNavegador`). "Indicar parceria" abre
`weracha.app/contato?motivo=Parceria`. Sem mudança no site. typecheck/lint/jest
limpos, não rodou em device. Menu ainda leva a `/em-breve`: só Sorteio rápido.

### Feito: Sorteio rápido (2026-09-10)

`src/app/(logado)/sorteio.tsx` (rota `/sorteio`, último item do menu). 100%
local, sem API: `src/sorteio.ts` é cópia literal de
`weracha-site/lib/sorteio.ts` (`sortearTimes` + Fisher-Yates), mantida em
sincronia à mão como o resto de `src/contrato/`. Formulário (nomes um por linha,
stepper 2-8 times, toggle "sortear capitão") → grade de times (★ pro capitão),
"Editar jogadores" / "Sortear de novo". CTA no rodapé leva pra `/criar-grupo`.
typecheck/lint/jest limpos, não rodou em device.

**Todas as telas do menu da `Navbar` agora existem** — nenhum item cai mais em
`/em-breve`.

### Feito: entrada por convite manual + destino do convite (2026-09-10)

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
- Sem mudança no site. typecheck/lint/jest limpos, não rodou em device.

**Falta validar:** colar link válido/inválido/revogado, entrar logado e via
login, cair na tela certa pra cada `destino` (grupo / check-in aberto / enquete).
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

### Em andamento: paridade visual/funcional com o site (a partir de 2026-09-11)

Plano em 8 fases (fora do doc, no plano da sessão) pra fechar as lacunas de
fidelidade listadas na seção "Aberto" abaixo: fontes/ícones/confete, vídeo
embutido, pager estilo Stories, seletor de cor, compartilhar com imagem, deep
link de replay. Fora de escopo confirmado: marketing/SEO, `/admin/*`, páginas
legais.

- **Fase 1 (EAS, parcial)**: `eas.json` criado (perfis `development`/`preview`/
  `production`). Deps: `expo-dev-client`, `react-native-svg`, `lucide-react-native`,
  `@expo-google-fonts/{space-grotesk,geist-mono}`. **Falta o dono rodar**
  `npx eas login` + `npx eas build -p android --profile development`, depois
  `npx eas credentials` pro SHA-256 real (troca o placeholder em
  `weracha-site/app/.well-known/assetlinks.json/route.ts`).
- **Fase 2 (design system), maior parte feita**: fontes Space Grotesk + Geist
  Mono (`src/ui/Texto.tsx` novo, sweep de `import { Text }` em ~45 arquivos,
  `src/app/_layout.tsx` carrega + segura o splash); ícones lucide
  (`src/ui/Icone.tsx` novo, `src/ui/TituloTela.tsx` novo) substituindo emoji/formas
  desenhadas na Navbar, títulos de tela, painel, onboarding, cronômetro do ao
  vivo, tela do grupo (pills + rodapé + cards), resenha, chat, enquetes,
  replays, resultado, checkboxes; confete de gol (`src/partida/Comemoracao.tsx`
  novo, porta `gerarParticulas` do site, 14 partículas em leque via
  `Animated`). Emoji mantido só onde o site também usa (medalhas do pódio,
  comemoração). typecheck/lint/jest limpos, não rodou em device.
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
  `ErroApi`, não o texto da mensagem como o site faz). typecheck/lint/jest
  limpos, não rodou em device.
- **Fases 4-8 (pendentes)**: vídeo embutido (`expo-video`), pager estilo
  Stories (`/replays`, `/resenha`), seletor de cor em configurar, compartilhar
  como imagem (`react-native-view-shot`), deep link de compartilhar replay
  (novo nos dois repos). Todas exigem o dev client da Fase 1.

### Próximo passo

1. **Build EAS (APK preview)** pra rodar sem o Metro/notebook. Expo Go carrega o
   JS da máquina; com o notebook desligado o app não abre. Precisa de `eas.json`
   + conta Expo grátis (`npx eas login` + `npx eas build -p android --profile
   preview`).
2. **Disparar a conta Apple Developer** (seção 4 abaixo) — é puro lead time, a
   verificação leva dias a semanas. Fazer em paralelo, não esperar o app pronto.
3. **Iterar as telas do app** contra a API. Feito: `/painel`, onboarding,
   criar grupo, tela do grupo (com admin), artilheiros, resenha, enquetes,
   gerenciar jogadores, o ciclo da partida (check-in, configurar, ao vivo,
   resultado), o cabeçalho padronizado (`Navbar`), todas as telas do menu
   (perfil, replays, parcerias, sorteio rápido), a entrada por convite manual e
   o mapeamento do `destino` do convite. Nada cai mais em `/em-breve`. A seguir:
   rodar tudo em device contra o site Local (a lista de "falta validar" das
   seções acima).
4. Deixar necessidade real puxar o resto — push, deep links (link de
   compartilhar replay), camadas 2/3 do anti-abuso de SMS, OpenAPI. Nada disso
   bloqueia iterar.

---

## Aberto

### 1. Ciclo de token: o que falta

- [ ] `POST /api/v1/auth/refresh` com rotação + detecção de reuse (refresh usado
      2x revoga a cadeia daquele device). **Adiado de propósito**: com 10 dias
      deslizantes o re-login silencioso do app (401 → `POST /api/v1/auth/token`
      com a senha guardada) cobre o caso comum. Refresh só entra se a UX de
      "digitar a senha" incomodar. Esse endpoint também vai precisar do rate
      limiting quando existir.
- [ ] Tela "meus aparelhos" (web e app), unificando `sessoes` + `tokensAcesso` na
      mesma visão. `revogado_em` e `nome_dispositivo` já existem pra isso.
- [ ] TTL exato do refresh token (o do access está em 10 dias, revisável).

### 2. Push notifications

Não existe nada de push hoje (nem site, nem Cam). O app de jogador é o primeiro
cliente que justifica: lembrete de check-in, "sorteio saiu", "seu gol foi
gravado", resposta na resenha, "artilheiro do mês definido". É um subsistema
inteiro, não um endpoint.

- [ ] **Infra de job agendado (Vercel Cron)** — não existe hoje (renovação de
      partida é manual, fila de exclusão é atendida na mão). Serve pra dois usos:
      lembrete de check-in (push agendado X horas antes da partida) e automatizar
      a fila de `solicitacoes_exclusao`. Uma infra, dois consumidores.
- [ ] **Transporte**: Expo Push (camada única sobre FCM + APNs, combina com o
      EAS/RN escolhido) vs. FCM/APNs direto. Inclinação: Expo Push pela
      simplicidade, migrar só se precisar de recurso que o Expo não expõe.
- [ ] **Schema**: tabela de device push tokens (`jogadorId`, token, plataforma,
      `criadoEm`/`ultimoUsoEm`/`revogadoEm`). Regra do CLAUDE.md do site: coluna
      `.defaultNow()` nasce `{ withTimezone: true }`. Precisa entrar nos 3 pontos
      de exclusão/anonimização de jogador (mesmo tratamento de `tokensAcesso`).
      Decidir se é tabela própria ou coluna em `tokensAcesso` (1 device = 1 token
      de acesso + 1 push token; provavelmente vale juntar).
- [ ] **Serviço de envio** (Expo Push é um POST HTTP) + mapa de gatilhos em
      `lib/services/*`. Testável agora com um token registrado na mão; o app só
      pluga o registro do token dele depois. Alguns gatilhos são reação a ação de
      outro usuário (resposta na resenha), outros são agendados (lembrete de
      check-in) e dependem do cron acima.
- [ ] **Preferências**: tela no app pra ligar/desligar por categoria; coluna(s)
      no jogador ou tabela à parte. Default de cada categoria.
- [ ] **iOS**: pedido de permissão de notificação (prompt nativo), tratamento de
      "negado".

### 3. Deep links / universal links

**Feito pro link de convite (2026-09-07):**
- Site: `app/convite/[token]/page.tsx` (redireciona pro `/login?convite=...` na
  web), `app/.well-known/{assetlinks.json,apple-app-site-association}/route.ts`
  (⚠️ **fingerprint SHA-256 e Apple Team ID ainda são placeholder** — trocar
  depois do EAS/conta Apple; sem isso o link abre com o seletor "abrir com" em
  vez de direto), `proxy.ts` libera `/convite/` e `/.well-known/`. Os 3
  geradores de link do site (`grupos/[id]`, `enquetes`, `grupos/[id]/enquetes`)
  passaram a emitir `weracha.app/convite/{token}` no lugar de `/login?convite=`.
- App: `app.json` com `intentFilters` (Android, `pathPrefix: /convite`,
  `autoVerify`) + `associatedDomains` (iOS). Rota `src/app/convite/[token].tsx`:
  deslogado guarda o token (`src/acesso/convitePendente.ts`) e manda pro login,
  que entra no grupo ao terminar (`useFluxoAcesso.concluirLogin`); logado, botão
  "Entrar no grupo" chama `POST /api/v1/convites/{token}`. `src/api/convites.ts`.
- **Testável agora** em Expo Go via `exp://<ip>:8081/--/convite/<token>`. O app
  link `https://` de verdade só depois do EAS Build (Expo Go não registra
  intent filter).
- **Entrada manual + `destino` (2026-09-10):** além do deep link, tela
  `/entrar-por-convite` pra colar o link (o painel sem grupo aponta pra ela). O
  `destino` da resposta do `POST /convites/{token}` agora é seguido de verdade
  (`processarConviteEIrParaDestino` em `src/convites.ts`): grupo / check-in
  aberto / enquete, tanto no toque de "Entrar no grupo" quanto no login vindo
  de convite. Ver a seção "Feito" acima.

- [ ] Link de **compartilhar replay** — mesma estrutura, quando as telas de
      replay existirem no app.

### 4. Distribuição nas lojas

- [ ] **Contas**: Apple Developer Program (US$ 99/ano, **pessoa física ou empresa
      — decidir**), Google Play Console (US$ 25, pagamento único). A conta Apple é
      o item de maior lead time do projeto (verificação de dias a semanas):
      disparar já, em paralelo com o scaffold. Google Play pode esperar.
- [ ] **Política de privacidade com URL pública** em `weracha.app`. A substância
      LGPD já existe
      ([`15-exclusao-de-conta.md`](../../weracha-site/docs/especificacao/15-exclusao-de-conta.md),
      [`12-termos-e-privacidade.md`](../../weracha-site/docs/especificacao/12-termos-e-privacidade.md));
      falta o documento público hospedado e o link nas duas lojas.
- [ ] **Privacy nutrition labels** (Apple) / **Data safety form** (Google):
      declarar o que o app coleta (telefone, nome, foto, vídeo; localização não).
      A Apple audita.
- [ ] **Review da Apple** é mais rígido e demora (semanas na 1ª submissão).
      Motivos comuns de rejeição pra revisar antes: login que exige telefone sem
      alternativa; conteúdo gerado por usuário (resenha/replays) sem ferramenta
      de denúncia e bloqueio visível; "Sign in with Apple" obrigatório se houver
      login social (não há, então ok).
- [ ] **Exclusão de conta acessível de dentro do app** — a Apple exige desde
      2022. O fluxo já existe (`/api/v1/conta/exclusao`), só garantir que está
      navegável no app.

### 5. Escopo do v1 e gate de versão mínima

- [ ] **O que entra na primeira versão.** A API cobre tudo (perfil, grupos,
      check-in, ao vivo, resultado, resenha, replays, enquetes, convites,
      exclusão de conta) incluindo as escritas de admin/dono **de grupo** — só as
      telas `/admin/*` do site (esportes, quadras, usuários, ouvidoria) ficaram
      fora de propósito. Decidir se o v1 do app é completo ou um subconjunto
      (ex.: só leitura + check-in, gestão de grupo fica pro site por enquanto).
- [ ] **Gate de versão mínima**: endpoint tipo `GET /api/v1/app/versao-minima`
      (ou header na resposta) que o app checa no boot; abaixo do mínimo, tela
      bloqueante "atualize pra continuar". Necessário porque não dá pra forçar
      todo mundo a atualizar e o contrato vai evoluir. Definir a política
      (quantas versões pra trás são suportadas).

### 6. Observabilidade do app

- [ ] **Crash reporting** (Sentry ou equivalente no RN) — decidir antes de
      shippar, senão bug silencioso em device de terceiro é invisível.
- [ ] **Analytics de uso** — decidir se entra e qual (o site já usa analytics da
      Cloudflare; app é outro contexto). Cuidado com o que declarar nas lojas
      (seção 4).

### 7. Anti-abuso de SMS: camadas 2 e 3

A camada 1 (teto por telefone) + kill-switch manual já estão em produção e são
suficientes pra escala de pelada. O resto só entra se aparecer abuso real.

- [ ] **Camada 2 — teto por IP.** Recusar se um IP pediu códigos demais/hora ou
      tocou muitos telefones distintos/dia (pega a enumeração que a camada 1 não
      vê). **Provavelmente NÃO com tabela no Postgres**: usar Upstash Redis
      (`@upstash/ratelimit`) ou regra de Vercel Firewall/WAF. Cloudflare Rate
      Limiting seria o ideal mas exige o tráfego passar pelo proxy da Cloudflare
      (só quando a separação de deploy acontecer, seção 8).
- [ ] **Camada 3 — disjuntor global automático.** A metade manual está feita.
      Falta a automática (sem e-mail): tabela `sms_enviados` append-only, um card
      no `/admin` "X SMS na última hora / Y hoje", e acima de
      `LIMITE_GLOBAL_SMS_HORA` (≈30) ligar `sms_habilitado = false` sozinho +
      botão "Retomar". Vem depois da camada 1 rodar um tempo em produção.
- [ ] **App attestation** (Play Integrity no Android + App Attest no iOS) —
      **decidido em 2026-09-06: não agora.** Fica anotado como a opção forte se
      aparecer abuso real depois do app no ar (precisa de verificação
      server-side do token de atestação). Secret no build descartado (fraco,
      extraível do APK/IPA).
- [ ] Buraco: `iniciarVerificacaoTelefone` cria a linha de `jogadores` antes de
      enviar o SMS — enumerar números enche o banco de lixo. Exige mover o código
      pendente pra fora da tabela `jogadores`, ou uma varredura no cron que apaga
      linha sem `senhaHash`/`telefoneValidadoEm`/vínculo mais velha que X dias.
- [ ] Buraco: `iniciarRecuperacaoSenha` responde `TELEFONE_NAO_CADASTRADO` —
      oráculo de enumeração. Responder genérico ("se existir conta, mandamos o
      código") custa a mensagem clara que o app quer mostrar. Decisão de UX no
      meio.
- Turnstile no fluxo web continua; o app usa o caminho novo. Não remover.

### 8. Infra quando o app estiver perto de shippar

- [ ] **Migração do Cam** de `/api/cam/*` pra `/api/v1/cam/*` e do
      `POST /api/auth/token` pra `/api/v1/auth/token`, com janela de dupla
      listagem (rota antiga reexporta o handler por N meses, header
      `Deprecation`/`Sunset`). Registrar a nota em
      [`13-we-racha-cam-api.md`](../../weracha-site/docs/especificacao/13-we-racha-cam-api.md)
      quando entrar em planejamento (arquivo vive nos dois repos).
- [ ] **Separar o deploy de front e back.** A API já está extraída (`lib/services/*`
      + route handlers `Request`/`Response` padrão, portável). Discutido em
      2026-09-04: domínio e deploy do site continuam na Vercel (Next.js),
      analytics e R2 já na Cloudflare. Ideia é migrar só a API (não o front) pra
      **Cloudflare Workers** quando essa separação acontecer de verdade, não
      antes. Sem decisão fechada.
- [ ] **CORS** — gatilho é a separação de deploy acima; hoje site e API são o
      mesmo domínio Vercel, então não existe cross-origin de verdade ainda.

### 9. Compartilhar contrato site ↔ app

- **Nível 1 (atual): copiar com disciplina.** `weracha-jogador/src/contrato/` tem a
  cópia literal do enum de `weracha-site/lib/api/codigosErro.ts`, dos tipos de
  request/response e de 2-3 helpers puros (telefone), com README apontando pra
  origem e um teste que fixa os valores do enum (quebra no desalinho). **NÃO**
  copiar componente React, código de servidor, Zod, Drizzle.
- [ ] **Nível 2**: pacote privado `@weracha/contrato` (GitHub Packages), só
      contrato/códigos de erro/validadores puros, zero React. **Gatilho**:
      primeiro bug de drift em produção, ou terceira vez editando o mesmo trecho
      copiado.
- [ ] **Nível 3**: gerar client do OpenAPI (seção 10). Só se a API crescer muito.
- `git submodule`/`subtree` e monorepo descartados (o segundo contraria a
  estrutura do workspace).

### 10. Formalizar o contrato como OpenAPI

- [ ] [`16-api-v1.md`](../../weracha-site/docs/especificacao/16-api-v1.md) é prosa
      hoje. Uma spec OpenAPI de verdade (a) valida que o contrato está completo e
      consistente antes de o app depender dele, (b) vira a fonte pro client do
      app se for pro Nível 3, (c) pega inconsistência de status/shape que a prosa
      esconde.

---

## Decisões já fechadas (não reabrir sem motivo)

- **Tecnologia: React Native + Expo** (2026-09-05). iOS sem Mac deixou de ser
  diferencial (EAS Build compila iOS na nuvem); continuidade de React com o site;
  projeto solo. Kotlin Multiplatform e Flutter descartados.
- **Dois apps separados** (2026-09-04): We Racha Cam (grava, celular fixo no
  tripé, foreground service `microphone`) e app de jogador (todo mundo instala).
  Público e ciclo de vida diferentes demais pra juntar.
- **Token do app**: 10 dias deslizantes, re-login silencioso em 401. **Token do
  Cam**: sem expiração (celular fixo não pode deslogar numa pelada).
- **App attestation**: não agora (ver seção 7).
- **Camada 2 de anti-abuso**: adiada, e não com tabela no Postgres (ver seção 7).

## Relação com outros documentos

- [`../../weracha-site/docs/especificacao/16-api-v1.md`](../../weracha-site/docs/especificacao/16-api-v1.md)
  — contrato de tudo que já está no ar; qualquer rota nova das seções acima entra
  lá quando sair do papel.
- [`../../weracha-site/docs/pendente/09-debitos-tecnicos-api.md`](../../weracha-site/docs/pendente/09-debitos-tecnicos-api.md)
  — débito de arquitetura da API que não depende do app.
- [`../../weracha-site/docs/especificacao/13-we-racha-cam-api.md`](../../weracha-site/docs/especificacao/13-we-racha-cam-api.md)
  — molde técnico do Cam; recebe a nota de migração pra `/api/v1/cam/*` (seção 8).
- [`../CLAUDE.md`](../CLAUDE.md) — regras do repo do app.
