import { Button } from "../../../components/ui/button.tsx";
import { RegisterFields } from "./register-fields.tsx";
import { registerFormStyles } from "./register-form.styles.ts";
import { type RegisterFormProps, useRegisterForm } from "./register-form.ts";

const styles = registerFormStyles();

export { type RegisterFormState, registerError } from "./register-form.ts";

export function RegisterForm({ form, error, pending, errorRef, onChange, onSubmit }: RegisterFormProps) {
  const { submitLabel } = useRegisterForm(pending);
  return (
    <form className={styles.form()} onSubmit={onSubmit}>
      <RegisterFields form={form} onChange={onChange} />
      {error && (
        <p ref={errorRef} role="alert" aria-live="assertive" tabIndex={-1} className={styles.error()}>
          {error}
        </p>
      )}
      <Button className={styles.submitButton()} type="submit" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
