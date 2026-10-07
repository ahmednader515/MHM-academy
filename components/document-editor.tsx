"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/contexts/language-context";
import { uploadBlobToS3 } from "@/lib/upload-blob";
import { isPdfFile } from "@/lib/document-utils";
import {
    Eraser,
    Hand,
    Highlighter,
    Loader2,
    Pencil,
    Redo2,
    Type,
    Undo2,
    X,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    Check,
} from "lucide-react";

type Tool = "pen" | "highlighter" | "eraser" | "text" | "move";

type Point = { x: number; y: number };

type Stroke = {
    tool: Exclude<Tool, "move">;
    color: string;
    size: number;
    points: Point[];
    text?: string;
    fontSize?: number;
};

type EditorPage = {
    width: number;
    height: number;
    background: string;
    strokes: Stroke[];
};

type TextDraft = {
    x: number;
    y: number;
    value: string;
};

interface DocumentEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sources: { url: string; name?: string }[];
    title?: string;
    submitLabel: string;
    onSubmit: (imageUrls: string[]) => Promise<void>;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function getCanvasPoint(clientX: number, clientY: number, canvas: HTMLCanvasElement): Point {
    const rect = canvas.getBoundingClientRect();
    return {
        x: ((clientX - rect.left) / rect.width) * canvas.width,
        y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
}

function getTextFontSize(stroke: Stroke) {
    return stroke.fontSize ?? Math.max(18, stroke.size * 4);
}

function getTextBounds(ctx: CanvasRenderingContext2D, stroke: Stroke) {
    if (stroke.tool !== "text" || !stroke.text || !stroke.points[0]) {
        return null;
    }

    const fontSize = getTextFontSize(stroke);
    const { x: originX, y: originY } = stroke.points[0];

    ctx.save();
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const metrics = ctx.measureText(stroke.text);
    ctx.restore();

    const padding = Math.max(4, fontSize * 0.12);
    const hasPreciseBounds =
        Number.isFinite(metrics.actualBoundingBoxLeft) &&
        Number.isFinite(metrics.actualBoundingBoxRight) &&
        Number.isFinite(metrics.actualBoundingBoxAscent) &&
        Number.isFinite(metrics.actualBoundingBoxDescent);

    if (hasPreciseBounds) {
        return {
            x: originX - metrics.actualBoundingBoxLeft - padding,
            y: originY - metrics.actualBoundingBoxAscent - padding,
            width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight + padding * 2,
            height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + padding * 2,
        };
    }

    return {
        x: originX - padding,
        y: originY - padding,
        width: Math.max(metrics.width, fontSize * 0.5) + padding * 2,
        height: fontSize + padding * 2,
    };
}

function findTextStrokeAt(page: EditorPage, point: Point, canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        return -1;
    }

    for (let index = page.strokes.length - 1; index >= 0; index--) {
        const stroke = page.strokes[index];
        const bounds = getTextBounds(ctx, stroke);
        if (!bounds) {
            continue;
        }

        if (
            point.x >= bounds.x &&
            point.x <= bounds.x + bounds.width &&
            point.y >= bounds.y &&
            point.y <= bounds.y + bounds.height
        ) {
            return index;
        }
    }

    return -1;
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, options?: { selected?: boolean }) {
    if (stroke.tool === "text" && stroke.text && stroke.points[0]) {
        ctx.save();
        const fontSize = getTextFontSize(stroke);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textBaseline = "top";

        ctx.textAlign = "left";
        ctx.fillStyle = stroke.color;
        ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);

        if (options?.selected) {
            const bounds = getTextBounds(ctx, stroke);
            if (bounds) {
                ctx.strokeStyle = "#2563eb";
                ctx.lineWidth = Math.max(1.5, fontSize * 0.04);
                ctx.setLineDash([6, 4]);
                ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
                ctx.setLineDash([]);
            }
        }

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
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const textInputRef = useRef<HTMLInputElement | null>(null);
    const [pages, setPages] = useState<EditorPage[]>([]);
    const [pageIndex, setPageIndex] = useState(0);
    const [tool, setTool] = useState<Tool>("pen");
    const [color, setColor] = useState("#e11d48");
    const [size, setSize] = useState(4);
    const [fontSize, setFontSize] = useState(24);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
    const drawingRef = useRef<Stroke | null>(null);
    const panDragRef = useRef<{
        pointerId: number;
        startX: number;
        startY: number;
        originX: number;
        originY: number;
    } | null>(null);
    const textDragRef = useRef<{
        pointerId: number;
        strokeIndex: number;
        offsetX: number;
        offsetY: number;
    } | null>(null);
    const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
    const pinchRef = useRef<{
        distance: number;
        zoom: number;
    } | null>(null);

    const currentPage = pages[pageIndex];
    const sourceKey = sources.map((source) => source.url).join("|");

    useEffect(() => {
        if (!open) {
            setPages([]);
            setPageIndex(0);
            setError(null);
            setZoom(1);
            setPan({ x: 0, y: 0 });
            setTextDraft(null);
            setSelectedTextIndex(null);
            textDragRef.current = null;
            setTool("pen");
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
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                    setTextDraft(null);
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
        page.strokes.forEach((stroke, index) =>
            drawStroke(ctx, stroke, { selected: index === selectedTextIndex })
        );
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
    }, [currentPage?.background, currentPage?.width, currentPage?.height, pageIndex]);

    useEffect(() => {
        if (!currentPage) {
            return;
        }
        redrawOverlay(currentPage);
    }, [currentPage?.strokes, selectedTextIndex, pageIndex]);

    useEffect(() => {
        if (textDraft && textInputRef.current) {
            textInputRef.current.focus();
        }
    }, [textDraft]);

    const updateCurrentPage = (updater: (page: EditorPage) => EditorPage) => {
        setPages((prev) => prev.map((page, index) => (index === pageIndex ? updater(page) : page)));
    };

    const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

    const changeZoom = (nextZoom: number) => {
        setZoom(clampZoom(nextZoom));
    };

    const selectTool = (nextTool: Tool) => {
        setTextDraft(null);
        drawingRef.current = null;
        panDragRef.current = null;
        textDragRef.current = null;
        setSelectedTextIndex(null);
        setTool(nextTool);
    };

    const moveTextStroke = (strokeIndex: number, point: Point, offsetX: number, offsetY: number) => {
        updateCurrentPage((page) => ({
            ...page,
            strokes: page.strokes.map((stroke, index) => {
                if (index !== strokeIndex || stroke.tool !== "text") {
                    return stroke;
                }
                return {
                    ...stroke,
                    points: [{ x: point.x - offsetX, y: point.y - offsetY }],
                };
            }),
        }));
    };

    const commitTextDraft = () => {
        if (!textDraft?.value.trim()) {
            setTextDraft(null);
            return;
        }
        updateCurrentPage((page) => ({
            ...page,
            strokes: [
                ...page.strokes,
                {
                    tool: "text",
                    color,
                    size,
                    fontSize,
                    points: [{ x: textDraft.x, y: textDraft.y }],
                    text: textDraft.value.trim(),
                },
            ],
        }));
        setTextDraft(null);
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (event.pointerType === "touch" && event.isPrimary === false) {
            return;
        }

        const canvas = overlayRef.current;
        if (!canvas || !currentPage) {
            return;
        }

        const point = getCanvasPoint(event.clientX, event.clientY, canvas);
        const hitTextIndex =
            tool === "text" || tool === "move"
                ? findTextStrokeAt(currentPage, point, canvas)
                : -1;

        if (hitTextIndex >= 0) {
            event.preventDefault();
            setTextDraft(null);
            const stroke = currentPage.strokes[hitTextIndex];
            const origin = stroke.points[0];
            textDragRef.current = {
                pointerId: event.pointerId,
                strokeIndex: hitTextIndex,
                offsetX: point.x - origin.x,
                offsetY: point.y - origin.y,
            };
            setSelectedTextIndex(hitTextIndex);
            canvas.setPointerCapture(event.pointerId);
            return;
        }

        setSelectedTextIndex(null);

        if (tool === "move") {
            panDragRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                originX: pan.x,
                originY: pan.y,
            };
            canvas.setPointerCapture(event.pointerId);
            return;
        }

        if (tool === "text") {
            event.preventDefault();
            setTextDraft({
                x: point.x,
                y: point.y,
                value: "",
            });
            return;
        }

        drawingRef.current = { tool, color, size, points: [point] };
        canvas.setPointerCapture(event.pointerId);
        redrawOverlay(currentPage, { ...drawingRef.current, points: [point, point] });
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = overlayRef.current;
        if (!canvas || !currentPage) {
            return;
        }

        if (textDragRef.current?.pointerId === event.pointerId) {
            const drag = textDragRef.current;
            const point = getCanvasPoint(event.clientX, event.clientY, canvas);
            moveTextStroke(drag.strokeIndex, point, drag.offsetX, drag.offsetY);
            return;
        }

        if (tool === "move" && panDragRef.current?.pointerId === event.pointerId) {
            const drag = panDragRef.current;
            setPan({
                x: drag.originX + (event.clientX - drag.startX),
                y: drag.originY + (event.clientY - drag.startY),
            });
            return;
        }

        const stroke = drawingRef.current;
        if (!stroke) {
            return;
        }

        stroke.points.push(getCanvasPoint(event.clientX, event.clientY, canvas));
        redrawOverlay(currentPage, stroke);
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
        if (textDragRef.current?.pointerId === event.pointerId) {
            textDragRef.current = null;
            return;
        }

        if (panDragRef.current?.pointerId === event.pointerId) {
            panDragRef.current = null;
            return;
        }

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

    const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
        if (event.touches.length === 2) {
            const [a, b] = [event.touches[0], event.touches[1]];
            const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
            pinchRef.current = { distance, zoom };
            panDragRef.current = null;
            textDragRef.current = null;
            drawingRef.current = null;
        }
    };

    const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
        if (event.touches.length === 2 && pinchRef.current) {
            event.preventDefault();
            const [a, b] = [event.touches[0], event.touches[1]];
            const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
            const ratio = distance / pinchRef.current.distance;
            setZoom(clampZoom(pinchRef.current.zoom * ratio));
        }
    };

    const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
        if (event.touches.length < 2) {
            pinchRef.current = null;
        }
    };

    const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        if (!event.ctrlKey && tool !== "move") {
            return;
        }
        event.preventDefault();
        const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        changeZoom(zoom + delta);
    };

    const undo = () => {
        setTextDraft(null);
        updateCurrentPage((page) => ({
            ...page,
            strokes: page.strokes.slice(0, -1),
        }));
    };

    const clearPage = () => {
        setTextDraft(null);
        updateCurrentPage((page) => ({
            ...page,
            strokes: [],
        }));
    };

    const handleSubmit = async () => {
        if (pages.length === 0) {
            return;
        }

        const pagesToExport = pages.map((page, index) => {
            if (
                index === pageIndex &&
                textDraft?.value.trim()
            ) {
                return {
                    ...page,
                    strokes: [
                        ...page.strokes,
                        {
                            tool: "text" as const,
                            color,
                            size,
                            fontSize,
                            points: [{ x: textDraft.x, y: textDraft.y }],
                            text: textDraft.value.trim(),
                        },
                    ],
                };
            }
            return page;
        });

        setTextDraft(null);
        setPages(pagesToExport);
        setSaving(true);
        try {
            const urls: string[] = [];
            for (const [index, page] of pagesToExport.entries()) {
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

    const textInputStyle = textDraft && currentPage
        ? {
            left: `${(textDraft.x / currentPage.width) * 100}%`,
            top: `${(textDraft.y / currentPage.height) * 100}%`,
            fontSize: `${fontSize * zoom}px`,
            color,
            minWidth: `${Math.max(120, fontSize * 4)}px`,
        }
        : undefined;

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
                <Button size="sm" variant={tool === "pen" ? "default" : "outline"} onClick={() => selectTool("pen")}>
                    <Pencil className="h-4 w-4" />
                    {t("student.pen") || "Pen"}
                </Button>
                <Button size="sm" variant={tool === "highlighter" ? "default" : "outline"} onClick={() => selectTool("highlighter")}>
                    <Highlighter className="h-4 w-4" />
                    {t("student.highlighter") || "Highlighter"}
                </Button>
                <Button size="sm" variant={tool === "eraser" ? "default" : "outline"} onClick={() => selectTool("eraser")}>
                    <Eraser className="h-4 w-4" />
                    {t("student.eraser") || "Eraser"}
                </Button>
                <Button size="sm" variant={tool === "text" ? "default" : "outline"} onClick={() => selectTool("text")}>
                    <Type className="h-4 w-4" />
                    {t("student.textTool") || "Text"}
                </Button>
                <Button size="sm" variant={tool === "move" ? "default" : "outline"} onClick={() => selectTool("move")}>
                    <Hand className="h-4 w-4" />
                    {t("student.moveTool") || "Move"}
                </Button>
                <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border bg-background"
                    aria-label={t("student.color") || "Color"}
                />
                {tool === "text" ? (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{t("student.fontSize") || "Font size"}</span>
                        <input
                            type="range"
                            min={12}
                            max={72}
                            value={fontSize}
                            onChange={(event) => setFontSize(Number(event.target.value))}
                            className="w-28"
                        />
                        <span className="w-8 tabular-nums">{fontSize}</span>
                    </label>
                ) : (
                    <input
                        type="range"
                        min={2}
                        max={16}
                        value={size}
                        onChange={(event) => setSize(Number(event.target.value))}
                        className="w-28"
                        aria-label={t("student.strokeSize") || "Stroke size"}
                    />
                )}
                <Button size="sm" variant="outline" onClick={() => changeZoom(zoom - ZOOM_STEP)} disabled={zoom <= MIN_ZOOM}>
                    <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
                    {Math.round(zoom * 100)}%
                </span>
                <Button size="sm" variant="outline" onClick={() => changeZoom(zoom + ZOOM_STEP)} disabled={zoom >= MAX_ZOOM}>
                    <ZoomIn className="h-4 w-4" />
                </Button>
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
                        onClick={() => {
                            setTextDraft(null);
                            setPageIndex((value) => Math.max(0, value - 1));
                            setPan({ x: 0, y: 0 });
                        }}
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
                        onClick={() => {
                            setTextDraft(null);
                            setPageIndex((value) => Math.min(pages.length - 1, value + 1));
                            setPan({ x: 0, y: 0 });
                        }}
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

            <div
                ref={viewportRef}
                className="flex-1 overflow-hidden bg-muted/40 p-4 touch-none"
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {loading ? (
                    <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {t("student.loadingDocument") || "Loading document..."}
                    </div>
                ) : error ? (
                    <div className="flex h-full items-center justify-center text-sm text-destructive">{error}</div>
                ) : (
                    <div className="flex h-full w-full items-center justify-center overflow-hidden">
                        <div
                            className="relative origin-center"
                            style={{
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                width: "min(100%, 64rem)",
                            }}
                        >
                            <canvas
                                ref={backgroundRef}
                                className="w-full rounded-md border bg-white shadow-sm"
                            />
                            <canvas
                                ref={overlayRef}
                                className={`absolute inset-0 h-full w-full touch-none ${
                                    tool === "move" || selectedTextIndex !== null
                                        ? "cursor-grab active:cursor-grabbing"
                                        : tool === "text"
                                          ? "cursor-text"
                                          : "cursor-crosshair"
                                }`}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerCancel={handlePointerUp}
                            />
                            {textDraft && (
                                <div
                                    className="absolute z-10 flex items-start gap-1"
                                    style={textInputStyle}
                                >
                                    <input
                                        ref={textInputRef}
                                        value={textDraft.value}
                                        onChange={(event) =>
                                            setTextDraft((prev) => (prev ? { ...prev, value: event.target.value } : prev))
                                        }
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                event.preventDefault();
                                                commitTextDraft();
                                            }
                                            if (event.key === "Escape") {
                                                event.preventDefault();
                                                setTextDraft(null);
                                            }
                                        }}
                                        placeholder={t("student.enterText") || "Enter text"}
                                        className="rounded border border-primary bg-white px-2 py-1 shadow outline-none"
                                        style={{
                                            fontSize: `${fontSize}px`,
                                            color,
                                            lineHeight: 1.2,
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        className="h-8 w-8 shrink-0"
                                        onClick={commitTextDraft}
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="outline"
                                        className="h-8 w-8 shrink-0 bg-white"
                                        onClick={() => setTextDraft(null)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
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
