import express, { Router } from "express";
import { revokeUser } from "../../controllers/auth/revoke.controller";

const revokeToken: Router = express();

revokeToken.post("/", revokeUser);

export default revokeToken;
