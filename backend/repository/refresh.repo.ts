import { prisma } from "../lib/prisma";

export const RefreshRepo = {
  fetchRefreshToken: async (token: string) => {
    return await prisma.refresh_tokens.findFirst({
      where: { token },
    });
  },

  inValidateRefreshToken: async (id: string, token: string) => {
    await prisma.refresh_tokens.update({
      where: {
        id,
      },
      data: {
        is_revoked: true,
        replaced_by_token: token,
      },
    });
  },
};
