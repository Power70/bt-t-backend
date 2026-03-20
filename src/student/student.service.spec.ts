import { Test, TestingModule } from '@nestjs/testing';
import { StudentService } from './student.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StudentService', () => {
  let service: StudentService;

  const mockPrismaService = {
    enrollment: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    userActivityLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    lesson: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    userProgress: {
      count: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    course: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    module: {
      findUnique: jest.fn(),
    },
    quiz: {
      findUnique: jest.fn(),
    },
    quizAttempt: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    certificate: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    finalAssessmentAttempt: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StudentService>(StudentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
