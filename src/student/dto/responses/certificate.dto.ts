import { ApiProperty } from '@nestjs/swagger';

class CertificateCourseDto {
  @ApiProperty({ example: 'cm123course' })
  id: string;

  @ApiProperty({ example: 'Complete JavaScript Course' })
  title: string;

  @ApiProperty({ example: 'complete-javascript-course' })
  slug: string;

  @ApiProperty({
    example: 'https://cdn.example.com/course-image.jpg',
    nullable: true,
  })
  imageUrl: string | null;
}

class CertificateUserDto {
  @ApiProperty({ example: 'cm123user' })
  id: string;

  @ApiProperty({ example: 'Jane Doe' })
  name: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  email: string;
}

export class CertificateDto {
  @ApiProperty({ example: 'cm123certificate' })
  id: string;

  @ApiProperty({ example: '2024-01-20T15:30:00.000Z' })
  issuedAt: Date;

  @ApiProperty({ example: 'CERT-cm123abc456' })
  uniqueCode: string;

  @ApiProperty({
    example: 'https://example.com/certificates/cert123.pdf',
    nullable: true,
    description: 'URL to download the certificate PDF',
  })
  pdfUrl: string | null;

  @ApiProperty({ example: 'cm123user' })
  userId: string;

  @ApiProperty({ example: 'cm123course' })
  courseId: string;

  @ApiProperty({ type: CertificateCourseDto })
  course: CertificateCourseDto;

  @ApiProperty({ type: CertificateUserDto })
  user: CertificateUserDto;
}
