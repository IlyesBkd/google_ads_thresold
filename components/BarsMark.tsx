import Image from "next/image";

type Variant = "nav" | "badge" | "card" | "footer";

const SIZES: Record<Variant, number> = {
  nav: 22,
  badge: 14,
  card: 24,
  footer: 16,
};

export default function BarsMark({ variant }: { variant: Variant }) {
  const size = SIZES[variant];
  return (
    <Image
      src="/logo.png"
      alt="GADSCALE"
      width={size}
      height={size}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    />
  );
}
