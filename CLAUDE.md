# We Racha — app de jogador (weracha-jogador)

App móvel (React Native + Expo) pro jogador comum de pelada. É o **terceiro**
projeto do workspace, cada um com seu próprio git, sem monorepo:

- **site** (`../weracha-site/`) — Next.js, frontend + backend. Expõe a API `/api/v1/*`
  que este app consome.
- **cam** (`../weracha-cam/`) — app Android nativo (Kotlin) que grava os replays.
  Roda num celular fixo no tripé. Público e ciclo de vida diferentes deste app.
- **app** (este) — instalado por todo mundo do grupo. Só fala com o site por HTTP.

Ver `../CLAUDE.md` (workspace) e `../weracha-site/docs/pendente/10-app-de-jogador.md`
(decisões e backlog do app).

## Como o app fala com o site

- Sempre HTTP contra `/api/v1/*`, autenticado por `Authorization: Bearer <token>`.
- Token emitido em `POST /api/v1/auth/token` (telefone + senha). Expira em **10
  dias deslizantes**; num `401` o app re-loga sozinho com a senha guardada no
  SecureStore (`src/sessao/`). Não há tela de "digite a senha de novo" no caminho
  comum.
- Contrato completo: `../weracha-site/docs/especificacao/16-api-v1.md`. Formato de erro
  fixo `{ codigo, mensagem, detalhe? }` — a UI decide a mensagem pelo `codigo`
  (enum estável), **nunca** pelo texto `mensagem` (PT-BR de debug).

## `src/contrato/` é cópia do site, não invente divergência

Nível 1 do compartilhamento ("copiar com disciplina"). `codigos-erro.ts`,
`tipos.ts` e `telefone.ts` são cópia literal de arquivos do repo do site (ver
`src/contrato/README.md` pra origem de cada um). Ao mexer nesses conceitos no
site, reflita aqui e rode `npm test` — o teste trava a lista de códigos de erro.
Não copiar componente React, código de servidor, Zod nem Drizzle.

## Rodando

```bash
npm install
npm start            # Metro; a no terminal abre no emulador Android
npm run android      # abre direto no emulador/device Android
npm test             # jest (contrato)
npm run typecheck    # tsc --noEmit
npm run lint
```

Pra falar com o site local (`next dev` na porta 3000), escolha "Local" na
engrenagem da tela de login:
- Emulador Android: o app usa `http://10.0.2.2:3000` (localhost do host).
- Device físico via USB: rode `adb reverse tcp:3000 tcp:3000` e o app usa
  `http://localhost:3000`.

`java`/`gradle`/`adb` não estão no PATH do sistema (ver `../CLAUDE.md` pros
caminhos do Android Studio). Build nativo real só quando for pra loja (EAS).

## Convenções

- **Só arquivos de rota e layout em `src/app/`** (expo-router, file-based). Todo
  o resto do código em `src/` (`api/`, `sessao/`, `contrato/`, `config/`).
- Rota `(logado)/` é grupo protegido: `src/app/(logado)/_layout.tsx` redireciona
  pro `/login` sem sessão. A home logada é `(logado)/painel.tsx` (`/painel`,
  espelha `weracha-site/app/painel`); peças de UI dele em `src/painel/ui.tsx`.
- **Cabeçalho padronizado**: `src/ui/Navbar.tsx` (espelha
  `weracha-site/components/navbar.tsx`) — marca à esquerda ou `<Navbar voltar="Grupo" />`
  pra nomear o destino do voltar, e o botão ☰ à direita que abre a gaveta com as
  telas principais. Toda tela logada renderiza `<Navbar />` no topo (o ciclo da
  partida herda via `TelaPartida`; `onboarding` é a exceção). O "‹ destino" **vai
  pro destino que o texto nomeia** (`router.dismissTo`: "Painel" → `/painel`,
  "Grupo" → `/grupos/[id]`, "Check-in", "Enquetes"; ids vêm dos params da rota), não
  pra tela de onde veio — isso é o voltar do celular (histórico). Rótulo sem destino
  conhecido cai em `router.back()`; `onVoltar` sobrescreve. Todas as telas do
  menu já existem; `(logado)/em-breve.tsx` (item `tipo: "em-breve"` da `Navbar`)
  fica de prontidão pra uma tela nova, sem rota apontando pra ele hoje.
- **Tela do grupo** (`(logado)/grupos/[id]/index.tsx`) espelha
  `weracha-site/app/grupos/[id]/page.tsx`; as sub-telas são irmãs
  (`artilheiros.tsx`, `resenha.tsx`, `enquetes/`, `jogadores.tsx`). Peças de UI
  em `src/grupo/` (`modais.tsx`, `MenuAcoes.tsx` — action sheet, o `Alert.alert`
  do RN corta em 3 botões no Android; `pickers.tsx` — data/hora via
  `@react-native-community/datetimepicker`), e por área em
  `src/{artilheiros,resenha,enquetes,jogadores}/`. Avatar em
  `src/ui/AvatarJogador.tsx`. Janela de check-in e formatação de partida em
  `src/partidas.ts` (sem fuso SP explícito: o cliente é local).
- **Tela com `TextInput` no meio da rolagem usa `ScrollTeclado`** (`src/ui/ScrollTeclado.tsx`)
  no lugar de `ScrollView`: encolhe a área quando o teclado abre e rola até o campo que
  ganhou foco (senão o teclado cobre o campo). Modais (`Modal`) já se ajustam sozinhos no
  Android e a tela de acesso tem o próprio `KeyboardAvoidingView`.
- Chat da resenha faz polling só enquanto `AppState.currentState === "active"`.
- **Vídeo de replay toca embutido** (`src/replay/PlayerReplay.tsx`, `expo-video`): pôster
  com play, o `VideoView` só monta no toque (cada um segura um decoder no Android) e só
  um toca por vez. **Nunca `Linking.openURL` num link de replay**: joga o jogador pro
  navegador. "Baixar vídeo" (`src/replay/baixarReplay.ts`) baixa do R2 pro cache com
  `expo-file-system` e grava na Galeria com `expo-media-library/legacy` (só escrita, só
  vídeo), sem passar pelo backend. O R2 (`pub-*.r2.dev`) já serve `video/mp4` com
  `Accept-Ranges` e `moov` no início, então não precisa de config no bucket nem de CORS
  (CORS só importa pra `fetch` de navegador, não pro player nativo).
- **Convite**: `src/app/convite/[token].tsx` (deep link) e
  `(logado)/entrar-por-convite.tsx` (colar link manual) reusam o mesmo fluxo.
  `src/convites.ts`: `tokenDeConvite` extrai o token de uma URL colada;
  `rotaDoConvite` traduz o `destino` da resposta (caminho do site, mesmo formato
  das rotas do app) e `processarConviteEIrParaDestino` (processa + navega) é o
  passo comum entre o botão "Entrar no grupo" e o login vindo de convite.
  `TelaAcesso` **não tem `<Redirect>` automático**: enquanto `estado.fase ===
  "logado"`, ela só mostra um spinner, e `useFluxoAcesso.concluirLogin` é o
  único dono da navegação — SEMPRE chama `router.replace` explícito no fim,
  pro destino do convite (se tinha um pendente) ou pro `/painel` (caso comum,
  ou se o convite falhar). Um `<Redirect>` automático dispararia assim que
  `entrar()` muda a sessão pra "logado", bem antes da chamada de rede do
  convite terminar, e brigaria com essa navegação. O convite pendente
  (`consumirConvitePendente()` em `@/acesso/convitePendente`) é lido + limpo,
  atômico, **uma vez no mount da tela** — não dentro de `concluirLogin` — pra
  um login abandonado não deixar o convite vazando pro próximo login que
  completar por essa tela, de conta sem relação nenhuma. `TelaAcesso` também
  tem uma rede de segurança (`useEffect` com `setTimeout` de 8s): se a sessão
  ficar "logado" sem nenhuma navegação (uma instância órfã da tela, presa numa
  pilha com mais de um `/login` empilhado), cai no `/painel` sozinha em vez de
  travar no spinner pra sempre.
- **Perfil vem do contexto de sessão.** `useSessao().estado.jogador` é `MeuPerfil`
  (do cache no boot). Tela logada que precisa do perfil fresco chama
  `recarregarPerfil()` (`GET /api/v1/me`) no mount; o contexto atualiza estado +
  SecureStore. Nunca refazer o fetch de `/me` por conta própria numa tela.
- **Nenhum texto visível pro usuário usa travessão ("—") pra montar frase.** Ponto,
  vírgula ou duas frases. (Mesma regra do site; vale pra tela, não pra comentário
  nem doc.)
- Credencial (token/senha) vive em SecureStore + `useRef`, nunca no state do React
  nem em log. (Exceção herdada: o campo de senha da tela de acesso é um
  `TextInput` controlado por `useState` enquanto o usuário digita — some no
  submit; nada é logado.)
- **Visual portado do site.** Tokens de cor/tipografia em `src/tema.ts` (espelham
  `weracha-site/app/globals.css`: fundo `#161a22`, teal, laranja). Peças de UI
  compartilhadas da tela de acesso em `src/acesso/ui.tsx`. Ao criar tela nova,
  puxar de `src/tema.ts` em vez de hardcodar cor.
- **Fontes**: Space Grotesk (texto) + Geist Mono (eyebrow), carregadas em
  `src/app/_layout.tsx`. **Todo texto importa `Text` de `@/ui/Texto`, nunca de
  `react-native`** — o wrapper resolve a família pelo `fontWeight` do style (RN
  não herda `fontFamily` nem combina família custom com peso). `tema.ts` exporta
  `fontes.{regular,medium,semibold,bold,light,mono}` pra quem precisa do nome
  explícito (`Animated.Text`, texto fora do wrapper).
- **Ícones**: `lucide-react-native`, reexportado com nomes curados em
  `src/ui/Icone.tsx` (mesmos nomes do `lucide-react` do site). Import direto
  (`import { Users } from "@/ui/Icone"`), `<Users size={18} color={cores.teal} />`.
  Emoji só onde o site também usa emoji (medalhas do pódio, comemoração de gol).
  `src/ui/TituloTela.tsx` monta o `<h1 icon+texto>` padrão de tela.
- **Fluxo de acesso** (entrar / criar conta / criar senha / esqueci a senha) vive
  em `src/acesso/` (`useFluxoAcesso.ts` + `TelaAcesso.tsx`), espelhando
  `weracha-site/app/login/page.tsx`. `src/app/login.tsx` é só o wrapper de rota.
