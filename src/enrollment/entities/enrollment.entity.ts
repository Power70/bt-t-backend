export class EnrollmentEntity {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt: Date;

  constructor(partial: Partial<EnrollmentEntity>) {
    Object.assign(this, partial);
  }
}
