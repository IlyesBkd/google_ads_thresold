import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GADSCALE Admin",
  description: "GADSCALE administration panel",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
