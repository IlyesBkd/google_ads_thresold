import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ADSCALE Admin",
  description: "ADSCALE administration panel",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
