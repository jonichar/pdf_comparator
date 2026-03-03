<template>
  <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">

    <!-- ── Zoom toolbar ──────────────────────────────────────── -->
    <div style="flex-shrink: 0; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 16px; background-color: var(--bg-secondary); border-bottom: 1px solid var(--border-color);">
      <button @click="zoomOut" :disabled="zoomLevel <= ZOOM_MIN"
        style="width:28px;height:28px;border-radius:7px;border:1px solid var(--border-color);background:var(--bg-card);color:var(--text-primary);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;"
        :style="zoomLevel <= ZOOM_MIN ? 'opacity:0.35;cursor:not-allowed;' : ''"
      >−</button>

      <input type="range" :min="ZOOM_MIN" :max="ZOOM_MAX" :step="ZOOM_STEP"
        v-model.number="zoomLevel" @change="onZoomChange"
        style="width:120px;accent-color:#4f8ef7;cursor:pointer;"
      />

      <button @click="zoomIn" :disabled="zoomLevel >= ZOOM_MAX"
        style="width:28px;height:28px;border-radius:7px;border:1px solid var(--border-color);background:var(--bg-card);color:var(--text-primary);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;"
        :style="zoomLevel >= ZOOM_MAX ? 'opacity:0.35;cursor:not-allowed;' : ''"
      >+</button>

      <span style="font-size:12px;font-weight:700;min-width:42px;text-align:center;color:var(--accent-blue);">
        {{ Math.round(zoomLevel * 100) }}%
      </span>

      <div style="display:flex;gap:4px;">
        <button v-for="p in ZOOM_PRESETS" :key="p" @click="setZoom(p)"
          style="padding:3px 9px;border-radius:6px;border:1px solid var(--border-color);font-size:11px;cursor:pointer;transition:all 0.12s;"
          :style="Math.abs(zoomLevel - p) < 0.01
            ? 'background:rgba(79,142,247,0.25);color:#4f8ef7;border-color:rgba(79,142,247,0.5);'
            : 'background:var(--bg-card);color:var(--text-muted);'"
        >{{ Math.round(p * 100) }}%</button>
      </div>

      <!-- Buscador de página -->
      <div style="display: flex; align-items: center; gap: 6px; margin-left: 12px; border-left: 1px solid var(--border-color); padding-left: 14px;">
        <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">Ir a:</span>
        <input 
          v-model="targetPage"
          @keyup.enter="jumpToPage"
          type="number" 
          placeholder="Ej: 128"
          style="width: 60px; padding: 4px 8px; border-radius: 6px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); font-size: 11px; outline: none; transition: all 0.2s;"
          onfocus="this.style.borderColor='var(--accent-blue)'"
          onblur="this.style.borderColor='var(--border-color)'"
        />
        <button @click="jumpToPage" style="padding: 4px 8px; border-radius: 6px; background: rgba(79,142,247,0.15); color: var(--accent-blue); border: 1px solid rgba(79,142,247,0.3); font-size: 11px; cursor: pointer;">
          Ir
        </button>
      </div>

      <!-- PDF Export: 2-step flow to keep user gesture fresh for Chrome security -->
      <template v-if="pageCount1 && pageCount2">
        <!-- Step 1: Generate -->
        <button v-if="!readyPdfBlob" @click="generateCombinedPdf" :disabled="exporting"
          style="margin-left:auto; padding: 4px 12px; border-radius: 6px; border: 1px solid #4ade80; background: rgba(34,197,94,0.15); color: #4ade80; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;"
          onmouseover="this.style.background='rgba(34,197,94,0.25)'" onmouseout="this.style.background='rgba(34,197,94,0.15)'">
          <span v-if="exporting">⏳ Generando PDF...</span>
          <span v-else>💾 Preparar PDF Combinado</span>
        </button>
        <!-- Step 2: Open in new tab (fresh user click) -->
        <button v-else @click="triggerPdfDownload"
          style="margin-left:auto; padding: 4px 12px; border-radius: 6px; border: 1px solid #3b82f6; background: rgba(59,130,246,0.2); color: #60a5fa; font-size: 11px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;"
          onmouseover="this.style.background='rgba(59,130,246,0.35)'" onmouseout="this.style.background='rgba(59,130,246,0.2)'">
          📄 Ver PDF (nueva pestaña)
        </button>
      </template>

      <span style="margin-left:12px;font-size:11px;color:#6b7280;display:flex;align-items:center;gap:4px;">
        🔗 Scroll sincronizado
      </span>
    </div>

    <!-- ── Panels ──────────────────────────────────────────────── -->
    <div style="display:flex;flex:1;min-height:0;overflow:hidden;">

      <!-- Left -->
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;border-right:1px solid var(--border-color);">
        <!-- Header -->
        <div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:9px 16px;background:var(--bg-secondary);border-bottom:1px solid var(--border-color);">
          <div style="display:flex;align-items:center;gap:8px;min-width:0;">
            <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:#ef4444;"></div>
            <span style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ label1 }}</span>
            <span v-if="pageCount1" style="font-size:11px;color:var(--text-muted);white-space:nowrap;">· {{ pageCount1 }} pág.</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div v-if="highlightedPages1.length" style="flex-shrink:0;font-size:11px;padding:2px 8px;border-radius:6px;background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);margin-left:8px;">
              {{ highlightedPages1.length }} pág. con cambios
            </div>
          </div>
        </div>

        <!-- Scroll area -->
        <div ref="leftContainer" @scroll="onLeftScroll"
          class="pdf-scroll-area"
        >
          <div v-if="!file1" class="pdf-empty-state">
            <span style="font-size:40px;">📄</span>
            <span>Carga el PDF original</span>
          </div>

          <!-- Pages: wrapper is full-width so canvas centering works inside it -->
          <div v-for="p in pages1" :key="p.num" class="pdf-page-wrapper">
            <div class="pdf-page-label">PÁGINA {{ p.num }}</div>
            <div v-if="highlightedPages1.includes(p.num)" class="pdf-change-badge pdf-change-badge--red">✏️ Cambios</div>
            <canvas
              :data-pageid="`left-${p.num}`"
              class="pdf-canvas"
            ></canvas>
          </div>

          <div v-if="loading1" class="pdf-loading">
            <a-spin />
            <span>Renderizando...</span>
          </div>
        </div>
      </div>

      <!-- Right -->
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden;">
        <!-- Header -->
        <div style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:9px 16px;background:var(--bg-secondary);border-bottom:1px solid var(--border-color);">
          <div style="display:flex;align-items:center;gap:8px;min-width:0;">
            <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:#22c55e;"></div>
            <span style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ label2 }}</span>
            <span v-if="pageCount2" style="font-size:11px;color:var(--text-muted);white-space:nowrap;">· {{ pageCount2 }} pág.</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div v-if="highlightedPages2.length" style="flex-shrink:0;font-size:11px;padding:2px 8px;border-radius:6px;background:rgba(34,197,94,0.15);color:#4ade80;border:1px solid rgba(34,197,94,0.3);margin-left:8px;">
              {{ highlightedPages2.length }} pág. con cambios
            </div>
          </div>
        </div>

        <!-- Scroll area -->
        <div ref="rightContainer" @scroll="onRightScroll"
          class="pdf-scroll-area"
        >
          <div v-if="!file2" class="pdf-empty-state">
            <span style="font-size:40px;">📄</span>
            <span>Carga el PDF modificado</span>
          </div>

          <div v-for="p in pages2" :key="p.num" class="pdf-page-wrapper">
            <div class="pdf-page-label">PÁGINA {{ p.num }}</div>
            <div v-if="highlightedPages2.includes(p.num)" class="pdf-change-badge pdf-change-badge--green">✏️ Cambios</div>
            <canvas
              :data-pageid="`right-${p.num}`"
              class="pdf-canvas"
            ></canvas>
          </div>

          <div v-if="loading2" class="pdf-loading">
            <a-spin />
            <span>Renderizando...</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import DiffMatchPatch from 'diff-match-patch'
import { PDFDocument, rgb } from 'pdf-lib'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

const dmp = new DiffMatchPatch()

const props = defineProps({
  file1:         { type: File,   default: null },
  file2:         { type: File,   default: null },
  label1:        { type: String, default: 'Documento Original' },
  label2:        { type: String, default: 'Documento Modificado' },
  pageTexts1:    { type: Array,  default: () => [] },   // text extracted per page for doc1
  pageTexts2:    { type: Array,  default: () => [] },   // text extracted per page for doc2
  changedPages1: { type: Array,  default: () => [] },
  changedPages2: { type: Array,  default: () => [] },
})

const emit = defineEmits(['pages-loaded'])

// ── Zoom ──────────────────────────────────────────────────────────
const ZOOM_MIN     = 0.4
const ZOOM_MAX     = 3.0
const ZOOM_STEP    = 0.1
const ZOOM_PRESETS = [0.75, 1.0, 1.5, 2.0]
// Render retina canvases. 1.5x is optimal for clarity without triggering Chrome Max GPU eviction
const QUALITY_SCALE = 1.5
const zoomLevel = ref(1.0)

function zoomOut() { setZoom(Math.max(ZOOM_MIN, +(zoomLevel.value - ZOOM_STEP).toFixed(2))) }
function zoomIn()  { setZoom(Math.min(ZOOM_MAX, +(zoomLevel.value + ZOOM_STEP).toFixed(2))) }

function setZoom(v) { zoomLevel.value = v }
function onZoomChange() { } // Handled by watcher for fast CSS reflow

// ── Jump to Page ──────────────────────────────────────────────────
const targetPage = ref('')
function jumpToPage() {
  const p = parseInt(targetPage.value)
  if (!p || p < 1) return

  const canvasL = document.querySelector(`.pdf-canvas[data-pageid="left-${p}"]`)
  const canvasR = document.querySelector(`.pdf-canvas[data-pageid="right-${p}"]`)
  
  if (canvasL && canvasL.parentElement) {
    canvasL.parentElement.scrollIntoView({ behavior: 'auto', block: 'start' })
  }
  if (canvasR && canvasR.parentElement) {
    canvasR.parentElement.scrollIntoView({ behavior: 'auto', block: 'start' })
  }
}

function externalJump(p) {
  targetPage.value = p
  jumpToPage()
}
defineExpose({ externalJump })

// ── Fast CSS DOM Zoom (NO CPU Re-rendering) ───────────────────────
watch(zoomLevel, (val) => {
  const canvases = document.querySelectorAll('.pdf-canvas')
  for (const c of canvases) {
    const bw = parseFloat(c.dataset.basewidth || '0')
    const bh = parseFloat(c.dataset.baseheight || '0')
    if (bw && bh) {
      c.style.width  = (bw * val) + 'px'
      c.style.height = (bh * val) + 'px'
    }
  }
})

// ── Containers ────────────────────────────────────────────────────
const leftContainer  = ref(null)
const rightContainer = ref(null)

// ── Scroll sync ───────────────────────────────────────────────────
let isSyncing = false

function onLeftScroll() {
  if (isSyncing || !rightContainer.value || !leftContainer.value) return
  isSyncing = true
  const src = leftContainer.value, dst = rightContainer.value
  const max = src.scrollHeight - src.clientHeight
  if (max > 0) dst.scrollTop = (src.scrollTop / max) * (dst.scrollHeight - dst.clientHeight)
  requestAnimationFrame(() => { isSyncing = false })
}

function onRightScroll() {
  if (isSyncing || !leftContainer.value || !rightContainer.value) return
  isSyncing = true
  const src = rightContainer.value, dst = leftContainer.value
  const max = src.scrollHeight - src.clientHeight
  if (max > 0) dst.scrollTop = (src.scrollTop / max) * (dst.scrollHeight - dst.clientHeight)
  requestAnimationFrame(() => { isSyncing = false })
}

// ── Find canvas by data-pageid ────────────────────────────────────
// Much more reliable than ref arrays or Maps
function getCanvas(side, num) {
  const container = side === 'left' ? leftContainer.value : rightContainer.value
  return container?.querySelector(`canvas[data-pageid="${side}-${num}"]`) ?? null
}

// ── Token helpers ─────────────────────────────────────────────────
// Min length rules prevent noise from common short words while
// preserving important short numeric tokens like "09", "10"
function tokenMinLen(w) {
  if (/^\d+$/.test(w)) return 1          // pure numbers: "9", "09", "10"
  if (/^\w+$/.test(w) && /\d/.test(w)) return 3  // alphanumeric codes: "v10"
  return 4                               // pure alpha: block "de", "la", "el", "of"
}

// 1. Used to generate the strict word-for-word diff sequence
function tokenizeSequence(text) {
  return (text || '')
    // Split by actual spaces or strong structural delimiters
    .split(/[\s;!?()/[\]"'\-]+/)
    // Lowercase and strip trailing/leading commas and periods (keeping internal ones like 100.000)
    .map(w => w.replace(/^[.,:]+|[.,:]+$/g, '').toLowerCase().trim())
    .filter(Boolean)
}

// 2. Used for highlights to drop insignificant short words ("of", "de")
function tokenize(text) {
  return tokenizeSequence(text).filter(w => w.length >= tokenMinLen(w))
}

// ── Highlights ────────────────────────────────────────────────────
/**
 * Extracts exact phrases that were deleted or inserted on the page.
 * By keeping the words in sequences (phrases), we avoid highlighting
 * isolated common tokens just because they appear elsewhere.
 */
const _pageCache = new Map() // num -> { deletedPhrases: string[], insertedPhrases: string[] }

function getPageHighlights(num) {
  if (_pageCache.has(num)) return _pageCache.get(num)

  const text1 = props.pageTexts1[num - 1] || ''
  const text2 = props.pageTexts2[num - 1] || ''

  const wordStates1 = []
  const wordStates2 = []

  if (!text1 && !text2) {
    const res = { wordStates1, wordStates2 }
    _pageCache.set(num, res)
    return res
  }

  // Use true Word-Level Diff using DiffMatchPatch.
  const seq1 = tokenizeSequence(text1)
  const seq2 = tokenizeSequence(text2)

  const wordToChar = new Map()
  const charToWord = new Map()
  let charCode = 0xE000 // Private Use Area

  function getChar(w) {
    if (!wordToChar.has(w)) {
      const ch = String.fromCharCode(charCode++)
      wordToChar.set(w, ch)
      charToWord.set(ch, w)
    }
    return wordToChar.get(w)
  }

  const str1 = seq1.map(getChar).join('')
  const str2 = seq2.map(getChar).join('')

  const rawDiffs = dmp.diff_main(str1, str2)



  for (let i = 0; i < rawDiffs.length; i++) {
    const op = rawDiffs[i][0]
    const len = rawDiffs[i][1].length

    if (op === 0) { // EQL
      for (let k = 0; k < len; k++) {
        wordStates1.push(false)
        wordStates2.push(false)
      }
    } else if (op === -1) { // DEL
      for (let k = 0; k < len; k++) {
        wordStates1.push(true)
      }
    } else if (op === 1) { // INS
      for (let k = 0; k < len; k++) {
        wordStates2.push(true)
      }
    }
  }

  const res = { wordStates1, wordStates2 }
  _pageCache.set(num, res)
  return res
}


async function drawHighlights(ctx, page, viewport, wordStates, color) {
  if (!wordStates || !wordStates.length) return
  if (!wordStates.some(v => v)) return // Fast skip if array contains no TRUEs

  const textContent = await page.getTextContent()

  // Strict identically scaled sort as usePdfExtractor ensures perfectly sequential canvas mapping
  const items = [...textContent.items]
  
  // 1. Sort by Y descending roughly
  items.sort((a, b) => b.transform[5] - a.transform[5])
  
  // 2. Cluster into logical horizontal lines (allow max 4 points baseline jitter)
  const lines = []
  let currentLine = []
  let lineBaseY = null
  for (const item of items) {
      const y = item.transform[5]
      if (lineBaseY === null || Math.abs(lineBaseY - y) < 4) {
          currentLine.push(item)
          if (lineBaseY === null) lineBaseY = y
      } else {
          lines.push(currentLine)
          currentLine = [item]
          lineBaseY = y
      }
  }
  if (currentLine.length) lines.push(currentLine)
  
  // 3. Sort each line left-to-right (Ascending X)
  lines.forEach(line => line.sort((a, b) => a.transform[4] - b.transform[4]))
  
  // 4. Flatten the fully sorted blocks
  const sortedItems = lines.flat()

  let wordIndex = 0

  for (const item of sortedItems) {
    const raw = item.str
    if (!raw) continue

    const words = tokenizeSequence(raw)
    const len = words.length
    if (len === 0) continue

    let hasChange = false
    // If ANY word in this tiny bounding box changed, color the box
    for (let i = 0; i < len; i++) {
        if (wordIndex + i < wordStates.length && wordStates[wordIndex + i]) {
            hasChange = true
            break
        }
    }
    
    wordIndex += len

    if (!hasChange) continue

    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform)
    const x  = tx[4], y = tx[5]
    const h  = Math.abs(tx[3]) || 12
    const w  = item.width * (Math.abs(tx[0]) / Math.abs(item.transform[0] || 1))

    ctx.save()
    ctx.globalAlpha = 0.28; ctx.fillStyle = color
    ctx.fillRect(x, y - h, w, h + 2)
    ctx.globalAlpha = 0.75
    ctx.fillRect(x, y + 1, w, 2)
    ctx.restore()
  }
}

// ── Render orchestration ──────────────────────────────────────────

let _observer = null

function setupObserverForSide(side) {
  if (!_observer) {
    _observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const canvas = entry.target
          if (!canvas.dataset.rendered) {
            canvas.dataset.rendered = 'true'
            const sd = canvas.dataset.side
            const num = parseInt(canvas.dataset.num)
            const doc = sd === 'left' ? _pdfDoc1 : _pdfDoc2
            const scale = sd === 'left' ? _baseScale1 : _baseScale2
            if (doc) renderPageContext(canvas, doc, num, sd, scale).catch(e => console.error(e))
          }
        }
      }
    }, { rootMargin: '150% 0px 150% 0px' }) // Lazily render 1.5 screens above/below view
  }

  const container = side === 'left' ? leftContainer.value : rightContainer.value
  const canvases = container.querySelectorAll('.pdf-canvas')
  canvases.forEach(c => _observer.observe(c))
}

async function setupPageDimensions(pdfDoc, num, side, baseScale) {
  const canvas = getCanvas(side, num)
  if (!canvas) return

  // Metadata for the Observer
  canvas.dataset.side = side
  canvas.dataset.num = num
  canvas.dataset.rendered = ''

  let page
  try {
    page = await pdfDoc.getPage(num)
  } catch(e) {
    console.warn(`[Viewer] setupPageDimensions: skipping page ${num}: ${e.message}`)
    return
  }
  const scale    = baseScale * QUALITY_SCALE
  const viewport = page.getViewport({ scale })

  // Phase 1: Minimal memory placeholder. Do NOT allocate 6GB of VRAM backing stores initially.
  canvas.width  = 1
  canvas.height = 1

  // Nominal 1.0x layout dimensions for CSS wrappers so the scrollbar calculates perfectly
  const nominalW = viewport.width / QUALITY_SCALE
  const nominalH = viewport.height / QUALITY_SCALE

  canvas.dataset.basewidth  = nominalW
  canvas.dataset.baseheight = nominalH

  canvas.style.width  = (nominalW * zoomLevel.value) + 'px'
  canvas.style.height = (nominalH * zoomLevel.value) + 'px'
}

async function renderPageContext(canvas, pdfDoc, num, side, baseScale) {
  let page
  try {
    page = await pdfDoc.getPage(num)
  } catch(e) {
    console.warn(`[Viewer] renderPageContext: skipping page ${num}: ${e.message}`)
    return
  }
  const scale    = baseScale * QUALITY_SCALE
  const viewport = page.getViewport({ scale })

  // Phase 2: User is looking at this page. Allocate full VRAM texture and paint.
  canvas.width  = viewport.width
  canvas.height = viewport.height

  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise

  // Retrieve page-specific sequential boolean string masks
  const { wordStates1, wordStates2 } = getPageHighlights(num)

  // Use precisely perfectly mapped boolean masks
  if (side === 'left')  await drawHighlights(ctx, page, viewport, wordStates1, '#ef4444')
  if (side === 'right') await drawHighlights(ctx, page, viewport, wordStates2, '#22c55e')
}

// ── State ─────────────────────────────────────────────────────────
const pageCount1       = ref(0)
const pageCount2       = ref(0)
const pages1           = ref([])
const pages2           = ref([])
const loading1         = ref(false)
const loading2         = ref(false)
const highlightedPages1 = ref([])
const highlightedPages2 = ref([])
const exporting         = ref(false)
const readyPdfBlob      = ref(null)  // Stores the ready blob until user clicks "Save"
let _pdfDoc1 = null, _baseScale1 = 1
let _pdfDoc2 = null, _baseScale2 = 1
// Cached unique-word Sets — recomputed when highlights props change
let _uniqueDeleted  = new Set()
let _uniqueInserted = new Set()

// ── Compute baseScale from container width ────────────────────────
// Called ONCE when PDF loads, not per-page.
async function computeBaseScale(pdfDoc, side) {
  const container = side === 'left' ? leftContainer.value : rightContainer.value
  let panelWidth = (container?.clientWidth ?? 700) - 40  // 20px padding each side
  
  // Prevent zero/negative size when rendering occurs out of sight (e.g. v-show=false)
  if (panelWidth <= 0) {
    panelWidth = 700 - 40
  }

  const firstPage = await pdfDoc.getPage(1)
  const naturalVp = firstPage.getViewport({ scale: 1 })
  
  // Return the pure ratio to fit the panel at 1.0x (100%) zoom
  return (panelWidth / naturalVp.width)
}

// ── Load PDF ──────────────────────────────────────────────────────
async function loadPdf(file, side) {
  if (!file) return
  const L = side === 'left'

  if (L) { loading1.value = true; pages1.value = []; highlightedPages1.value = [] }
  else   { loading2.value = true; pages2.value = []; highlightedPages2.value = [] }

  try {
    const ab     = await file.arrayBuffer()
    const pdfDoc = await pdfjsLib.getDocument({ data: ab }).promise
    const count  = pdfDoc.numPages

    if (L) { _pdfDoc1 = pdfDoc; pageCount1.value = count }
    else   { _pdfDoc2 = pdfDoc; pageCount2.value = count }

    // Populate page list → triggers DOM creation of canvas elements
    const pageList = Array.from({ length: count }, (_, i) => ({ num: i + 1 }))
    if (L) pages1.value = pageList
    else   pages2.value = pageList

    emit('pages-loaded', { side, pageCount: count })

    // Reset previously generated PDF when docs change
    if (readyPdfBlob.value) {
      URL.revokeObjectURL(URL.createObjectURL(readyPdfBlob.value))
      readyPdfBlob.value = null
    }

    // Wait for Vue to create all canvas elements
    await nextTick()
    await nextTick()

    // Clear page diff cache and rebuild for this mount
    _pageCache.clear()

    // Compute scale ONCE from the panel width (stable at this point)
    const baseScale = await computeBaseScale(pdfDoc, side)
    if (L) _baseScale1 = baseScale
    else   _baseScale2 = baseScale

    // 1. Setup layout shells synchronously fast so scrollbars measure perfectly
    for (let i = 1; i <= count; i++) {
      await setupPageDimensions(pdfDoc, i, side, baseScale)
    }

    // 2. Delegate rendering strictly to the Viewport Observer
    setupObserverForSide(side)

    if (L) highlightedPages1.value = [...props.changedPages1]
    else   highlightedPages2.value = [...props.changedPages2]

  } catch (e) {
    console.error(`[PDF] Load error (${side}):`, e)
  } finally {
    if (L) loading1.value = false
    else   loading2.value = false
  }
}

// ── Native PDF Export ──────────────────────────────────────────────

async function applyHighlightsToLibDoc(libDoc, pdfjsDoc, side) {
  const isLeft = side === 'left'
  const pagesLib = libDoc.getPages()
  const color = isLeft ? rgb(0.93, 0.26, 0.26) : rgb(0.13, 0.77, 0.36)
  // Use the minimum page count — we can only draw on pages that exist in BOTH references
  const count = Math.min(pdfjsDoc.numPages, pagesLib.length)

  for (let i = 0; i < count; i++) {
    const pageNum = i + 1
    const { wordStates1, wordStates2 } = await getPageHighlights(pageNum)
    const wordStates = isLeft ? wordStates1 : wordStates2

    if (!wordStates || !wordStates.length || !wordStates.some(v => v)) continue

    const libPage = pagesLib[i]
    if (!libPage) continue  // Guard: skip if page is missing in pdf-lib doc

    let pdfjsPage
    try {
      pdfjsPage = await pdfjsDoc.getPage(pageNum)
    } catch(e) {
      console.warn(`[Export] Skipping page ${pageNum}: ${e.message}`)
      continue
    }
    const textContent = await pdfjsPage.getTextContent()
    
    const items = [...textContent.items]
    items.sort((a, b) => b.transform[5] - a.transform[5])
    
    const lines = []
    let currentLine = []
    let lineBaseY = null
    for (const item of items) {
        const y = item.transform[5]
        if (lineBaseY === null || Math.abs(lineBaseY - y) < 4) {
            currentLine.push(item)
            if (lineBaseY === null) lineBaseY = y
        } else {
            lines.push(currentLine)
            currentLine = [item]
            lineBaseY = y
        }
    }
    if (currentLine.length) lines.push(currentLine)
    lines.forEach(line => line.sort((a, b) => a.transform[4] - b.transform[4]))
    const sortedItems = lines.flat()

    let wordIndex = 0

    for (const item of sortedItems) {
      const raw = item.str
      if (!raw) continue
  
      const words = tokenizeSequence(raw)
      const len = words.length
      if (len === 0) continue

      let hasChange = false
      for (let wId = 0; wId < len; wId++) {
          if (wordIndex + wId < wordStates.length && wordStates[wordIndex + wId]) {
              hasChange = true
              break
          }
      }
      wordIndex += len

      if (!hasChange) continue

      const tx = item.transform
      const x = tx[4]
      const y = tx[5]
      const h = Math.abs(tx[3]) || 12
      const scaleX = Math.abs(tx[0] || 1)
      const w = item.width * scaleX
      
      libPage.drawRectangle({
        x: x,
        y: y - h * 0.2,
        width: w,
        height: h * 1.2,
        color,
        opacity: 0.25
      })
    }
  }
}

async function generateCombinedPdf() {
  if (!props.file1 || !props.file2 || !_pdfDoc1 || !_pdfDoc2) return

  try {
    exporting.value = true

    // Load original arrays securely
    const ab1 = await props.file1.arrayBuffer()
    const ab2 = await props.file2.arrayBuffer()
    
    // Create doc instances mapped for PDF-lib editing
    const doc1 = await PDFDocument.load(ab1)
    const doc2 = await PDFDocument.load(ab2)

    // Prepare unified, wide document
    await applyHighlightsToLibDoc(doc1, _pdfDoc1, 'left')
    await applyHighlightsToLibDoc(doc2, _pdfDoc2, 'right')
    
    const count = Math.max(_pdfDoc1.numPages, _pdfDoc2.numPages)
    const finalMergedPdf = await PDFDocument.create()
    
    for (let i = 0; i < count; i++) {
        const p1 = i < doc1.getPageCount() ? doc1.getPage(i) : null;
        const p2 = i < doc2.getPageCount() ? doc2.getPage(i) : null;
        
        const w1 = p1 ? p1.getWidth() : 0;
        const h1 = p1 ? p1.getHeight() : 0;
        const w2 = p2 ? p2.getWidth() : 0;
        const h2 = p2 ? p2.getHeight() : 0;

        const mergedWidth = w1 + w2;
        const mergedHeight = Math.max(h1, h2) || 842;
        
        let embedded1, embedded2;
        if (p1) embedded1 = await finalMergedPdf.embedPage(p1)
        if (p2) embedded2 = await finalMergedPdf.embedPage(p2)

        const blankPage = finalMergedPdf.addPage([mergedWidth, mergedHeight])

        if (embedded1) blankPage.drawPage(embedded1, { x: 0, y: mergedHeight - h1 })
        if (embedded2) blankPage.drawPage(embedded2, { x: w1, y: mergedHeight - h2 })
        
        if (w1 > 0) {
            blankPage.drawLine({
              start: { x: w1, y: 0 },
              end: { x: w1, y: mergedHeight },
              thickness: 1,
              color: rgb(0.8, 0.8, 0.8)
            })
        }
    }


    const pdfBytes = await finalMergedPdf.save()
    
    // Just store it. DO NOT trigger download here - Chrome would reject it
    // because the user gesture has expired after all the async computation.
    readyPdfBlob.value = new Blob([pdfBytes], { type: 'application/pdf' })

  } catch(e) {
    console.error("Export Error:", e)
  } finally {
    exporting.value = false
  }
}

// Opens the prepared PDF in a new browser tab where the user can save it normally
function triggerPdfDownload() {
  if (!readyPdfBlob.value) return
  const url = URL.createObjectURL(readyPdfBlob.value)
  window.open(url, '_blank')
  // Keep URL alive for 5 minutes so user has time to interact with the PDF viewer
  setTimeout(() => URL.revokeObjectURL(url), 300000)
  readyPdfBlob.value = null
}

async function rerenderAll() {
  // Disabled: Zoom and Highlighting are now fully decoupled from CPU re-rendering.
  // Re-rendering 200+ canvases concurrently causes catastrophic browser flickering.
}

// Re-render only when underlying texts violently change
watch([() => props.pageTexts1, () => props.pageTexts2], () => {
  _pageCache.clear()
}, { deep: true })

watch(() => props.file1, f => { if (f) loadPdf(f, 'left')  }, { immediate: true })
watch(() => props.file2, f => { if (f) loadPdf(f, 'right') }, { immediate: true })
</script>

<style scoped>
/* Scroll container: align-items MUST be flex-start to avoid
   left-side overflow being permanently hidden (flex centering bug) */
.pdf-scroll-area {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-top: 20px;
}

/* Page wrapper: 
   min-width: 100% + width: fit-content allows the wrapper to grow beyond the scroll area 
   when zoomed, preserving native scrollability in all directions. */
.pdf-page-wrapper {
  min-width: 100%;
  width: fit-content;
  display: flex;
  flex-direction: column;
  align-items: center; /* Safe now because the wrapper itself grows */
  padding: 0 20px 24px;
  box-sizing: border-box;
  flex-shrink: 0;
  position: relative;
}

.pdf-canvas {
  display: block;
  border-radius: 3px;
  box-shadow: 0 6px 28px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07);
  background: white;
  transform-origin: center top;
  will-change: width, height;
}

.pdf-page-label {
  font-size: 10px;
  color: #6b7280;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.pdf-change-badge {
  position: absolute;
  top: 0;
  right: 24px;
  z-index: 10;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 6px;
  color: white;
}
.pdf-change-badge--red   { background: rgba(239,68,68,0.92);  box-shadow: 0 2px 8px rgba(239,68,68,0.5); }
.pdf-change-badge--green { background: rgba(34,197,94,0.92);  box-shadow: 0 2px 8px rgba(34,197,94,0.5); }

.pdf-empty-state {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  gap: 12px;
  color: var(--text-muted);
  font-size: 14px;
}

.pdf-loading {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px;
  gap: 10px;
  font-size: 12px;
  color: var(--text-muted);
}
</style>
