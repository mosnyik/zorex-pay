import express, { Router } from "express";

const revokeToken: Router = express();

revokeToken.post("/api/revoke-token", (req, res) => {
  res.send("Login endpoint");
});

export default revokeToken;
