export abstract class EmailServiceAbstraction {
  abstract send(options: {
    to: string;
    subject: string;
    body: string;
  }): Promise<void>;
}
