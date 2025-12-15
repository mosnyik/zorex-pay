import express, { Router } from "express";

const logout: Router = express();


logout.post("/api/logout", (req, res) => {
  res.send("Login endpoint");
});

export default logout;
