import express, { Router } from "express";

const logout: Router = express();


logout.post("/", (req, res) => {
  // call the revoke endpoint
  // 
  res.send("Login endpoint");
});

export default logout;
