import { AppShell } from "@/components/layout/AppShell";
import { ProtectedApp } from "@/components/layout/ProtectedApp";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedApp>
      <AppShell>{children}</AppShell>
    </ProtectedApp>
  );
}
