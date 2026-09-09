import express from "express";
import cors from "cors";
import { contactsRouter } from "./routes/contacts";
import { tagsRouter } from "./routes/tags";
import { circlesRouter } from "./routes/circles";
import { relationshipsRouter } from "./routes/relationships";
import { interactionsRouter } from "./routes/interactions";
import { draftMessagesRouter } from "./routes/draftMessages";
import { profileRouter } from "./routes/profile";
import { statsRouter } from "./routes/stats";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/contacts", contactsRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/circles", circlesRouter);
app.use("/api/relationships", relationshipsRouter);
app.use("/api/interactions", interactionsRouter);
app.use("/api/draft-messages", draftMessagesRouter);
app.use("/api/profile", profileRouter);
app.use("/api/stats", statsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`NestWork server listening on http://localhost:${PORT}`);
});
