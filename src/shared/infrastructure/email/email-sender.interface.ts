export type SendEmailInput = {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
};

export interface IEmailSender {
  send(input: SendEmailInput): Promise<void>;
}
