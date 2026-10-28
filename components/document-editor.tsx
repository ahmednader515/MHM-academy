"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/contexts/language-context";
import { uploadBlobToS3 } from "@/lib/upload-blob";
import { isPdfFile } from "@/lib/document-utils";
import { createHomeworkPdf } from "@/lib/homework-pdf";
import { HOMEWORK_EDITOR_ATTACHMENT, parseHomeworkEditorState } from "@/lib/homework-editor-state";
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
    PanelRightClose,
    PanelRightOpen,
    Palette,
    SlidersHorizontal,
    Trash2,
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
    pdfWidth?: number;
    pdfHeight?: number;
    background: string;
    strokes: Stroke[];
};

type TextDraft = {
    pageIndex: number;
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
    const overlayRefs = useRef(new Map<number, HTMLCanvasElement>());
    const pageRefs = useRef(new Map<number, HTMLDivElement>());
    const activePointerRef = useRef<{ pointerId: number; pageIndex: number } | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const textInputRef = useRef<HTMLInputElement | null>(null);
    const [pages, setPages] = useState<EditorPage[]>([]);
    const [pageIndex, setPageIndex] = useState(0);
    const [tool, setTool] = useState<Tool>("move");
    const [color, setColor] = useState("#e11d48");
    const [size, setSize] = useState(4);
    const [fontSize, setFontSize] = useState(24);
    const [zoom, setZoom] = useState(1);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
            setTextDraft(null);
            setSelectedTextIndex(null);
            textDragRef.current = null;
            activePointerRef.current = null;
            drawingRef.current = null;
            panDragRef.current = null;
            pinchRef.current = null;
            setTool("move");
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

    const redrawOverlay = (page: EditorPage, extraStroke?: Stroke | null, targetIndex = pageIndex) => {
        const overlay = overlayRefs.current.get(targetIndex);
        if (!overlay) {
            return;
        }
        if (overlay.width !== page.width) overlay.width = page.width;
        if (overlay.height !== page.height) overlay.height = page.height;
        const ctx = overlay.getContext("2d");
        if (!ctx) {
            return;
        }
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        page.strokes.forEach((stroke, index) =>
            drawStroke(ctx, stroke, { selected: targetIndex === pageIndex && index === selectedTextIndex })
        );
        if (extraStroke) {
            drawStroke(ctx, extraStroke);
        }
    };

    useEffect(() => {
        pages.forEach((page, index) => redrawOverlay(page, null, index));
    }, [pages, selectedTextIndex, pageIndex]);

    useEffect(() => {
        if (textDraft && textInputRef.current) {
            textInputRef.current.focus();
        }
    }, [textDraft]);

    const updateCurrentPage = (updater: (page: EditorPage) => EditorPage, targetIndex = pageIndex) => {
        setPages((prev) => prev.map((page, index) => (index === targetIndex ? updater(page) : page)));
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
        activePointerRef.current = null;
        setSelectedTextIndex(null);
        setTool(nextTool);
    };

    const moveTextStroke = (strokeIndex: number, point: Point, offsetX: number, offsetY: number, targetIndex: number) => {
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
        }), targetIndex);
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
        }), textDraft.pageIndex);
        setTextDraft(null);
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>, targetIndex: number) => {
        if (event.pointerType === "touch" && event.isPrimary === false) {
            return;
        }

        const canvas = event.currentTarget;
        const currentPage = pages[targetIndex];
        if (!currentPage) {
            return;
        }

        if (activePointerRef.current) return;
        setPageIndex(targetIndex);
        activePointerRef.current = { pointerId: event.pointerId, pageIndex: targetIndex };
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
                originX: viewportRef.current?.scrollLeft ?? 0,
                originY: viewportRef.current?.scrollTop ?? 0,
            };
            canvas.setPointerCapture(event.pointerId);
            return;
        }

        if (tool === "text") {
            event.preventDefault();
            activePointerRef.current = null;
            setTextDraft({
                pageIndex: targetIndex,
                x: point.x,
                y: point.y,
                value: "",
            });
            return;
        }

        drawingRef.current = { tool, color, size, points: [point] };
        canvas.setPointerCapture(event.pointerId);
        redrawOverlay(currentPage, { ...drawingRef.current, points: [point, point] }, targetIndex);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>, targetIndex: number) => {
        const canvas = event.currentTarget;
        const currentPage = pages[targetIndex];
        if (!currentPage) {
            return;
        }

        if (activePointerRef.current?.pointerId !== event.pointerId) return;
        if (textDragRef.current?.pointerId === event.pointerId) {
            const drag = textDragRef.current;
            const point = getCanvasPoint(event.clientX, event.clientY, canvas);
            moveTextStroke(drag.strokeIndex, point, drag.offsetX, drag.offsetY, targetIndex);
            return;
        }

        if (tool === "move" && panDragRef.current?.pointerId === event.pointerId) {
            const drag = panDragRef.current;
            if (viewportRef.current) {
                viewportRef.current.scrollLeft = drag.originX - (event.clientX - drag.startX);
                viewportRef.current.scrollTop = drag.originY - (event.clientY - drag.startY);
            }
            return;
        }

        const stroke = drawingRef.current;
        if (!stroke) {
            return;
        }

        stroke.points.push(getCanvasPoint(event.clientX, event.clientY, canvas));
        redrawOverlay(currentPage, stroke, targetIndex);
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
        const activePointer = activePointerRef.current;
        if (!activePointer || activePointer.pointerId !== event.pointerId) return;
        activePointerRef.current = null;
        if (textDragRef.current?.pointerId === event.pointerId) {
            textDragRef.current = null;
            handleScroll();
            return;
        }

        if (panDragRef.current?.pointerId === event.pointerId) {
            panDragRef.current = null;
            handleScroll();
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
        }), activePointer.pageIndex);
    };

    const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
        if (event.touches.length === 2) {
            const [a, b] = [event.touches[0], event.touches[1]];
            const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
            pinchRef.current = { distance, zoom };
            panDragRef.current = null;
            textDragRef.current = null;
            drawingRef.current = null;
            activePointerRef.current = null;
            pages.forEach((page, index) => redrawOverlay(page, null, index));
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
        if (!event.ctrlKey && !event.metaKey) {
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
        if (pages.length === 0 || saving) {
            return;
        }

        const pagesToExport = pages.map((page, index) => {
            if (
                index === textDraft?.pageIndex &&
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
            const pdf = await createHomeworkPdf(pagesToExport, async (page) => {
                const exportCanvas = document.createElement("canvas");
                exportCanvas.width = page.width;
                exportCanvas.height = page.height;
                const ctx = exportCanvas.getContext("2d");
                if (!ctx) {
                    throw new Error("Could not export homework page");
                }

                await new Promise<void>((resolve, reject) => {
                    const background = new Image();
                    background.onload = () => {
                        ctx.drawImage(background, 0, 0, page.width, page.height);
                        resolve();
                    };
                    background.onerror = () => reject(new Error("Failed to export page"));
                    background.src = page.background;
                });

                // Erase annotations on their own layer, never the underlying worksheet.
                const overlay = document.createElement("canvas");
                overlay.width = page.width;
                overlay.height = page.height;
                const overlayContext = overlay.getContext("2d");
                if (!overlayContext) throw new Error("Could not export homework annotations");
                page.strokes.forEach((stroke) => drawStroke(overlayContext, stroke));
                ctx.drawImage(overlay, 0, 0);
                const image = exportCanvas.toDataURL("image/jpeg", 0.95);
                exportCanvas.width = exportCanvas.height = overlay.width = overlay.height = 0;
                return image;
            }, pagesToExport);
            const url = await uploadBlobToS3(pdf, "homework.pdf", "homeworkImage");
            await onSubmit([url]);
            onOpenChange(false);
        } catch (submitError) {
            console.error("[DOCUMENT_EDITOR_SUBMIT]", submitError);
            setError(t("student.homeworkSubmitFailed") || "Failed to submit homework");
        } finally {
            setSaving(false);
        }
    };

    const goToPage = (index: number) => {
        setTextDraft(null);
        setSelectedTextIndex(null);
        setPageIndex(index);
        const viewport = viewportRef.current;
        const page = pageRefs.current.get(index);
        if (viewport && page) {
            viewport.scrollTop += page.getBoundingClientRect().top - viewport.getBoundingClientRect().top - 16;
        }
    };

    const handleScroll = () => {
        if (activePointerRef.current || textDraft) return;
        const viewport = viewportRef.current;
        if (!viewport) return;
        const top = viewport.getBoundingClientRect().top;
        let nearest = 0;
        let distance = Infinity;
        pageRefs.current.forEach((page, index) => {
            const rect = page.getBoundingClientRect();
            const nextDistance = Math.abs(rect.top - top - 16);
            if (rect.bottom > top && nextDistance < distance) {
                nearest = index;
                distance = nextDistance;
            }
        });
        if (nearest !== pageIndex) {
            setSelectedTextIndex(null);
            setPageIndex(nearest);
        }
    };

    if (!open) {
        return null;
    }

    const draftPage = textDraft ? pages[textDraft.pageIndex] : undefined;
    const textInputStyle = textDraft && draftPage
        ? {
            left: `${(textDraft.x / draftPage.width) * 100}%`,
            top: `${(textDraft.y / draftPage.height) * 100}%`,
            fontSize: `${fontSize * zoom}px`,
            color,
            minWidth: `${Math.max(120, fontSize * 4)}px`,
        }
        : undefined;

    return (
        <div className="fixed inset-0 z-[100] flex h-[100dvh] flex-col bg-background">
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

            <div className="flex min-h-0 flex-1" dir="ltr">
                <div
                    ref={viewportRef}
                    className="min-w-0 flex-1 overflow-auto overscroll-contain bg-muted/40 touch-pan-y"
                    dir="ltr"
                    onScroll={handleScroll}
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
                        <div className="flex min-h-full flex-col items-center gap-6 p-4" style={{ width: `${zoom * 100}%`, minWidth: zoom >= 1 ? "100%" : undefined, marginInline: zoom < 1 ? "auto" : undefined }}>
                            {pages.map((page, index) => (
                                <div
                                    key={index}
                                    ref={(node) => { if (node) pageRefs.current.set(index, node); else pageRefs.current.delete(index); }}
                                    data-page-index={index}
                                    onClick={() => setSidebarCollapsed(true)}
                                    aria-label={`${isRTL ? "صفحة" : "Page"} ${index + 1}`}
                                    className="relative w-full shrink-0"
                                    style={{ aspectRatio: `${page.width} / ${page.height}`, maxWidth: `${64 * zoom}rem` }}
                                >
                                    <img src={page.background} alt="" draggable={false}
                                        className="block h-full w-full rounded-md border bg-white shadow-sm" />
                                    <canvas
                                        ref={(node) => { if (node) overlayRefs.current.set(index, node); else overlayRefs.current.delete(index); }}
                                        className={`absolute inset-0 h-full w-full touch-none ${
                                            tool === "move" || (index === pageIndex && selectedTextIndex !== null)
                                                ? "cursor-grab active:cursor-grabbing"
                                                : tool === "text"
                                                  ? "cursor-text"
                                                  : "cursor-crosshair"
                                        }`}
                                        onPointerDown={(event) => handlePointerDown(event, index)}
                                        onPointerMove={(event) => handlePointerMove(event, index)}
                                        onPointerUp={handlePointerUp}
                                        onPointerCancel={handlePointerUp}
                                    />
                                    {textDraft?.pageIndex === index && (
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
                            ))}
                        </div>
                    )}
                </div>
                <aside
                    aria-label={isRTL ? "أدوات تعديل المستند" : "Document editing tools"}
                    dir={isRTL ? "rtl" : "ltr"}
                    className={`flex shrink-0 flex-col overflow-y-auto border-l border-slate-700 bg-slate-900 text-slate-100 ${sidebarCollapsed ? "w-12" : "w-32 sm:w-56"}`}
                >
                    <Button variant="ghost" size="icon"
                        className="m-1.5 shrink-0 self-end text-slate-200 hover:bg-slate-700 hover:text-white"
                        aria-expanded={!sidebarCollapsed} aria-controls="document-editor-controls"
                        aria-label={sidebarCollapsed ? (isRTL ? "إظهار الأدوات" : "Expand sidebar") : (isRTL ? "إخفاء الأدوات" : "Collapse sidebar")}
                        title={sidebarCollapsed ? (isRTL ? "إظهار الأدوات" : "Expand sidebar") : (isRTL ? "إخفاء الأدوات" : "Collapse sidebar")}
                        onClick={() => setSidebarCollapsed(value => !value)}>
                        {sidebarCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
                    </Button>
                    {sidebarCollapsed && <div className="flex flex-1 flex-col items-center gap-1 px-1.5 pb-3">
                        {([
                            { value: "move", icon: Hand, label: t("student.moveTool") || "Move" },
                            { value: "pen", icon: Pencil, label: t("student.pen") || "Pen" },
                            { value: "highlighter", icon: Highlighter, label: t("student.highlighter") || "Highlighter" },
                            { value: "eraser", icon: Eraser, label: t("student.eraser") || "Eraser" },
                            { value: "text", icon: Type, label: t("student.textTool") || "Text" },
                        ] as const).map(({ value, icon: Icon, label }) => (
                            <Button key={value} size="icon" variant="ghost"
                                aria-label={label} title={label} aria-pressed={tool === value}
                                aria-expanded={false} aria-controls="document-editor-controls"
                                onClick={() => { selectTool(value); setSidebarCollapsed(false); }}
                                className={`shrink-0 text-slate-200 hover:bg-slate-700 hover:text-white ${tool === value ? "bg-blue-600 text-white hover:bg-blue-500" : ""}`}>
                                <Icon className="h-4 w-4" />
                            </Button>
                        ))}
                        <div className="my-2 w-full border-t border-slate-700" />
                        {[
                            { icon: Palette, label: t("student.color") || "Color" },
                            { icon: SlidersHorizontal, label: tool === "text" ? t("student.fontSize") || "Font size" : t("student.strokeSize") || "Stroke size" },
                            { icon: ZoomOut, label: isRTL ? "تصغير" : "Zoom out", action: () => changeZoom(zoom - ZOOM_STEP), disabled: zoom <= MIN_ZOOM },
                            { icon: ZoomIn, label: isRTL ? "تكبير" : "Zoom in", action: () => changeZoom(zoom + ZOOM_STEP), disabled: zoom >= MAX_ZOOM },
                            { icon: isRTL ? Redo2 : Undo2, label: t("student.undo") || "Undo" },
                            { icon: Trash2, label: t("student.clearPage") || "Clear page" },
                            { icon: ChevronLeft, label: isRTL ? "الصفحة السابقة" : "Previous page" },
                            { icon: ChevronRight, label: isRTL ? "الصفحة التالية" : "Next page" },
                        ].map(({ icon: Icon, label, action, disabled }) => (
                            <Button key={label} size="icon" variant="ghost"
                                aria-label={label} title={label} aria-expanded={action ? undefined : false} aria-controls={action ? undefined : "document-editor-controls"}
                                className="shrink-0 text-slate-200 hover:bg-slate-700 hover:text-white"
                                disabled={disabled}
                                onClick={action ?? (() => setSidebarCollapsed(false))}>
                                <Icon className="h-4 w-4" />
                            </Button>
                        ))}
                        <Button size="icon" className="mt-auto shrink-0 bg-blue-600 text-white hover:bg-blue-500"
                            aria-label={submitLabel} title={submitLabel} aria-expanded={false} aria-controls="document-editor-controls"
                            onClick={() => setSidebarCollapsed(false)}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                    </div>}
                    <div id="document-editor-controls" hidden={sidebarCollapsed} className={sidebarCollapsed ? "hidden" : "flex flex-1 flex-col gap-4 p-3 sm:p-4"}>
                        <div className="grid gap-1.5">
                            {([
                                { value: "move", icon: Hand, label: t("student.moveTool") || "Move" },
                                { value: "pen", icon: Pencil, label: t("student.pen") || "Pen" },
                                { value: "highlighter", icon: Highlighter, label: t("student.highlighter") || "Highlighter" },
                                { value: "eraser", icon: Eraser, label: t("student.eraser") || "Eraser" },
                                { value: "text", icon: Type, label: t("student.textTool") || "Text" },
                            ] as const).map(({ value, icon: Icon, label }) => (
                                <Button
                                    key={value}
                                    size="sm"
                                    variant="ghost"
                                    aria-pressed={tool === value}
                                    onClick={() => selectTool(value)}
                                    className={`h-auto min-h-10 justify-start whitespace-normal px-2 py-2 text-xs hover:bg-slate-700 hover:text-white sm:text-sm ${
                                        tool === value ? "bg-blue-600 text-white hover:bg-blue-500" : "text-slate-200"
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </Button>
                            ))}
                        </div>

                        <div className="space-y-3 border-t border-slate-700 pt-4">
                            <label className="flex items-center justify-between gap-2 text-xs text-slate-300">
                                <span>{t("student.color") || "Color"}</span>
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(event) => setColor(event.target.value)}
                                    className="h-9 w-10 shrink-0 cursor-pointer rounded border border-slate-600 bg-slate-800"
                                />
                            </label>
                            <label className="flex flex-col gap-2 text-xs text-slate-300">
                                <span className="flex flex-wrap justify-between gap-1">
                                    <span>{tool === "text" ? t("student.fontSize") || "Font size" : t("student.strokeSize") || "Stroke size"}</span>
                                    <span className="tabular-nums">{tool === "text" ? fontSize : size}</span>
                                </span>
                                <input
                                    type="range"
                                    min={tool === "text" ? 12 : 2}
                                    max={tool === "text" ? 72 : 16}
                                    value={tool === "text" ? fontSize : size}
                                    onChange={(event) => tool === "text" ? setFontSize(Number(event.target.value)) : setSize(Number(event.target.value))}
                                    className="w-full accent-blue-500"
                                />
                            </label>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-700 pt-4" dir="ltr">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-200 hover:bg-slate-700 hover:text-white"
                                aria-label={isRTL ? "تصغير" : "Zoom out"}
                                onClick={() => changeZoom(zoom - ZOOM_STEP)} disabled={zoom <= MIN_ZOOM}>
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <span className="text-center text-xs tabular-nums text-slate-300">{Math.round(zoom * 100)}%</span>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-200 hover:bg-slate-700 hover:text-white"
                                aria-label={isRTL ? "تكبير" : "Zoom in"}
                                onClick={() => changeZoom(zoom + ZOOM_STEP)} disabled={zoom >= MAX_ZOOM}>
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid gap-1.5 border-t border-slate-700 pt-4">
                            <Button size="sm" variant="ghost" className="h-auto min-h-10 justify-start whitespace-normal px-2 text-xs text-slate-200 hover:bg-slate-700 hover:text-white sm:text-sm"
                                onClick={undo} disabled={!currentPage?.strokes.length}>
                                {isRTL ? <Redo2 className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
                                {t("student.undo") || "Undo"}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-auto min-h-10 justify-start whitespace-normal px-2 text-xs text-slate-200 hover:bg-slate-700 hover:text-white sm:text-sm"
                                onClick={clearPage} disabled={!currentPage?.strokes.length}>
                                {t("student.clearPage") || "Clear page"}
                            </Button>
                        </div>

                        <div className="mt-auto space-y-3 border-t border-slate-700 pt-4">
                            <div className="flex items-center justify-between gap-1" dir="ltr">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-200 hover:bg-slate-700 hover:text-white"
                                    aria-label={isRTL ? "الصفحة السابقة" : "Previous page"}
                                    onClick={() => goToPage(Math.max(0, pageIndex - 1))} disabled={pageIndex === 0}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs tabular-nums text-slate-300">{pages.length ? `${pageIndex + 1} / ${pages.length}` : "0 / 0"}</span>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-200 hover:bg-slate-700 hover:text-white"
                                    aria-label={isRTL ? "الصفحة التالية" : "Next page"}
                                    onClick={() => goToPage(Math.min(pages.length - 1, pageIndex + 1))} disabled={pageIndex >= pages.length - 1}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button className="h-auto min-h-10 w-full whitespace-normal bg-blue-600 px-2 py-2 text-xs text-white hover:bg-blue-500 sm:text-sm"
                                onClick={handleSubmit} disabled={saving || loading || pages.length === 0}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {saving ? t("student.submittingHomework") || "Submitting..." : submitLabel}
                            </Button>
                        </div>
                    </div>
                </aside>
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
    const attachments = await pdf.getAttachments();
    const editableContent = attachments?.[HOMEWORK_EDITOR_ATTACHMENT]?.content;
    if (editableContent instanceof Uint8Array) {
        const restoredPages = parseHomeworkEditorState(editableContent, pdf.numPages);
        if (restoredPages) {
            await pdf.destroy();
            return restoredPages;
        }
    }
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
            pdfWidth: viewport.width / 1.5,
            pdfHeight: viewport.height / 1.5,
            background: canvas.toDataURL("image/jpeg", 0.92),
            strokes: [],
        });
    }

    await pdf.destroy();
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
