import { ProtectedLayout } from "@/components/layout/protected-layout";

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
