import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { getAllDocuments, findOrCreateDocument } from "./controllers/documentController";
import { Document } from "./models/documentModel";  

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const DATABASE_URL = process.env.DATABASE_URL || "";

/** Connect to MongoDB */
mongoose
  .connect(DATABASE_URL, { dbName: "Google-Docs" })
  .then(() => console.log("✅ Database connected"))
  .catch((error) => console.error("❌ DB connection failed: ", error));

const io = new Server(PORT, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A user connected");

  // ✅ Send all documents to the dashboard
  socket.on("get-all-documents", async () => {
    const allDocuments = await getAllDocuments();
    socket.emit("all-documents", allDocuments.reverse());
  });

  // ✅ Fetch or create a document
  socket.on("get-document", async ({ documentId, documentName }) => {
    socket.join(documentId);
    const document = await findOrCreateDocument({ documentId, documentName });

    if (document) {
      socket.emit("load-document", document);
    }

    socket.on("send-changes", ({ documentId, delta }) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    // ✅ Save document when updated
    socket.on("save-document", async ({ documentId, data }) => {
      if (!documentId) return;
      try {
        console.log(`📝 Saving document: ${documentId}`);
        await Document.findByIdAndUpdate(
          documentId,
          { data },
          { new: true, upsert: true }
        );

        socket.emit("document-saved");
        console.log("✅ Document saved successfully.");
      } catch (error) {
        console.error("❌ Error saving document:", error);
        socket.emit("save-error", "Error saving document.");
      }
    });
  });

  


  socket.on("disconnect", () => console.log("User disconnected"));
});
