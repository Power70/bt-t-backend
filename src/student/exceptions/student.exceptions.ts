import { NotFoundException, BadRequestException } from '@nestjs/common';

export class EnrollmentNotFoundException extends NotFoundException {
  constructor(userId: string, courseId: string) {
    super(
      `You are not enrolled in this course. Please enroll before accessing course content.`,
    );
  }
}

export class LessonNotFoundException extends NotFoundException {
  constructor(lessonId: string) {
    super(`Lesson with ID '${lessonId}' not found`);
  }
}

export class QuizNotFoundException extends NotFoundException {
  constructor(quizId?: string, lessonId?: string) {
    if (quizId) {
      super(`Quiz with ID '${quizId}' not found`);
    } else if (lessonId) {
      super(`No quiz found for lesson with ID '${lessonId}'`);
    } else {
      super('Quiz not found');
    }
  }
}

export class CertificateNotFoundException extends NotFoundException {
  constructor(certificateId: string, userId: string) {
    super(
      `Certificate with ID '${certificateId}' not found or does not belong to you`,
    );
  }
}

export class QuizAlreadyPassedException extends BadRequestException {
  constructor() {
    super('You have already passed this quiz');
  }
}

export class InvalidQuizAnswersException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}

export class CourseNotStartedException extends BadRequestException {
  constructor() {
    super('Please start the course by completing the first lesson');
  }
}

export class CourseNotFoundException extends NotFoundException {
  constructor(courseId: string) {
    super(`Course with ID '${courseId}' not found`);
  }
}
