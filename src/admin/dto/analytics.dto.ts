import { ApiProperty } from '@nestjs/swagger';

export class RevenueAnalyticsDto {
  @ApiProperty({ description: 'Total revenue from all enrollments' })
  totalRevenue: number;

  @ApiProperty({ description: 'Total number of successful payments' })
  totalPayments: number;

  @ApiProperty({ description: 'Average transaction value' })
  averageTransactionValue: number;

  @ApiProperty({ description: 'Total number of enrollments' })
  totalEnrollments: number;

  @ApiProperty({ description: 'Revenue from current month' })
  monthlyRevenue: number;

  @ApiProperty({
    description: 'Revenue growth percentage compared to last month',
  })
  revenueGrowth: number;

  @ApiProperty({ description: 'Top earning courses' })
  topEarningCourses: TopEarningCourse[];

  @ApiProperty({ description: 'Revenue by month for the last 12 months' })
  revenueByMonth: MonthlyRevenue[];

  @ApiProperty({ description: 'Revenue by category' })
  revenueByCategory: CategoryRevenue[];
}

export class TopEarningCourse {
  @ApiProperty()
  courseId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  enrollmentCount: number;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  price: number;

  @ApiProperty()
  instructorName: string;
}

export class MonthlyRevenue {
  @ApiProperty()
  month: string;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  enrollments: number;

  @ApiProperty()
  year: number;
}

export class CategoryRevenue {
  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  categoryName: string;

  @ApiProperty()
  revenue: number;

  @ApiProperty()
  enrollmentCount: number;

  @ApiProperty()
  courseCount: number;
}

export class EnrollmentDetailsDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  enrolledAt: Date;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  userEmail: string;

  @ApiProperty()
  userName: string;

  @ApiProperty()
  courseId: string;

  @ApiProperty()
  courseTitle: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  instructorName: string;

  @ApiProperty()
  categoryName: string;
}

export class PaymentTransactionsDto {
  @ApiProperty()
  transactions: EnrollmentDetailsDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalRevenue: number;
}
