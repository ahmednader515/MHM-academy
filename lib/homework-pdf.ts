import { PDFDocument } from "pdf-lib";
import { HOMEWORK_EDITOR_ATTACHMENT, serializeHomeworkEditorState, type EditableHomeworkPage } from "./homework-editor-state";

export interface HomeworkPdfPage {
    width: number;
    height: number;
    pdfWidth?: number;
    pdfHeight?: number;
}

/** Package the edited pages in their displayed order, retaining each page's proportions. */
export async function createHomeworkPdf<T extends HomeworkPdfPage>(
    pages: T[],
    renderPage: (page: T) => Promise<Uint8Array | string>,
    editablePages?: EditableHomeworkPage[],
) {
    if (pages.length === 0) throw new Error("Cannot submit an empty document");
    const document = await PDFDocument.create();
    for (const page of pages) {
        const width = page.pdfWidth ?? page.width * 72 / 96;
        const height = page.pdfHeight ?? page.height * 72 / 96;
        if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) {
            throw new Error("Invalid homework page dimensions");
        }
        const image = await document.embedJpg(await renderPage(page));
        document.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
    }
    if (editablePages) {
        if (editablePages.length !== pages.length) throw new Error("Editable page count does not match PDF");
        // The PDF remains viewable in ordinary readers; our editor restores the
        // clean worksheets and separate marks from this standard PDF attachment.
        await document.attach(serializeHomeworkEditorState(editablePages), HOMEWORK_EDITOR_ATTACHMENT, {
            mimeType: "application/json",
            description: "MHM Academy editable homework pages and annotations",
        });
    }
    const bytes = await document.save();
    return new Blob([new Uint8Array(bytes).buffer], { type: "application/pdf" });
}
