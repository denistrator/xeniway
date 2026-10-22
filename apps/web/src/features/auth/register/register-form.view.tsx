import { Button } from "../../../components/ui/button.view";
import { RegisterFields } from "./register-fields.view";
import { type RegisterFormProps, useRegisterForm } from "./register-form.model";
import { registerFormStyles } from "./register-form.styles";

const styles = registerFormStyles();

export { type RegisterFormState, registerError } from "./register-form.model";

export function RegisterForm({ form, fieldErrors, error, pending, errorRef, onChange, onSubmit }: RegisterFormProps) {
  const { submitLabel } = useRegisterForm(pending);
  return (
    <form className={styles.form()} onSubmit={onSubmit}>
      <RegisterFields form={form} errors={fieldErrors} onChange={onChange} />
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
