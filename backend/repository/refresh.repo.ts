import { prisma } from "../lib/prisma";

export const RefreshRepo = {
  fetchRefreshToken: async (token: string) => {
    return await prisma.refresh_tokens.findFirst({
      where: { token },
    });
  },

  inValidateRefreshToken: async (id_of_invalid_token: string, token_for_replacement: string) => {
    await prisma.refresh_tokens.update({
      where: {
        id: id_of_invalid_token,
      },
      data: {
        is_revoked: true,
        replaced_by_token: token_for_replacement,
      },
    });
  },
};
