import { PartialType } from '@nestjs/mapped-types';
import { InstructorCreateCourseDto } from './create-course.dto';

export class InstructorUpdateCourseDto extends PartialType(InstructorCreateCourseDto) {}
