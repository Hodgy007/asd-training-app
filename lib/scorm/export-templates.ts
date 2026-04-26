/**
 * Static HTML templates rendered into a SCORM 1.2 export package.
 *
 * Each lesson SCO gets its own self-contained HTML file that:
 *   - finds the LMS's SCORM 1.2 API in the parent/opener window,
 *   - calls `LMSInitialize` on load and `LMSFinish` on unload,
 *   - reports completion (TEXT/VIDEO lessons) or score (lessons with quizzes).
 *
 * No frameworks or runtime deps — vanilla JS, designed to run inside any
 * SCORM 1.2 conformant LMS (Moodle, SCORM Cloud, etc.).
 */

import { sanitizeHtml } from '@/lib/sanitize'
import { getInteractiveBlocksCss, getInteractiveBlocksJs } from './export-blocks'

export interface QuizQuestionForExport {
  id: string
  question: string
  options: string[]
  /** Index (string) or option text. We accept either; runtime compares to text. */
  correctAnswer: string
  explanation: string
}

export interface LessonAttachmentForExport {
  fileName: string
  /** Relative path inside the zip (e.g. assets/file-1.pdf). */
  relativePath: string
}

export interface LessonHtmlArgs {
  moduleTitle: string
  lessonTitle: string
  /**
   * HTML prose. Image src attributes already rewritten to relative paths.
   * Will be passed through `sanitizeHtml` before rendering.
   *
   * When `prerenderedBodyHtml` is set this field is ignored — that path is
   * used by the export builder, which has already merged sanitised prose
   * with rendered interactive blocks (whose data-* attributes the lesson
   * sanitiser would otherwise strip).
   */
  contentHtml: string
  /**
   * Pre-rendered, already-safe body HTML. When provided, replaces
   * `contentHtml` and is rendered verbatim (no sanitisation). The caller is
   * responsible for safety — used by the export builder so interactive-block
   * HTML survives the trip into the static page.
   */
  prerenderedBodyHtml?: string
  /** Optional video URL — embedded as iframe. Requires internet at runtime. */
  videoUrl?: string | null
  /** Optional video transcript text. */
  transcript?: string | null
  /** Attachments listed as a "Resources" section. */
  attachments: LessonAttachmentForExport[]
  /** If non-empty, lesson ends with a quiz; completion is gated on it. */
  quizQuestions: QuizQuestionForExport[]
  /** 0-100. Default 80. */
  passingScore?: number
  /** Note shown at the top if interactive blocks were stripped. */
  hadStrippedInteractiveBlocks?: boolean
}

const SCORM_API_JS = `(function(){
  function findAPI(win){
    var attempts = 0;
    while (win && win.API == null && win.parent != null && win.parent !== win && attempts < 500){
      attempts++;
      win = win.parent;
    }
    return win ? win.API : null;
  }
  function getAPI(){
    var api = null;
    try { if (window.parent != null && window.parent !== window) api = findAPI(window.parent); } catch(e){}
    if (api == null) { try { if (window.opener != null) api = findAPI(window.opener); } catch(e){} }
    return api;
  }
  var api = getAPI();
  var initialised = false;
  function init(){
    if (api && !initialised){
      initialised = api.LMSInitialize('') === 'true';
    }
    return initialised;
  }
  function setValue(name, value){
    if (api && initialised) return api.LMSSetValue(name, String(value));
    return 'false';
  }
  function commit(){
    if (api && initialised) return api.LMSCommit('');
    return 'false';
  }
  function finish(){
    if (api && initialised){
      api.LMSFinish('');
      initialised = false;
    }
  }
  function present(){ return api != null; }
  window.SCORM = { init: init, setValue: setValue, commit: commit, finish: finish, present: present };
  window.addEventListener('load', function(){ init(); });
  window.addEventListener('beforeunload', function(){ finish(); });
})();`

const SHARED_CSS = `:root { color-scheme: light dark; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 17px;
  line-height: 1.6;
  color: #1e293b;
  background: #f8fafc;
  padding: 32px 16px 64px;
}
.scorm-shell { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.scorm-shell h1 { font-size: 28px; margin: 0 0 8px; color: #0f172a; }
.scorm-shell .module-name { font-size: 14px; color: #64748b; margin-bottom: 24px; }
.scorm-shell h2 { font-size: 22px; margin-top: 32px; }
.scorm-shell h3 { font-size: 18px; margin-top: 24px; }
.scorm-shell p { margin: 12px 0; }
.scorm-shell img { max-width: 100%; height: auto; border-radius: 8px; }
.scorm-shell ul, .scorm-shell ol { padding-left: 24px; }
.scorm-shell a { color: #6d28d9; }
.scorm-notice {
  background: #fef3c7; border: 1px solid #fcd34d; padding: 12px 16px; border-radius: 12px; font-size: 14px; margin: 16px 0;
}
.scorm-video { aspect-ratio: 16/9; width: 100%; border: 0; border-radius: 12px; margin: 16px 0; background: #000; }
.scorm-resources { border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 24px; }
.scorm-resources li { margin: 6px 0; }
.scorm-quiz {
  border-top: 1px solid #e2e8f0; margin-top: 32px; padding-top: 24px;
}
.scorm-quiz .question { background: #f1f5f9; padding: 16px; border-radius: 12px; margin: 16px 0; }
.scorm-quiz .question p.q-text { font-weight: 600; margin: 0 0 12px; }
.scorm-quiz label { display: block; padding: 8px 12px; margin: 4px 0; border-radius: 8px; cursor: pointer; }
.scorm-quiz label:hover { background: #fff; }
.scorm-quiz input[type=radio] { margin-right: 8px; }
.scorm-quiz button.submit-quiz {
  background: #6d28d9; color: #fff; border: 0; border-radius: 12px; padding: 12px 20px; font-weight: 700; cursor: pointer; font-size: 16px;
}
.scorm-quiz button.submit-quiz:disabled { opacity: 0.5; cursor: not-allowed; }
.scorm-quiz .result { margin-top: 16px; padding: 16px; border-radius: 12px; }
.scorm-quiz .result.pass { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
.scorm-quiz .result.fail { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
.scorm-quiz .feedback.correct { color: #166534; font-weight: 600; }
.scorm-quiz .feedback.incorrect { color: #991b1b; font-weight: 600; }
.scorm-quiz .explanation { margin-top: 8px; color: #475569; font-style: italic; font-size: 14px; }
.scorm-mark-complete {
  margin-top: 24px;
  background: #6d28d9; color: #fff; border: 0; border-radius: 12px; padding: 12px 20px; font-weight: 700; cursor: pointer; font-size: 16px;
}
@media (prefers-color-scheme: dark) {
  body { background: #0f172a; color: #e2e8f0; }
  .scorm-shell { background: #1e293b; box-shadow: none; }
  .scorm-shell h1, .scorm-shell h2 { color: #f1f5f9; }
  .scorm-shell .module-name { color: #94a3b8; }
  .scorm-shell a { color: #c4b5fd; }
  .scorm-notice { background: #422006; border-color: #92400e; color: #fde68a; }
  .scorm-quiz .question { background: #0f172a; }
  .scorm-quiz label:hover { background: #1e293b; }
}
`

export function getSharedScormApiJs(): string {
  return SCORM_API_JS
}

export function getSharedCss(): string {
  return SHARED_CSS + '\n' + getInteractiveBlocksCss()
}

export function getSharedBlocksJs(): string {
  return getInteractiveBlocksJs()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function videoEmbedHtml(rawUrl: string): string {
  const url = rawUrl.trim()
  let embedSrc: string | null = null
  // YouTube
  const yt =
    url.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/) ??
    url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/) ??
    url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/)
  if (yt) embedSrc = `https://www.youtube.com/embed/${yt[1]}`
  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (!embedSrc && vimeo) embedSrc = `https://player.vimeo.com/video/${vimeo[1]}`
  if (embedSrc) {
    return `<iframe class="scorm-video" src="${escapeHtml(embedSrc)}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`
  }
  // Direct video file
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) {
    return `<video class="scorm-video" controls src="${escapeHtml(url)}"></video>`
  }
  // Fallback — link out
  return `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener">Watch the video</a> <span class="scorm-notice" style="display:inline-block;margin-left:8px">Requires internet access</span></p>`
}

export function renderLessonHtml(args: LessonHtmlArgs): string {
  const {
    moduleTitle,
    lessonTitle,
    contentHtml,
    videoUrl,
    transcript,
    attachments,
    quizQuestions,
    passingScore = 80,
    hadStrippedInteractiveBlocks = false,
  } = args

  const safeContent =
    args.prerenderedBodyHtml !== undefined
      ? args.prerenderedBodyHtml
      : sanitizeHtml(contentHtml ?? '')

  const interactiveNotice = hadStrippedInteractiveBlocks
    ? `<div class="scorm-notice">Some interactive activities from the original lesson are not included in this export and are only available in the asd-training platform.</div>`
    : ''

  const videoBlock = videoUrl ? videoEmbedHtml(videoUrl) : ''
  const transcriptBlock = transcript
    ? `<details><summary>Transcript</summary><div>${escapeHtml(transcript).replace(/\n/g, '<br/>')}</div></details>`
    : ''

  const attachmentsBlock = attachments.length
    ? `<section class="scorm-resources">
        <h2>Resources</h2>
        <ul>${attachments
          .map(
            (a) =>
              `<li><a href="${escapeHtml(a.relativePath)}" target="_blank" rel="noopener">${escapeHtml(a.fileName)}</a></li>`,
          )
          .join('')}</ul>
      </section>`
    : ''

  const hasQuiz = quizQuestions.length > 0

  // Quiz JSON for runtime — embedded as a data island so we can pass it to JS
  // without any string-escape hazards.
  const quizDataJson = JSON.stringify(
    quizQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    })),
  )

  const quizBlock = hasQuiz
    ? `<section class="scorm-quiz" id="scorm-quiz">
        <h2>Quiz</h2>
        <p>Answer the questions below to complete this lesson. Pass mark: ${passingScore}%.</p>
        <form id="quiz-form"></form>
        <button type="button" class="submit-quiz" id="quiz-submit" disabled>Submit answers</button>
        <div id="quiz-result" role="status" aria-live="polite"></div>
      </section>
      <script type="application/json" id="quiz-data">${quizDataJson.replace(/</g, '\\u003c')}</script>
      <script>${getQuizRunnerJs(passingScore)}</script>`
    : `<button type="button" class="scorm-mark-complete" id="mark-complete">Mark as complete</button>
      <script>${getMarkCompleteJs()}</script>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(lessonTitle)} — ${escapeHtml(moduleTitle)}</title>
  <link rel="stylesheet" href="../../shared/style.css" />
  <script src="../../shared/scorm-api.js"></script>
  <script defer src="../../shared/scorm-blocks.js"></script>
</head>
<body>
  <main class="scorm-shell">
    <p class="module-name">${escapeHtml(moduleTitle)}</p>
    <h1>${escapeHtml(lessonTitle)}</h1>
    ${interactiveNotice}
    ${videoBlock}
    <article>${safeContent}</article>
    ${transcriptBlock}
    ${attachmentsBlock}
    ${quizBlock}
  </main>
</body>
</html>
`
}

function getMarkCompleteJs(): string {
  return `(function(){
    var btn = document.getElementById('mark-complete');
    if (!btn) return;
    btn.addEventListener('click', function(){
      if (window.SCORM && window.SCORM.present()){
        window.SCORM.setValue('cmi.core.lesson_status', 'completed');
        window.SCORM.commit();
      }
      btn.disabled = true;
      btn.textContent = 'Completed ✓';
    });
  })();`
}

function getQuizRunnerJs(passingScore: number): string {
  // Inlined per-lesson because passingScore is per-lesson configurable.
  return `(function(){
    var dataEl = document.getElementById('quiz-data');
    if (!dataEl) return;
    var questions = JSON.parse(dataEl.textContent || '[]');
    var form = document.getElementById('quiz-form');
    var submit = document.getElementById('quiz-submit');
    var result = document.getElementById('quiz-result');
    if (!form || !submit || !result) return;

    function renderQuestions(){
      questions.forEach(function(q, qi){
        var fs = document.createElement('fieldset');
        fs.className = 'question';
        fs.innerHTML = '<p class="q-text">' + (qi+1) + '. ' + escapeHtml(q.question) + '</p>';
        q.options.forEach(function(opt, oi){
          var label = document.createElement('label');
          var radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = 'q-' + qi;
          radio.value = String(oi);
          radio.addEventListener('change', updateSubmitState);
          label.appendChild(radio);
          label.appendChild(document.createTextNode(' ' + opt));
          fs.appendChild(label);
        });
        form.appendChild(fs);
      });
    }

    function escapeHtml(s){
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function updateSubmitState(){
      submit.disabled = questions.some(function(q, qi){
        return !form.querySelector('input[name="q-' + qi + '"]:checked');
      });
    }

    function gradeAnswer(q, chosenIndex){
      // correctAnswer may be the option text or a stringified index.
      var ca = String(q.correctAnswer);
      if (/^\\d+$/.test(ca)){
        return chosenIndex === Number(ca);
      }
      var chosenText = q.options[chosenIndex];
      return String(chosenText).trim().toLowerCase() === ca.trim().toLowerCase();
    }

    submit.addEventListener('click', function(){
      var correct = 0;
      questions.forEach(function(q, qi){
        var checked = form.querySelector('input[name="q-' + qi + '"]:checked');
        var idx = checked ? Number(checked.value) : -1;
        var isRight = idx >= 0 && gradeAnswer(q, idx);
        if (isRight) correct++;
        // Disable inputs after submit
        var inputs = form.querySelectorAll('input[name="q-' + qi + '"]');
        for (var i=0;i<inputs.length;i++) inputs[i].disabled = true;
        // Append per-question feedback
        var fb = document.createElement('p');
        fb.className = 'feedback ' + (isRight ? 'correct' : 'incorrect');
        fb.textContent = isRight ? 'Correct' : 'Not quite';
        var fs = form.children[qi];
        if (fs) fs.appendChild(fb);
        if (q.explanation){
          var ex = document.createElement('p');
          ex.className = 'explanation';
          ex.textContent = q.explanation;
          if (fs) fs.appendChild(ex);
        }
      });

      var pct = Math.round((correct / questions.length) * 100);
      var passed = pct >= ${passingScore};
      result.className = 'result ' + (passed ? 'pass' : 'fail');
      result.textContent = 'You scored ' + pct + '% (' + correct + ' of ' + questions.length + ').' + (passed ? ' Lesson complete.' : ' You can review and retry.');

      if (window.SCORM && window.SCORM.present()){
        window.SCORM.setValue('cmi.core.score.raw', String(pct));
        window.SCORM.setValue('cmi.core.score.min', '0');
        window.SCORM.setValue('cmi.core.score.max', '100');
        window.SCORM.setValue('cmi.core.lesson_status', passed ? 'passed' : 'failed');
        window.SCORM.commit();
      }

      submit.disabled = true;
      submit.textContent = passed ? 'Submitted ✓' : 'Submitted';

      if (!passed){
        var retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'submit-quiz';
        retry.style.marginTop = '12px';
        retry.textContent = 'Try again';
        retry.addEventListener('click', function(){ window.location.reload(); });
        result.appendChild(document.createElement('br'));
        result.appendChild(retry);
      }
    });

    renderQuestions();
  })();`
}

/**
 * Top-level index.html shown if the LMS launches the package root rather than
 * a specific SCO. Lists every lesson with a link. Most LMSes navigate via the
 * manifest TOC instead, but this is a courtesy fallback.
 */
export function renderIndexHtml(
  moduleTitle: string,
  lessons: Array<{ title: string; href: string }>,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(moduleTitle)}</title>
  <link rel="stylesheet" href="shared/style.css" />
</head>
<body>
  <main class="scorm-shell">
    <h1>${escapeHtml(moduleTitle)}</h1>
    <p class="module-name">Use your LMS's table of contents to navigate, or pick a lesson below.</p>
    <ol>
      ${lessons.map((l) => `<li><a href="${escapeHtml(l.href)}">${escapeHtml(l.title)}</a></li>`).join('')}
    </ol>
  </main>
</body>
</html>
`
}

