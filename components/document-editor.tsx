"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/contexts/language-context";
import { uploadBlobToS3 } from "@/lib/upload-blob";
import { isPdfFile } from "@/lib/document-utils";
import {
    Eraser,
    Highlighter,
    Loader2,
    Pencil,
    Redo2,
    Type,
    Undo2,
    X,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

type Tool = "pen" | "highlighter" | "eraser" | "text";

type Point = { x: number; y: number };

type Stroke = {
    tool: Tool;
    color: string;
    size: number;
    points: Point[];
    text?: string;
};

type EditorPage = {
    width: number;
    height: number;
    background: string;
    strokes: Stroke[];
};

interface DocumentEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sources: { url: string; name?: string }[];
    title?: string;
    submitLabel: string;
    onSubmit: (imageUrls: string[]) => Promise<void>;
}

function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): Point {
    const rect = canvas.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * canvas.width,
        y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.tool === "text" && stroke.text && stroke.points[0]) {
        ctx.save();
        ctx.fillStyle = stroke.color;
        ctx.font = `${Math.max(18, stroke.size * 4)}px sans-serif`;
        ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);
        ctx.restore();
        return;
    }

    if (stroke.points.length < 2) {
        return;
    }

    ctx.save();
    if (stroke.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = stroke.size * 3;
    } else if (stroke.tool === "highlighter") {
        ctx.globalCompositeOperation = "multiply";
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size * 4;
        ctx.globalAlpha = 0.35;
    } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.globalAlpha = 1;
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
}

export function DocumentEditor({
    open,
    onOpenChange,
    sources,
    title,
    submitLabel,
    onSubmit,
}: DocumentEditorProps) {
    const { t, isRTL } = useLanguage();
    const backgroundRef = useRef<HTMLCanvasElement | null>(null);
    const overlayRef = useRef<HTMLCanvasElement | null>(null);
    const [pages, setPages] = useState<EditorPage[]>([]);
    const [pageIndex, setPageIndex] = useState(0);
    const [tool, setTool] = useState<Tool>("pen");
    const [color, setColor] = useState("#e11d48");
    const [size, setSize] = useState(4);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const drawingRef = useRef<Stroke | null>(null);

    const currentPage = pages[pageIndex];

    const sourceKey = sources.map((source) => source.url).join("|");

    useEffect(() => {
        if (!open) {
            setPages([]);
            setPageIndex(0);
            setError(null);
            return;
        }

        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const loadedPages: EditorPage[] = [];
                for (const source of sources) {
                    const response = await fetch(`/api/files/proxy?url=${encodeURIComponent(source.url)}`);
                    if (!response.ok) {
                        throw new Error("Failed to load document");
                    }
                    const blob = await response.blob();
                    if (isPdfFile(source.url, source.name) || blob.type === "application/pdf") {
                        const pdfPages = await renderPdfPages(await blob.arrayBuffer());
                        loadedPages.push(...pdfPages);
                    } else {
                        loadedPages.push(await renderImagePage(blob));
                    }
                }

                if (!cancelled) {
                    if (loadedPages.length === 0) {
                        setError(t("student.unsupportedDocument") || "This file type cannot be edited on the platform.");
                    }
                    setPages(loadedPages);
                    setPageIndex(0);
                }
            } catch (loadError) {
                console.error("[DOCUMENT_EDITOR_LOAD]", loadError);
                if (!cancelled) {
                    setError(t("student.failedToLoadDocument") || "Failed to load the document for editing.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [open, sourceKey, t]);

    const redrawOverlay = (page: EditorPage, extraStroke?: Stroke | null) => {
        const overlay = overlayRef.current;
        if (!overlay) {
            return;
        }
        overlay.width = page.width;
        overlay.height = page.height;
        const ctx = overlay.getContext("2d");
        if (!ctx) {
            return;
        }
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        page.strokes.forEach((stroke) => drawStroke(ctx, stroke));
        if (extraStroke) {
            drawStroke(ctx, extraStroke);
        }
    };

    useEffect(() => {
        const backgroundCanvas = backgroundRef.current;
        if (!backgroundCanvas || !currentPage) {
            return;
        }

        backgroundCanvas.width = currentPage.width;
        backgroundCanvas.height = currentPage.height;
        const ctx = backgroundCanvas.getContext("2d");
        if (!ctx) {
            return;
        }

        const background = new Image();
        background.onload = () => {
            ctx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
            ctx.drawImage(background, 0, 0, backgroundCanvas.width, backgroundCanvas.height);
            redrawOverlay(currentPage);
        };
        background.src = currentPage.background;
    }, [currentPage, pageIndex]);

    const updateCurrentPage = (updater: (page: EditorPage) => EditorPage) => {
        setPages((prev) => prev.map((page, index) => (index === pageIndex ? updater(page) : page)));
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = overlayRef.current;
        if (!canvas || !currentPage) {
            return;
        }

        const point = getCanvasPoint(event, canvas);
        if (tool === "text") {
            const text = window.prompt(t("student.enterText") || "Enter text");
            if (!text?.trim()) {
                return;
            }
            updateCurrentPage((page) => ({
                ...page,
                strokes: [...page.strokes, { tool, color, size, points: [point], text: text.trim() }],
            }));
            return;
        }

        drawingRef.current = { tool, color, size, points: [point] };
        canvas.setPointerCapture(event.pointerId);
        redrawOverlay(currentPage, { ...drawingRef.current, points: [point, point] });
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = overlayRef.current;
        const stroke = drawingRef.current;
        if (!canvas || !stroke || !currentPage) {
            return;
        }

        stroke.points.push(getCanvasPoint(event, canvas));
        redrawOverlay(currentPage, stroke);
    };

    const handlePointerUp = () => {
        const stroke = drawingRef.current;
        drawingRef.current = null;
        if (!stroke || stroke.points.length < 2) {
            return;
        }
        updateCurrentPage((page) => ({
            ...page,
            strokes: [...page.strokes, stroke],
        }));
    };

    const undo = () => {
        updateCurrentPage((page) => ({
            ...page,
            strokes: page.strokes.slice(0, -1),
        }));
    };

    const clearPage = () => {
        updateCurrentPage((page) => ({
            ...page,
            strokes: [],
        }));
    };

    const handleSubmit = async () => {
        if (pages.length === 0) {
            return;
        }

        setSaving(true);
        try {
            const urls: string[] = [];
            for (const [index, page] of pages.entries()) {
                const exportCanvas = document.createElement("canvas");
                exportCanvas.width = page.width;
                exportCanvas.height = page.height;
                const ctx = exportCanvas.getContext("2d");
                if (!ctx) {
                    continue;
                }

                await new Promise<void>((resolve, reject) => {
                    const background = new Image();
                    background.onload = () => {
                        ctx.drawImage(background, 0, 0, page.width, page.height);
                        page.strokes.forEach((stroke) => drawStroke(ctx, stroke));
                        resolve();
                    };
                    background.onerror = () => reject(new Error("Failed to export page"));
                    background.src = page.background;
                });

                const blob = await new Promise<Blob | null>((resolve) =>
                    exportCanvas.toBlob(resolve, "image/jpeg", 0.86)
                );
                if (!blob) {
                    throw new Error("Failed to export page");
                }

                const url = await uploadBlobToS3(blob, `homework-page-${index + 1}.jpg`, "homeworkImage");
                urls.push(url);
            }

            await onSubmit(urls);
            onOpenChange(false);
        } catch (submitError) {
            console.error("[DOCUMENT_EDITOR_SUBMIT]", submitError);
            setError(t("student.homeworkSubmitFailed") || "Failed to submit homework");
        } finally {
            setSaving(false);
        }
    };

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                    <h2 className="text-lg font-semibold">{title || t("student.documentEditor")}</h2>
                    <p className="text-xs text-muted-foreground">
                        {t("student.documentEditorHelp") || "Edit the document here, then submit without downloading it."}
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} disabled={saving}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
                <Button size="sm" variant={tool === "pen" ? "default" : "outline"} onClick={() => setTool("pen")}>
                    <Pencil className="h-4 w-4" />
                    {t("student.pen") || "Pen"}
                </Button>
                <Button size="sm" variant={tool === "highlighter" ? "default" : "outline"} onClick={() => setTool("highlighter")}>
                    <Highlighter className="h-4 w-4" />
                    {t("student.highlighter") || "Highlighter"}
                </Button>
                <Button size="sm" variant={tool === "eraser" ? "default" : "outline"} onClick={() => setTool("eraser")}>
                    <Eraser className="h-4 w-4" />
                    {t("student.eraser") || "Eraser"}
                </Button>
                <Button size="sm" variant={tool === "text" ? "default" : "outline"} onClick={() => setTool("text")}>
                    <Type className="h-4 w-4" />
                    {t("student.textTool") || "Text"}
                </Button>
                <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border bg-background"
                    aria-label={t("student.color") || "Color"}
                />
                <input
                    type="range"
                    min={2}
                    max={16}
                    value={size}
                    onChange={(event) => setSize(Number(event.target.value))}
                    className="w-28"
                />
                <Button size="sm" variant="outline" onClick={undo} disabled={!currentPage?.strokes.length}>
                    {isRTL ? <Redo2 className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
                    {t("student.undo") || "Undo"}
                </Button>
                <Button size="sm" variant="outline" onClick={clearPage} disabled={!currentPage?.strokes.length}>
                    {t("student.clearPage") || "Clear page"}
                </Button>
                <div className="ml-auto flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
                        disabled={pageIndex === 0}
                    >
                        {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        {pages.length ? `${pageIndex + 1} / ${pages.length}` : "0 / 0"}
                    </span>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPageIndex((value) => Math.min(pages.length - 1, value + 1))}
                        disabled={pageIndex >= pages.length - 1}
                    >
                        {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                    <Button onClick={handleSubmit} disabled={saving || loading || pages.length === 0}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {saving ? t("student.submittingHomework") || "Submitting..." : submitLabel}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-muted/40 p-4">
                {loading ? (
                    <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {t("student.loadingDocument") || "Loading document..."}
                    </div>
                ) : error ? (
                    <div className="flex h-full items-center justify-center text-sm text-destructive">{error}</div>
                ) : (
                    <div className="relative mx-auto w-full max-w-5xl">
                        <canvas
                            ref={backgroundRef}
                            className="w-full rounded-md border bg-white shadow-sm"
                        />
                        <canvas
                            ref={overlayRef}
                            className="absolute inset-0 h-full w-full touch-none"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

async function renderImagePage(blob: Blob): Promise<EditorPage> {
    const objectUrl = URL.createObjectURL(blob);
    const image = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    const maxWidth = 1600;
    const scale = Math.min(1, maxWidth / image.width);
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Could not create canvas");
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(objectUrl);
    return {
        width: canvas.width,
        height: canvas.height,
        background: canvas.toDataURL("image/jpeg", 0.92),
        strokes: [],
    };
}

async function renderPdfPages(data: ArrayBuffer): Promise<EditorPage[]> {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pages: EditorPage[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            continue;
        }
        await page.render({
            canvas,
            canvasContext: ctx,
            viewport,
        } as Parameters<typeof page.render>[0]).promise;
        pages.push({
            width: canvas.width,
            height: canvas.height,
            background: canvas.toDataURL("image/jpeg", 0.92),
            strokes: [],
        });
    }

    return pages;
}

function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });
}
