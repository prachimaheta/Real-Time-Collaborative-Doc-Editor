import { useState, useEffect, useCallback } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { TOOLBAR_OPTIONS, SAVE_INTERVAL_MS } from '../constants';
import { io, Socket } from 'socket.io-client';
import { useParams } from 'react-router-dom';

export const TextEditor = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [quill, setQuill] = useState<Quill | null>(null);
    const [isSaved, setIsSaved] = useState<boolean>(true);
    const { id: documentId } = useParams();

    // ✅ Connect to WebSocket
    useEffect(() => {
        const skt = io(import.meta.env.VITE_SERVER_URL);
        setSocket(skt);
        console.log("✅ Connected to WebSocket");

        return () => {
            skt.disconnect();
        };
    }, []);

    // ✅ Initialize Quill Editor
    const wrapperRef = useCallback((wrapper: HTMLDivElement | null) => {
        if (!wrapper) return;
        wrapper.innerHTML = '';

        const editor = document.createElement('div');
        wrapper.append(editor);

        const quillInstance = new Quill(editor, {
            theme: 'snow',
            modules: { toolbar: TOOLBAR_OPTIONS },
        });

        setQuill(quillInstance);
    }, []);

    // ✅ Load document when editor initializes
    useEffect(() => {
        if (!socket || !quill || !documentId) return;

        console.log(`📄 Fetching document: ${documentId}`);
        socket.once("load-document", (document: any) => {
            quill.setContents(document.data);
            quill.enable();
        });

        const documentName = localStorage.getItem(`document-name-for-${documentId}`) || "Untitled";
        socket.emit("get-document", { documentId, documentName });
    }, [socket, quill, documentId]);

    // ✅ Handle text changes and send to server
    useEffect(() => {
        if (!socket || !quill) return;

        const handler = (delta: any, _oldDelta: any, source: string) => {
            if (source !== 'user') return;
            setIsSaved(false);
            socket.emit('send-changes', { documentId, delta });
        };

        quill.on('text-change', handler);

        return () => {
            quill.off('text-change', handler);
        };
    }, [socket, quill, documentId]);

    // ✅ Receive changes from server
    useEffect(() => {
        if (!socket || !quill) return;

        const handler = (delta: any) => {
            quill.updateContents(delta);
        };

        socket.on('receive-changes', handler);

        return () => {
            socket.off('receive-changes', handler);
        };
    }, [socket, quill]);

    // ✅ Auto-save document
    useEffect(() => {
        if (!socket || !quill || !documentId) return;

        const interval = setInterval(() => {
            console.log("💾 Auto-saving...");
            socket.emit("save-document", {
                documentId,
                data: quill.getContents(),
            });
        }, SAVE_INTERVAL_MS);

        return () => {
            clearInterval(interval);
        };
    }, [socket, quill, documentId]);

    // ✅ Show saved status
    useEffect(() => {
        if (!socket) return;

        socket.on("document-saved", () => {
            console.log("✅ Document saved successfully!");
            setIsSaved(true);
        });

        return () => {
            socket.off("document-saved");
        };
    }, [socket]);

    return (
        <div className="editorContainer">
            <div className="status-bar">
            <p>{isSaved ? "✅ All changes saved" : "💾 Saving..."}</p>
            </div>
            <div ref={wrapperRef}></div>
        </div>
    );
};
