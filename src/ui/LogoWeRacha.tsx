import { Image } from "expo-image";

// Ícone da marca (a coroa, sem o texto ao lado, que a Navbar já desenha com
// <Text> pra herdar a fonte do app). Raster (não vetor): a coroa nova tem um
// monograma "RWR" desenhado à mão que não dá pra recriar em path SVG só de
// olho com fidelidade, então usamos o PNG exportado do design direto (mesmo
// arquivo por trás de weracha-site/public/crown-mark.png), em vez das
// primitivas Rect/Line/Circle da marca antiga.
const ASPECTO = 224 / 163;

export function LogoWeRacha({ tamanho = 28 }: { tamanho?: number }) {
  const altura = tamanho / ASPECTO;
  return (
    <Image
      source={require("../../assets/images/crown-mark.png")}
      style={{ width: tamanho, height: altura }}
      contentFit="contain"
    />
  );
}
