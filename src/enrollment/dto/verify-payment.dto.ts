import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({
    description: 'Paystack transaction reference',
    example: 'T1234567890',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  reference: string;
}
