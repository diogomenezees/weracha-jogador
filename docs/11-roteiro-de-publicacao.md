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

## Decisões pra conversar amanhã

Sem isso não dá pra fechar o plano:

1. **Google Play: conta pessoal ou de empresa?** Pessoal exige teste fechado com 12 testadores
   por 14 dias antes de produção; empresa não, mas pede mais documentação (conferir). Doc 10 §4.
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

1. [ ] `npx eas login` (conta Expo grátis).
2. [ ] `npx eas build -p android --profile preview`: APK pra instalar no seu celular e no de
       alguns amigos. Roda sem Metro e sem o notebook ligado.
3. [ ] Rodar o **checklist de validação** do doc 10 (seção "Validação em device"), riscando tela
       por tela. É aqui que aparecem os bugs reais. O ponto de maior risco conhecido: upload da
       foto de perfil pro R2 (o `PUT` do blob via `fetch` do RN).
4. [ ] `npx eas build -p android --profile development`: dev client, necessário pras fases 5-8 da
       paridade com o site e pro `expo-media-library` ("Baixar vídeo" na Galeria).
5. [ ] **Limpeza do que não pode ir pra loja** (achados no código, 2026-09-21):
   - [ ] **Jogador:** o seletor Local/Produção fica visível na tela de login. Em build de
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

- [ ] **Google Play Console:** US$ 25, pagamento único. Escolher pessoa física ou empresa **antes**
      de pagar: muda a exigência de teste (fase 4). Conta de empresa costuma pedir número D-U-N-S
      **(conferir)**.
- [ ] **Apple Developer Program:** US$ 99/ano. É o item de maior lead time (dias a semanas de
      verificação). Só necessário se for lançar no iPhone. Doc 10 §4. Se iOS ficar pra depois,
      pular sem culpa.
- [ ] **Política de privacidade:** a página `weracha.app/privacidade` **já existe** no site
      (spec 12) e o app já linka pra ela. Conferir que cobre o que a loja pede: dados coletados
      (telefone, nome, foto, vídeo, sem localização), como excluir, contato.
- [ ] **Formulário de segurança de dados (Data safety) da Play** / *privacy nutrition labels* da
      Apple: declarar o que o app coleta. Depende das decisões de crash e analytics (fase 3), então
      preencher **depois** dela.
- [ ] **Exclusão de conta:** o fluxo dentro do app já existe (perfil, "Excluir meus dados"). A Play
      também pede uma **URL web** pra solicitar exclusão de dados fora do app **(conferir)**.
      Verificar se `weracha.app/contato` ou uma página dedicada serve.
- [ ] **Conteúdo gerado por usuário (resenha e comentários dos replays):** a Play e a Apple exigem
      um jeito de **denunciar** conteúdo e **bloquear** usuário **(conferir)**. Hoje o app não tem
      isso (só apagar o próprio comentário; admin apaga). Decidir o mínimo aceitável: botão
      "Denunciar" que cai na ouvidoria já existente (`/admin/ouvidoria`) pode bastar. É trabalho
      novo nos dois repos.
- [ ] **Classificação indicativa:** questionário da Play. O site já exige 18+ pra comentar (gate por
      data de nascimento no servidor).
- [ ] **Material da ficha na loja:** ícone 512×512, imagem de destaque 1024×500, no mínimo 2
      screenshots de celular, descrição curta e completa, categoria (Esportes). Screenshots saem
      do APK da fase 1.

---

## Fase 3. Crash, versão mínima e salvaguardas (antes de publicar)

Sem isto, um bug em aparelho de terceiro é invisível e não dá pra forçar atualização depois.

- [ ] **Crash reporting no app de jogador** (doc 10 §6). Sentry (`@sentry/react-native` + plugin
      Expo) e envio de sourcemaps no build do EAS, senão o stack trace vem ofuscado. Não funciona
      no Expo Go; só em build EAS. Cuidado pra **não** mandar telefone/nome no contexto do usuário.
- [ ] **Crash reporting no Cam.** O Cam é Kotlin nativo e já teve bugs de campo difíceis (gravação
      órfã, replay truncado), que só foram achados com logcat manual. Opções: Sentry Android ou
      Firebase Crashlytics. Vale mais aqui do que no app de jogador, porque o celular fica
      sozinho no tripé.
- [ ] **Gate de versão mínima** (doc 10 §5): endpoint tipo `GET /api/v1/app/versao-minima` no
      site + checagem no boot do app + tela bloqueante "atualize pra continuar". Precisa estar na
      **primeira** versão publicada, porque versão antiga sem o gate não pode ser forçada a
      atualizar. Definir quantas versões pra trás são suportadas. O Cam precisa do mesmo? Decidir.
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
4. [ ] **Teste fechado.** Se a conta for pessoal: **12 testadores por 14 dias seguidos** antes de
       poder pedir produção **(conferir)**. O próprio grupo da pelada serve. Começar cedo, é o
       maior prazo da fase.
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
- [ ] Sem seletor de servidor no login de produção; Cam com `BASE_URL` real
- [ ] Crash reporting nos dois apps, recebendo evento de teste
- [ ] Gate de versão mínima no site e no app
- [ ] Fluxo de denúncia/bloqueio de comentário (ou decisão de que não é exigido)
- [ ] Política de privacidade e URL de exclusão conferidas
- [ ] Declarações da loja (dados, classificação) preenchidas
- [ ] `assetlinks.json` com o fingerprint real
- [ ] Teste fechado cumprido (se conta pessoal)
