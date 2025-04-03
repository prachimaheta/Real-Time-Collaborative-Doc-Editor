import { useState, useEffect } from "react";
import { io } from "socket.io-client"; // ✅ Removed 'Socket' (Not Used)

interface Document {
    _id: string;
    name: string;
}

export const Dashboard = () => {
    const [documents, setDocuments] = useState<Document[]>([]);

    useEffect(() => {
        const socket = io("http://localhost:3000");

        socket.emit("get-all-documents");

        socket.on("all-documents", (docs: Document[]) => {
            console.log("📄 Received Documents:", docs);
            setDocuments(docs);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <div>
            <h2>📜 My Documents</h2>
            {documents.length === 0 ? (
                <p>No saved documents.</p>
            ) : (
                <ul>
                    {documents.map((doc) => (
                        <li key={doc._id}>
                            <a href={`/documents/${doc._id}`}>{doc.name || "Untitled"}</a>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
