import { Link } from "react-router-dom";
import { AuthCard } from "../../../components/auth-card.view";
import { RegisterForm } from "./register-form.view";
import { useRegisterPage } from "./register-page.model";
import { registerPageStyles } from "./register-page.styles";

const styles = registerPageStyles();

export function RegisterPage() {
  const { labels, errorRef, error, fieldErrors, form, update, handleSubmit, pending } = useRegisterPage();
  return (
    <AuthCard title={labels.title} description={labels.description}>
      <RegisterForm
        form={form}
        fieldErrors={fieldErrors}
        error={error}
        pending={pending}
        errorRef={errorRef}
        onChange={update}
        onSubmit={handleSubmit}
      />
      <p className={styles.signInPrompt()}>
        {labels.alreadyRegistered}{" "}
        <Link className={styles.signInLink()} to={labels.signInLink}>
          {labels.signIn}
        </Link>
      </p>
    </AuthCard>
  );
}
