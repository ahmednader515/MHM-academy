export const HOMEWORK_EDITOR_ATTACHMENT = "mhm-academy-editor.json";

export interface EditableHomeworkStroke {
    tool: "pen" | "highlighter" | "eraser" | "text";
    color: string;
    size: number;
    points: { x: number; y: number }[];
    text?: string;
    fontSize?: number;
}

export interface EditableHomeworkPage {
    width: number;
    height: number;
    pdfWidth?: number;
    pdfHeight?: number;
    background: string;
    strokes: EditableHomeworkStroke[];
}

function record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function finite(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

/** Only restore our versioned, self-contained image-and-stroke format. */
export function parseHomeworkEditorState(content: Uint8Array, pageCount: number): EditableHomeworkPage[] | null {
    if (content.byteLength > 50 * 1024 * 1024) return null;
    try {
        const state: unknown = JSON.parse(new TextDecoder().decode(content));
        if (!record(state) || state.format !== "mhm-academy/homework" || state.version !== 1 ||
            !Array.isArray(state.pages) || state.pages.length !== pageCount || pageCount === 0) return null;
        for (const page of state.pages) {
            if (!record(page) || !finite(page.width) || !finite(page.height) ||
                page.width <= 0 || page.height <= 0 || page.width > 16384 || page.height > 16384 ||
                typeof page.background !== "string" || !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(page.background) ||
                !Array.isArray(page.strokes)) return null;
            for (const key of ["pdfWidth", "pdfHeight"]) {
                if (page[key] !== undefined && (!finite(page[key]) || page[key] <= 0)) return null;
            }
            for (const stroke of page.strokes) {
                if (!record(stroke) || !["pen", "highlighter", "eraser", "text"].includes(String(stroke.tool)) ||
                    typeof stroke.color !== "string" || !/^#[0-9a-f]{6}$/i.test(stroke.color) ||
                    !finite(stroke.size) || stroke.size <= 0 || !Array.isArray(stroke.points) ||
                    !stroke.points.every(point => record(point) && finite(point.x) && finite(point.y)) ||
                    (stroke.text !== undefined && typeof stroke.text !== "string") ||
                    (stroke.fontSize !== undefined && (!finite(stroke.fontSize) || stroke.fontSize <= 0))) return null;
            }
        }
        return state.pages as EditableHomeworkPage[];
    } catch {
        return null;
    }
}

export function serializeHomeworkEditorState(pages: EditableHomeworkPage[]) {
    return new TextEncoder().encode(JSON.stringify({ format: "mhm-academy/homework", version: 1, pages }));
}
