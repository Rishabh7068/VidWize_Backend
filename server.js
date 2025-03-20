import express from "express";
import { config } from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import youtuberRoutes from "./routes/youtuber.routes.js";
import editorRoutes from "./routes/editor.routes.js";
import  cors  from "cors";
const app = express();




const corsOptions = {
  origin: 'http://localhost:5173',
};

config();

const PORT = process.env.PORT ;

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send('Welcome to VidWize API!');
});

app.use("/api/auth", authRoutes);
app.use('/api/editor', editorRoutes);
app.use('/api/youtuber', youtuberRoutes);





// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
    console.log(`Server Running on port ${PORT}`);
});