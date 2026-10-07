import { Link } from "react-router-dom";
import { Button } from "../components/ui/button.tsx";
import { notFoundPageStyles } from "./not-found-page.styles.ts";
import { useNotFoundPage } from "./not-found-page.ts";

const styles = notFoundPageStyles();

export function NotFoundPage() {
  const view = useNotFoundPage();

  return (
    <div className={styles.root()}>
      <section className={styles.content()}>
        <h1 className={styles.heading()}>{view.title}</h1>
        <p className={styles.description()}>{view.description}</p>
        <nav aria-label={view.navigationLabel} className={styles.navigation()}>
          <Button asChild>
            <Link to="/">{view.goToApplications}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/about">{view.about}</Link>
          </Button>
        </nav>
      </section>
    </div>
  );
}
