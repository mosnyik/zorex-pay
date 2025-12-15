import express, { Router } from "express";

const refreshToken: Router = express();

refreshToken.get("/api/refresh-token", (req, res) => {
  res.send("We are live");
});

export default refreshToken
