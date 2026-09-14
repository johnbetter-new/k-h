"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchesInstructor = matchesInstructor;
exports.detectCourseDuplicate = detectCourseDuplicate;
const fastest_levenshtein_1 = require("fastest-levenshtein");
const text_normalizer_js_1 = require("./text-normalizer.js");
const TITLES = new Set(['دکتر', 'مهندس', 'استاد']);
const tokens = (s) => (0, text_normalizer_js_1.normalizePersianText)(s).split(' ').filter(x => x && !TITLES.has(x));
function matchesInstructor(a, b) { const x = tokens(a), y = tokens(b); if (!x.length || !y.length)
    return false; if (x.join(' ') === y.join(' '))
    return true; if (x.length > 1 && y.length > 1 && (x.every(t => y.includes(t)) || y.every(t => x.includes(t))))
    return true; const aa = x.join(' '), bb = y.join(' '), max = Math.max(aa.length, bb.length); return max > 0 && 1 - (0, fastest_levenshtein_1.distance)(aa, bb) / max >= .9; }
function detectCourseDuplicate(input, existing) { const title = (0, text_normalizer_js_1.normalizePersianText)(input.title), sem = (0, text_normalizer_js_1.normalizePersianText)(input.semester); for (const c of existing) {
    if (c.normalizedSemester !== sem)
        continue;
    const im = matchesInstructor(input.instructor, c.instructor);
    if (!im)
        continue;
    if (c.normalizedTitle === title)
        return { isDuplicate: true, confidence: 1, matchedCourse: c, reason: 'دقیقاً مطابق با عنوان، استاد و نیم‌سال موجود است.' };
    const max = Math.max(title.length, c.normalizedTitle.length);
    if (!max)
        continue;
    const sim = 1 - (0, fastest_levenshtein_1.distance)(title, c.normalizedTitle) / max;
    if (sim >= .85)
        return { isDuplicate: true, confidence: sim, matchedCourse: c, reason: `شباهت بالای عنوان (${Math.round(sim * 100)}%) با استاد و نیم‌سال یکسان.` };
} return { isDuplicate: false, confidence: 0 }; }
