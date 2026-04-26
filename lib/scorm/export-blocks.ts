/**
 * Static HTML renderers for interactive blocks in a SCORM 1.2 export.
 *
 * The learner-facing app renders interactive blocks (hotspot, carousel,
 * scenario, etc.) as React components. They can't be shipped as React in a
 * SCORM package — the runtime would balloon and React state would have to
 * round-trip through the SCORM 1.2 API. Instead, each block degrades to
 * vanilla HTML/CSS with a tiny shared JS file (`shared/scorm-blocks.js`)
 * driving the click handlers via data attributes.
 *
 *   image-hotspot   → image + clickable dots + collapsible list
 *   card-reveal     → click-to-flip cards
 *   carousel        → prev / next slider with one slide visible at a time
 *   video           → iframe embed (YouTube/Vimeo) or <video> tag
 *   knowledge-check → inline quiz with reveal-answer button
 *   scenario        → branching choices via show/hide on data-target
 *   drag-drop       → degraded to a labelled list with an answer key
 *
 * This file owns:
 *   1. `extractInteractiveBlockUrls`      — every absolute http(s) URL the
 *      block references, so the builder can download and bundle them.
 *   2. `renderInteractiveBlockHtml`       — produces the static HTML for one
 *      block, given a Map<absoluteUrl, relativeAssetPath>.
 *   3. `getInteractiveBlocksJs`           — the runtime JS that all blocks
 *      share. Embedded once at `shared/scorm-blocks.js`.
 *   4. `getInteractiveBlocksCss`          — paired styles, embedded once.
 */

import type {
  CarouselData,
  DragDropData,
  HotspotData,
  InteractiveBlock,
  KnowledgeCheckData,
  ScenarioData,
  VideoData,
} from '@/types/interactive'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function rewriteUrl(url: string | undefined, urlToPath: Map<string, string>): string {
  if (!url) return ''
  const mapped = urlToPath.get(url)
  return mapped ?? url
}

/**
 * Walk a single block's data and yield every absolute http(s) URL it
 * references (images, videos, etc). The builder unions these into the asset
 * download set so the bundle has every media file the block needs.
 */
export function extractInteractiveBlockUrls(block: InteractiveBlock): string[] {
  const urls: string[] = []
  const push = (u: string | undefined) => {
    if (typeof u === 'string' && /^https?:\/\//i.test(u.trim())) urls.push(u.trim())
  }

  switch (block.type) {
    case 'hotspot':
      push((block.data as HotspotData).imageUrl)
      break
    case 'carousel':
      for (const slide of (block.data as CarouselData).slides) push(slide.imageUrl)
      break
    case 'video':
      push((block.data as VideoData).url)
      break
    case 'scenario':
      for (const node of (block.data as ScenarioData).nodes) push(node.imageUrl)
      break
    case 'drag-drop':
      for (const item of (block.data as DragDropData).items) push(item.imageUrl)
      break
    case 'knowledge-check':
      // No images; just text questions.
      break
  }
  return urls
}

function videoEmbed(rawUrl: string): string {
  const url = rawUrl.trim()
  let embedSrc: string | null = null
  const yt =
    url.match(/youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/) ??
    url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/) ??
    url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/)
  if (yt) embedSrc = `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (!embedSrc && vimeo) embedSrc = `https://player.vimeo.com/video/${vimeo[1]}`
  if (embedSrc) {
    return `<iframe class="ib-video-frame" src="${escapeHtml(embedSrc)}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`
  }
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) {
    return `<video class="ib-video-frame" controls src="${escapeHtml(url)}"></video>`
  }
  return `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener">Watch the video</a></p>`
}

function renderHotspot(block: InteractiveBlock, map: Map<string, string>): string {
  const { variant, imageUrl, hotspots = [], cards = [] } = block.data as HotspotData

  const head = `<header class="ib-head">
    ${block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ''}
    ${block.instructions ? `<p class="ib-instructions">${escapeHtml(block.instructions)}</p>` : ''}
  </header>`

  if (variant === 'card-reveal') {
    const cardsHtml = cards
      .map(
        (c) => `<button type="button" class="ib-card" data-flip aria-pressed="false">
          <span class="ib-card-front">${escapeHtml(c.frontLabel)}</span>
          <span class="ib-card-back" hidden>${escapeHtml(c.backContent)}</span>
        </button>`,
      )
      .join('')
    return `<section class="ib ib-card-reveal">${head}<div class="ib-cards-grid">${cardsHtml}</div></section>`
  }

  // image-hotspot
  const imgSrc = rewriteUrl(imageUrl, map)
  const dotsHtml = hotspots
    .map(
      (h, i) => `<button
        type="button"
        class="ib-hotspot-dot"
        style="left:${h.x}%;top:${h.y}%;width:${Math.max(24, h.radius * 2)}px;height:${Math.max(24, h.radius * 2)}px"
        data-hotspot-target="${escapeHtml(h.id)}"
        aria-label="${escapeHtml(h.title || `Hotspot ${i + 1}`)}"
      >${i + 1}</button>`,
    )
    .join('')
  const listHtml = hotspots
    .map(
      (h, i) => `<li id="hs-${escapeHtml(h.id)}">
        <strong>${escapeHtml(h.title || `Point ${i + 1}`)}</strong>
        <p>${escapeHtml(h.content)}</p>
      </li>`,
    )
    .join('')
  const imgHtml = imgSrc
    ? `<div class="ib-hotspot-frame"><img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(block.title)}"/>${dotsHtml}</div>`
    : ''
  return `<section class="ib ib-hotspot" data-hotspot-block>
    ${head}
    ${imgHtml}
    ${hotspots.length > 0 ? `<details class="ib-hotspot-list" open><summary>Show all points</summary><ol>${listHtml}</ol></details>` : ''}
  </section>`
}

function renderCarousel(block: InteractiveBlock, map: Map<string, string>): string {
  const slides = (block.data as CarouselData).slides
  if (slides.length === 0) return ''
  const slidesHtml = slides
    .map(
      (s, i) => `<article class="ib-slide${i === 0 ? ' ib-slide-current' : ''}" data-slide-index="${i}">
        ${s.imageUrl ? `<img src="${escapeHtml(rewriteUrl(s.imageUrl, map))}" alt="${escapeHtml(s.title)}"/>` : ''}
        ${s.title ? `<h4>${escapeHtml(s.title)}</h4>` : ''}
        ${s.body ? `<div class="ib-slide-body">${escapeHtml(s.body)}</div>` : ''}
      </article>`,
    )
    .join('')
  const head = `<header class="ib-head">
    ${block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ''}
    ${block.instructions ? `<p class="ib-instructions">${escapeHtml(block.instructions)}</p>` : ''}
  </header>`
  return `<section class="ib ib-carousel" data-carousel data-total="${slides.length}">
    ${head}
    <div class="ib-carousel-frame">${slidesHtml}</div>
    <nav class="ib-carousel-nav">
      <button type="button" class="ib-carousel-prev" aria-label="Previous slide">‹ Previous</button>
      <span class="ib-carousel-pager" aria-live="polite">1 / ${slides.length}</span>
      <button type="button" class="ib-carousel-next" aria-label="Next slide">Next ›</button>
    </nav>
  </section>`
}

function renderVideo(block: InteractiveBlock): string {
  const data = block.data as VideoData
  const head = `<header class="ib-head">
    ${block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ''}
    ${block.instructions ? `<p class="ib-instructions">${escapeHtml(block.instructions)}</p>` : ''}
  </header>`
  const captionHtml = data.caption
    ? `<p class="ib-video-caption">${escapeHtml(data.caption)}</p>`
    : ''
  return `<section class="ib ib-video">${head}${videoEmbed(data.url)}${captionHtml}</section>`
}

function renderKnowledgeCheck(block: InteractiveBlock): string {
  const questionsHtml = (block.data as KnowledgeCheckData).questions
    .map(
      (q, qi) => `<fieldset class="ib-kc-question" data-kc-question>
        <legend>${qi + 1}. ${escapeHtml(q.question)}</legend>
        ${q.options
          .map(
            (opt) => `<label class="ib-kc-option">
              <input type="radio" name="ib-kc-${escapeHtml(block.id)}-${qi}" value="${escapeHtml(opt)}" data-correct="${escapeHtml(q.correctAnswer)}"/>
              <span>${escapeHtml(opt)}</span>
            </label>`,
          )
          .join('')}
        <p class="ib-kc-feedback" hidden>${escapeHtml(q.feedback)}</p>
      </fieldset>`,
    )
    .join('')
  const head = `<header class="ib-head">
    ${block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ''}
    ${block.instructions ? `<p class="ib-instructions">${escapeHtml(block.instructions)}</p>` : ''}
  </header>`
  return `<section class="ib ib-kc" data-kc-block>${head}<form>${questionsHtml}</form><button type="button" data-kc-check class="ib-kc-check">Check answers</button></section>`
}

function renderScenario(block: InteractiveBlock, map: Map<string, string>): string {
  const data = block.data as ScenarioData
  const nodesHtml = data.nodes
    .map((n) => {
      const isStart = n.id === data.startNodeId
      const choicesHtml = (n.choices ?? [])
        .map(
          (c) => `<button type="button" class="ib-scenario-choice" data-scenario-target="${escapeHtml(c.nextNodeId)}">${escapeHtml(c.label)}</button>`,
        )
        .join('')
      const endingClass = n.isEnding
        ? ` ib-scenario-ending ib-scenario-ending-${escapeHtml(n.endingType ?? 'neutral')}`
        : ''
      return `<article class="ib-scenario-node${endingClass}" id="sc-${escapeHtml(block.id)}-${escapeHtml(n.id)}" data-scenario-node="${escapeHtml(n.id)}"${isStart ? '' : ' hidden'}>
        ${n.imageUrl ? `<img src="${escapeHtml(rewriteUrl(n.imageUrl, map))}" alt=""/>` : ''}
        <p>${escapeHtml(n.text)}</p>
        ${n.feedback ? `<p class="ib-scenario-feedback">${escapeHtml(n.feedback)}</p>` : ''}
        ${choicesHtml ? `<div class="ib-scenario-choices">${choicesHtml}</div>` : ''}
        ${n.isEnding ? `<button type="button" class="ib-scenario-restart" data-scenario-restart>Start over</button>` : ''}
      </article>`
    })
    .join('')
  const head = `<header class="ib-head">
    ${block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ''}
    ${block.instructions ? `<p class="ib-instructions">${escapeHtml(block.instructions)}</p>` : ''}
  </header>`
  return `<section class="ib ib-scenario" data-scenario data-start="${escapeHtml(data.startNodeId)}">${head}${nodesHtml}</section>`
}

function renderDragDrop(block: InteractiveBlock, map: Map<string, string>): string {
  // Drag-and-drop in a SCORM iframe across desktop + mobile is fragile.
  // Degrade to a labelled list with the correct answer key in a <details> so
  // learners still get the educational content, just without the interaction.
  const data = block.data as DragDropData
  const itemsHtml = data.items
    .map(
      (i) => `<li class="ib-dnd-item">
        ${i.imageUrl ? `<img src="${escapeHtml(rewriteUrl(i.imageUrl, map))}" alt=""/>` : ''}
        <span>${escapeHtml(i.label)}</span>
      </li>`,
    )
    .join('')
  let answerKey = ''
  if (data.variant === 'order' && data.correctOrder) {
    const itemMap = new Map(data.items.map((i) => [i.id, i.label]))
    const ordered = data.correctOrder
      .map((id) => itemMap.get(id) ?? id)
      .map((label) => `<li>${escapeHtml(label)}</li>`)
      .join('')
    answerKey = `<details class="ib-dnd-key"><summary>Show correct order</summary><ol>${ordered}</ol></details>`
  } else if (data.variant === 'match' && data.correctMatches) {
    const itemMap = new Map(data.items.map((i) => [i.id, i.label]))
    const catMap = new Map((data.categories ?? []).map((c) => [c.id, c.label]))
    const pairs = Object.entries(data.correctMatches)
      .map(
        ([itemId, catId]) =>
          `<li>${escapeHtml(itemMap.get(itemId) ?? itemId)} → ${escapeHtml(catMap.get(catId) ?? catId)}</li>`,
      )
      .join('')
    answerKey = `<details class="ib-dnd-key"><summary>Show correct matches</summary><ul>${pairs}</ul></details>`
  }
  const head = `<header class="ib-head">
    ${block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ''}
    ${block.instructions ? `<p class="ib-instructions">${escapeHtml(block.instructions)}</p>` : ''}
  </header>`
  return `<section class="ib ib-dnd">${head}<ul class="ib-dnd-list">${itemsHtml}</ul>${answerKey}</section>`
}

export function renderInteractiveBlockHtml(
  block: InteractiveBlock,
  urlToPath: Map<string, string>,
): string {
  switch (block.type) {
    case 'hotspot':
      return renderHotspot(block, urlToPath)
    case 'carousel':
      return renderCarousel(block, urlToPath)
    case 'video':
      return renderVideo(block)
    case 'knowledge-check':
      return renderKnowledgeCheck(block)
    case 'scenario':
      return renderScenario(block, urlToPath)
    case 'drag-drop':
      return renderDragDrop(block, urlToPath)
    default:
      return ''
  }
}

export function getInteractiveBlocksCss(): string {
  return `.ib { border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 24px 0; background: #fff; }
.ib-head { margin: 0 0 12px; }
.ib-head h3 { margin: 0 0 4px; font-size: 18px; }
.ib-instructions { margin: 0; color: #475569; font-size: 14px; }

.ib-hotspot-frame { position: relative; display: inline-block; max-width: 100%; }
.ib-hotspot-frame img { display: block; max-width: 100%; height: auto; border-radius: 12px; }
.ib-hotspot-dot {
  position: absolute; transform: translate(-50%, -50%); border: 0; border-radius: 9999px;
  background: rgba(109, 40, 217, 0.85); color: #fff; font-weight: 700; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}
.ib-hotspot-dot:hover, .ib-hotspot-dot:focus { background: #6d28d9; outline: 2px solid #fff; }
.ib-hotspot-list { margin-top: 16px; font-size: 14px; }
.ib-hotspot-list li.is-active strong { color: #6d28d9; }

.ib-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.ib-card {
  border: 2px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #f8fafc; cursor: pointer;
  text-align: center; min-height: 100px;
}
.ib-card[aria-pressed="true"] { background: #ede9fe; border-color: #a78bfa; }
.ib-card-front { font-weight: 700; }
.ib-card-back { display: block; margin-top: 8px; color: #475569; font-size: 14px; }

.ib-carousel-frame { position: relative; min-height: 100px; }
.ib-slide { display: none; }
.ib-slide.ib-slide-current { display: block; }
.ib-slide img { max-width: 100%; height: auto; border-radius: 12px; }
.ib-slide h4 { margin: 12px 0 4px; }
.ib-slide-body { color: #334155; }
.ib-carousel-nav { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; gap: 8px; }
.ib-carousel-nav button {
  background: #6d28d9; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; font-weight: 700; cursor: pointer;
}
.ib-carousel-nav button:disabled { opacity: 0.4; cursor: not-allowed; }
.ib-carousel-pager { font-weight: 700; color: #475569; }

.ib-video-frame { aspect-ratio: 16/9; width: 100%; border: 0; border-radius: 12px; background: #000; }
.ib-video-caption { color: #475569; font-size: 14px; margin: 8px 0 0; }

.ib-kc-question { border: 0; padding: 0; margin: 12px 0; }
.ib-kc-question legend { font-weight: 700; margin-bottom: 8px; }
.ib-kc-option { display: block; padding: 6px 8px; border-radius: 6px; cursor: pointer; }
.ib-kc-option:hover { background: #f1f5f9; }
.ib-kc-option.is-correct { background: #dcfce7; color: #166534; }
.ib-kc-option.is-incorrect { background: #fee2e2; color: #991b1b; }
.ib-kc-feedback { margin-top: 8px; padding: 8px 12px; border-radius: 8px; background: #f1f5f9; font-style: italic; color: #475569; font-size: 14px; }
.ib-kc-check {
  background: #6d28d9; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; font-weight: 700; cursor: pointer;
}

.ib-scenario-node { padding: 12px; border-radius: 12px; background: #f8fafc; margin: 8px 0; }
.ib-scenario-node img { max-width: 100%; border-radius: 8px; }
.ib-scenario-choices { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.ib-scenario-choice {
  background: #6d28d9; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px; font-weight: 700; cursor: pointer;
  text-align: left;
}
.ib-scenario-feedback { color: #475569; font-style: italic; }
.ib-scenario-ending-positive { background: #dcfce7; }
.ib-scenario-ending-negative { background: #fee2e2; }
.ib-scenario-ending-neutral { background: #fef3c7; }
.ib-scenario-restart {
  margin-top: 12px;
  background: transparent; color: #6d28d9; border: 1px solid #c4b5fd; border-radius: 8px; padding: 6px 12px; cursor: pointer;
}

.ib-dnd-list { padding-left: 20px; }
.ib-dnd-item { margin: 6px 0; }
.ib-dnd-item img { vertical-align: middle; max-width: 60px; height: auto; margin-right: 8px; }
.ib-dnd-key { margin-top: 12px; font-size: 14px; }

@media (prefers-color-scheme: dark) {
  .ib { background: #0f172a; border-color: #334155; }
  .ib-instructions, .ib-slide-body, .ib-scenario-feedback, .ib-kc-feedback, .ib-video-caption { color: #cbd5e1; }
  .ib-card { background: #1e293b; border-color: #334155; color: #e2e8f0; }
  .ib-card[aria-pressed="true"] { background: #4c1d95; border-color: #c4b5fd; }
  .ib-card-back { color: #cbd5e1; }
  .ib-scenario-node { background: #1e293b; }
  .ib-kc-option:hover { background: #1e293b; }
  .ib-kc-feedback { background: #1e293b; }
  .ib-scenario-ending-positive { background: #14532d; }
  .ib-scenario-ending-negative { background: #7f1d1d; }
  .ib-scenario-ending-neutral { background: #78350f; }
}
`
}

export function getInteractiveBlocksJs(): string {
  return `(function(){
    function on(root, selector, evt, handler){
      root.addEventListener(evt, function(e){
        var t = e.target;
        while (t && t !== root){
          if (t.matches && t.matches(selector)){ handler.call(t, e); return; }
          t = t.parentNode;
        }
      });
    }

    // Carousel — show one slide at a time, prev/next buttons.
    document.querySelectorAll('[data-carousel]').forEach(function(root){
      var slides = root.querySelectorAll('.ib-slide');
      var pager = root.querySelector('.ib-carousel-pager');
      var prev = root.querySelector('.ib-carousel-prev');
      var next = root.querySelector('.ib-carousel-next');
      var idx = 0;
      function show(i){
        idx = Math.max(0, Math.min(slides.length - 1, i));
        slides.forEach(function(s, j){ s.classList.toggle('ib-slide-current', j === idx); });
        if (pager) pager.textContent = (idx + 1) + ' / ' + slides.length;
        if (prev) prev.disabled = idx === 0;
        if (next) next.disabled = idx === slides.length - 1;
      }
      if (prev) prev.addEventListener('click', function(){ show(idx - 1); });
      if (next) next.addEventListener('click', function(){ show(idx + 1); });
      show(0);
    });

    // Card reveal — flip on click.
    document.querySelectorAll('.ib-card[data-flip]').forEach(function(card){
      card.addEventListener('click', function(){
        var pressed = card.getAttribute('aria-pressed') === 'true';
        card.setAttribute('aria-pressed', pressed ? 'false' : 'true');
        var back = card.querySelector('.ib-card-back');
        if (back){ back.hidden = pressed; }
      });
    });

    // Image hotspot — clicking a dot scrolls to and highlights its list item.
    document.querySelectorAll('[data-hotspot-block]').forEach(function(root){
      root.querySelectorAll('.ib-hotspot-dot').forEach(function(dot){
        dot.addEventListener('click', function(){
          var id = dot.getAttribute('data-hotspot-target');
          if (!id) return;
          var li = root.querySelector('#hs-' + id);
          if (!li) return;
          root.querySelectorAll('.ib-hotspot-list li').forEach(function(x){ x.classList.remove('is-active'); });
          li.classList.add('is-active');
          li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      });
    });

    // Knowledge check — instant per-option feedback on click.
    document.querySelectorAll('[data-kc-block]').forEach(function(root){
      on(root, '[data-kc-check]', 'click', function(){
        root.querySelectorAll('[data-kc-question]').forEach(function(fs){
          var checked = fs.querySelector('input[type=radio]:checked');
          var fb = fs.querySelector('.ib-kc-feedback');
          fs.querySelectorAll('.ib-kc-option').forEach(function(l){
            l.classList.remove('is-correct', 'is-incorrect');
          });
          if (!checked) return;
          var correct = checked.getAttribute('data-correct');
          var isRight = checked.value === correct;
          var label = checked.closest('.ib-kc-option');
          if (label) label.classList.add(isRight ? 'is-correct' : 'is-incorrect');
          if (fb) fb.hidden = false;
        });
      });
    });

    // Scenario — branching choice tree.
    document.querySelectorAll('[data-scenario]').forEach(function(root){
      function show(id){
        root.querySelectorAll('[data-scenario-node]').forEach(function(n){
          n.hidden = n.getAttribute('data-scenario-node') !== id;
        });
      }
      on(root, '.ib-scenario-choice', 'click', function(){
        var target = this.getAttribute('data-scenario-target');
        if (target) show(target);
      });
      on(root, '[data-scenario-restart]', 'click', function(){
        show(root.getAttribute('data-start') || '');
      });
    });
  })();`
}
