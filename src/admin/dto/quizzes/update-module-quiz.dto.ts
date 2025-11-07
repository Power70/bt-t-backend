import { PartialType } from '@nestjs/swagger';
import { CreateModuleQuizDto } from './create-module-quiz.dto';

export class UpdateModuleQuizDto extends PartialType(CreateModuleQuizDto) {}
