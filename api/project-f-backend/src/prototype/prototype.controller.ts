import { Body, Controller, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrototypeTestCommand } from './commands/prototype-test.command';
import type { PrototypeTestRequestDto } from './dto/prototype-test.dto';

@ApiTags('prototype')
@Controller('prototype')
export class PrototypeController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Test VROOM solve with a single vehicle/job' })
  @ApiBody({
    description: 'Prototype request payload',
    schema: {
      type: 'object',
      examples: {
        philippines: {
          summary: 'Philippines sample',
          value: {
            vehicles: [
              { id: 1, start: [121.0437, 14.676], end: [121.0437, 14.676] },
            ],
            jobs: [{ id: 101, location: [121.0509, 14.5547], service: 300 }],
            options: { g: true },
          },
        },
      },
      properties: {
        vehicles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              start: {
                type: 'array',
                items: { type: 'number' },
                example: [121.0437, 14.676],
              },
              end: {
                type: 'array',
                items: { type: 'number' },
                example: [121.0437, 14.676],
              },
            },
            required: ['id', 'start', 'end'],
          },
          example: [
            { id: 1, start: [121.0437, 14.676], end: [121.0437, 14.676] },
          ],
        },
        jobs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 101 },
              location: {
                type: 'array',
                items: { type: 'number' },
                example: [121.0509, 14.5547],
              },
              service: { type: 'number', example: 300 },
            },
            required: ['id', 'location', 'service'],
          },
          example: [{ id: 101, location: [121.0509, 14.5547], service: 300 }],
        },
        options: {
          type: 'object',
          example: { g: true },
          additionalProperties: true,
        },
      },
      required: ['vehicles', 'jobs'],
    },
  })
  @ApiResponse({ status: 200, description: 'VROOM response' })
  @Post('test')
  async test(@Body() body: PrototypeTestRequestDto) {
    return this.commandBus.execute(new PrototypeTestCommand(body));
  }
}
