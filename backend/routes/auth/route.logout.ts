import express, { Router } from "express";
import { handleHttpError } from "../../controllers/error.handler";
import { RefreshRepo } from "../../repository/refresh.repo";
import RevokeService from "../../services/auth/revoke.service";

const logout: Router = express();

logout.post("/", async (req, res) => {
  try {
    const current_refresh_token = req.cookies.refreshToken;
    // call the revoke endpoint
    if (current_refresh_token) {
      // invalidate the refresh token
      RevokeService.revoke(current_refresh_token);
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    res.status(200).json({
      success: true,
      data: {},
      error: null,
    });
  } catch (err) {
    handleHttpError(err, res);
  }
});

export default logout;
