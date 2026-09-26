# Roteiro pra publicar: app de jogador e Cam, na ordem

> Criado em 2026-09-21. Junta, **em ordem de execução**, tudo que falta pra colocar o app de
> jogador (e o Cam) na Google Play. Não substitui o backlog: os detalhes e as decisões de cada
> item vivem em [`10-app-de-jogador.md`](10-app-de-jogador.md) (citado como "doc 10 §N"); o que
> o app já entrega está em [`00-estado-do-app.md`](00-estado-do-app.md).
>
> Regras da Google Play (contas, testes, declarações) mudam com o tempo. Onde este doc cita uma
> regra da loja, ela está marcada com **(conferir)**: confirmar na Play Console antes de agir.

## Ordem em uma olhada

| # | Fase | Bloqueia a loja? | Prazo de terceiros? |
|---|---|---|---|
| 0 | Mini onboarding antes do login (jogador + Cam) | Não, mas é o pedido de UX número 1 | Não |
| 1 | Primeiro build (EAS) + validar em device + limpar o que não pode ir pra loja | Sim | Não |
| 2 | Contas e burocracia das lojas | Sim | **Sim, abrir já** |
| 3 | Crash, versão mínima e demais salvaguardas | Sim (crash e versão mínima) | Não |
| 4 | Publicar: teste fechado, depois produção | Sim | **Sim (14 dias)** |
| 5 | Pós-lançamento: push, paridade com o site, resto do backlog | Não | Não |

As fases 1, 2 e 3 andam em paralelo. A 2 é a que tem relógio correndo, então é a que se abre
primeiro.

## Andamento (atualizado em 2026-09-25)

**Já feito** (o detalhe de cada item está na fase correspondente):

- **Conta da Google Play Console aprovada e app criado no console (2026-09-24).** O relógio do
  teste fechado de 14 dias (fase 4) ainda não começou: falta subir um AAB, terminar a ficha e
  juntar os 12 testadores.
- **Primeiro build no EAS (2026-09-24).** `eas login` feito (conta `weracha`), projeto
  `@weracha/weracha-jogador` criado e vinculado (`projectId` no `app.json`), keystore gerada pelo
  EAS na nuvem e **APK de preview compilado e instalado** no celular do dono, que relatou que
  funcionou tudo (login em produção incluso). Ainda sem o checklist formal do doc 10.
- **Nome do app: "WeRacha"** (era "We Racha"): `name` e permissões do `app.json` e os textos
  visíveis do app. O slug (`weracha-jogador`) e o package (`com.weracha.jogador`) não mudam. O
  nome novo só aparece em build novo.
- **Conta de teste pro revisor da Google** criada em produção (jogador "Revisor Google", telefone
  (11) 99999-9999, senha forte guardada fora do repo, telefone já validado, nascimento 1990) e
  um grupo "Pelada de Teste" com ela como dona. Apagar a conta e o grupo em "Gerenciar usuários"
  depois que o app for aprovado.
- **Migration 0066 aplicada em produção** (a tabela `bloqueios_jogador` existe).
- **Gate de versão mínima** (API + app), fase 3. `GET /api/v1/app/versao-minima` no site e tela
  "Atualize o WeRacha" no app, com abertura normal se o site falhar.
- **Denunciar comentário da resenha**, fase 2. Menu ⋯ em cada comentário, no app e no site, com
  Denunciar, Apagar (autor em 5 min, admin sempre) e Bloquear usuário. A denúncia cai na ouvidoria,
  que ganhou atalhos pra apagar o comentário e bloquear a conta do autor.
- **Upload da foto de perfil validado e corrigido (2026-09-26).** No Expo Go, `fetch(uri).blob()`
  devolvia o texto "File not found" (14 bytes) e ele ia pro R2 no lugar da foto: avatar preto, sem
  erro nenhum. Agora o envio é por `uploadAsync` (`expo-file-system`), o app recusa arquivo
  menor que 1 KB e não pede mais permissão de galeria (o seletor do sistema não precisa). Testado
  no aparelho: a troca de foto funciona. **O APK de preview antigo ainda tem o bug**, só o próximo
  build leva a correção.
- **AAB de produção no teste interno (2026-09-26).** Dois builds de produção no EAS: o
  versionCode 2 voltou da Play com o **erro "permissões de fotos e vídeos precisam da declaração
  de funcionalidade principal"**. Causa: o plugin do `expo-media-library` (`READ_MEDIA_VIDEO`,
  `READ_MEDIA_VISUAL_USER_SELECTED`, `READ_EXTERNAL_STORAGE`) e o do `expo-image-picker`
  (`RECORD_AUDIO`) adicionavam permissões que o app não usa. Correção no `app.json`:
  `microphonePermission: false` no image-picker, `granularPermissions: []` no media-library e
  `android.blockedPermissions` com `READ_MEDIA_*`, `READ_EXTERNAL_STORAGE` e `RECORD_AUDIO`. Sobram
  no manifesto `INTERNET`, `VIBRATE`, `SYSTEM_ALERT_WINDOW` (padrão do Expo) e
  `WRITE_EXTERNAL_STORAGE` (só até o Android 12). O versionCode 3 subiu limpo (sobrou só o aviso
  inofensivo do arquivo de desofuscação: o R8/ProGuard não está ligado, não há o que enviar) e
  está publicado no **teste interno**, "Disponível para testadores internos", 31,6 MB, API 24+.
  **Risco a testar no aparelho:** o "Baixar vídeo" sem nenhuma permissão de leitura. Pelo código do
  `expo-media-library`, no Android 13+ a gravação (`writeOnly`) não pede permissão nenhuma, mas
  isso só se confirma num build. Dica: se descartar uma versão na Play, o pacote continua na
  biblioteca e o mesmo versionCode não pode ser reenviado: usar "Adicionar da biblioteca".
  O nome "(unreviewed)" que aparece na loja é normal até a ficha ser revisada.
- **Política de privacidade e selo "Em breve, Na Google Play" no ar (2026-09-26).** Ver a spec 12
  do site.
- **Seletor Local/Produção escondido em build de release (2026-09-26).** Só aparece em
  desenvolvimento (`PODE_ESCOLHER_SERVIDOR = __DEV__` em `src/config/servidor.ts`); no APK/AAB o
  app fala sempre com `https://weracha.app` e ignora um "local" guardado.
- **Sentry configurado no app de jogador (2026-09-26).** `@sentry/react-native`, plugin no
  `app.json`, `metro.config.js` com debug IDs e `Sentry.init` em `src/app/_layout.tsx`: só liga em
  release, sem `setUser`, sem PII e sem corpo/cabeçalhos de requisição. O DSN
  (`EXPO_PUBLIC_SENTRY_DSN`) e o token de sourcemaps (`SENTRY_AUTH_TOKEN`, secreto) vivem nas
  variáveis do EAS (production e preview), nunca no repo. **Falta ver um evento de teste chegando**
  (só dá em build de release). **Data safety já atualizado** com Registros de falhas e Diagnóstico
  (2026-09-26, ver a fase 2).
- **Enquetes no formato do site (2026-09-26):** descrições e aviso "pra criar uma enquete, entre no
  grupo", card com selo Ativa/Encerrada e nome do grupo, nome do grupo no modal e botão "Ir ao
  grupo" na tela global.
- **Diálogos no padrão do app.** Os alertas brancos nativos (`Alert.alert`) foram trocados por
  modais escuros com blur (`useDialogos()`, `src/ui/Dialogos.tsx`; o servidor do login virou um
  menu de baixo).

**Pendências que surgiram no caminho:**

- [x] ~~Aplicar a migration 0066 em produção~~ (feito, confirmado em 2026-09-24).
- [ ] **Validar em device, item a item,** o gate de versão, o menu ⋯ (denunciar, bloquear, apagar)
      e os novos diálogos. O dono relatou em 2026-09-24 que o APK de preview "funcionou tudo",
      mas sem passar pelo checklist formal.
- [ ] **Commitar o `app.json`** (tem o `projectId` do EAS, o nome "WeRacha" e as permissões) e os
      textos trocados nas telas. Nada disso foi commitado ainda.
- [ ] **Investigar a lentidão do modal "Responder" no Expo Go.** Com muitas mensagens, a conversa
      completa demora dezenas de segundos pra aparecer (só nessa tela). A rede está boa (o site
      responde em milissegundos) e a suspeita é o desfoque de fundo do Android
      (`dimezisBlurView`) redesenhando o app inteiro por trás. O desfoque foi mantido por
      decisão de 2026-09-23 e o assunto fica pra depois. O app já ganhou proteção contra pedidos
      empilhados, timeout que cobre o corpo e uma nova tentativa. Ver `src/api/cliente.ts` e
      `src/api/resenha.ts`.
- [ ] **Testar no Expo Go pelo Wi-Fi, não pelo `adb reverse`.** O túnel USB deixa as respostas
      vazias ou penduradas (`exp://<IP-do-PC>:8081`, celular na mesma rede). Aviso do Expo Go
      sobre a biblioteca de mídia é só limitação dele: o "Baixar vídeo" só vale no APK/AAB.

## Próximos passos (definidos em 2026-09-25)

O Play Console está pronto. Antes de gerar a versão que vai pra loja, o dono quer **melhorar o app
no Expo Go**, depois gerar o build no EAS e só então subir na Play. Ordem:

1. [~] **Melhorar o app no Expo Go** (em andamento em 2026-09-26: foto e enquetes revisadas) (Metro na máquina, celular no Wi-Fi via
       `exp://<IP-do-PC>:8081`, site local com o `rodar-local`). Aproveitar pra riscar o
       checklist de device do doc 10 e validar o gate de versão, o menu ⋯ e os diálogos.
2. [x] **Fechar o que bloqueia a loja no código** (fases 1 e 3): seletor Local/Produção
       escondido e Sentry configurado (2026-09-26). Do Cam ainda falta, se for pra loja. O Data
       safety já ganhou "Registros de falhas" e "Diagnóstico" por causa do Sentry (2026-09-26).
3. [x] **Gerar o AAB** (feito em 2026-09-26, versionCode 3; cota mensal do EAS: cada build
       gasta uma unidade, então juntar as mudanças antes de gerar outro).
4. [~] **Subir o AAB no teste interno** (feito, publicado). Falta **instalar pela loja no
       celular**: ao tocar em "Download test app" a Play respondeu "item não encontrado",
       provavelmente propagação (pode levar de minutos a 1 ou 2 horas no 1º envio). Conferir a
       lista de testadores marcada e a conta certa no celular.
5. [ ] **`assetlinks.json`:** pegar o SHA-256 da chave de assinatura no console (Integridade do
       app) e preencher no site, senão o link de convite abre o seletor "abrir com".
6. [ ] **Juntar os 9 testadores que faltam** (Gmail + Android) e mandar o convite do teste
       fechado; o relógio dos 14 dias só começa quando os 12 aceitarem.
7. [ ] **Teste fechado por 14 dias seguidos**, depois pedir produção.
8. [ ] Depois da aprovação: apagar a conta "Revisor Google" e o grupo de teste em "Gerenciar
       usuários"; revisar o Marketing externo.

## Decisões pra conversar amanhã

Sem isso não dá pra fechar o plano:

1. ~~**Google Play: conta pessoal ou de empresa?**~~ **Decidido em 2026-09-23: conta pessoal.**
   Consequência: o teste fechado com 12 testadores por 14 dias seguidos é obrigatório antes de
   pedir produção (conferir na Play Console). Ver fase 4. Doc 10 §4.
2. **O Cam vai pra Play Store ou fica como APK direto?** Ele roda num celular fixo e só o dono
   instala. APK direto (ou teste interno da Play) evita a declaração de foreground service e a
   revisão de câmera/microfone. Ver fase 4.
3. **Escopo do v1 do app de jogador:** completo como está, ou tirar algo (ex.: gestão de grupo
   fica só no site)? Doc 10 §5.
4. **Push entra no v1 ou só depois?** Recomendo depois (fase 5): é um subsistema inteiro (cron,
   schema, envio, preferências) e não bloqueia a loja.
5. **Crash reporting: Sentry ou Firebase Crashlytics?** Recomendo Sentry pro app de jogador
   (React Native, funciona bem com EAS). No Cam, decidir separado.
6. **Analytics de uso: entra ou não?** Muda o que se declara nas lojas. Doc 10 §6.
7. **Mini onboarding: o texto e a quantidade de telas** (proposta na fase 0).

---

## Fase 0. Mini onboarding antes do login (jogador e Cam)

**Problema:** os dois apps abrem direto na tela de login. Quem instala sem contexto não sabe o
que é o app nem se era esse que queria. Pior no Cam: o jogador comum pode instalar o Cam
achando que é o app do grupo.

**Fato do código:**
- **Jogador** ([`src/app/index.tsx`](../src/app/index.tsx)): sem sessão, redireciona pra `/login`.
  Já existe um carrossel de onboarding, mas é **depois** do login e só pra quem ainda não tem grupo
  (`src/app/(logado)/onboarding.tsx`). Não serve como intro
  pré-login, mas o componente de slides pode ser reaproveitado.
- **Cam** ([`WeRachaCamNavHost.kt`](../../weracha-cam/app/src/main/java/com/weracha/cam/ui/navigation/WeRachaCamNavHost.kt)):
  `startDestination = if (isLoggedIn) MatchList else Login`. Sem nenhuma tela antes.

**Proposta (pra validar amanhã):**

- [ ] **Jogador:** 2 a 3 slides, mostrados **uma vez** (flag guardada no aparelho), antes do login.
      Sugestão de conteúdo: (1) o que é o We Racha (organiza a pelada); (2) o que dá pra fazer
      (check-in, times sorteados, artilheiros, replays dos gols); (3) "entre com seu telefone".
      Botão "Pular" sempre visível. Depois da intro vai pro `/login` e não volta a aparecer.
      Ponto técnico: hoje só o `SecureStore` é usado no app; uma flag simples cabe nele, ou
      adicionar `@react-native-async-storage/async-storage`.
- [ ] **Cam:** 2 telas, mostradas uma vez, com a mensagem principal **"este app é a câmera do
      tripé, não é o app do jogador"** (com o link/nome do app certo). Sugestão: (1) pra que
      serve o Cam e que só uma pessoa por partida precisa dele; (2) como usar: login, escolher a
      partida, apoiar o celular no tripé, pode bloquear a tela, permissões de câmera, microfone e
      notificação. Combina com o `PermissionsGate` que já existe.
- [ ] Decidir se o mesmo texto/visual vale nos dois (tokens de cor já são os mesmos, `cores.dark`
      e laranja).
- [ ] Depois de pronto: reapontar o item "onboarding pós-login" do jogador pra não repetir
      conteúdo da intro.

---

## Fase 1. Primeiro build, validação em device e limpeza pra loja

**Por quê:** nada do app rodou em aparelho ainda, e a build local não funciona nesta máquina
(problema do CMake/NDK, ver `CLAUDE.md` do workspace). O EAS Build compila na nuvem.

**Perfis do [`eas.json`](../eas.json):** `development` e `preview` geram **APK** (instalar direto),
`production` gera **AAB**, que é o que a Play aceita pra app novo.

1. [x] `npx eas-cli login` (feito em 2026-09-24; o login do Expo Go no celular é outra coisa e
       não vale pro EAS). Conta `weracha`, dona também de `werachas-team`.
2. [x] `npx eas-cli build -p android --profile preview`: APK compilado em 2026-09-24 e instalado
       no celular do dono (link do build fica em expo.dev, conta `weracha`, projeto
       `weracha-jogador`). Falta instalar nos celulares de alguns amigos. A conta grátis do EAS
       tem cota mensal de builds, então juntar mudanças antes de gerar outro.
3. [ ] Rodar o **checklist de validação** do doc 10 (seção "Validação em device"), riscando tela
       por tela. É aqui que aparecem os bugs reais. O ponto de maior risco conhecido: upload da
       foto de perfil pro R2 (o `PUT` do blob via `fetch` do RN).
4. [ ] `npx eas build -p android --profile development`: dev client, necessário pras fases 5-8 da
       paridade com o site e pro `expo-media-library` ("Baixar vídeo" na Galeria).
5. [ ] **Limpeza do que não pode ir pra loja** (achados no código, 2026-09-21):
   - [x] **Jogador (feito em 2026-09-26):** o seletor Local/Produção ficava visível na tela de login. Em build de
         produção, esconder (ou deixar atrás de gesto escondido). Usuário não pode apontar o app
         pra outro servidor.
   - [ ] **Cam:** `release` ainda tem `BASE_URL = "https://weracha.example.com/"` (placeholder) em
         [`build.gradle.kts`](../../weracha-cam/app/build.gradle.kts). Trocar por `https://weracha.app/`.
   - [ ] **Cam:** `release` está com `optimization { enable = false }` (sem R8/minify) e sem
         `signingConfig`. Decidir se liga minify (testar bem: Retrofit, kotlinx-serialization e
         Media3 são sensíveis a regra do R8) e criar a keystore de assinatura.
   - [ ] **Cam:** `versionCode = 1`, `versionName = "1.0"`; definir a política de incremento.
   - [ ] **Jogador:** conferir `app.json` (nome, ícone, splash, permissões; o `version` está
         "1.0.0" e o EAS controla o `versionCode` via `autoIncrement`).
6. [ ] Teste de regressão do que mudou no site: `pnpm run test:bearer` (varredura Bearer, roda no
       `revisar-e-subir`).

---

## Fase 2. Contas e burocracia das lojas (abrir em paralelo, tem prazo)

- [x] **Google Play Console:** conta pessoal criada em 2026-09-23 e **aprovada em 2026-09-24**;
      app criado no console. **Em 2026-09-25 o dono relatou ter preenchido tudo o que o painel
      pedia** (declarações e ficha, abaixo). O que falta na Play é só a **versão** (AAB) e os
      **testadores**: por ser conta pessoal, o teste fechado exige 12 testadores por 14 dias
      seguidos (fase 4) e o dono tem 3 até agora, **faltam 9**. O teste interno precisa de um AAB.
- [x] **Declarações do painel, preenchidas (relato do dono em 2026-09-25; detalhes abaixo):**
  - [x] Classificação de conteúdo: interação entre usuários, conteúdo gerado por usuários,
        bloquear e denunciar (Sim), sem nudez nem violência real, interações limitadas a amigos
        convidados (Sim). Diversos: tudo "Não" (sem localização, compra digital, recompensa em
        dinheiro, navegador, notícia). Saiu 12+. Ponto em aberto: "moderação de conversas por
        chat" ficou como "Não"; é defensável marcar "Sim" (admin do grupo apaga, dono do site
        trata denúncias na ouvidoria), mas só se o dono acompanhar a ouvidoria.
  - [x] **Público-alvo:** preenchido. Recomendação que foi dada: **16-17 e 18+** (o cadastro não tem
        idade mínima; só comentar exige 18+). Evitar faixas abaixo de 13 (ativa a política de
        Famílias). Conferir se `weracha.app/termos` cita idade mínima e alinhar.
  - [x] **Acesso ao app:** conta de teste do revisor informada (ver "Já feito").
  - [x] **Segurança dos dados (Data safety), preenchido com estas respostas:** coleta = Sim;
        criptografia em trânsito = Sim; conta criada por "Nome de usuário, senha e outras autenticações" (telefone + senha + código SMS); exclusão pedida
        pelo usuário = Sim. Tipos, todos **Coletado, não Compartilhado, não efêmero**:
        Nome (obrigatório; funcionalidade + gerenciamento de conta), Telefone (obrigatório;
        funcionalidade + conta + segurança/fraude), IDs do usuário (obrigatório; funcionalidade +
        conta), E-mail (opcional; só mensagens do desenvolvedor), Outras informações = data de
        nascimento (opcional; funcionalidade), Fotos = foto de perfil (opcional; funcionalidade),
        Outras mensagens no app = comentários e contato (opcional; funcionalidade).
        **Não declarar:** Vídeos (o app só reproduz e baixa; quem grava é o Cam), SMS/MMS (o app
        não lê SMS, o código é digitado), IDs do dispositivo, localização, análise, publicidade.
        Prestadores (Vercel, Neon, R2, Twilio) não contam como compartilhamento. Não marcar
        "Personalização" em nenhum. **Sentry entrou em 2026-09-26 e o formulário foi atualizado
        (ver abaixo). Se entrar analytics, atualizar de novo.**
        Conferir se a política de privacidade cita a Twilio e diz que a foto é visível aos outros
        membros do grupo.
  - [x] Marketing externo (opção de anunciar fora da Play): deixado marcado; revisar ao ir pra
        produção (a mudança leva até 60 dias).
- [ ] **Apple Developer Program:** US$ 99/ano. É o item de maior lead time (dias a semanas de
      verificação). Só necessário se for lançar no iPhone. Doc 10 §4. Se iOS ficar pra depois,
      pular sem culpa.
- [ ] **Política de privacidade:** a página `weracha.app/privacidade` **já existe** no site
      (spec 12) e o app já linka pra ela. Conferir que cobre o que a loja pede: dados coletados
      (telefone, nome, foto, vídeo, sem localização), como excluir, contato.
- [x] **Formulário de segurança de dados (Data safety) da Play** preenchido em 2026-09-25 e
      **atualizado em 2026-09-26 pelo Sentry:** em "Informações e desempenho do app" foram marcados
      **Registros de falhas** e **Diagnóstico** (coletados, não compartilhados, não efêmeros,
      obrigatórios, finalidade Análise); "Outros dados de desempenho" ficou de fora porque o
      desempenho está desligado (`tracesSampleRate: 0`). No layout novo da Play Console o caminho
      é Monitorar e aprimorar, Política e programas, Conteúdo do app, Segurança dos dados (ou a
      busca do topo). Se entrar analytics, reabrir. *Privacy nutrition labels* da Apple só se for
      pro iOS.
- [ ] **Exclusão de conta:** o fluxo dentro do app já existe (perfil, "Excluir meus dados"). A Play
      também pede uma **URL web** pra solicitar exclusão de dados fora do app **(conferir)**.
      Verificar se `weracha.app/contato` ou uma página dedicada serve.
- [x] **Conteúdo gerado por usuário (resenha e comentários dos replays):** a Play e a Apple exigem
      um jeito de **denunciar** conteúdo e **bloquear** usuário **(conferir)**. **Feito em 2026-09-23:**
      cada comentário tem um menu ⋯ (Denunciar pra todo mundo menos o autor, Apagar pro autor na
      janela de 5 min e pro admin sempre). A denúncia cai na ouvidoria
      (`POST /api/v1/comentarios/{id}/denuncia`, texto copiado). **Bloquear usuário** (pessoal) também
      feito em 2026-09-23, e a ouvidoria ganhou atalhos pra apagar o comentário e bloquear a conta do
      autor. Site e app têm o mesmo menu ⋯. Migration 0066 aplicada em produção.
- [x] **Classificação indicativa:** questionário respondido (12+). O site já exige 18+ pra comentar
      (gate por data de nascimento no servidor).
- [x] **Material da ficha na loja (preenchido, relato do dono em 2026-09-25):** ícone 512×512, imagem de destaque 1024×500, no mínimo 2
      screenshots de celular, descrição curta e completa, categoria (Esportes). Screenshots saem
      do APK da fase 1. **Textos escritos em 2026-09-24** (ver o anexo no fim).

---

## Fase 3. Crash, versão mínima e salvaguardas (antes de publicar)

Sem isto, um bug em aparelho de terceiro é invisível e não dá pra forçar atualização depois.

- [~] **Crash reporting no app de jogador** (doc 10 §6). **Configurado em 2026-09-26** e Data safety
      atualizado; falta ver o evento de teste num build de release. Sentry (`@sentry/react-native`
      + plugin Expo) e envio de sourcemaps no build do EAS, senão o stack trace vem ofuscado. Não funciona
      no Expo Go; só em build EAS. Cuidado pra **não** mandar telefone/nome no contexto do usuário.
- [ ] **Crash reporting no Cam.** O Cam é Kotlin nativo e já teve bugs de campo difíceis (gravação
      órfã, replay truncado), que só foram achados com logcat manual. Opções: Sentry Android ou
      Firebase Crashlytics. Vale mais aqui do que no app de jogador, porque o celular fica
      sozinho no tripé.
- [x] **Gate de versão mínima, feito em 2026-09-23** (doc 10 §5): endpoint
      `GET /api/v1/app/versao-minima` no site (pública, contrato em `16-api-v1.md`) + checagem
      no boot e ao voltar pro primeiro plano + tela bloqueante "Atualize o We Racha" com botão pra
      loja. A versão mínima mora em `weracha-site/lib/appVersao.ts` (hoje `1.0.0`, igual ao
      `app.json`) e só sobe quando uma versão antiga precisa sair de circulação. Se o site falhar
      ou responder algo estranho, o app abre normal. Precisa estar na **primeira** versão
      publicada, porque versão antiga sem o gate não pode ser forçada a atualizar. **Falta:** o
      link da loja (`URL_LOJA_ANDROID`) só funciona depois do app publicado; definir quantas
      versões pra trás são suportadas; decidir se o Cam precisa do mesmo.
- [ ] **Analytics de uso:** decidir (doc 10 §6). Se entrar, atualizar as declarações da fase 2.
- [ ] **Deep link (`assetlinks.json`):** o SHA-256 em
      `weracha-site/app/.well-known/assetlinks.json/route.ts` ainda é **placeholder** (doc 10 §3).
      Com Play App Signing, o fingerprint que vale é o da **chave de assinatura do app** que a
      Play mostra no console (Integridade do app), não só o da chave de upload **(conferir)**. Só
      dá pra preencher depois de criar o app na Play. Sem isso o link de convite abre o seletor
      "abrir com" em vez de abrir direto no app.

---

## Fase 4. Publicar

**Jogador (AAB):**

1. [ ] `npx eas build -p android --profile production` (gera o **AAB**; o EAS cuida da keystore,
       `npx eas credentials` mostra o fingerprint).
2. [ ] Criar o app na Play Console, preencher ficha, declarações e questionários da fase 2.
3. [ ] **Teste interno** (até 100 testadores, sem revisão): validar que o AAB instala pela loja.
4. [ ] **Teste fechado (obrigatório: a conta é pessoal).** **12 testadores por 14 dias seguidos**
       antes de poder pedir produção **(conferir)**. O próprio grupo da pelada serve. É o maior
       prazo do roteiro, então o relógio só começa quando o app estiver no ar no teste fechado e
       os 12 tiverem aceitado o convite. Cada testador precisa de uma **conta Google (Gmail)** e
       de um Android; vale já combinar com o pessoal e coletar os e-mails, pra não perder dias
       depois. Dica: chamar uns 15 pra sobrar margem se alguém sair antes dos 14 dias.
5. [ ] Preencher o `assetlinks.json` com o fingerprint real (fase 3) e conferir o link de convite.
6. [ ] Enviar pra produção (`npx eas submit -p android` ou upload manual). Primeira revisão pode
       levar dias.

**Cam:** conforme a decisão de amanhã.

- [ ] **Opção A, APK direto** (recomendada pra começar): assinar o release, distribuir o APK pro
      dono do celular do tripé. Sem revisão da loja. Atualização é manual (aí o gate de versão
      mínima ajuda).
- [ ] **Opção B, Play Store:** exige declaração de **foreground service** (`camera` e `microphone`)
      com justificativa e vídeo demonstrando o uso **(conferir)**, mais revisão de permissões de
      câmera/microfone. Tem que estar em produção pra ter atualização automática.
- [ ] Em qualquer opção, antes de assinar: o `RecordingService` **nunca** pode usar `dataSync` no
      `foregroundServiceType` (hoje é `camera|microphone`, certo) e o token do Cam segue fora do
      backup do Android.

---

## Fase 5. Pós-lançamento: só entra se a necessidade aparecer

Nada aqui bloqueia a loja. Ordem sugerida por valor:

1. [ ] **Push notifications** (doc 10 §2). Subsistema inteiro, na ordem:
   1. Job agendado (Vercel Cron). Não existe hoje; serve pro lembrete de check-in e pra
      automatizar a fila de exclusão de conta.
   2. Transporte: Expo Push (recomendado) sobre FCM. Precisa da credencial FCM configurada no EAS.
   3. Schema: tabela de tokens de push, com `withTimezone: true` nas colunas `defaultNow()`, e
      entrada nos 3 pontos de exclusão/anonimização de jogador (regra do `CLAUDE.md` do site).
   4. Serviço de envio + mapa de gatilhos: "sorteio saiu", "seu gol foi gravado", resposta na
      resenha, lembrete de check-in, artilheiro do mês.
   5. Tela de preferências por categoria no app.
   6. iOS: prompt de permissão e tratamento de "negado".
2. [ ] **Paridade com o site, fases 5-8** (doc 10): pager estilo Stories nos replays/resenha,
       seletor de cor nativo em "configurar", compartilhar resultado como imagem
       (`react-native-view-shot`), deep link de compartilhar replay (novo nos dois repos). Todas
       precisam do dev client da fase 1.
3. [ ] **Contato deslogado nativo** no app (hoje o link abre o navegador; precisa de captcha via
       WebView e rota isenta de CSRF). Doc 10.
4. [ ] **iOS:** só depois do Android estável e da conta Apple aprovada. O EAS compila iOS sem Mac.
5. [ ] **Sessão e segurança** (doc 10 §1 e §7): `POST /api/v1/auth/refresh` (só se digitar a senha
       incomodar), tela "meus aparelhos", anti-abuso de SMS camadas 2 e 3, e app attestation (decidido
       "não agora" em 2026-09-06). Buracos conhecidos: `iniciarVerificacaoTelefone` cria a linha
       antes do SMS, e `iniciarRecuperacaoSenha` é oráculo de enumeração.
6. [ ] **Infra** (doc 10 §8): migrar o Cam de `/api/cam/*` pra `/api/v1/cam/*` com janela de
       dupla listagem, e separar o deploy do back (Cloudflare Workers) com o CORS junto. Sem
       decisão fechada.
7. [ ] **Contrato** (doc 10 §9 e §10): pacote `@weracha/contrato` e OpenAPI, só se aparecer drift
       real entre site e app.
8. [ ] **Débitos técnicos da API** (site, `docs/pendente/09-debitos-tecnicos-api.md`): opcionais,
       só se mexer nessas áreas por outro motivo.

---

## Checklist de "pronto pra apertar publicar"

- [ ] Intro pré-login nos dois apps (fase 0)
- [ ] Checklist de device do doc 10 todo riscado
- [~] Sem seletor de servidor no login de produção (feito no app); Cam com `BASE_URL` real (falta)
- [~] Crash reporting nos dois apps, recebendo evento de teste (app configurado, sem evento ainda; Cam não)
- [x] Gate de versão mínima no site e no app (falta só validar em device)
- [x] Fluxo de denúncia/bloqueio de comentário (migration 0066 já em produção; falta validar em device)
- [ ] Política de privacidade e URL de exclusão conferidas
- [x] Declarações da loja preenchidas na Play Console (relato do dono em 2026-09-25)
- [ ] **Falta:** AAB de produção gerado (`eas build --profile production`) e subido no teste interno
- [x] Ficha da loja preenchida (textos, ícone, imagem de destaque, screenshots)
- [ ] `assetlinks.json` com o fingerprint real
- [ ] **Faltam 9 testadores** (tem 3 de 12). Teste fechado cumprido (12 testadores, 14 dias seguidos; obrigatório, a conta é pessoal)

---

## Anexo: textos da ficha da loja (escritos em 2026-09-24)

**Breve descrição (77 caracteres, limite 80):**

```
Organize seu racha: sorteio de times, placar ao vivo, replays e artilheiros.
```

**Descrição completa (cerca de 2.100 caracteres, limite 4.000):**

```
O WeRacha organiza o seu racha do começo ao fim. Junte o grupo, confirme presença, sorteie os times, acompanhe o placar e reveja os gols depois do jogo, tudo num lugar só.

COMO FUNCIONA
Crie o grupo do seu racha, escolha o esporte e o horário e convide o pessoal por link, pelo WhatsApp. Quem entra já vê a próxima partida e pode confirmar presença.

O QUE VOCÊ FAZ NO APP

• Grupos e convites: crie o seu grupo ou entre no de um amigo com um link de convite. Cada grupo tem administradores e jogadores.

• Check-in: confirme se você vai ou não jogar e veja quem já confirmou.

• Sorteio de times: o app monta times equilibrados entre os presentes, e você pode refazer o sorteio antes de começar.

• Ao vivo: acompanhe o placar da partida e veja quem marcou cada gol.

• Resultado: ao fim do jogo, veja o placar final, os times e a linha do tempo dos gols.

• Artilheiros: ranking de gols do grupo, com filtro por mês e por esporte.

• Enquetes: pergunte ao grupo o horário, o local ou o que for, e vote com um toque.

• Replays: veja os lances e os gols em vídeo, baixe para a galeria e compartilhe com a galera. Os replays são gravados pelo We Racha Cam, um celular fixo no tripé, que funciona em conjunto com este app.

• Resenha: comente os lances do grupo. Os comentários são liberados apenas para maiores de 18 anos, e você pode denunciar um comentário ou bloquear alguém a qualquer momento.

• Parcerias: benefícios de estabelecimentos parceiros para quem joga no WeRacha.

FEITO PARA O GRUPO
Só quem está no grupo vê as partidas, os replays e os comentários. Você pode pedir a exclusão dos seus dados direto no perfil.

Esportes: futebol de campo, futebol de salão (futsal), society, futebol de areia e futevôlei.

Baixe o WeRacha e organize o próximo racha sem confusão no grupo do WhatsApp.
```

Se o Cam não for citado na ficha, reescrever o item "Replays". Se "Parcerias" não estiver
pronto pro público geral, tirar.
