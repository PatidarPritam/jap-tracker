import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Jap Tracker API Running",
  });
});

export default app;