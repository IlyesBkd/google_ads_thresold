import Image from "next/image";

type Variant = "nav" | "badge" | "card" | "footer";

const HEIGHTS: Record<Variant, number> = {
  nav: 32,
  badge: 20,
  card: 36,
  footer: 22,
};

export default function BarsMark({ variant }: { variant: Variant }) {
  const h = HEIGHTS[variant];
  const w = Math.round(h * (220 / 250));
  return (
    <Image
      src="/logo.png"
      alt="GadScale logo"
      width={w}
      height={h}
      style={{ display: "block", objectFit: "contain" }}
      priority={variant === "nav"}
    />
  );
}
