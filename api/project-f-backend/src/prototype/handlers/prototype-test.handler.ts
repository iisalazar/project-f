import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { HttpException, HttpStatus } from '@nestjs/common';
import { PrototypeTestCommand } from '../commands/prototype-test.command';

@CommandHandler(PrototypeTestCommand)
export class PrototypeTestHandler implements ICommandHandler<PrototypeTestCommand> {
  async execute(command: PrototypeTestCommand) {
    const payload = command.payload ?? { vehicles: [], jobs: [] };
    const body = {
      ...payload,
      options: {
        ...(payload.options ?? {}),
        g: true,
      },
    };

    const response = await fetch('http://localhost:3000/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new HttpException(
        {
          message: 'VROOM request failed',
          statusCode: response.status,
          error: text,
        },
        response.status as HttpStatus,
      );
    }

    return response.json();
  }
}
