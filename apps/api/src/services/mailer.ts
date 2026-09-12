import nodemailer from "nodemailer";

export type PasswordResetMessage = {
  to: string;
  resetUrl: string;
  expiresAt: Date;
};

export type PasswordResetMailer = {
  sendPasswordReset(message: PasswordResetMessage): Promise<void>;
};

export class ConsolePasswordResetMailer implements PasswordResetMailer {
  constructor(private readonly logger: (message: string) => void = console.log) {}

  async sendPasswordReset({ to, resetUrl, expiresAt }: PasswordResetMessage): Promise<void> {
    this.logger(`Password reset requested for ${to}: ${resetUrl} (expires ${expiresAt.toISOString()})`);
  }
}

export class SmtpPasswordResetMailer implements PasswordResetMailer {
  private readonly transporter;

  constructor(
    smtpUrl: string,
    private readonly from: string,
  ) {
    this.transporter = nodemailer.createTransport(smtpUrl);
  }

  async sendPasswordReset({ to, resetUrl, expiresAt }: PasswordResetMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: "Reset your Xenia Way password",
      text: [
        "We received a request to reset your Xenia Way password.",
        "",
        `Reset your password: ${resetUrl}`,
        "",
        `This link expires at ${expiresAt.toISOString()}. If you did not request this, you can ignore this email.`,
      ].join("\n"),
    });
  }
}
