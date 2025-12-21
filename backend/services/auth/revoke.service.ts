import { RefreshRepo } from "../../repository/refresh.repo";
import type { RefreshTokenShape } from "./refresh.service";

const revoke = async (token_to_revoke: string) => {
  const fetchedRefreshToken: RefreshTokenShape | null =
    await RefreshRepo.fetchRefreshToken(token_to_revoke);
  RefreshRepo.inValidateRefreshToken(fetchedRefreshToken?.id!, "");
};

const RevokeService = {
  revoke,
};

export default RevokeService;
