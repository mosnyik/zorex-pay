import express, { Router } from "express";

const login: Router = express();

login.post("/api/login", (req, res) => {
  res.send("Login endpoint");
});

export default login;
