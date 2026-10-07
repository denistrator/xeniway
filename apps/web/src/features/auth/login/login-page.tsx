import { Link } from "react-router-dom";
import { AuthCard } from "../../../components/auth-card.tsx";
import { LoginForm } from "./login-form.tsx";
import { loginPageStyles } from "./login-page.styles.ts";
import { useLoginPage } from "./login-page.ts";

const styles = loginPageStyles();

export function LoginPage() {
  const { labels, errorRef, email, setEmail, password, setPassword, login, handleSubmit, pending } = useLoginPage();
  return (
    <AuthCard title={labels.title} description={labels.description}>
      <LoginForm
        email={email}
        password={password}
        error={login.error}
        pending={pending}
        errorRef={errorRef}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
      />
      <p className={styles.registerPrompt()}>
        {labels.newHere}{" "}
        <Link className={styles.registerLink()} to="/register">
          {labels.createAccount}
        </Link>
      </p>
    </AuthCard>
  );
}
