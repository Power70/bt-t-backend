import { PrismaClient, UserRole, LessonType } from '../generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clean existing data (optional - comment out if you want to preserve existing data)
  console.log('🧹 Cleaning existing data...');
  await prisma.userAnswer.deleteMany();
  await prisma.quizSubmission.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.userProgress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Hash password for all users (same password for easy testing)
  const hashedPassword = await bcrypt.hash('Test1234!', 10);

  // 1. Create Users
  console.log('👥 Creating users...');

  const instructor1 = await prisma.user.create({
    data: {
      email: 'nwisuanu+y2@gmail.com',
      name: 'John Doe',
      password: hashedPassword,
      role: UserRole.INSTRUCTOR,
      isVerified: true,
    },
  });

  const instructor2 = await prisma.user.create({
    data: {
      email: 'nwisuanu+y3@gmail.com',
      name: 'Jane Smith',
      password: hashedPassword,
      role: UserRole.INSTRUCTOR,
      isVerified: true,
    },
  });

  const student1 = await prisma.user.create({
    data: {
      email: 'nwisuanu+y4@gmail.com',
      name: 'Alice Johnson',
      password: hashedPassword,
      role: UserRole.STUDENT,
      isVerified: true,
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: 'nwisuanu+y5@gmail.com',
      name: 'Bob Williams',
      password: hashedPassword,
      role: UserRole.STUDENT,
      isVerified: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'nwisuanu+test@gmail.com',
      name: 'Admin User',
      password: hashedPassword,
      role: UserRole.ADMIN,
      isVerified: true,
    },
  });

  console.log(
    `✅ Created ${[instructor1, instructor2, student1, student2, admin].length} users`,
  );

  // 2. Create Categories
  console.log('\n📚 Creating categories...');

  const webDevCategory = await prisma.category.create({
    data: { name: 'Web Development' },
  });

  const dataScienceCategory = await prisma.category.create({
    data: { name: 'Data Science' },
  });

  const mobileDevCategory = await prisma.category.create({
    data: { name: 'Mobile Development' },
  });

  console.log(`✅ Created 3 categories`);

  // 3. Create Courses with Modules and Lessons
  console.log('\n🎓 Creating courses with modules and lessons...');

  // Course 1: Complete Web Development Bootcamp
  const course1 = await prisma.course.create({
    data: {
      title: 'Complete Web Development Bootcamp',
      slug: 'complete-web-development-bootcamp',
      description:
        'Learn full-stack web development from scratch. Master HTML, CSS, JavaScript, Node.js, and React.',
      imageUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
      price: 99.99,
      isPublished: true,
      instructorId: instructor1.id,
      categoryId: webDevCategory.id,
      modules: {
        create: [
          {
            title: 'Introduction to HTML & CSS',
            order: 1,
            lessons: {
              create: [
                {
                  title: 'Welcome to Web Development',
                  type: LessonType.VIDEO,
                  content: 'Introduction to the course and what you will learn',
                  videoUrl: 'https://www.youtube.com/watch?v=qz0aGYrrlhU',
                  completionTime: 900,
                  order: 1,
                },
                {
                  title: 'HTML Basics',
                  type: LessonType.TEXT,
                  content:
                    'Learn the fundamentals of HTML including tags, elements, and attributes.',
                  completionTime: 600,
                  order: 2,
                },
                {
                  title: 'CSS Fundamentals',
                  type: LessonType.VIDEO,
                  content:
                    'Understanding CSS selectors, properties, and values',
                  videoUrl: 'https://www.youtube.com/watch?v=1PnVor36_40',
                  completionTime: 1200,
                  order: 3,
                },
              ],
            },
          },
          {
            title: 'JavaScript Essentials',
            order: 2,
            lessons: {
              create: [
                {
                  title: 'JavaScript Introduction',
                  type: LessonType.VIDEO,
                  content: 'Getting started with JavaScript programming',
                  videoUrl: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
                  completionTime: 1500,
                  order: 1,
                },
                {
                  title: 'Variables and Data Types',
                  type: LessonType.TEXT,
                  content:
                    'Understanding variables, let, const, and different data types in JavaScript',
                  completionTime: 720,
                  order: 2,
                },
                {
                  title: 'Functions and Scope',
                  type: LessonType.VIDEO,
                  content: 'Master JavaScript functions and understand scope',
                  videoUrl: 'https://www.youtube.com/watch?v=xUI5Tsl2JpY',
                  completionTime: 1080,
                  order: 3,
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      modules: {
        include: {
          lessons: true,
        },
      },
    },
  });

  // Course 2: React for Beginners
  const course2 = await prisma.course.create({
    data: {
      title: 'React for Beginners',
      slug: 'react-for-beginners',
      description:
        'Master React.js from the ground up. Build modern, interactive user interfaces.',
      imageUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee',
      price: 79.99,
      isPublished: true,
      instructorId: instructor1.id,
      categoryId: webDevCategory.id,
      modules: {
        create: [
          {
            title: 'React Fundamentals',
            order: 1,
            lessons: {
              create: [
                {
                  title: 'What is React?',
                  type: LessonType.VIDEO,
                  content: 'Introduction to React and its ecosystem',
                  videoUrl: 'https://www.youtube.com/watch?v=SqcY0GlETPk',
                  completionTime: 1200,
                  order: 1,
                },
                {
                  title: 'Setting Up Your Environment',
                  type: LessonType.TEXT,
                  content:
                    'Learn how to set up Node.js, npm, and create-react-app',
                  completionTime: 480,
                  order: 2,
                },
                {
                  title: 'Components and Props',
                  type: LessonType.VIDEO,
                  content:
                    'Understanding React components and how to pass data with props',
                  videoUrl: 'https://www.youtube.com/watch?v=Tn6-PIqc4UM',
                  completionTime: 1320,
                  order: 3,
                },
              ],
            },
          },
          {
            title: 'State and Lifecycle',
            order: 2,
            lessons: {
              create: [
                {
                  title: 'Understanding State',
                  type: LessonType.VIDEO,
                  content:
                    'Learn about React state and how to manage component data',
                  videoUrl: 'https://www.youtube.com/watch?v=O6P86uwfdR0',
                  completionTime: 1500,
                  order: 1,
                },
                {
                  title: 'React Hooks',
                  type: LessonType.TEXT,
                  content:
                    'Deep dive into useState, useEffect, and other React hooks',
                  completionTime: 900,
                  order: 2,
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      modules: {
        include: {
          lessons: true,
        },
      },
    },
  });

  // Course 3: Python Data Science
  const course3 = await prisma.course.create({
    data: {
      title: 'Python for Data Science',
      slug: 'python-data-science',
      description:
        'Learn Python programming and data analysis with pandas, numpy, and matplotlib.',
      imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5',
      price: 89.99,
      isPublished: true,
      instructorId: instructor2.id,
      categoryId: dataScienceCategory.id,
      modules: {
        create: [
          {
            title: 'Python Basics',
            order: 1,
            lessons: {
              create: [
                {
                  title: 'Introduction to Python',
                  type: LessonType.VIDEO,
                  content: 'Getting started with Python programming',
                  videoUrl: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
                  completionTime: 1800,
                  order: 1,
                },
                {
                  title: 'Python Data Structures',
                  type: LessonType.TEXT,
                  content: 'Learn about lists, tuples, dictionaries, and sets',
                  completionTime: 720,
                  order: 2,
                },
              ],
            },
          },
          {
            title: 'Data Analysis with Pandas',
            order: 2,
            lessons: {
              create: [
                {
                  title: 'Introduction to Pandas',
                  type: LessonType.VIDEO,
                  content: 'Learn the basics of the pandas library',
                  videoUrl: 'https://www.youtube.com/watch?v=vmEHCJofslg',
                  completionTime: 1200,
                  order: 1,
                },
                {
                  title: 'Data Cleaning and Preprocessing',
                  type: LessonType.TEXT,
                  content: 'Master data cleaning techniques with pandas',
                  completionTime: 900,
                  order: 2,
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      modules: {
        include: {
          lessons: true,
        },
      },
    },
  });

  // Course 4: Mobile App Development with React Native (Unpublished)
  const course4 = await prisma.course.create({
    data: {
      title: 'Mobile App Development with React Native',
      slug: 'react-native-mobile-dev',
      description:
        'Build cross-platform mobile applications using React Native.',
      imageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c',
      price: 119.99,
      isPublished: false, // This course is not published yet
      instructorId: instructor2.id,
      categoryId: mobileDevCategory.id,
      modules: {
        create: [
          {
            title: 'Getting Started with React Native',
            order: 1,
            lessons: {
              create: [
                {
                  title: 'What is React Native?',
                  type: LessonType.VIDEO,
                  content:
                    'Introduction to React Native and mobile development',
                  videoUrl: 'https://www.youtube.com/watch?v=0-S5a0eXPoc',
                  completionTime: 1500,
                  order: 1,
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`✅ Created 4 courses with modules and lessons`);

  // 4. Create some sample enrollments
  console.log('\n📝 Creating sample enrollments...');

  await prisma.enrollment.create({
    data: {
      userId: student1.id,
      courseId: course1.id,
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: student1.id,
      courseId: course2.id,
    },
  });

  console.log(`✅ Created 2 sample enrollments`);

  // Print summary for testing
  console.log('\n' + '='.repeat(60));
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(60));

  console.log('\n📋 TEST DATA SUMMARY:\n');

  console.log('👥 USERS (password for all: Test1234!)');
  console.log('─'.repeat(60));
  console.log(`Instructor 1: ${instructor1.email} (ID: ${instructor1.id})`);
  console.log(`Instructor 2: ${instructor2.email} (ID: ${instructor2.id})`);
  console.log(`Student 1:    ${student1.email} (ID: ${student1.id})`);
  console.log(`Student 2:    ${student2.email} (ID: ${student2.id})`);
  console.log(`Admin:        ${admin.email} (ID: ${admin.id})`);

  console.log('\n🎓 COURSES (Published)');
  console.log('─'.repeat(60));
  console.log(`1. ${course1.title}`);
  console.log(`   Slug: ${course1.slug}`);
  console.log(`   ID: ${course1.id}`);
  console.log(`   Price: $${course1.price}`);
  console.log(`   Instructor: ${instructor1.name}`);
  console.log(`   Modules: ${course1.modules.length}`);
  console.log('');
  console.log(`2. ${course2.title}`);
  console.log(`   Slug: ${course2.slug}`);
  console.log(`   ID: ${course2.id}`);
  console.log(`   Price: $${course2.price}`);
  console.log(`   Instructor: ${instructor1.name}`);
  console.log(`   Modules: ${course2.modules.length}`);
  console.log('');
  console.log(`3. ${course3.title}`);
  console.log(`   Slug: ${course3.slug}`);
  console.log(`   ID: ${course3.id}`);
  console.log(`   Price: $${course3.price}`);
  console.log(`   Instructor: ${instructor2.name}`);
  console.log(`   Modules: ${course3.modules.length}`);
  console.log('');
  console.log(`4. ${course4.title} [UNPUBLISHED]`);
  console.log(`   Slug: ${course4.slug}`);
  console.log(`   ID: ${course4.id}`);
  console.log(`   Price: $${course4.price}`);
  console.log(`   Instructor: ${instructor2.name}`);

  console.log('\n📝 EXISTING ENROLLMENTS');
  console.log('─'.repeat(60));
  console.log(`- ${student1.name} enrolled in "${course1.title}"`);
  console.log(`- ${student1.name} enrolled in "${course2.title}"`);

  console.log('\n💡 TESTING TIPS:');
  console.log('─'.repeat(60));
  console.log('1. Use student2@test.com to test new enrollments');
  console.log('2. Try enrolling in published courses (IDs above)');
  console.log('3. Test duplicate enrollment prevention with student1');
  console.log('4. Test unpublished course enrollment restrictions');
  console.log('5. All passwords are: Test1234!');

  console.log('\n🔗 QUICK TEST COMMANDS:');
  console.log('─'.repeat(60));
  console.log('Login as Student 2:');
  console.log(
    `POST /auth/login { "email": "student2@test.com", "password": "Test1234!" }`,
  );
  console.log('');
  console.log('Enroll in Course:');
  console.log(`POST /enrollment { "courseId": "${course1.id}" }`);
  console.log('');
  console.log('Get My Enrollments:');
  console.log('GET /enrollment/my-enrollments');
  console.log('\n' + '='.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
