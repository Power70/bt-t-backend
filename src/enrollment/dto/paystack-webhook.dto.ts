import { ApiProperty } from '@nestjs/swagger';

export class PaystackWebhookMetadataDto {
  @ApiProperty({ required: false })
  courseId?: string;

  @ApiProperty({ required: false })
  userId?: string;

  [key: string]: any;
}

export class PaystackWebhookCustomerDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  email: string;

  @ApiProperty()
  customer_code: string;

  [key: string]: any;
}

export class PaystackWebhookAuthorizationDto {
  @ApiProperty()
  authorization_code: string;

  @ApiProperty()
  bin: string;

  @ApiProperty()
  last4: string;

  @ApiProperty()
  exp_month: string;

  @ApiProperty()
  exp_year: string;

  @ApiProperty()
  channel: string;

  @ApiProperty()
  card_type: string;

  @ApiProperty()
  bank: string;

  @ApiProperty()
  country_code: string;

  @ApiProperty()
  brand: string;

  @ApiProperty()
  reusable: boolean;

  [key: string]: any;
}

export class PaystackWebhookDataDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  domain: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  reference: string;

  @ApiProperty()
  amount: number;

  @ApiProperty({ required: false })
  message: string | null;

  @ApiProperty()
  gateway_response: string;

  @ApiProperty()
  paid_at: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  channel: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  ip_address: string;

  @ApiProperty({ type: PaystackWebhookMetadataDto })
  metadata: PaystackWebhookMetadataDto;

  @ApiProperty({ type: PaystackWebhookCustomerDto })
  customer: PaystackWebhookCustomerDto;

  @ApiProperty({ type: PaystackWebhookAuthorizationDto, required: false })
  authorization?: PaystackWebhookAuthorizationDto;

  [key: string]: any;
}

export interface PaystackWebhookDto {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: {
      courseId?: string;
      userId?: string;
      [key: string]: any;
    };
    customer: {
      id: number;
      email: string;
      customer_code: string;
      [key: string]: any;
    };
    authorization?: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  };
}
