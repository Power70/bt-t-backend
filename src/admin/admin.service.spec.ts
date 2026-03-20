import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { UserRole, LessonType } from '../../generated/prisma';

describe('AdminService', () => {
  let service: AdminService;
  let prismaService: any;
  let mailService: any;
  let authService: any;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    module: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    lesson: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    enrollment: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMailService = {
    sendWelcomeEmail: jest.fn(),
  };

  const mockAuthService = {
    createAndStoreOtpForUser: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:5173'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prismaService = module.get(PrismaService);
    mailService = module.get(MailService);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Course Management', () => {
    describe('createCourse', () => {
      const createCourseDto = {
        title: 'Test Course',
        description: 'Test Description',
        instructorEmail: 'instructor@test.com',
        categoryName: 'Programming',
        price: 99.99,
        currency: 'USD',
      };

      const mockInstructor = {
        id: 'instructor-id',
        email: 'instructor@test.com',
        name: 'Test Instructor',
        role: UserRole.INSTRUCTOR,
      };

      const mockCategory = {
        id: 'category-id',
        name: 'Programming',
      };

      const mockCourse = {
        id: 'course-id',
        title: 'Test Course',
        slug: 'test-course',
        description: 'Test Description',
        price: 99.99,
        currency: 'USD',
        instructorId: 'instructor-id',
        categoryId: 'category-id',
        isPublished: false,
        instructor: mockInstructor,
        category: mockCategory,
        _count: {
          modules: 0,
          enrollments: 0,
        },
      };

      it('should create a course successfully', async () => {
        prismaService.user.findUnique.mockResolvedValue(mockInstructor as any);
        prismaService.category.findUnique.mockResolvedValue(
          mockCategory as any,
        );
        prismaService.course.findUnique.mockResolvedValue(null);
        prismaService.course.create.mockResolvedValue(mockCourse as any);

        const result = await service.createCourse(createCourseDto);

        expect(result).toEqual(mockCourse);
        expect(prismaService.user.findUnique).toHaveBeenCalledWith({
          where: { email: createCourseDto.instructorEmail },
        });
        expect(prismaService.category.findUnique).toHaveBeenCalledWith({
          where: { name: createCourseDto.categoryName },
        });
        expect(prismaService.course.create).toHaveBeenCalled();
      });

      it('should throw NotFoundException if instructor not found', async () => {
        prismaService.user.findUnique.mockResolvedValue(null);

        await expect(service.createCourse(createCourseDto)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.createCourse(createCourseDto)).rejects.toThrow(
          `Instructor with email '${createCourseDto.instructorEmail}' not found`,
        );
      });

      it('should throw BadRequestException if user is not an instructor', async () => {
        const nonInstructor = { ...mockInstructor, role: UserRole.STUDENT };
        prismaService.user.findUnique.mockResolvedValue(nonInstructor as any);

        await expect(service.createCourse(createCourseDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.createCourse(createCourseDto)).rejects.toThrow(
          `User '${createCourseDto.instructorEmail}' is not an instructor`,
        );
      });

      it('should throw NotFoundException if category not found', async () => {
        prismaService.user.findUnique.mockResolvedValue(mockInstructor as any);
        prismaService.category.findUnique.mockResolvedValue(null);

        await expect(service.createCourse(createCourseDto)).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.createCourse(createCourseDto)).rejects.toThrow(
          `Category '${createCourseDto.categoryName}' not found`,
        );
      });

      it('should generate unique slug when slug exists', async () => {
        prismaService.user.findUnique.mockResolvedValue(mockInstructor as any);
        prismaService.category.findUnique.mockResolvedValue(
          mockCategory as any,
        );
        // First two calls check for duplicates, third call is successful
        prismaService.course.findUnique
          .mockResolvedValueOnce({ id: 'existing-course' } as any)
          .mockResolvedValueOnce({ id: 'existing-course-2' } as any)
          .mockResolvedValueOnce(null);
        prismaService.course.create.mockResolvedValue(mockCourse as any);

        const result = await service.createCourse(createCourseDto);

        expect(result).toBeDefined();
        expect(prismaService.course.findUnique).toHaveBeenCalledTimes(3);
      });
    });

    describe('getCourses', () => {
      const mockCourses = [
        {
          id: 'course-1',
          title: 'Course 1',
          instructor: { id: '1', name: 'Instructor 1', email: 'i1@test.com' },
          category: { id: '1', name: 'Category 1' },
          _count: { modules: 3, enrollments: 10 },
        },
      ];

      it('should return paginated courses', async () => {
        prismaService.course.findMany.mockResolvedValue(mockCourses as any);
        prismaService.course.count.mockResolvedValue(1);

        const result = await service.getCourses({});

        expect(result.data).toEqual(mockCourses);
        expect(result.meta.total).toBe(1);
        expect(result.meta.page).toBe(1);
        expect(result.meta.limit).toBe(10);
        expect(result.meta.totalPages).toBe(1);
      });

      it('should filter courses by search term', async () => {
        prismaService.course.findMany.mockResolvedValue(mockCourses as any);
        prismaService.course.count.mockResolvedValue(1);

        await service.getCourses({ search: 'test' });

        expect(prismaService.course.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.any(Array),
            }),
          }),
        );
      });

      it('should filter courses by isPublished', async () => {
        prismaService.course.findMany.mockResolvedValue(mockCourses as any);
        prismaService.course.count.mockResolvedValue(1);

        await service.getCourses({ isPublished: true });

        expect(prismaService.course.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              isPublished: true,
            }),
          }),
        );
      });
    });

    describe('getCourseById', () => {
      const mockCourse = {
        id: 'course-id',
        title: 'Test Course',
        modules: [],
        instructor: { id: '1', name: 'Instructor', email: 'test@test.com' },
        category: { id: '1', name: 'Category' },
      };

      it('should return a course by id', async () => {
        const mockCourseWithCompletion = {
          ...mockCourse,
          completionTime: 0,
        };
        prismaService.course.findUnique.mockResolvedValue(
          mockCourseWithCompletion as any,
        );
        prismaService.lesson.findMany.mockResolvedValue([]);

        const result = await service.getCourseById('course-id');

        expect(result).toEqual(mockCourseWithCompletion);
        expect(prismaService.course.findUnique).toHaveBeenCalledWith({
          where: { id: 'course-id' },
          include: expect.any(Object),
        });
      });

      it('should throw NotFoundException if course not found', async () => {
        prismaService.course.findUnique.mockResolvedValue(null);

        await expect(service.getCourseById('non-existent')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('updateCourse', () => {
      const updateDto = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      const mockCourse = {
        id: 'course-id',
        title: 'Test Course',
      };

      it('should update a course successfully', async () => {
        prismaService.course.findUnique.mockResolvedValue(mockCourse as any);
        prismaService.course.findFirst.mockResolvedValue(null);
        prismaService.lesson.findMany.mockResolvedValue([]);
        prismaService.course.update.mockResolvedValue({
          ...mockCourse,
          ...updateDto,
        } as any);

        const result = await service.updateCourse('course-id', updateDto);

        expect(result.title).toBe(updateDto.title);
        expect(prismaService.course.update).toHaveBeenCalled();
      });

      it('should throw NotFoundException if course not found', async () => {
        prismaService.course.findUnique.mockResolvedValue(null);

        await expect(
          service.updateCourse('non-existent', updateDto),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteCourse', () => {
      it('should delete a course successfully', async () => {
        prismaService.course.findUnique.mockResolvedValue({
          id: 'course-id',
        } as any);
        prismaService.course.delete.mockResolvedValue({
          id: 'course-id',
        } as any);

        const result = await service.deleteCourse('course-id');

        expect(result).toEqual({ message: 'Course deleted successfully' });
        expect(prismaService.course.delete).toHaveBeenCalledWith({
          where: { id: 'course-id' },
        });
      });

      it('should throw NotFoundException if course not found', async () => {
        prismaService.course.findUnique.mockResolvedValue(null);

        await expect(service.deleteCourse('non-existent')).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('toggleCoursePublish', () => {
      it('should publish an unpublished course', async () => {
        const mockCourse = { id: 'course-id', isPublished: false };
        prismaService.course.findUnique.mockResolvedValue(mockCourse as any);
        prismaService.course.update.mockResolvedValue({
          ...mockCourse,
          isPublished: true,
        } as any);

        const result = await service.toggleCoursePublish('course-id');

        expect(result.isPublished).toBe(true);
      });

      it('should unpublish a published course', async () => {
        const mockCourse = { id: 'course-id', isPublished: true };
        prismaService.course.findUnique.mockResolvedValue(mockCourse as any);
        prismaService.course.update.mockResolvedValue({
          ...mockCourse,
          isPublished: false,
        } as any);

        const result = await service.toggleCoursePublish('course-id');

        expect(result.isPublished).toBe(false);
      });
    });
  });

  describe('Module Management', () => {
    describe('createModule', () => {
      const createModuleDto = {
        title: 'Test Module',
        description: 'Test Description',
      };

      const mockModule = {
        id: 'module-id',
        title: 'Test Module',
        description: 'Test Description',
        courseId: 'course-id',
        order: 1,
      };

      it('should create a module successfully', async () => {
        prismaService.course.findUnique.mockResolvedValue({
          id: 'course-id',
        } as any);
        prismaService.module.findFirst.mockResolvedValue(null);
        prismaService.module.count.mockResolvedValue(0);
        prismaService.module.create.mockResolvedValue(mockModule as any);

        const result = await service.createModule('course-id', createModuleDto);

        expect(result).toEqual(mockModule);
        expect(prismaService.module.create).toHaveBeenCalled();
      });

      it('should throw NotFoundException if course not found', async () => {
        prismaService.course.findUnique.mockResolvedValue(null);

        await expect(
          service.createModule('non-existent', createModuleDto),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('getModulesByCourse', () => {
      const mockModules = [{ id: 'module-1', title: 'Module 1', lessons: [] }];

      it('should return modules for a course', async () => {
        prismaService.course.findUnique.mockResolvedValue({
          id: 'course-id',
        } as any);
        prismaService.module.findMany.mockResolvedValue(mockModules as any);

        const result = await service.getModulesByCourse('course-id');

        expect(result).toEqual(mockModules);
      });
    });

    describe('deleteModule', () => {
      it('should delete a module successfully', async () => {
        prismaService.module.findUnique.mockResolvedValue({
          id: 'module-id',
        } as any);
        prismaService.module.delete.mockResolvedValue({
          id: 'module-id',
        } as any);

        const result = await service.deleteModule('module-id');

        expect(result).toEqual({ message: 'Module deleted successfully' });
      });

      it('should throw NotFoundException if module not found', async () => {
        prismaService.module.findUnique.mockResolvedValue(null);

        await expect(service.deleteModule('non-existent')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('Lesson Management', () => {
    describe('createLesson', () => {
      const createLessonDto = {
        title: 'Test Lesson',
        content: 'Test Content',
        type: LessonType.VIDEO,
        videoUrl: 'https://example.com/video.mp4',
        completionTime: 300,
      };

      const mockLesson = {
        id: 'lesson-id',
        title: 'Test Lesson',
        content: 'Test Content',
        type: LessonType.VIDEO,
        moduleId: 'module-id',
        order: 1,
      };

      it('should create a lesson successfully', async () => {
        prismaService.module.findUnique.mockResolvedValue({
          id: 'module-id',
          courseId: 'course-id',
          course: {
            id: 'course-id',
          },
        } as any);
        prismaService.lesson.findFirst.mockResolvedValue(null);
        prismaService.lesson.count.mockResolvedValue(0);
        prismaService.lesson.create.mockResolvedValue(mockLesson as any);
        prismaService.lesson.findMany.mockResolvedValue([]);
        prismaService.course.update.mockResolvedValue({} as any);

        const result = await service.createLesson('module-id', createLessonDto);

        expect(result).toEqual(mockLesson);
        expect(prismaService.lesson.create).toHaveBeenCalled();
      });

      it('should throw NotFoundException if module not found', async () => {
        prismaService.module.findUnique.mockResolvedValue(null);

        await expect(
          service.createLesson('non-existent', createLessonDto),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('getLessonsByModule', () => {
      const mockLessons = [
        { id: 'lesson-1', title: 'Lesson 1', type: LessonType.VIDEO },
      ];

      it('should return lessons for a module', async () => {
        prismaService.module.findUnique.mockResolvedValue({
          id: 'module-id',
        } as any);
        prismaService.lesson.findMany.mockResolvedValue(mockLessons as any);

        const result = await service.getLessonsByModule('module-id');

        expect(result).toEqual(mockLessons);
      });
    });

    describe('deleteLesson', () => {
      it('should delete a lesson successfully', async () => {
        prismaService.lesson.findUnique.mockResolvedValue({
          id: 'lesson-id',
          moduleId: 'module-id',
          module: {
            courseId: 'course-id',
          },
        } as any);
        prismaService.lesson.delete.mockResolvedValue({
          id: 'lesson-id',
        } as any);
        prismaService.lesson.findMany.mockResolvedValue([]);

        const result = await service.deleteLesson('lesson-id');

        expect(result).toEqual({ message: 'Lesson deleted successfully' });
      });

      it('should throw NotFoundException if lesson not found', async () => {
        prismaService.lesson.findUnique.mockResolvedValue(null);

        await expect(service.deleteLesson('non-existent')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('Category Management', () => {
    describe('createCategory', () => {
      const createCategoryDto = {
        name: 'Test Category',
        description: 'Test Description',
      };

      it('should create a category successfully', async () => {
        prismaService.category.findUnique.mockResolvedValue(null);
        prismaService.category.create.mockResolvedValue({
          id: 'category-id',
          ...createCategoryDto,
        } as any);

        const result = await service.createCategory(createCategoryDto);

        expect(result.name).toBe(createCategoryDto.name);
      });

      it('should throw ConflictException if category already exists', async () => {
        prismaService.category.findUnique.mockResolvedValue({
          id: 'existing-id',
          name: 'Test Category',
        } as any);

        await expect(service.createCategory(createCategoryDto)).rejects.toThrow(
          ConflictException,
        );
      });
    });

    describe('getCategories', () => {
      it('should return all categories', async () => {
        const mockCategories = [
          { id: '1', name: 'Category 1', _count: { courses: 5 } },
        ];
        prismaService.category.findMany.mockResolvedValue(
          mockCategories as any,
        );

        const result = await service.getCategories();

        expect(result).toEqual(mockCategories);
      });
    });
  });

  describe('User Management', () => {
    describe('createAdmin', () => {
      const createAdminDto = {
        email: 'admin@test.com',
        name: 'Test Admin',
        password: 'SecurePassword123!',
      };

      it('should create an admin successfully', async () => {
        const mockOtpCode = '123456';
        authService.createAndStoreOtpForUser.mockResolvedValue({
          token: mockOtpCode,
          counter: 0,
        });
        prismaService.user.findUnique.mockResolvedValue(null);
        prismaService.user.create.mockResolvedValue({
          id: 'admin-id',
          email: createAdminDto.email,
          name: createAdminDto.name,
          role: UserRole.ADMIN,
          isVerified: false,
        } as any);

        const result = await service.createAdmin(createAdminDto);

        expect(result.user.role).toBe(UserRole.ADMIN);
        expect(result.message).toBe('Admin account created successfully');
        expect(mailService.sendWelcomeEmail).toHaveBeenCalledWith(
          createAdminDto.email,
          mockOtpCode,
        );
      });

      it('should throw ConflictException if user already exists', async () => {
        prismaService.user.findUnique.mockResolvedValue({
          id: 'existing-id',
        } as any);

        await expect(service.createAdmin(createAdminDto)).rejects.toThrow(
          ConflictException,
        );
      });
    });

    describe('createInstructor', () => {
      const createInstructorDto = {
        email: 'instructor@test.com',
        name: 'Test Instructor',
        password: 'SecurePassword123!',
      };

      it('should create an instructor successfully', async () => {
        const mockOtpCode = '123456';
        authService.createAndStoreOtpForUser.mockResolvedValue({
          token: mockOtpCode,
          counter: 0,
        });
        prismaService.user.findUnique.mockResolvedValue(null);
        prismaService.user.create.mockResolvedValue({
          id: 'instructor-id',
          email: createInstructorDto.email,
          name: createInstructorDto.name,
          role: UserRole.INSTRUCTOR,
          isVerified: false,
        } as any);

        const result = await service.createInstructor(createInstructorDto);

        expect(result.user.role).toBe(UserRole.INSTRUCTOR);
        expect(result.message).toBe('Instructor account created successfully');
        expect(mailService.sendWelcomeEmail).toHaveBeenCalledWith(
          createInstructorDto.email,
          mockOtpCode,
        );
      });
    });

    describe('getUsers', () => {
      it('should return paginated users', async () => {
        const mockUsers = [
          { id: '1', email: 'user1@test.com', role: UserRole.STUDENT },
        ];
        prismaService.user.findMany.mockResolvedValue(mockUsers as any);
        prismaService.user.count.mockResolvedValue(1);

        const result = await service.getUsers({});

        expect(result.data).toEqual(mockUsers);
        expect(result.meta.total).toBe(1);
      });

      it('should filter users by role', async () => {
        const mockUsers = [
          { id: '1', email: 'admin@test.com', role: UserRole.ADMIN },
        ];
        prismaService.user.findMany.mockResolvedValue(mockUsers as any);
        prismaService.user.count.mockResolvedValue(1);

        await service.getUsers({ role: UserRole.ADMIN });

        expect(prismaService.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              role: UserRole.ADMIN,
            }),
          }),
        );
      });
    });
  });
});
