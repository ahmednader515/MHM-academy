const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const sharp = require('sharp');
const { PDFDocument, PDFName } = require('pdf-lib');

function loadTs(file, mocks = {}) {
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const compiled = new Module(path.resolve(file), module);
    compiled.filename = path.resolve(file);
    compiled.require = name => mocks[name] ?? (name.startsWith('.')
        ? loadTs(path.resolve(path.dirname(file), `${name}.ts`)) : require(name));
    compiled._compile(code, compiled.filename);
    return compiled.exports;
}

const { createHomeworkPdf } = loadTs('lib/homework-pdf.ts');
const { HOMEWORK_EDITOR_ATTACHMENT, parseHomeworkEditorState, serializeHomeworkEditorState } = loadTs('lib/homework-editor-state.ts');

test('saved PDFs restore clean worksheets and editable marks through the same PDF.js loader as the editor', async () => {
    const jpeg = await sharp({ create: { width: 40, height: 60, channels: 3, background: 'white' } }).jpeg().toBuffer();
    const pages = [{ width: 40, height: 60, background: `data:image/jpeg;base64,${jpeg.toString('base64')}`, strokes: [
        { tool: 'pen', color: '#e11d48', size: 4, points: [{ x: 5, y: 5 }, { x: 20, y: 20 }] },
        { tool: 'text', color: '#e11d48', size: 4, fontSize: 24, text: 'إجابة', points: [{ x: 10, y: 30 }] },
    ] }];
    const blob = await createHomeworkPdf(pages, async () => jpeg, pages);
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
    const attachments = await pdf.getAttachments();
    const restored = parseHomeworkEditorState(attachments[HOMEWORK_EDITOR_ATTACHMENT].content, pdf.numPages);
    await pdf.destroy();
    assert.deepEqual(restored, pages);
    // Erasing/resaving keeps the original worksheet and independent stroke history.
    restored[0].strokes.push({ tool: 'eraser', color: '#e11d48', size: 8, points: [{ x: 5, y: 5 }, { x: 20, y: 20 }] });
    const savedAgain = await createHomeworkPdf(restored, async () => jpeg, restored);
    const reopened = await pdfjs.getDocument({ data: new Uint8Array(await savedAgain.arrayBuffer()) }).promise;
    const secondAttachments = await reopened.getAttachments();
    const secondState = parseHomeworkEditorState(secondAttachments[HOMEWORK_EDITOR_ATTACHMENT].content, reopened.numPages);
    await reopened.destroy();
    assert.equal(secondState[0].background, pages[0].background);
    assert.equal(secondState[0].strokes.at(-1).tool, 'eraser');
});

test('ignores malformed editor attachments, unsupported versions, remote backgrounds and page-count mismatches', () => {
    const page = { width: 40, height: 60, background: 'data:image/jpeg;base64,YQ==', strokes: [] };
    assert.equal(parseHomeworkEditorState(new TextEncoder().encode('invalid json'), 1), null);
    assert.equal(parseHomeworkEditorState(serializeHomeworkEditorState([page]), 2), null);
    assert.equal(parseHomeworkEditorState(serializeHomeworkEditorState([{ ...page, background: 'https://example.test/image.jpg' }]), 1), null);
    assert.equal(parseHomeworkEditorState(serializeHomeworkEditorState([{ ...page, strokes: [{ tool: 'unknown' }] }]), 1), null);
    const version = new TextEncoder().encode(JSON.stringify({ format: 'mhm-academy/homework', version: 2, pages: [page] }));
    assert.equal(parseHomeworkEditorState(version, 1), null);
});

test('exports one PDF with every edited page in order and preserves page sizes', async () => {
    const images = await Promise.all(['red', 'blue'].map(background =>
        sharp({ create: { width: 40, height: 60, channels: 3, background } }).jpeg().toBuffer()));
    const pages = [
        { width: 900, height: 1200, pdfWidth: 600, pdfHeight: 800, image: images[0] },
        { width: 1200, height: 600, image: images[1] },
    ];
    const rendered = [];
    const blob = await createHomeworkPdf(pages, async page => { rendered.push(page); return page.image; });
    assert.equal(blob.type, 'application/pdf');
    assert.deepEqual(rendered, pages);
    const bytes = await blob.arrayBuffer();
    assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), '%PDF-');
    const document = await PDFDocument.load(bytes);
    assert.equal(document.getPageCount(), 2);
    assert.deepEqual(document.getPages().map(page => page.getSize()), [
        { width: 600, height: 800 }, { width: 900, height: 450 },
    ]);
    // Check the actual image bytes in each page, not just that a PDF was produced.
    for (const [index, page] of document.getPages().entries()) {
        const resources = page.node.Resources().lookup(PDFName.of('XObject'));
        const image = document.context.lookup(resources.values()[0]);
        assert.deepEqual(Buffer.from(image.contents), images[index]);
    }
});

test('rejects incomplete or empty exports rather than silently dropping a page', async () => {
    await assert.rejects(() => createHomeworkPdf([], async () => ''), /empty document/);
    await assert.rejects(() => createHomeworkPdf([{ width: 0, height: 500 }], async () => ''), /dimensions/);
    await assert.rejects(() => createHomeworkPdf([{ width: 500, height: 500 }], async () => {
        throw new Error('Page could not render');
    }), /Page could not render/);
});

test('homework upload validation permits PDF and legacy photos but rejects other files and oversized PDFs', () => {
    const { validateUploadInput } = loadTs('lib/s3.ts');
    assert.doesNotThrow(() => validateUploadInput('homeworkImage', { name: 'homework.pdf', type: 'application/pdf', size: 1024 }));
    assert.doesNotThrow(() => validateUploadInput('homeworkImage', { name: 'photo.jpg', type: 'image/jpeg', size: 1024 }));
    assert.throws(() => validateUploadInput('homeworkImage', { name: 'page.html', type: 'text/html', size: 1024 }));
    assert.throws(() => validateUploadInput('homeworkImage', { name: 'huge.pdf', type: 'application/pdf', size: 51 * 1024 * 1024 }));
});

test('resubmitting an edited PDF replaces old page images while regular uploads still append', async () => {
    for (const replaceExisting of [true, false]) {
        let saved;
        const { POST } = loadTs('app/api/courses/[courseId]/chapters/[chapterId]/homework/route.ts', {
            '@/lib/auth': { auth: async () => ({ user: { id: 'student' } }) },
            '@/lib/subscription-utils': { hasSubscriptionAccess: async () => true },
            '@/lib/db': { db: {
                chapter: { findUnique: async () => ({ isFree: true, course: {} }) },
                homeworkSubmission: {
                    findFirst: async () => ({ id: 'homework', imageUrls: ['old-page-1.jpg', 'old-page-2.jpg'] }),
                    update: async ({ data }) => { saved = data; return data; },
                },
            } },
        });
        const response = await POST(new Request('https://academy.test/api/homework', {
            method: 'POST', body: JSON.stringify({ imageUrls: ['homework.pdf'], replaceExisting }),
        }), { params: Promise.resolve({ courseId: 'course', chapterId: 'chapter' }) });
        assert.equal(response.status, 200);
        assert.deepEqual(Array.from(saved.imageUrls), replaceExisting ? ['homework.pdf'] : ['old-page-1.jpg', 'old-page-2.jpg', 'homework.pdf']);
        assert.equal(saved.imageUrl, 'homework.pdf');
    }
});

test('editing a saved correction replaces only that file and rejects stale correction URLs', async () => {
    for (const replaceUrl of ['saved.pdf', 'missing.pdf']) {
        let saved;
        const { PATCH } = loadTs('app/api/teacher/homework/[chapterId]/route.ts', {
            '@/lib/auth': { auth: async () => ({ user: { id: 'teacher', role: 'TEACHER' } }) },
            '@/lib/db': { db: { homeworkSubmission: {
                findUnique: async () => ({ correctedImageUrls: ['saved.pdf', 'other.pdf'], chapter: { course: { userId: 'teacher' } } }),
                update: async ({ data }) => { saved = data; return data; },
            } } },
        });
        const response = await PATCH(new Request('https://academy.test/api/correction', {
            method: 'PATCH', body: JSON.stringify({ homeworkId: 'homework', correctedImageUrls: ['edited.pdf'], replaceUrl }),
        }), { params: Promise.resolve({ chapterId: 'chapter' }) });
        assert.equal(response.status, replaceUrl === 'saved.pdf' ? 200 : 400);
        if (saved) assert.deepEqual(saved.correctedImageUrls, ['edited.pdf', 'other.pdf']);
        else assert.equal(replaceUrl, 'missing.pdf');
    }
});
