const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

// Execute the actual TypeScript modules, with external services replaced per test.
function load(file, mocks = {}) {
    const filename = path.resolve(file);
    const module = { exports: {} };
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
    }).outputText;
    const localRequire = name => {
        if (name in mocks) return mocks[name];
        if (name.startsWith('.') || name.startsWith('@/')) {
            const target = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(filename), name);
            return load(target + '.ts', mocks);
        }
        return require(name);
    };
    vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, console, ...mocks.globals }, { filename });
    return module.exports;
}

const scoring = load('lib/quiz-scoring.ts');
const questions = [
    { id: 'mc', type: 'MULTIPLE_CHOICE', options: '["A","B"]', correctAnswer: 'B', points: 3 },
    { id: 'tf', type: 'TRUE_FALSE', options: null, correctAnswer: ' true ', points: 2 },
    { id: 'written', type: 'SHORT_ANSWER', options: null, correctAnswer: 'essay', points: 5 }
];
test('correct objective answers earn weighted points; written answers stay pending', () => {
    const result = scoring.scoreQuiz(questions, [{ questionId: 'mc', answer: ' B ' }, { questionId: 'tf', answer: 'TRUE' }, { questionId: 'written', answer: 'essay' }]);
    assert.equal(result.score, 5);
    assert.equal(result.totalPoints, 10);
    assert.equal(result.percentage, 50);
    assert.equal(result.quizAnswers[2].isGraded, false);
    assert.equal(scoring.scoreQuiz(questions.slice(0, 2), [{ questionId: 'mc', answer: 'B' }, { questionId: 'tf', answer: 'true' }]).percentage, 100);
});
test('wrong and missing answers earn zero, including empty answer keys', () => {
    assert.equal(scoring.scoreQuiz(questions, []).score, 0);
    assert.equal(scoring.scoreQuiz(questions, [{ questionId: 'mc', answer: 'A' }, { questionId: 'tf', answer: 'false' }]).score, 0);
    assert.equal(scoring.scoreQuiz([{ ...questions[0], options: '[""]', correctAnswer: '' }], []).score, 0);
});
test('reject malformed and duplicate submitted answers', () => {
    for (const value of [null, {}, [null], [{ questionId: 'mc', answer: 0 }], [{ questionId: 'mc', answer: 'B' }, { questionId: 'mc', answer: 'A' }]]) assert.equal(scoring.validQuizAnswers(value), false);
    assert.equal(scoring.validQuizAnswers([{ questionId: 'mc', answer: 'B' }]), true);
});

function quizPage(timer = null, failSubmit = false) {
    const slots = [];
    let cursor = 0, pending = [], tree, now = 0;
    const timeouts = new Map();
    const submissions = [], pushes = [];
    const quiz = { id: 'q', title: 'Quiz', timer, questions: [questions[0]], maxAttempts: 1 };
    const react = {
        use: value => value,
        useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
        useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
        useEffect: (effect, deps) => { const i = cursor++; const old = slots[i]; if (!old || !deps || deps.some((value, n) => !Object.is(value, old.deps?.[n]))) { pending.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: effect() }; }); } }
    };
    const ui = new Proxy({}, { get: (_, key) => String(key) });
    const mocks = {
        react,
        'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
        'next/navigation': { useRouter: () => ({ push: url => pushes.push(url) }) },
        '@/lib/contexts/language-context': { useLanguage: () => ({ t: value => value }) },
        sonner: { toast: { success() {}, error() {} } },
        'lucide-react': ui,
        globals: {
            Date: { now: () => now },
            setTimeout: callback => { const id = Symbol(); timeouts.set(id, callback); return id; },
            clearTimeout: id => timeouts.delete(id),
            fetch: async (url, options) => {
                if (url.endsWith('/submit')) { submissions.push(JSON.parse(options.body)); return { ok: !failSubmit, text: async () => 'Failed' }; }
                return { ok: true, json: async () => url.endsWith('/navigation') ? {} : quiz };
            }
        }
    };
    for (const name of ['button', 'card', 'radio-group', 'label', 'input', 'textarea', 'badge']) mocks['@/components/ui/' + name] = ui;
    const Page = load('app/(course)/courses/[courseId]/quizzes/[quizId]/page.tsx', mocks).default;
    const render = () => { cursor = 0; tree = Page({ params: { courseId: 'c', quizId: 'q' } }); const effects = pending; pending = []; effects.forEach(effect => effect()); };
    const flush = async () => { await new Promise(resolve => setImmediate(resolve)); render(); };
    const find = (type, predicate = () => true) => {
        function walk(node) { if (!node || typeof node !== 'object') return; if (node.type === type && predicate(node)) return node; for (const child of [node.props?.children].flat(Infinity)) { const found = walk(child); if (found) return found; } }
        return walk(tree);
    };
    render();
    return { flush, find, submissions, pushes, tick: () => { now += 1000; const callbacks = [...timeouts.values()]; timeouts.clear(); callbacks.forEach(callback => callback()); render(); } };
}

test('first attempt submits the latest selection and ignores double clicks', async () => {
    const page = quizPage(); await page.flush();
    page.find('RadioGroup').props.onValueChange('B');
    const finish = page.find('Button', node => node.props.children === 'إنهاء الاختبار');
    finish.props.onClick(); finish.props.onClick(); await page.flush();
    assert.equal(page.submissions.length, 1);
    assert.equal(page.submissions[0].answers[0].answer, 'B');
    assert.equal(page.pushes.length, 1);
});
test('timeout submits the latest answer exactly once', async () => {
    const timed = quizPage(1 / 60); await timed.flush();
    timed.find('RadioGroup').props.onValueChange('B');
    timed.tick(); await timed.flush(); timed.tick(); await timed.flush();
    assert.equal(timed.submissions.length, 1);
    assert.equal(timed.submissions[0].answers[0].answer, 'B');
    assert.equal(timed.pushes.length, 1);
});
test('untimed quizzes never auto-submit', async () => {
    const page = quizPage(); await page.flush();
    for (let i = 0; i < 1801; i++) page.tick();
    assert.equal(page.submissions.length, 0);
});
test('failed timeout submission does not loop and leaves retry available', async () => {
    const page = quizPage(1 / 60, true); await page.flush();
    page.tick(); await page.flush(); page.tick(); await page.flush();
    assert.equal(page.submissions.length, 1);
    assert.equal(page.find('RadioGroup').props.disabled, false);
});

function submissionApi() {
    const results = [];
    let previous = Promise.resolve();
    const quiz = { questions: questions.slice(0, 2), maxAttempts: 1 };
    const db = {
        course: { findUnique: async () => ({ isFree: true, purchases: [] }) },
        $transaction: async callback => {
            const wait = previous;
            let release;
            previous = new Promise(resolve => { release = resolve; });
            let locked = false;
            const tx = {
                $queryRaw: async () => { await wait; locked = true; return []; },
                quiz: { findFirst: async () => { assert.equal(locked, true); return quiz; } },
                quizResult: {
                    findMany: async () => results,
                    create: async ({ data }) => {
                        const result = { ...data, id: 'result', answers: data.answers.create.map(answer => ({ ...answer, question: quiz.questions.find(q => q.id === answer.questionId) })) };
                        results.push(result); return result;
                    }
                }
            };
            try { return await callback(tx); } finally { release(); }
        }
    };
    const api = load('app/api/courses/[courseId]/quizzes/[quizId]/submit/route.ts', {
        '@/lib/db': { db }, '@/lib/auth': { auth: async () => ({ user: { id: 'student' } }) },
        '@/lib/subscription-utils': { hasSubscriptionAccess: async () => true }
    });
    return { results, submit: answers => api.POST({ json: async () => ({ answers }) }, { params: Promise.resolve({ courseId: 'c', quizId: 'q' }) }) };
}
test('concurrent submissions cannot exceed maxAttempts; first result saves correct score', async () => {
    const api = submissionApi();
    const answers = [{ questionId: 'mc', answer: 'B' }, { questionId: 'tf', answer: 'true' }];
    const responses = await Promise.all([api.submit(answers), api.submit(answers)]);
    assert.deepEqual(responses.map(response => response.status).sort(), [200, 400]);
    assert.equal(api.results.length, 1);
    assert.equal(api.results[0].score, 5);
    assert.equal(api.results[0].percentage, 100);
    assert.equal(api.results[0].attemptNumber, 1);
});
test('invalid and stale question submissions do not consume attempts', async () => {
    const api = submissionApi();
    assert.equal((await api.submit(null)).status, 400);
    assert.equal((await api.submit([{ questionId: 'old-question', answer: 'B' }])).status, 409);
    assert.equal(api.results.length, 0);
});
test('all quiz editors protect historical answers before deleting questions', async () => {
    for (const file of ['app/api/admin/quizzes/[quizId]/route.ts', 'app/api/teacher/quizzes/[quizId]/route.ts', 'app/api/courses/[courseId]/quizzes/[quizId]/route.ts']) {
        let locked = false;
        const db = {
            course: { findUnique: async () => ({ id: 'c', userId: 'admin' }) },
            quiz: { findUnique: async () => ({ id: 'q', courseId: 'c', position: 1, questions: [], course: { userId: 'admin' } }) },
            $transaction: async callback => callback({
                $queryRaw: async () => { locked = true; },
                quizResult: { count: async () => { assert.equal(locked, true); return 1; } },
                question: { deleteMany: async () => assert.fail('Historical answers would be deleted') },
                quiz: { update: async () => assert.fail('Attempted quizzes must be preserved') }
            })
        };
        const api = load(file, { '@/lib/db': { db }, '@/lib/auth': { auth: async () => ({ user: { id: 'admin', role: 'ADMIN' } }) }, '@/lib/subscription-utils': {} });
        const response = await api.PATCH({ json: async () => ({ title: 'Quiz', courseId: 'c', questions: [{ text: 'Q', type: 'TRUE_FALSE', correctAnswer: 'true', points: 1 }] }) }, { params: Promise.resolve({ courseId: 'c', quizId: 'q' }) });
        assert.equal(response.status, 409, file);
    }
});

test('written grading serializes concurrent updates and recomputes the full total', async () => {
    const result = { id: 'r', totalPoints: 10, answers: ['a', 'b'].map(id => ({ id, pointsEarned: 0, question: { type: 'SHORT_ANSWER', points: 5 } })) };
    let previous = Promise.resolve();
    const db = {
        $transaction: async callback => {
            const wait = previous; let release;
            previous = new Promise(resolve => { release = resolve; });
            const tx = {
                $queryRaw: async () => { await wait; },
                quizResult: {
                    findFirst: async () => JSON.parse(JSON.stringify(result)),
                    update: async ({ data }) => Object.assign(result, data)
                },
                quizAnswer: { update: async ({ where, data }) => Object.assign(result.answers.find(a => a.id === where.id), data) }
            };
            try { return await callback(tx); } finally { release(); }
        }
    };
    const { gradeWrittenQuizAnswer } = load('lib/quiz-grading.ts', { '@/lib/db': { db } });
    await Promise.all(['a', 'b'].map(answerId => gradeWrittenQuizAnswer({ resultId: 'r', answerId, isCorrect: true, accessWhere: {} })));
    assert.equal(result.score, 10);
    assert.equal(result.percentage, 100);
});

test('student result shows awaiting grading instead of a final zero', () => {
    let cursor = 0;
    const states = [{ id: 'r', score: 0, totalPoints: 5, percentage: 0, answers: [{ questionId: 'w', studentAnswer: 'essay', correctAnswer: 'essay', isCorrect: false, isGraded: false, pointsEarned: 0, question: { type: 'SHORT_ANSWER', text: 'Write', points: 5 } }] }, null, false, false];
    const ui = new Proxy({}, { get: (_, name) => String(name) });
    const mocks = {
        react: { use: value => value, useState: () => [states[cursor++], () => {}], useEffect() {} },
        'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
        'next/navigation': { useRouter: () => ({}) }, 'lucide-react': ui
    };
    for (const name of ['button', 'card', 'badge', 'progress']) mocks['@/components/ui/' + name] = ui;
    const Page = load('app/(course)/courses/[courseId]/quizzes/[quizId]/result/page.tsx', mocks).default;
    const tree = JSON.stringify(Page({ params: { courseId: 'c', quizId: 'q' } }));
    assert.ok(tree.includes('بانتظار التصحيح'));
    assert.ok(!tree.includes('0.0%'));
    assert.ok(!tree.includes('"type":"Progress"'));
});
