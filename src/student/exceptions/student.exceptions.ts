import { NotFoundException, BadRequestException } from '@nestjs/common';

export class EnrollmentNotFoundException extends NotFoundException {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _courseId: string,
  ) {
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
  constructor(
    certificateId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId?: string,
  ) {
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

export class ModuleNotFoundException extends NotFoundException {
  constructor(moduleId: string) {
    super(`Module with ID '${moduleId}' not found`);
  }
}

export class ModuleQuizNotFoundException extends NotFoundException {
  constructor(moduleId: string) {
    super(`No quiz found for module with ID '${moduleId}'`);
  }
}

export class FinalAssessmentNotFoundException extends NotFoundException {
  constructor(courseId: string) {
    super(`No final assessment found for course with ID '${courseId}'`);
  }
}

export class CertificateNotEligibleException extends BadRequestException {
  constructor(message: string) {
    super(message);
  }
}

export class ModuleQuizNotPassedException extends BadRequestException {
  constructor(moduleTitle: string) {
    super(
      `You must pass the quiz for module '${moduleTitle}' before accessing the certificate`,
    );
  }
}

export class FinalAssessmentNotPassedException extends BadRequestException {
  constructor() {
    super(
      'You must pass the final assessment with at least 80% before accessing the certificate',
    );
  }
}

export class CourseNotCompletedException extends BadRequestException {
  constructor() {
    super(
      'You must complete all module quizzes and the final assessment to complete this course',
    );
  }
}
