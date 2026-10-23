import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from "./app.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number.parseInt(process.env.PORT ?? '3000', 10);

  await app.listen(port);

  console.log(`Application running on http://localhost:${port}`);
}

void bootstrap();
