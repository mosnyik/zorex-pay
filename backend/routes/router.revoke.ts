import express, { Router } from "express";
import { revokeUser } from "../controllers/revoke.controller";

const revokeToken: Router = express();

revokeToken.post("/", revokeUser);

export default revokeToken;
