import { Injectable } from '@nestjs/common';
import { EmailServiceAbstraction } from './email.service';

@Injectable()
export class MockEmailService extends EmailServiceAbstraction {
  async send(_options: { to: string; subject: string; body: string }): Promise<void> {
    return;
  }
}
