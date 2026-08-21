import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import subjectRouter from "./routes/subjects.js";
import dashboardRouter from "./routes/dashboard.js";
import userRouter from "./routes/users.js";
import securityMiddleWare from "./middleware/security.js";
import classRouter from "./routes/classes.js";
import departmentRouter from "./routes/departments.js";
import { auth } from "./lib/auth.js";
import logger from "./middleware/logger.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

if (!process.env.FRONTEND_URL) {
  throw new Error("FRONTEND_URL environment variable is not set");
}

const isDev = process.env.NODE_ENV !== "production";
const allowedOrigins = [process.env.FRONTEND_URL];

if (isDev) {
  allowedOrigins.push("http://localhost:5173");
  allowedOrigins.push("http://localhost:3000");
  allowedOrigins.push("http://127.0.0.1:5173");
  allowedOrigins.push("http://127.0.0.1:3000");
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Mount better-auth handler BEFORE express.json() so it can read raw request body.
// Must be on /api/auth/* to match the frontend's authClient baseURL.
app.use("/api/auth", toNodeHandler(auth));

app.use(express.json());

app.use(securityMiddleWare);
app.use(logger);


app.use("/api/subjects", subjectRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/users", userRouter);
app.use("/api/classes", classRouter);
app.use("/api/departments", departmentRouter);

app.get("/", (_req, res) => {
  res.send("Hello, Welcome to the Classroom Backend API!");
});

app.use(errorHandler);

export default app;
