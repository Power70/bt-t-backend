import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const configuredOrigins =
    configService
      .get<string>('FRONTEND_URL')
      ?.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => Boolean(origin) && origin !== '*') || [];
  const allowedOrigins =
    configuredOrigins.length > 0
      ? configuredOrigins
      : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  // --- Security & CORS ---
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, Postman) with no Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // Enable credentials for cookie-based auth
  });

  // --- Global Pipes ---
  // Automatically validate and transform incoming data based on DTOs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // --- Global Guards ---
  // Apply rate limiting and role-based access control to all endpoints.
  // app.useGlobalGuards(new ThrottlerGuard());
  // app.useGlobalGuards(new RolesGuard(reflector));

  // --- Swagger API Documentation ---
  const swaggerConfig = new DocumentBuilder()
    .setTitle('BT&T API')
    .setDescription('API documentation for the BT&T platform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
      },
      'access-token', // This name is used to identify the security scheme
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document); // Access docs at /api-docs

  // --- Prisma Shutdown Hooks ---
  // This ensures that Prisma gracefully disconnects from the database
  // when the NestJS application is shutting down.
  // const prismaService = app.get(PrismaService);
  // await prismaService.enableShutdownHooks(app);

  // --- Start Application ---
  const port = configService.get<number>('PORT', 3004);
  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(
    `📚 API documentation available at: http://localhost:${port}/api-docs`,
  );
}

void bootstrap();
