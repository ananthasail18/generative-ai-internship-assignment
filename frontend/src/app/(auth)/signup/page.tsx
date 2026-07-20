import { AuthGuard } from "@/components/providers/auth-guard";
import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <AuthGuard>
      <SignupForm />
    </AuthGuard>
  );
}
