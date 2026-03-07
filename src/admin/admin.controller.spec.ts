import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserRole, LessonType } from '../../generated/prisma';

describe('AdminController', () => {
  let controller: AdminController;
  let service: jest.Mocked<AdminService>;

  const mockAdminService = {
    // Course methods
    createCourse: jest.fn(),
    getCourses: jest.fn(),
    getCourseById: jest.fn(),
    updateCourse: jest.fn(),
    deleteCourse: jest.fn(),
    toggleCoursePublish: jest.fn(),

    // Module methods
    createModule: jest.fn(),
    getModulesByCourse: jest.fn(),
    getModuleById: jest.fn(),
    updateModule: jest.fn(),
    deleteModule: jest.fn(),
    reorderModules: jest.fn(),

    // Lesson methods
    createLesson: jest.fn(),
    getLessonsByModule: jest.fn(),
    getLessonById: jest.fn(),
    updateLesson: jest.fn(),
    deleteLesson: jest.fn(),
    reorderLessons: jest.fn(),

    // Category methods
    createCategory: jest.fn(),
    getCategories: jest.fn(),
    getCategoryById: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),

    // User methods
    createAdmin: jest.fn(),
    createInstructor: jest.fn(),
    getUsers: jest.fn(),
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),

    // Analytics methods
    getCourseProgressSummary: jest.fn(),
    getUserCourseProgress: jest.fn(),
    getEnrollmentStats: jest.fn(),
    getRevenueStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Course Management', () => {
    describe('createCourse', () => {
      it('should create a course', async () => {
        const createCourseDto = {
          title: 'Test Course',
          description: 'Test Description',
          instructorEmail: 'instructor@test.com',
          categoryName: 'Programming',
          price: 99.99,
          currency: 'USD',
        };

        const mockCourse = {
          id: 'course-id',
          ...createCourseDto,
          slug: 'test-course',
        };

        mockAdminService.createCourse.mockResolvedValue(mockCourse as any);

        const result = await controller.createCourse(createCourseDto);

        expect(result).toEqual(mockCourse);
        expect(service.createCourse).toHaveBeenCalledWith(createCourseDto);
      });
    });

    describe('getCourses', () => {
      it('should return paginated courses', async () => {
        const filterDto = { page: 1, limit: 10 };
        const mockResult = {
          data: [{ id: 'course-1', title: 'Course 1' }],
          meta: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };

        mockAdminService.getCourses.mockResolvedValue(mockResult as any);

        const result = await controller.getCourses(filterDto);

        expect(result).toEqual(mockResult);
        expect(service.getCourses).toHaveBeenCalledWith(filterDto);
      });
    });

    describe('getCourseById', () => {
      it('should return a course by id', async () => {
        const mockCourse = {
          id: 'course-id',
          title: 'Test Course',
          modules: [],
        };

        mockAdminService.getCourseById.mockResolvedValue(mockCourse as any);

        const result = await controller.getCourseById('course-id');

        expect(result).toEqual(mockCourse);
        expect(service.getCourseById).toHaveBeenCalledWith('course-id');
      });
    });

    describe('updateCourse', () => {
      it('should update a course', async () => {
        const updateDto = {
          title: 'Updated Title',
          description: 'Updated Description',
        };

        const mockUpdatedCourse = {
          id: 'course-id',
          ...updateDto,
        };

        mockAdminService.updateCourse.mockResolvedValue(
          mockUpdatedCourse as any,
        );

        const result = await controller.updateCourse('course-id', updateDto);

        expect(result).toEqual(mockUpdatedCourse);
        expect(service.updateCourse).toHaveBeenCalledWith(
          'course-id',
          updateDto,
        );
      });
    });

    describe('deleteCourse', () => {
      it('should delete a course', async () => {
        const mockResponse = { message: 'Course deleted successfully' };

        mockAdminService.deleteCourse.mockResolvedValue(mockResponse);

        const result = await controller.deleteCourse('course-id');

        expect(result).toEqual(mockResponse);
        expect(service.deleteCourse).toHaveBeenCalledWith('course-id');
      });
    });

    describe('toggleCoursePublish', () => {
      it('should toggle course publish status', async () => {
        const mockCourse = {
          id: 'course-id',
          isPublished: true,
        };

        mockAdminService.toggleCoursePublish.mockResolvedValue(
          mockCourse as any,
        );

        const result = await controller.toggleCoursePublish('course-id');

        expect(result).toEqual(mockCourse);
        expect(service.toggleCoursePublish).toHaveBeenCalledWith('course-id');
      });
    });
  });

  describe('Module Management', () => {
    describe('createModule', () => {
      it('should create a module', async () => {
        const createModuleDto = {
          title: 'Test Module',
          description: 'Test Description',
        };

        const mockModule = {
          id: 'module-id',
          ...createModuleDto,
          courseId: 'course-id',
        };

        mockAdminService.createModule.mockResolvedValue(mockModule as any);

        const result = await controller.createModule(
          'course-id',
          createModuleDto,
        );

        expect(result).toEqual(mockModule);
        expect(service.createModule).toHaveBeenCalledWith(
          'course-id',
          createModuleDto,
        );
      });
    });

    describe('getModulesByCourse', () => {
      it('should return modules for a course', async () => {
        const mockModules = [
          { id: 'module-1', title: 'Module 1' },
          { id: 'module-2', title: 'Module 2' },
        ];

        mockAdminService.getModulesByCourse.mockResolvedValue(
          mockModules as any,
        );

        const result = await controller.getModulesByCourse('course-id');

        expect(result).toEqual(mockModules);
        expect(service.getModulesByCourse).toHaveBeenCalledWith('course-id');
      });
    });

    describe('deleteModule', () => {
      it('should delete a module', async () => {
        const mockResponse = { message: 'Module deleted successfully' };

        mockAdminService.deleteModule.mockResolvedValue(mockResponse);

        const result = await controller.deleteModule('module-id');

        expect(result).toEqual(mockResponse);
        expect(service.deleteModule).toHaveBeenCalledWith('module-id');
      });
    });

    describe('reorderModules', () => {
      it('should reorder modules', async () => {
        const reorderDto = {
          modules: [
            { id: 'module-1', order: 1 },
            { id: 'module-2', order: 2 },
            { id: 'module-3', order: 3 },
          ],
        };

        const mockResponse = { message: 'Modules reordered successfully' };

        mockAdminService.reorderModules.mockResolvedValue(mockResponse);

        const result = await controller.reorderModules('course-id', reorderDto);

        expect(result).toEqual(mockResponse);
        expect(service.reorderModules).toHaveBeenCalledWith(
          'course-id',
          reorderDto,
        );
      });
    });
  });

  describe('Lesson Management', () => {
    describe('createLesson', () => {
      it('should create a lesson', async () => {
        const createLessonDto = {
          title: 'Test Lesson',
          content: 'Test Content',
          type: LessonType.VIDEO,
          completionTime: 300,
        };

        const mockLesson = {
          id: 'lesson-id',
          ...createLessonDto,
          moduleId: 'module-id',
        };

        mockAdminService.createLesson.mockResolvedValue(mockLesson as any);

        const result = await controller.createLesson(
          'module-id',
          createLessonDto,
        );

        expect(result).toEqual(mockLesson);
        expect(service.createLesson).toHaveBeenCalledWith(
          'module-id',
          createLessonDto,
        );
      });
    });

    describe('getLessonsByModule', () => {
      it('should return lessons for a module', async () => {
        const mockLessons = [
          { id: 'lesson-1', title: 'Lesson 1' },
          { id: 'lesson-2', title: 'Lesson 2' },
        ];

        mockAdminService.getLessonsByModule.mockResolvedValue(
          mockLessons as any,
        );

        const result = await controller.getLessonsByModule('module-id');

        expect(result).toEqual(mockLessons);
        expect(service.getLessonsByModule).toHaveBeenCalledWith('module-id');
      });
    });

    describe('deleteLesson', () => {
      it('should delete a lesson', async () => {
        const mockResponse = { message: 'Lesson deleted successfully' };

        mockAdminService.deleteLesson.mockResolvedValue(mockResponse);

        const result = await controller.deleteLesson('lesson-id');

        expect(result).toEqual(mockResponse);
        expect(service.deleteLesson).toHaveBeenCalledWith('lesson-id');
      });
    });

    describe('reorderLessons', () => {
      it('should reorder lessons', async () => {
        const reorderDto = {
          lessons: [
            { id: 'lesson-1', order: 1 },
            { id: 'lesson-2', order: 2 },
            { id: 'lesson-3', order: 3 },
          ],
        };

        const mockResponse = { message: 'Lessons reordered successfully' };

        mockAdminService.reorderLessons.mockResolvedValue(mockResponse);

        const result = await controller.reorderLessons('module-id', reorderDto);

        expect(result).toEqual(mockResponse);
        expect(service.reorderLessons).toHaveBeenCalledWith(
          'module-id',
          reorderDto,
        );
      });
    });
  });

  describe('Category Management', () => {
    describe('createCategory', () => {
      it('should create a category', async () => {
        const createCategoryDto = {
          name: 'Test Category',
          description: 'Test Description',
        };

        const mockCategory = {
          id: 'category-id',
          ...createCategoryDto,
        };

        mockAdminService.createCategory.mockResolvedValue(mockCategory as any);

        const result = await controller.createCategory(createCategoryDto);

        expect(result).toEqual(mockCategory);
        expect(service.createCategory).toHaveBeenCalledWith(createCategoryDto);
      });
    });

    describe('getCategories', () => {
      it('should return all categories', async () => {
        const mockCategories = [
          { id: 'cat-1', name: 'Category 1' },
          { id: 'cat-2', name: 'Category 2' },
        ];

        mockAdminService.getCategories.mockResolvedValue(mockCategories as any);

        const result = await controller.getCategories();

        expect(result).toEqual(mockCategories);
        expect(service.getCategories).toHaveBeenCalled();
      });
    });

    describe('deleteCategory', () => {
      it('should delete a category', async () => {
        const mockResponse = { message: 'Category deleted successfully' };

        mockAdminService.deleteCategory.mockResolvedValue(mockResponse);

        const result = await controller.deleteCategory('category-id');

        expect(result).toEqual(mockResponse);
        expect(service.deleteCategory).toHaveBeenCalledWith('category-id');
      });
    });
  });

  describe('User Management', () => {
    describe('createAdmin', () => {
      it('should create an admin user', async () => {
        const createAdminDto = {
          email: 'admin@test.com',
          name: 'Test Admin',
          password: 'SecurePassword123!',
        };

        const mockResponse = {
          message: 'Admin account created successfully',
          user: {
            id: 'admin-id',
            email: createAdminDto.email,
            name: createAdminDto.name,
            role: UserRole.ADMIN,
            isVerified: false,
          },
        };

        mockAdminService.createAdmin.mockResolvedValue(mockResponse as any);

        const result = await controller.createAdmin(createAdminDto);

        expect(result).toEqual(mockResponse);
        expect(service.createAdmin).toHaveBeenCalledWith(createAdminDto);
      });
    });

    describe('createInstructor', () => {
      it('should create an instructor user', async () => {
        const createInstructorDto = {
          email: 'instructor@test.com',
          name: 'Test Instructor',
          password: 'SecurePassword123!',
        };

        const mockResponse = {
          message: 'Instructor account created successfully',
          user: {
            id: 'instructor-id',
            email: createInstructorDto.email,
            name: createInstructorDto.name,
            role: UserRole.INSTRUCTOR,
            isVerified: false,
          },
        };

        mockAdminService.createInstructor.mockResolvedValue(
          mockResponse as any,
        );

        const result = await controller.createInstructor(createInstructorDto);

        expect(result).toEqual(mockResponse);
        expect(service.createInstructor).toHaveBeenCalledWith(
          createInstructorDto,
        );
      });
    });

    describe('getUsers', () => {
      it('should return paginated users', async () => {
        const filterDto = { page: 1, limit: 10 };
        const mockResult = {
          data: [
            { id: 'user-1', email: 'user1@test.com', role: UserRole.STUDENT },
          ],
          meta: {
            total: 1,
            page: 1,
            limit: 10,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };

        mockAdminService.getUsers.mockResolvedValue(mockResult as any);

        const result = await controller.getUsers(filterDto);

        expect(result).toEqual(mockResult);
        expect(service.getUsers).toHaveBeenCalledWith(filterDto);
      });
    });

    describe('getUserById', () => {
      it('should return a user by id', async () => {
        const mockUser = {
          id: 'user-id',
          email: 'user@test.com',
          role: UserRole.STUDENT,
        };

        mockAdminService.getUserById.mockResolvedValue(mockUser as any);

        const result = await controller.getUserById('user-id');

        expect(result).toEqual(mockUser);
        expect(service.getUserById).toHaveBeenCalledWith('user-id');
      });
    });

    describe('deleteUser', () => {
      it('should delete a user', async () => {
        const mockResponse = { message: 'User deleted successfully' };

        mockAdminService.deleteUser.mockResolvedValue(mockResponse);

        const result = await controller.deleteUser('user-id');

        expect(result).toEqual(mockResponse);
        expect(service.deleteUser).toHaveBeenCalledWith('user-id');
      });
    });
  });

  describe('Analytics', () => {
    describe('getCourseProgressSummary', () => {
      it('should return course progress summary', async () => {
        const mockSummary = {
          totalEnrollments: 50,
          completedEnrollments: 20,
          inProgressEnrollments: 25,
          notStartedEnrollments: 5,
          averageProgress: 45.5,
        };

        mockAdminService.getCourseProgressSummary.mockResolvedValue(
          mockSummary as any,
        );

        const result = await controller.getCourseProgressSummary('course-id');

        expect(result).toEqual(mockSummary);
        expect(service.getCourseProgressSummary).toHaveBeenCalledWith(
          'course-id',
        );
      });
    });

    describe('getUserCourseProgress', () => {
      it('should return user course progress', async () => {
        const mockProgress = {
          userId: 'user-id',
          courseId: 'course-id',
          progress: 75,
          completedLessons: 15,
          totalLessons: 20,
        };

        mockAdminService.getUserCourseProgress.mockResolvedValue(
          mockProgress as any,
        );

        const result = await controller.getUserCourseProgress(
          'user-id',
          'course-id',
        );

        expect(result).toEqual(mockProgress);
        expect(service.getUserCourseProgress).toHaveBeenCalledWith(
          'user-id',
          'course-id',
        );
      });
    });
  });
});
