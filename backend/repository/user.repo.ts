import { prisma } from "../lib/prisma";
import type { userPersistenceDto } from "../models/user.model";

export const UserRepo = {
  findByEmailOrPhone: (email: any, phone: any) => {
    return prisma.users.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        user_name: true,
        email: true,
        phone: true,
        password_hash: true,
        kyc_status: true,
        created_at: true,
      },
    });
  },
  findById: async (id: any) => {
    return await prisma.users.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        password_hash: true,
        kyc_status: true,
        created_at: true,
      },
    });
  },

  create: async (data: userPersistenceDto) => {
    return prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          first_name: data.first_name!,
          last_name: data.last_name!,
          user_name: data.user_name,
          email: data.email!,
          phone: data.phone!,
          password_hash: data.password_hash!,
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
      await tx.wallets.create({
        data: {
          user_id: user.id,
          status: "ACTIVE",
          currency: "NGN",
        },
      });
      return user;
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
