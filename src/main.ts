import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';             
import { json } from 'express';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// import { PrismaService } from './prisma/prisma.service';
// import { RolesGuard } from './auth/guards/roles.guard'; // Assumes you create this guard
import { ThrottlerGuard } from '@nestjs/throttler'; // Using the standard throttler guard

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Disable the default body parser to handle raw body for Stripe webhooks.
    bodyParser: false,
  });

  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);
  const logger = new Logger('Bootstrap');

  // --- Security & CORS ---
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: '*', // TODO: In production, restrict this to your frontend's domain.
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
  // app.useGlobalGuards(new RolesGuard(reflector)); // Your custom RolesGuard

  // --- Middleware for Stripe Webhook ---
  // This is a special configuration to get the raw request body, which Stripe
  // requires to verify the signature of its webhook events.
  app.use((req: any, res: any, next: any) => {
    if (req.originalUrl.includes('/payments/stripe-webhook')) {
      json({
        verify: (req: any, res, buffer) => {
          // Store the raw body as a buffer on the request object.
          req.rawBody = buffer;
        },
      })(req, res, next);
    } else {
      // For all other routes, use the standard JSON parser.
      json()(req, res, next);
    }
  });

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
  const port = configService.get<number>('PORT', 30004);
  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 API documentation available at: http://localhost:${port}/api-docs`);
}

bootstrap();