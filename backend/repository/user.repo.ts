import type { userPersistenceDto } from "../infrastructure/models";
import { prisma } from "../lib/prisma";

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
        first_name: data.first_name!,
        last_name: data.last_name!,
        email: data.email!,
        phone: data.phone!,
        password_hash: data.hashed_password!,
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
  saveToken: async (token: string, id: string) => {
    const hr = 24 * 60 * 60 * 1000;
    const now = new Date();
    const expiry = new Date(now.getTime() + hr);
    return prisma.refresh_tokens.create({
      data: {
        user_id: id,
        token,
        expires_at: expiry,
      },
    });
  },
};
