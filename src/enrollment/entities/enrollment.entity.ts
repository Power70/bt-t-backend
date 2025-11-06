export class EnrollmentEntity {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: Date;
  status: string;

  constructor(partial: Partial<EnrollmentEntity>) {
    Object.assign(this, partial);
  }
}
