import { PartialType } from '@nestjs/swagger';
import { CreateFinalAssessmentDto } from './create-final-assessment.dto';

export class UpdateFinalAssessmentDto extends PartialType(
  CreateFinalAssessmentDto,
) {}

