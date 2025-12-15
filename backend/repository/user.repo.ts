import type { userPersistenceDto } from "../infrastructure/models";
import { prisma } from "../lib/prisma";
import type { userDomainDto } from "../models/user.model";

export const UserRepo = {
  findByEmailOrPhone: (email: any, phone: any) => {
    return prisma.users.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });
  },

  create: async (data: userPersistenceDto) => {
    return prisma.users.create({
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone: data.phone,
        password_hash: data.hashed_password,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        created_at: true,
      },
    });
  },
};
