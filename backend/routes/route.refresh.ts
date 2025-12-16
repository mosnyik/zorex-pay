import express, { Router } from "express";
import refreshUserToken from "../controllers/refresh.controller";

const refreshToken: Router = express();

refreshToken.post("/", refreshUserToken);

export default refreshToken;
