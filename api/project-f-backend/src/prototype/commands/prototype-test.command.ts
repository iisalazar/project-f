import { PrototypeTestRequestDto } from '../dto/prototype-test.dto';

export class PrototypeTestCommand {
  constructor(public readonly payload: PrototypeTestRequestDto) {}
}
