import Svg, { Circle, Line, Rect } from "react-native-svg";
import { cores } from "@/tema";

// Ícone da marca, mesmo desenho de weracha-site/public/werracha-logo-white.svg
// (só o quadrado com a "mira", sem o texto ao lado, que a Navbar já desenha
// com <Text> pra herdar a fonte do app).
export function LogoWeRacha({ tamanho = 28 }: { tamanho?: number }) {
  const altura = (tamanho * 44) / 56;
  return (
    <Svg width={tamanho} height={altura} viewBox="8 12 56 44">
      <Rect x={8} y={12} width={56} height={44} rx={5} fill="none" stroke={cores.branco} strokeWidth={3.2} />
      <Line x1={36} y1={12} x2={36} y2={56} stroke={cores.branco} strokeWidth={3.2} />
      <Circle cx={36} cy={34} r={9} fill="none" stroke={cores.branco} strokeWidth={3.2} />
      <Circle cx={36} cy={34} r={3} fill={cores.orange} />
    </Svg>
  );
}
