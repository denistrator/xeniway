import type { AuthCardProps } from "./auth-card.model";
import { authCardStyles } from "./auth-card.styles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card.view";

const styles = authCardStyles();

export function AuthCard({ title, description, children, descriptionRef, announceDescription = false }: AuthCardProps) {
  return (
    <div className={styles.root()}>
      <Card className={styles.card()}>
        <CardHeader>
          <CardTitle as="h1">{title}</CardTitle>
          <CardDescription
            ref={descriptionRef}
            role={announceDescription ? "status" : undefined}
            tabIndex={announceDescription ? -1 : undefined}
          >
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
