import { NestFactory } from "@nestjs/core";
import { useContainer } from "class-validator";
import { AppModule } from "@/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    forceCloseConnections: false,
  });

  app.enableShutdownHooks();
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await app.listen(4000);
}
void bootstrap();
