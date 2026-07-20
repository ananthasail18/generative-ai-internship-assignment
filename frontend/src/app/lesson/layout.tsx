import { ProtectedLayout } from "@/components/layout/protected-layout";

export default function LessonLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
