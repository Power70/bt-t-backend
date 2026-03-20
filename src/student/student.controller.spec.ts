import { Test, TestingModule } from '@nestjs/testing';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

describe('StudentController', () => {
  let controller: StudentController;
  const mockStudentService = {
    getDashboardSummary: jest.fn(),
    getMyEnrollments: jest.fn(),
    getPublishedCourses: jest.fn(),
    getCourseDetails: jest.fn(),
    markLessonCompleted: jest.fn(),
    logActivity: jest.fn(),
    getModuleQuizDetails: jest.fn(),
    submitModuleQuiz: jest.fn(),
    getFinalAssessmentDetails: jest.fn(),
    submitFinalAssessment: jest.fn(),
    getCertificate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentController],
      providers: [
        {
          provide: StudentService,
          useValue: mockStudentService,
        },
      ],
    }).compile();

    controller = module.get<StudentController>(StudentController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboardSummary', () => {
    it('should use req.user.sub and delegate to service', async () => {
      const req = { user: { sub: 'student-1' } };
      const expected = {
        totalEnrolled: 4,
        totalCompleted: 2,
        avgCompletion: 50,
        totalStudyTime: 12.5,
      };

      mockStudentService.getDashboardSummary.mockResolvedValue(expected);

      const result = await controller.getDashboardSummary(req);

      expect(result).toEqual(expected);
      expect(mockStudentService.getDashboardSummary).toHaveBeenCalledWith(
        'student-1',
      );
    });

    it('should fallback to req.user.id when sub is absent', async () => {
      const req = { user: { id: 'student-2' } };
      mockStudentService.getDashboardSummary.mockResolvedValue({});

      await controller.getDashboardSummary(req);

      expect(mockStudentService.getDashboardSummary).toHaveBeenCalledWith(
        'student-2',
      );
    });
  });
});
