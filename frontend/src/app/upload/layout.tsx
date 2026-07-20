import { ProtectedLayout } from "@/components/layout/protected-layout";

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
