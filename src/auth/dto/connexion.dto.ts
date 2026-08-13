import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ConnexionDto {
  @ApiProperty({ example: '+2250700000000' })
  @IsString()
  telephone!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  motDePasse!: string;
}
