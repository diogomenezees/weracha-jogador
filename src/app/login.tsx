import { TelaAcesso } from "@/acesso/TelaAcesso";

// Tela de acesso: entrar, criar conta (verificação de telefone por SMS), criar a
// primeira senha e redefinir senha esquecida. Fluxo e visual espelham
// weracha-site/app/login/page.tsx. Lógica em @/acesso/.
export default function Login() {
  return <TelaAcesso />;
}
