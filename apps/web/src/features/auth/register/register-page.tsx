import { Link } from "react-router-dom";
import { AuthCard } from "../../../components/auth-card.tsx";
import { RegisterForm } from "./register-form.tsx";
import { registerPageStyles } from "./register-page.styles.ts";
import { useRegisterPage } from "./register-page.ts";

const styles = registerPageStyles();

export function RegisterPage() {
  const { labels, errorRef, error, form, update, handleSubmit, pending } = useRegisterPage();
  return (
    <AuthCard title={labels.title} description={labels.description}>
      <RegisterForm
        form={form}
        error={error}
        pending={pending}
        errorRef={errorRef}
        onChange={update}
        onSubmit={handleSubmit}
      />
      <p className={styles.signInPrompt()}>
        {labels.alreadyRegistered}{" "}
        <Link className={styles.signInLink()} to="/login">
          {labels.signIn}
        </Link>
      </p>
    </AuthCard>
  );
}
