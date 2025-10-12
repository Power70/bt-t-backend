import { UserRole } from '../../../generated/prisma';

export class UserEntity {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}