import DashboardLayout from "@/components/layout/DashboardLayout";

export const runtime = 'edge';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}
