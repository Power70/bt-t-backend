import { Test, TestingModule } from '@nestjs/testing';
import { InstructorController } from './instructor.controller';
import { InstructorService } from './instructor.service';

describe('InstructorController', () => {
  let controller: InstructorController;

  const mockInstructorService = {
    getDashboardOverview: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    getCategories: jest.fn(),
    createCourse: jest.fn(),
    getMyCourses: jest.fn(),
    getCourseById: jest.fn(),
    previewCourse: jest.fn(),
    updateCourse: jest.fn(),
    deleteCourse: jest.fn(),
    toggleCoursePublish: jest.fn(),
    duplicateCourse: jest.fn(),
    createModule: jest.fn(),
    getModulesByCourse: jest.fn(),
    getModuleById: jest.fn(),
    updateModule: jest.fn(),
    deleteModule: jest.fn(),
    reorderModules: jest.fn(),
    createLesson: jest.fn(),
    getLessonsByModule: jest.fn(),
    getLessonById: jest.fn(),
    updateLesson: jest.fn(),
    deleteLesson: jest.fn(),
    reorderLessons: jest.fn(),
    createQuiz: jest.fn(),
    getQuizById: jest.fn(),
    updateQuestion: jest.fn(),
    deleteQuestion: jest.fn(),
    deleteQuiz: jest.fn(),
    getStudents: jest.fn(),
    getStudentById: jest.fn(),
    getStudentProgressInCourse: jest.fn(),
    getAnalyticsOverview: jest.fn(),
    getCourseAnalytics: jest.fn(),
    getRevenueAnalytics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstructorController],
      providers: [
        {
          provide: InstructorService,
          useValue: mockInstructorService,
        },
      ],
    }).compile();

    controller = module.get<InstructorController>(InstructorController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDashboard', () => {
    it('should use req.user.sub and delegate to service', async () => {
      const req = { user: { sub: 'instructor-1' } };
      const expected = { totalCourses: 5, publishedCourses: 3 };

      mockInstructorService.getDashboardOverview.mockResolvedValue(expected);

      const result = await controller.getDashboard(req);

      expect(result).toEqual(expected);
      expect(mockInstructorService.getDashboardOverview).toHaveBeenCalledWith(
        'instructor-1',
      );
    });

    it('should fallback to req.user.id when sub is absent', async () => {
      const req = { user: { id: 'instructor-2' } };
      mockInstructorService.getDashboardOverview.mockResolvedValue({});

      await controller.getDashboard(req);

      expect(mockInstructorService.getDashboardOverview).toHaveBeenCalledWith(
        'instructor-2',
      );
    });
  });
});
