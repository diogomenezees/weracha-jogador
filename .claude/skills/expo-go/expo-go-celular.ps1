# Sobe o app de jogador no Expo Go do celular.
# Padrão: USB (adb reverse 8081/3000 + Metro em --lan anunciando 127.0.0.1).
# Uso: powershell -ExecutionPolicy Bypass -File expo-go-celular.ps1 [-Limpar] [-SoAbrir] [-Wifi]
#   -Limpar  : mata o Metro e sobe de novo com --clear (quando o app mostra código velho)
#   -SoAbrir : não mexe no Metro, só refaz o reverse e reabre o Expo Go
#   -Wifi    : sem cabo; Metro anuncia o IP da LAN (exige firewall liberado pro node em uso)
#   -Parear IP:porta -Codigo 123456 : pareia a depuração sem fio (quando o USB não pede autorização)
#   -Conectar IP:porta : conecta na depuração sem fio já pareada (adb reverse funciona igual ao cabo)
param([switch]$Limpar, [switch]$SoAbrir, [switch]$Wifi, [string]$Parear, [string]$Codigo, [string]$Conectar)

$ErrorActionPreference = 'Continue'   # falhas tratadas à mão; 'Stop' quebra com o stderr do adb no PS 5.1
$adb = "C:\Users\Diogo Oliveira\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$app = Resolve-Path (Join-Path $PSScriptRoot '..\..\..')

function Ok($m)    { Write-Host "[ok] $m" -ForegroundColor Green }
function Aviso($m) { Write-Host "[!]  $m" -ForegroundColor Yellow }
function Falha($m) { Write-Host "[x]  $m" -ForegroundColor Red; exit 1 }

function MetroStatus {
  # curl.exe e não Invoke-WebRequest: no PS 5.1 o IWR demora segundos detectando proxy e dá falso negativo
  (curl.exe -s -m 8 'http://127.0.0.1:8081/status') -join ''
}
function EstadoAdb {
  $l = & $adb devices | Select-Object -Skip 1 | Where-Object { $_.Trim() }
  if (-not $l) { return 'nenhum' }
  if ($l -match "\tdevice$") { return 'ok' }
  if ($l -match 'unauthorized') { return 'unauthorized' }
  return "$l"
}

# ---------- 1. Rede do PC ----------
$adapters = Get-NetAdapter | Where-Object Status -eq 'Up'
if ($adapters | Where-Object InterfaceDescription -match 'NDIS|Remote NDIS|Ancoragem|Tethering') {
  Aviso 'Ancoragem USB do celular ativa: o PC está usando a internet do celular. No modo Wi-Fi o app fica sem rota pro PC; prefira o USB (ou desligue a ancoragem).'
}
$ipLan = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.InterfaceAlias -match 'Wi-Fi|Ethernet' } |
  Select-Object -First 1
if ($ipLan) {
  $perfil = (Get-NetConnectionProfile -InterfaceAlias $ipLan.InterfaceAlias -ErrorAction SilentlyContinue).NetworkCategory
  Ok "PC na rede: $($ipLan.InterfaceAlias) $($ipLan.IPAddress) (perfil $perfil)"
} else {
  Aviso 'PC sem IP de Wi-Fi/Ethernet (só o USB vai funcionar).'
}

# Firewall: o node em uso tem regra de entrada liberada?
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
$fwOk = $false
if ($node) {
  $fwOk = [bool](Get-NetFirewallApplicationFilter -ErrorAction SilentlyContinue |
    Where-Object { $_.Program -eq $node } |
    Get-NetFirewallRule | Where-Object { $_.Enabled -eq 'True' -and $_.Direction -eq 'Inbound' -and $_.Action -eq 'Allow' })
}
if (-not $fwOk) {
  $msg = "Firewall NÃO libera $node -> Wi-Fi bloqueado (só USB)."
  if ($Wifi) { Falha "$msg Rode como admin: New-NetFirewallRule -DisplayName 'node dev (8081,3000)' -Direction Inbound -Protocol TCP -LocalPort 8081,3000 -RemoteAddress LocalSubnet -Action Allow" }
  Aviso $msg
} else {
  Ok "Firewall libera $node (Wi-Fi possível com -Wifi)"
}

# ---------- 2. Celular (USB ou depuração sem fio) ----------
if ($Parear) {
  if (-not $Codigo) { Falha '-Parear precisa de -Codigo (os 6 dígitos de "Parear com código").' }
  $s = cmd /c """$adb"" pair $Parear $Codigo 2>&1"
  if ($s -notmatch 'Successfully') { Falha "Pareamento falhou: $s" }
  Ok "Pareado ($Parear). Agora o IP:porta da tela principal da Depuração sem fio vai em -Conectar."
  if (-not $Conectar) { exit 0 }
}
if ($Conectar) {
  $s = cmd /c """$adb"" connect $Conectar 2>&1"
  if ($s -notmatch 'connected') { Falha "Conexão sem fio falhou: $s (a porta muda a cada vez que liga a Depuração sem fio)" }
  Ok "Conectado sem fio em $Conectar"
}
$estado = EstadoAdb
if ($estado -eq 'unauthorized') {
  Aviso 'Celular "unauthorized": reiniciando o adb pra disparar o aviso. Desbloqueie a tela e aceite "Permitir depuração USB" (marque "Sempre permitir").'
  & $adb kill-server | Out-Null
  cmd /c ""$adb" start-server 2>nul" | Out-Null
  $t = 0
  while (($estado = EstadoAdb) -ne 'ok' -and $t -lt 90) { Start-Sleep -Seconds 3; $t += 3 }
}
$usb = $estado -eq 'ok'
if ($usb) {
  $serial = ((& $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\tdevice$" } | Select-Object -First 1) -split "`t")[0]
  $env:ANDROID_SERIAL = $serial   # se o mesmo celular aparecer no USB (unauthorized) e sem fio, o adb exigiria -s
  Ok "Celular no adb: $serial ($(& $adb shell getprop ro.product.model))"
  if (-not (& $adb shell pm list packages host.exp.exponent)) { Falha 'Expo Go não está instalado no celular (instale pela Play Store).' }
  Ok 'Expo Go instalado'
} elseif (-not $Wifi) {
  switch ($estado) {
    'nenhum'       { $motivo = 'nenhum celular no adb (cabo só de carga? depuração USB desligada?)' }
    'unauthorized' { $motivo = 'continua "unauthorized". Sem o aviso no celular? USB em "Transferência de arquivos", Revogar autorizações + desligar/ligar Depuração USB, replugar desbloqueado. Ou use a depuração sem fio (-Parear/-Conectar)' }
    default        { $motivo = "estado inesperado: $estado" }
  }
  if ($fwOk -and $ipLan) { Falha "USB: $motivo. Alternativa: rodar com -Wifi (celular no mesmo Wi-Fi)." }
  Falha "USB: $motivo. Wi-Fi também bloqueado pelo firewall, então resolva o USB."
}

$modoWifi = $Wifi -or -not $usb
if ($modoWifi -and -not $ipLan) { Falha 'Modo Wi-Fi sem IP de Wi-Fi/Ethernet no PC.' }
$host_ = if ($modoWifi) { $ipLan.IPAddress } else { '127.0.0.1' }

# ---------- 3. Site local ----------
$codigo = curl.exe -s -m 15 -o NUL -w '%{http_code}' 'http://127.0.0.1:3000/'
if ($codigo -and $codigo -ne '000') { Ok "Site local respondendo na 3000 ($codigo)" }
else { Aviso 'Site local fora do ar na 3000 (skill rodar-local, ou escolha "Produção" na engrenagem do login).' }

# ---------- 4. Metro ----------
function HostDoManifesto {
  try {
    $man = (curl.exe -s -m 30 -H 'expo-platform: android' -H 'Accept: application/expo+json' 'http://127.0.0.1:8081/') -join ''
    if ($man -match '"hostUri":"([^"]+)"') { return $Matches[1] }
  } catch {}
  return $null
}

if (-not $SoAbrir) {
  $pidMetro = (Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
  if ($pidMetro -and -not $Limpar) {
    if ((MetroStatus) -notmatch 'running') {
      Falha "Porta 8081 ocupada (PID $pidMetro) mas não responde em 127.0.0.1 (subiu com --localhost?). Rode com -Limpar."
    }
    $h = HostDoManifesto
    if ($h -and $h -ne "${host_}:8081") {
      Aviso "Metro anuncia $h mas o modo atual precisa de ${host_}:8081 -> reiniciando o Metro."
      $Limpar = $true
    }
  }
  if ($pidMetro -and $Limpar) {
    Stop-Process -Id $pidMetro -Force
    Start-Sleep -Seconds 2
    $pidMetro = $null
    Ok 'Metro antigo encerrado'
  }
  if (-not $pidMetro) {
    # Janela separada pro usuário ver logs e apertar "r".
    # NUNCA --localhost (escuta só IPv6 aqui) nem CI=1 (desliga o reload).
    # --clear só com -Limpar: sem cache o Metro recompila tudo e a subida passa de 1 min.
    $limparCache = if ($Limpar) { ' --clear' } else { '' }
    # NO_COLOR=1 vem do terminal do Claude Code; o Expo põe FORCE_COLOR nos workers e o Node
    # avisa "NO_COLOR is ignored due to FORCE_COLOR" em todo log. Tirar devolve as cores.
    $cmd = "Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue; `$env:REACT_NATIVE_PACKAGER_HOSTNAME='$host_'; Set-Location '$app'; npx expo start --lan --port 8081 --go$limparCache"
    Start-Process powershell -ArgumentList '-NoExit', '-Command', $cmd | Out-Null
    Write-Host '...esperando o Metro subir'
    $t = 0
    while ((MetroStatus) -notmatch 'running') {
      Start-Sleep -Seconds 2; $t += 2
      if ($t -ge 180) { Falha 'Metro não respondeu em 180s. Veja a janela do Metro.' }
    }
    Ok 'Metro no ar (janela separada)'
  } else {
    Ok "Metro já no ar (PID $pidMetro)"
  }
}
$h = HostDoManifesto
if ($h -eq "${host_}:8081") { Ok "Manifesto anuncia $h" }
elseif ($h) { Aviso "Manifesto anuncia $h (esperado ${host_}:8081). Rode com -Limpar." }
else { Aviso 'Não consegui ler o manifesto do Metro (pode estar compilando ainda).' }

# ---------- 5. Abrir ----------
$url = "exp://${host_}:8081"
if ($usb) {
  if (-not $modoWifi) {
    & $adb reverse tcp:8081 tcp:8081 | Out-Null
    & $adb reverse tcp:3000 tcp:3000 | Out-Null
    $rev = (& $adb reverse --list) -join ' '
    if ($rev -notmatch 'tcp:8081' -or $rev -notmatch 'tcp:3000') { Falha "adb reverse não ficou ativo: $rev" }
    Ok 'adb reverse 8081 e 3000 ativos'
  } else {
    & $adb reverse --remove-all | Out-Null   # no Wi-Fi o reverse só confunde
  }
  # force-stop antes, senão o Expo Go ignora o link e fica na Home
  & $adb shell am force-stop host.exp.exponent | Out-Null
  $saida = & $adb shell am start -a android.intent.action.VIEW -d $url host.exp.exponent 2>&1
  if ($saida -match 'Error') { Falha "Expo Go não abriu: $saida" }
  Ok "Expo Go aberto em $url (primeira carga pode levar ~1 min)"
} else {
  Ok "Sem cabo: no celular (mesmo Wi-Fi), abra o Expo Go -> 'Enter URL manually' -> $url"
}
Write-Host 'No login, engrenagem -> "Local" pra usar o site da máquina.'
