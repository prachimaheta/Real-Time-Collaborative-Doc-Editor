"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const documentController_1 = require("./controllers/documentController");
const documentModel_1 = require("./models/documentModel");
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const DATABASE_URL = process.env.DATABASE_URL || "";
/** Connect to MongoDB */
mongoose_1.default
    .connect(DATABASE_URL, { dbName: "Google-Docs" })
    .then(() => console.log("✅ Database connected"))
    .catch((error) => console.error("❌ DB connection failed: ", error));
const io = new socket_io_1.Server(PORT, {
    cors: {
        origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});
io.on("connection", (socket) => {
    console.log("A user connected");
    // ✅ Send all documents to the dashboard
    socket.on("get-all-documents", () => __awaiter(void 0, void 0, void 0, function* () {
        const allDocuments = yield (0, documentController_1.getAllDocuments)();
        socket.emit("all-documents", allDocuments.reverse());
    }));
    // ✅ Fetch or create a document
    socket.on("get-document", ({ documentId, documentName }) => __awaiter(void 0, void 0, void 0, function* () {
        socket.join(documentId);
        const document = yield (0, documentController_1.findOrCreateDocument)({ documentId, documentName });
        if (document) {
            socket.emit("load-document", document);
        }
        socket.on("send-changes", ({ documentId, delta }) => {
            socket.broadcast.to(documentId).emit("receive-changes", delta);
        });
        // ✅ Save document when updated
        socket.on("save-document", ({ documentId, data }) => __awaiter(void 0, void 0, void 0, function* () {
            if (!documentId)
                return;
            try {
                console.log(`📝 Saving document: ${documentId}`);
                yield documentModel_1.Document.findByIdAndUpdate(documentId, { data }, { new: true, upsert: true });
                socket.emit("document-saved");
                console.log("✅ Document saved successfully.");
            }
            catch (error) {
                console.error("❌ Error saving document:", error);
                socket.emit("save-error", "Error saving document.");
            }
        }));
    }));
    socket.on("disconnect", () => console.log("User disconnected"));
});
