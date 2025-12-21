import error from "./middleware/errors";
import express from "express";
import register from "./routes/auth/route.register";
import login from "./routes/auth/route.login";
import refresh from "./routes/auth/route.refresh";
import revoke from "./routes/auth/route.revoke";
import logout from "./routes/auth/route.logout";
import logger from "./logger";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use("/api/register", register);
app.use("/api/login", login);
app.use("/api/refresh", refresh);
app.use("/api/revoke", revoke);
app.use("/api/logout", logout);

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(error);

const PORT = process.env.PORT || 5500;

app.listen(PORT, () => logger.info(`Server running on port ${PORT}...`));
