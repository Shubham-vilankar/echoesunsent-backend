import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  message: "Too many submissions from this IP, try again later."
});

app.use("/submit", limiter);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

const CATEGORY_COLORS = {
  Love: "#F8BBD0",
  Crush: "#E1BEE7",
  Friend: "#B2DFDB",
  Parent: "#FFF9C4",
  Self: "#BBDEFB",
  Other: "#FFE0B2"
};

app.post("/submit", async (req, res) => {
  try {
    const { content, category, name, language } = req.body;

    if (!content || content.length > 500) {
      return res.status(400).json({ error: "Invalid message length" });
    }

    if (!CATEGORY_COLORS[category]) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const ip_hash = crypto.createHash("sha256").update(ip).digest("hex");

    const { error } = await supabase.from("messages").insert([
      {
        content,
        category,
        name: name || null,
        color: CATEGORY_COLORS[category],
        language,
        status: "pending",
        ip_hash
      }
    ]);

    if (error) {
      return res.status(500).json({ error: "Database insert failed" });
    }

    res.json({ message: "Submitted for approval" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/", (req, res) => {
  res.send("EchoesUnsent Backend Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});