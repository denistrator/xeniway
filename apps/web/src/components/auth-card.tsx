import { authCardStyles } from "./auth-card.styles.ts";
import type { AuthCardProps } from "./auth-card.ts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card.tsx";

const styles = authCardStyles();

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className={styles.root()}>
      <Card className={styles.card()}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
