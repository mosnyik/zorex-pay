import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import logger from "./logger";
import error from "./middleware/errors";

// Route imports
import register from "./routes/auth/route.register";
import login from "./routes/auth/route.login";
import refresh from "./routes/auth/route.refresh";
import revoke from "./routes/auth/route.revoke";
import logout from "./routes/auth/route.logout";
import fundBank from "./routes/funding/route.fund.bank";
import wallets from "./routes/wallets/route.wallets";
import paystack from "./routes/webhooks/route.paystack";

const app = express();

// Middleware - order matters!
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Auth routes (public)
app.use("/api/register", register);
app.use("/api/login", login);
app.use("/api/refresh", refresh);
app.use("/api/revoke", revoke);
app.use("/api/logout", logout);

// Protected routes
app.use("/api/fund-bank", fundBank);
app.use("/api/wallets", wallets);

// Webhook routes (special - need raw body for signature verification)
app.use("/api/webhooks", paystack);

// Error handler (must be last)
app.use(error);

const PORT = process.env.PORT || 5500;

app.listen(PORT, () => logger.info(`Server running on port ${PORT}...`));
