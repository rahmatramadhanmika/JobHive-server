import mongoose from "mongoose";
import app from "./app.js";
import dotenv from "dotenv";

dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("database connected");
    const PORT = process.env.PORT || 3000;
    // Bind to all interfaces (0.0.0.0) instead of localhost only
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`server is running on port ${PORT}`);
      console.log(`Health check available at: http://0.0.0.0:${PORT}/health`);
    });
  })
  .catch((e) => {
    console.log("error: ", e.message);
  });
