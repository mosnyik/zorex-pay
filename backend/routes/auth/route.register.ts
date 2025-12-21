import express, { Router } from "express";
import { registerUser } from "../../controllers/auth/register.controller";

const register: Router = express();

// call controller

register.post("/", registerUser);

export default register;
