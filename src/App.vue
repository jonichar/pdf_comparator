<template>
  <div class="min-h-screen flex flex-col" style="background-color: var(--bg-primary);">

    <!-- ── Header ──────────────────────────────────────────────── -->
    <header class="w-full" style="border-bottom: 1px solid var(--border-color); background-color: var(--bg-secondary);">
      <div style="max-width: 1400px; margin: 0 auto; padding: 16px 40px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; background: linear-gradient(135deg, rgba(79,142,247,0.2), rgba(124,92,191,0.2)); border: 1px solid rgba(79,142,247,0.3);">
            📊
          </div>
          <div>
            <h1 style="font-size: 17px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.3px;">PDF Comparator</h1>
            <p style="font-size: 11px; color: var(--text-muted); margin-top: 1px;">Comparación de documentos a nivel de texto</p>
          </div>
        </div>
        <span style="font-size: 11px; padding: 4px 12px; border-radius: 999px; font-weight: 500; background: rgba(79,142,247,0.12); color: var(--accent-blue); border: 1px solid rgba(79,142,247,0.3);">
          PDF.js + diff-match-patch
        </span>
      </div>
    </header>

    <!-- ── Sticky Step Nav (shown once docs are uploaded) ────────── -->
    <nav v-if="pdf1File || pdf2File"
      style="position: sticky; top: 0; z-index: 50; border-bottom: 1px solid var(--border-color); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); background: rgba(15,18,30,0.88);"
    >
      <div style="max-width: 1400px; margin: 0 auto; padding: 0 40px; display: flex; align-items: center; gap: 4px; height: 48px;">
        <button
          v-for="step in navSteps"
          :key="step.id"
          @click="activeStep = step.id"
          :disabled="step.requiresDiff && !diffDone"
          style="display: flex; align-items: center; gap: 7px; padding: 6px 14px; border-radius: 8px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s; white-space: nowrap;"
          :style="activeStep === step.id
            ? 'background:rgba(79,142,247,0.2); color:#4f8ef7; border:1px solid rgba(79,142,247,0.4);'
            : step.requiresDiff && !diffDone
              ? 'background:transparent; color:#4b5563; cursor:not-allowed; border:1px solid transparent;'
              : 'background:transparent; color:var(--text-muted); border:1px solid transparent;'"
        >
          <span style="width: 18px; height: 18px; border-radius: 50%; font-size: 10px; font-weight: 700; display:flex; align-items:center; justify-content:center;"
            :style="activeStep === step.id
              ? 'background:#4f8ef7; color:white;'
              : step.requiresDiff && !diffDone
                ? 'background:#374151; color:#6b7280;'
                : 'background:rgba(255,255,255,0.08); color:var(--text-muted);'"
          >{{ step.id }}</span>
          {{ step.label }}
          <span v-if="step.badge" style="font-size: 10px; padding: 1px 6px; border-radius: 999px; background: rgba(251,191,36,0.2); color:#fbbf24; border: 1px solid rgba(251,191,36,0.3);">
            {{ step.badge }}
          </span>
        </button>

        <!-- Right side: Compare button in nav when on step 1 -->
        <div style="flex: 1;"></div>
        <button
          v-if="activeStep === 1"
          @click="runComparison"
          :disabled="!canCompare || isComparing"
          style="display: flex; align-items: center; gap: 6px; padding: 6px 18px; border-radius: 8px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s;"
          :style="canCompare && !isComparing
            ? 'background: linear-gradient(135deg, #4f8ef7, #7c5cbf); color: white; box-shadow: 0 2px 12px rgba(79,142,247,0.3);'
            : 'background: rgba(79,142,247,0.1); color: #4b5563; cursor: not-allowed;'"
        >
          <span>🔍</span>
          {{ isComparing ? 'Analizando...' : 'Comparar' }}
        </button>
      </div>
    </nav>

    <!-- ── Main content ──────────────────────────────────────────── -->
    <main style="width: 100%; max-width: 1400px; margin: 0 auto; padding: 40px 40px; flex: 1;">

      <!-- ① Upload -->
      <section v-if="activeStep === 1">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
          <span style="font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 999px; background: rgba(79,142,247,0.15); color: var(--accent-blue); letter-spacing: 0.5px;">PASO 1</span>
          <h2 style="font-size: 17px; font-weight: 700; color: var(--text-primary);">Carga tus documentos PDF</h2>
        </div>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 24px;">
          El análisis es completamente local, tus archivos no se suben a ningún servidor.
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div style="border-radius: 18px; padding: 2px; background: linear-gradient(135deg, rgba(79,142,247,0.4), rgba(124,92,191,0.15));">
            <div style="border-radius: 16px; padding: 18px; background-color: var(--bg-card);">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
                <div style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: white; background: linear-gradient(135deg, #4f8ef7, #7c5cbf);">1</div>
                <span style="font-weight: 600; font-size: 13px; color: var(--text-primary);">Documento Original</span>
              </div>
              <PdfUploader label="Cargar PDF Original" :loading="pdf1Loading" :progress="pdf1Progress" :error="pdf1Error" @file-selected="onPdf1Selected" @file-cleared="onPdf1Cleared" />
            </div>
          </div>
          <div style="border-radius: 18px; padding: 2px; background: linear-gradient(135deg, rgba(124,92,191,0.4), rgba(239,68,68,0.15));">
            <div style="border-radius: 16px; padding: 18px; background-color: var(--bg-card);">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
                <div style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: white; background: linear-gradient(135deg, #7c5cbf, #ef4444);">2</div>
                <span style="font-weight: 600; font-size: 13px; color: var(--text-primary);">Documento Modificado</span>
              </div>
              <PdfUploader label="Cargar PDF Modificado" :loading="pdf2Loading" :progress="pdf2Progress" :error="pdf2Error" @file-selected="onPdf2Selected" @file-cleared="onPdf2Cleared" />
            </div>
          </div>
        </div>

        <!-- Big compare button (only when no sticky nav) -->
        <div v-if="!pdf1File && !pdf2File" style="display: flex; justify-content: center; margin-top: 48px;">
          <a-button type="primary" size="large" disabled
            style="height: 48px; padding: 0 48px; font-size: 15px; font-weight: 600; border-radius: 12px; background: linear-gradient(135deg, #4f8ef7, #7c5cbf); border: none; opacity: 0.4;">
            🔍 Comparar documentos
          </a-button>
        </div>
        <div v-else style="display: flex; justify-content: center; margin-top: 40px; padding-top: 32px; border-top: 1px solid var(--border-color);">
          <a-button type="primary" size="large"
            :disabled="!canCompare || isComparing"
            :loading="isComparing"
            style="height: 48px; padding: 0 48px; font-size: 15px; font-weight: 600; border-radius: 12px; background: linear-gradient(135deg, #4f8ef7, #7c5cbf); border: none; box-shadow: 0 4px 24px rgba(79,142,247,0.3);"
            @click="runComparison"
          >
            <template #icon><span style="margin-right:6px;">🔍</span></template>
            {{ isComparing ? 'Analizando...' : 'Comparar documentos' }}
          </a-button>
        </div>

        <!-- Empty state (no files yet) -->
        <div v-if="!pdf1File && !pdf2File" style="text-align: center; padding: 40px 0;">
          <div style="font-size: 52px; margin-bottom: 12px;">🔎</div>
          <p style="font-size: 14px; font-weight: 500; color: var(--text-muted);">
            Carga dos PDFs y presiona "Comparar documentos" para ver las diferencias
          </p>
        </div>
      </section>

      <!-- ② Stats -->
      <section v-if="activeStep === 2 && diffDone">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <span style="font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 999px; background: rgba(79,142,247,0.15); color: var(--accent-blue); letter-spacing: 0.5px;">PASO 2</span>
          <h2 style="font-size: 17px; font-weight: 700; color: var(--text-primary);">Estadísticas del análisis</h2>
        </div>

        <div v-if="pdf1Pages !== pdf2Pages"
          style="margin-bottom: 16px; border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; gap: 12px; background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3);">
          <span style="font-size: 20px;">📄</span>
          <div>
            <p style="font-size: 13px; font-weight: 600; color: #fbbf24;">Los documentos tienen distinto número de páginas</p>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
              Original: <strong style="color: var(--text-primary);">{{ pdf1Pages }} pág.</strong>
              &nbsp;→&nbsp;
              Modificado: <strong style="color: var(--text-primary);">{{ pdf2Pages }} pág.</strong>
              &nbsp;({{ pdf2Pages > pdf1Pages ? '+' : '' }}{{ pdf2Pages - pdf1Pages }} páginas)
            </p>
          </div>
        </div>

        <!-- Skipped pages warning -->
        <div v-if="skippedPages1.length || skippedPages2.length"
          style="margin-bottom: 16px; border-radius: 12px; padding: 14px 18px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.3);">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <span style="font-size: 18px;">⚠️</span>
            <p style="font-size: 13px; font-weight: 600; color: #f87171;">Páginas con problemas de lectura</p>
          </div>
          <p style="font-size: 12px; color: var(--text-muted); line-height: 1.7;">
            Algunas páginas tienen una estructura interna inválida y no pudieron ser procesadas por PDF.js.
            Su contenido <strong style="color: var(--text-primary);">no se incluye en el análisis de diferencias</strong>.
          </p>
          <div v-if="skippedPages1.length" style="margin-top: 8px; font-size: 12px; color: #fca5a5;">
            📋 <strong>Original:</strong> páginas omitidas → {{ skippedPages1.join(', ') }}
          </div>
          <div v-if="skippedPages2.length" style="margin-top: 4px; font-size: 12px; color: #fca5a5;">
            📋 <strong>Modificado:</strong> páginas omitidas → {{ skippedPages2.join(', ') }}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 14px;">
          <div style="border-radius: 14px; padding: 18px 12px; text-align: center; background-color: var(--bg-card); border: 1px solid var(--border-color);">
            <p style="font-size: 28px; font-weight: 700; color: var(--accent-blue);">{{ similarityPercent }}%</p>
            <p style="font-size: 11px; margin-top: 6px; color: var(--text-muted);">Similitud</p>
          </div>
          <div style="border-radius: 14px; padding: 18px 12px; text-align: center; background-color: var(--bg-card); border: 1px solid rgba(34,197,94,0.3);">
            <p style="font-size: 28px; font-weight: 700; color: var(--accent-green);">+{{ stats.added }}</p>
            <p style="font-size: 11px; margin-top: 6px; color: var(--text-muted);">Palabras añadidas</p>
          </div>
          <div style="border-radius: 14px; padding: 18px 12px; text-align: center; background-color: var(--bg-card); border: 1px solid rgba(239,68,68,0.3);">
            <p style="font-size: 28px; font-weight: 700; color: var(--accent-red);">-{{ stats.removed }}</p>
            <p style="font-size: 11px; margin-top: 6px; color: var(--text-muted);">Palabras eliminadas</p>
          </div>
          <div style="border-radius: 14px; padding: 18px 12px; text-align: center; background-color: var(--bg-card); border: 1px solid var(--border-color);">
            <p style="font-size: 28px; font-weight: 700; color: var(--text-primary);">{{ stats.unchanged }}</p>
            <p style="font-size: 11px; margin-top: 6px; color: var(--text-muted);">Sin cambios</p>
          </div>
          <div style="border-radius: 14px; padding: 18px 12px; text-align: center; background-color: var(--bg-card); border: 1px solid rgba(251,191,36,0.3);">
            <p style="font-size: 28px; font-weight: 700; color: #fbbf24;">{{ report.length }}</p>
            <p style="font-size: 11px; margin-top: 6px; color: var(--text-muted);">Cambios totales</p>
          </div>
        </div>

        <div style="border-radius: 14px; padding: 18px 20px; background-color: var(--bg-card); border: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="font-size: 11px; color: var(--text-muted);">Diferencias</span>
            <span style="font-size: 11px; color: var(--text-muted);">Igualdad</span>
          </div>
          <a-progress :percent="similarityPercent" :stroke-color="{ from: '#ef4444', to: '#22c55e' }" :trail-color="'rgba(239,68,68,0.2)'" />
        </div>
      </section>

      <!-- ③ Report -->
      <section v-if="activeStep === 3 && diffDone">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 999px; background: rgba(124,92,191,0.15); color: #a78bfa; letter-spacing: 0.5px;">PASO 3</span>
            <h2 style="font-size: 17px; font-weight: 700; color: var(--text-primary);">Síntesis de cambios</h2>
          </div>
          <span style="font-size: 12px; color: var(--text-muted);">{{ report.length }} cambio(s) detectado(s)</span>
        </div>

        <div v-if="report.length === 0" style="border-radius: 14px; padding: 28px; text-align: center; background-color: var(--bg-card); border: 1px solid rgba(34,197,94,0.3);">
          <div style="font-size: 36px; margin-bottom: 8px;">✅</div>
          <p style="color: var(--accent-green); font-weight: 600;">Los documentos son idénticos en contenido de texto.</p>
        </div>

        <div v-else style="display: flex; flex-direction: column; gap: 10px;">
          <div v-for="(entry, idx) in report" :key="idx"
            style="border-radius: 14px; overflow: hidden; background-color: var(--bg-card); border: 1px solid var(--border-color);">
            <div style="padding: 10px 18px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border-color); background-color: var(--bg-secondary);">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">#{{ idx + 1 }}</span>
              <span style="font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 999px;"
                :style="entry.type === 'substitution'
                  ? 'background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3);'
                  : entry.type === 'deletion' 
                    ? 'background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3);'
                    : 'background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3);'"
              >{{ entry.type === 'substitution' ? '🔄 Sustitución' : entry.type === 'deletion' ? '➖ Eliminación' : '➕ Inserción' }}</span>
              <span v-if="entry.count > 1" style="font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 999px; background: rgba(255,255,255,0.1); color: white; margin-left: auto;">
                {{ entry.count }} repeticiones
              </span>
            </div>
            <div style="padding: 14px 18px; display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <div v-if="entry.context" style="font-size: 11px; color: var(--text-muted); font-style: italic; border-left: 2px solid var(--border-color); padding-left: 10px;">
                  …{{ entry.context }}
                </div>
                
                <div 
                  @click="entry.pagesArray.length > 5 ? entry.expanded = !entry.expanded : null"
                  :style="{ cursor: entry.pagesArray.length > 5 ? 'pointer' : 'default' }"
                  style="font-size: 10px; color: var(--text-muted); display: flex; align-items: flex-start; background: var(--bg-primary); border: 1px solid var(--border-color); padding: 4px 8px; border-radius: 6px; transition: all 0.2s; user-select: none;"
                >
                  <span style="margin-top: 1px;">📄 Pág:</span> 
                  <span style="color: var(--text-primary); margin-left: 4px; font-weight: 600; max-width: 300px; line-height: 1.4; display: inline-block; word-wrap: break-word; white-space: normal;">
                    <template v-if="entry.pagesArray.length <= 5 || entry.expanded">
                      <span v-for="(pageNum, idx) in entry.pagesArray" :key="idx">
                        <span @click.stop="goToPage(pageNum)" style="color: var(--accent-blue); text-decoration: underline; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1">{{ pageNum }}</span><span v-if="idx < entry.pagesArray.length - 1">, </span>
                      </span>
                      <span v-if="entry.expanded" style="color: var(--text-muted); margin-left: 4px; font-weight: normal; text-decoration: underline;">(ocultar)</span>
                    </template>
                    <template v-else>
                      <span v-for="(pageNum, idx) in entry.pagesArray.slice(0, 4)" :key="idx">
                        <span @click.stop="goToPage(pageNum)" style="color: var(--accent-blue); text-decoration: underline; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.7" onmouseout="this.style.opacity=1">{{ pageNum }}</span><span v-if="idx < 3">, </span>
                      </span>
                      <span style="color: var(--accent-blue); margin-left: 2px;">...+{{ entry.pagesArray.length - 4 }} (ver todas)</span>
                    </template>
                  </span>
                </div>
              </div>
              <div v-if="entry.removed" style="display: flex; align-items: flex-start; gap: 10px;">
                <span style="font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; white-space: nowrap; background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3);">— Original</span>
                <span style="font-size: 13px; color: #f87171; font-family: 'Fira Code', monospace; text-decoration: line-through; line-height: 1.6;">{{ entry.removed }}</span>
              </div>
              <div v-if="entry.inserted" style="display: flex; align-items: flex-start; gap: 10px;">
                <span style="font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; white-space: nowrap; background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3);">+ Nuevo</span>
                <span style="font-size: 13px; color: #4ade80; font-family: 'Fira Code', monospace; line-height: 1.6;">{{ entry.inserted }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ④ Synced PDF Viewer — v-show keeps Virtual DOM statically ready! -->
      <section v-show="activeStep === 4 && diffDone">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
          <span style="font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 999px; background: rgba(79,142,247,0.15); color: var(--accent-blue); letter-spacing: 0.5px;">PASO 4</span>
          <h2 style="font-size: 17px; font-weight: 700; color: var(--text-primary);">Visor de documentos sincronizado</h2>
        </div>

        <div style="height: 82vh; min-height: 600px; border-radius: 16px; overflow: hidden; border: 1px solid var(--border-color); position: relative;">
          <SyncedPdfViewer
            ref="pdfViewerRef"
            :file1="pdf1File"
            :file2="pdf2File"
            label1="Documento Original"
            label2="Documento Modificado"
            :page-texts1="pdf1PageTexts"
            :page-texts2="pdf2PageTexts"
            :changed-pages1="changedPages1"
            :changed-pages2="changedPages2"
          />
        </div>
      </section>

    </main>

    <footer style="text-align: center; padding: 16px; font-size: 11px; color: var(--text-muted); border-top: 1px solid var(--border-color);">
      PDF Comparator &nbsp;·&nbsp; Análisis 100% local &nbsp;·&nbsp; Powered by PDF.js &amp; diff‑match‑patch &nbsp;·&nbsp; jcharriscaro@gmail.com
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import PdfUploader from './components/PdfUploader.vue'
import SyncedPdfViewer from './components/SyncedPdfViewer.vue'
import { usePdfExtractor } from './composables/usePdfExtractor.js'
import { useTextDiff } from './composables/useTextDiff.js'

// ── PDF extractors ────────────────────────────────────────────────
const extractor1 = usePdfExtractor()
const extractor2 = usePdfExtractor()

// Expose reactive props from extractors for template
const pdf1Loading = extractor1.isLoading
const pdf1Progress = extractor1.progress
const pdf1Error = extractor1.error
const pdf2Loading = extractor2.isLoading
const pdf2Progress = extractor2.progress
const pdf2Error = extractor2.error

// Manual state refs (usePdfExtractor doesn't keep reactive text/file/pages refs)
const pdf1File     = ref(null)
const pdf2File     = ref(null)
const pdf1Text     = ref('')
const pdf2Text     = ref('')
const pdf1Pages    = ref(0)
const pdf2Pages    = ref(0)
const pdf1PageTexts = ref([])   // per-page text arrays for page-level diff
const pdf2PageTexts = ref([])
const skippedPages1 = ref([])   // pages that pdfjs couldn't load
const skippedPages2 = ref([])

async function onPdf1Selected(file) {
  pdf1File.value = file
  const result = await extractor1.extractText(file)
  if (result) {
    pdf1Text.value      = result.fullText
    pdf1Pages.value     = result.pageCount
    pdf1PageTexts.value = result.pages
    skippedPages1.value = result.skippedPages || []
    if (skippedPages1.value.length > 0) {
      message.warning({
        content: `Documento Original: ${skippedPages1.value.length} página(s) no pudieron leerse (pág. ${skippedPages1.value.join(', ')}) y se omitirán del análisis.`,
        duration: 8
      })
    }
  }
}
async function onPdf2Selected(file) {
  pdf2File.value = file
  const result = await extractor2.extractText(file)
  if (result) {
    pdf2Text.value      = result.fullText
    pdf2Pages.value     = result.pageCount
    pdf2PageTexts.value = result.pages
    skippedPages2.value = result.skippedPages || []
    if (skippedPages2.value.length > 0) {
      message.warning({
        content: `Documento Modificado: ${skippedPages2.value.length} página(s) no pudieron leerse (pág. ${skippedPages2.value.join(', ')}) y se omitirán del análisis.`,
        duration: 8
      })
    }
  }
}
function onPdf1Cleared() {
  pdf1File.value = null; pdf1Text.value = ''; pdf1Pages.value = 0
  diffDone.value = false; activeStep.value = 1
}
function onPdf2Cleared() {
  pdf2File.value = null; pdf2Text.value = ''; pdf2Pages.value = 0
  diffDone.value = false; activeStep.value = 1
}

// ── Diff ──────────────────────────────────────────────────────────
const { stats, similarityPercent, report, changedPages1, changedPages2, computeDiff } = useTextDiff()
const deletedTexts  = ref([])
const insertedTexts = ref([])
const diffDone      = ref(false)
const isComparing   = ref(false)
const canCompare    = computed(() => pdf1Text.value && pdf2Text.value)

const pdfViewerRef = ref(null)

function goToPage(pageNum) {
  activeStep.value = 4
  // Now that v-show is used, the component never unmounts, so 0ms timeout is perfectly safe
  setTimeout(() => {
    if (pdfViewerRef.value && typeof pdfViewerRef.value.externalJump === 'function') {
      pdfViewerRef.value.externalJump(pageNum)
    }
  }, 10)
}

async function runComparison() {
  if (!canCompare.value) return
  isComparing.value = true
  try {
    computeDiff(pdf1Text.value, pdf2Text.value)
    deletedTexts.value  = report.value.map(e => e.removed).filter(Boolean)
    insertedTexts.value = report.value.map(e => e.inserted).filter(Boolean)
    diffDone.value = true
    message.success(`¡Comparación completada! ${report.value.length} cambio(s) encontrado(s)`)
    activeStep.value = 2
  } catch (e) {
    message.error('Error durante la comparación: ' + e.message)
  } finally {
    isComparing.value = false
  }
}

// ── Initial Test Preload (Disabled for production) ──────────────────
/*
onMounted(async () => {
  try {
    message.loading({ content: 'Precargando PDFs de prueba...', key: 'preload' })
    
    const v09Url = '/test-pdfs/400006952 PROPUESTO.pdf'
    const v10Url = '/test-pdfs/400006953 PROPUESTO.pdf'

    const [res1, res2] = await Promise.all([ fetch(v09Url), fetch(v10Url) ])
    
    if (!res1.ok || !res2.ok) throw new Error("Could not find test pdfs in public directory.")

    const blob1 = await res1.blob()
    const blob2 = await res2.blob()
    
    const file1 = new File([blob1], '400006952_PROPUESTO.pdf', { type: 'application/pdf' })
    const file2 = new File([blob2], '400006953_PROPUESTO.pdf', { type: 'application/pdf' })
    
    await Promise.all([ onPdf1Selected(file1), onPdf2Selected(file2) ])
    
    message.success({ content: 'PDFs precargados exitosamente', key: 'preload', duration: 2 })
    
    await runComparison()

    activeStep.value = 3
  } catch(e) {
    console.error('Preload failed:', e)
    message.error({ content: 'Fallo al precargar los PDFs', key: 'preload' })
  }
})
*/

// ── Step navigation ────────────────────────────────────────────────
const activeStep = ref(1)
const navSteps = computed(() => [
  { id: 1, label: 'Documentos',   requiresDiff: false, badge: null },
  { id: 2, label: 'Estadísticas', requiresDiff: true,  badge: null },
  { id: 3, label: 'Diferencias',  requiresDiff: true,  badge: diffDone.value && report.value.length ? String(report.value.length) : null },
  { id: 4, label: 'Visor PDF',    requiresDiff: true,  badge: null },
])
</script>
