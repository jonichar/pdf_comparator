/**
 * usePdfExtractor.js
 * Composable for extracting text from PDF files using PDF.js
 */
import { ref } from 'vue'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

export function usePdfExtractor(side = 'left') {
    const isLoading = ref(false)
    const progress = ref(0)
    const error = ref(null)

    /**
     * Extract text from a PDF File object
     * @param {File} file - PDF File object
     * @returns {Promise<{ pages: string[], fullText: string, pageCount: number, skippedPages: number[] }>}
     */
    async function extractText(file) {
        isLoading.value = true
        progress.value = 0
        error.value = null

        try {
            const arrayBuffer = await file.arrayBuffer()
            const workerName = `extractor-${side}-${Date.now()}-${Math.random()}`
            console.log(`[Extractor] Starting getDocument with worker: ${workerName}, file: ${file.name}`)

            // Dynamically import isolated instance to bypass global pdf.js caches/singletons
            let pdfjsLib
            if (side === 'right') {
                pdfjsLib = await import('pdfjs-dist?side=right')
            } else {
                pdfjsLib = await import('pdfjs-dist')
            }
            pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

            const worker = new pdfjsLib.PDFWorker({ name: workerName })
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, worker }).promise
            console.log(`[Extractor] getDocument complete for ${file.name}, numPages: ${pdf.numPages}`)
            const pageCount = pdf.numPages
            const pages = []
            const skippedPages = []  // 1-indexed page numbers that couldn't be loaded
            
            // Override destroy to also destroy the worker
            const originalDestroy = pdf.destroy.bind(pdf)
            pdf.destroy = async () => {
                await originalDestroy()
                worker.destroy()
            }

            for (let i = 1; i <= pageCount; i++) {
                let page
                try {
                    page = await pdf.getPage(i)
                } catch (pageErr) {
                    console.warn(`[Extractor] Skipping page ${i} (getPage failed): ${pageErr.message}`)
                    pages.push('')  // Push empty string so page indices stay aligned
                    progress.value = Math.round((i / pageCount) * 100)
                    continue
                }

                const textContent = await page.getTextContent()
                const items = [...textContent.items]

                // Sort items visually: Top-to-Bottom, Left-to-Right.
                // PDF coordinates: Y is bottom-up (higher Y is higher on the page).

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

                const pageText = sortedItems
                    .map(item => item.str)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                pages.push(pageText)
                progress.value = Math.round((i / pageCount) * 100)
            }

            // Crucial: Destroy the PDF and Worker to clear pdf.js main-thread cache!
            // This prevents fingerprint collisions when comparing identical PDFs.
            await pdf.destroy()

            return {
                pages,
                fullText: pages.join('\n\n--- Page Break ---\n\n'),
                pageCount,
                skippedPages
            }
        } catch (err) {
            error.value = `Error al procesar el PDF: ${err.message}`
            console.error(err)
            return null
        } finally {
            isLoading.value = false
        }
    }

    return { extractText, isLoading, progress, error }
}
