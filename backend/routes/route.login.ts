import express, { Router } from "express";
import { loginUser } from "../controllers/login.controller";

const login: Router = express();

login.post("/", loginUser);

export default login;
