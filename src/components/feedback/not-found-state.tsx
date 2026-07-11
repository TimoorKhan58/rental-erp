import Link from "next/link";
import { FileQuestionIcon } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type NotFoundStateProps = {
  title?: string;
  description?: string;
};

export function NotFoundState({
  title = "Page not found",
  description = "The page you are looking for does not exist or has been moved.",
}: NotFoundStateProps) {
  return (
    <Card className="mx-auto w-full max-w-md text-center">
      <CardHeader className="space-y-3">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          <FileQuestionIcon className="size-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button render={<Link href={ROUTES.home} />}>Back to home</Button>
      </CardContent>
    </Card>
  );
}
