import Link from "next/link";
import { ShieldAlertIcon } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type UnauthorizedStateProps = {
  title?: string;
  description?: string;
};

export function UnauthorizedState({
  title = "Unauthorized",
  description = "You do not have permission to access this resource.",
}: UnauthorizedStateProps) {
  return (
    <Card className="mx-auto w-full max-w-md text-center">
      <CardHeader className="space-y-3">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          <ShieldAlertIcon className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button render={<Link href={ROUTES.home} />}>Go home</Button>
        <Button variant="outline" render={<Link href={ROUTES.login} />}>
          Sign in
        </Button>
      </CardContent>
    </Card>
  );
}
