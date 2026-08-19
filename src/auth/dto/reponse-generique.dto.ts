import { ApiProperty } from '@nestjs/swagger';

export class ReponseGeneriqueDto {
  @ApiProperty()
  message!: string;
}
