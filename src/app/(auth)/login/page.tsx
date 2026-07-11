import { Suspense } from "react";
import { redirect } from "next/navigation";
import { APPLICATION } from "@/constants/application";
import { LoginForm } from "@/components/shared/login-form";
import { getServerSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getServerSession();

  if (session) {
    redirect("/");
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {APPLICATION.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {APPLICATION.client}
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </>
  );
}
