import Link from "next/link";
import { ShieldAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <ShieldAlertIcon className="size-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Unauthorized</CardTitle>
          <CardDescription>
            You do not have permission to access this page. Contact your
            administrator if you believe this is an error.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button render={<Link href="/" />}>Go home</Button>
          <Button variant="outline" render={<Link href="/login" />}>
            Sign in
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
