/**
 * useTextDiff.js
 * Composable for computing text diffs using Google's diff-match-patch
 */
import { ref, computed } from 'vue'
import DiffMatchPatch from 'diff-match-patch'

const dmp = new DiffMatchPatch()

export const DIFF_DELETE = -1
export const DIFF_INSERT = 1
export const DIFF_EQUAL = 0

export function useTextDiff() {
    const diffs = ref([])
    const stats = ref({ added: 0, removed: 0, unchanged: 0 })
    const report = ref([])
    const changedPages1 = ref([])
    const changedPages2 = ref([])

    // ── Main compute ──────────────────────────────────────
    function computeDiff(text1, text2) {
        const rawDiffs = dmp.diff_main(text1, text2)
        dmp.diff_cleanupSemantic(rawDiffs)
        diffs.value = rawDiffs

        let added = 0, removed = 0, unchanged = 0
        for (const [op, text] of rawDiffs) {
            const wordCount = text.trim().split(/\s+/).filter(w => w).length
            if (op === DIFF_INSERT) added += wordCount
            else if (op === DIFF_DELETE) removed += wordCount
            else unchanged += wordCount
        }
        stats.value = { added, removed, unchanged }
        report.value = buildReport(rawDiffs)
        changedPages1.value = computeChangedPages(rawDiffs, 'left')
        changedPages2.value = computeChangedPages(rawDiffs, 'right')
    }

    // ── Report builder ────────────────────────────────────
    function buildReport(rawDiffs) {
        const entriesMap = new Map()
        const CONTEXT_LEN = 60
        const PAGE_BREAK = '--- Page Break ---'

        const blocks = []
        let p1 = 1, p2 = 1
        for (let i = 0; i < rawDiffs.length; i++) {
            const [op, text] = rawDiffs[i]
            blocks.push({ op, text, p1, p2 })
            const pbCount = text.split(PAGE_BREAK).length - 1
            if (op === DIFF_EQUAL) { p1 += pbCount; p2 += pbCount }
            else if (op === DIFF_DELETE) p1 += pbCount
            else if (op === DIFF_INSERT) p2 += pbCount
        }

        for (let i = 0; i < blocks.length; i++) {
            const { op, text, p1, p2 } = blocks[i]
            if (op === DIFF_EQUAL) continue

            let type = ''
            let removed = ''
            let inserted = ''
            let ctxBefore = ''
            let affectedPage = p2

            if (op === DIFF_DELETE) {
                removed = text.trim()
                type = 'deletion'
                affectedPage = p1

                if (i + 1 < blocks.length && blocks[i + 1].op === DIFF_INSERT) {
                    inserted = blocks[i + 1].text.trim()
                    type = 'substitution'
                    affectedPage = blocks[i + 1].p2
                    i++
                }

                const prevIdx = i - (inserted ? 2 : 1)
                if (prevIdx >= 0 && blocks[prevIdx]?.op === DIFF_EQUAL) {
                    const s = blocks[prevIdx].text.replace(/--- Page Break ---/g, '').trimEnd()
                    ctxBefore = s.length > CONTEXT_LEN ? '…' + s.slice(-CONTEXT_LEN) : s
                }
            } else if (op === DIFF_INSERT) {
                inserted = text.trim()
                type = 'insertion'
                affectedPage = p2
                if (i - 1 >= 0 && blocks[i - 1].op === DIFF_EQUAL) {
                    const s = blocks[i - 1].text.replace(/--- Page Break ---/g, '').trimEnd()
                    ctxBefore = s.length > CONTEXT_LEN ? '…' + s.slice(-CONTEXT_LEN) : s
                }
            }

            removed = removed.replace(/--- Page Break ---/g, '').trim()
            inserted = inserted.replace(/--- Page Break ---/g, '').trim()

            if (!removed && !inserted) continue

            const key = `${type}|${removed}|${inserted}`
            if (entriesMap.has(key)) {
                const entry = entriesMap.get(key)
                entry.count++
                entry.pages.add(affectedPage)
            } else {
                entriesMap.set(key, {
                    type, removed, inserted, context: ctxBefore,
                    count: 1, pages: new Set([affectedPage])
                })
            }
        }

        return Array.from(entriesMap.values()).map(e => ({
            ...e,
            pagesArray: Array.from(e.pages).sort((a, b) => a - b)
        })).sort((a, b) => b.count - a.count)
    }

    // ── Changed pages detector ────────────────────────────
    /**
     * Find which 1-indexed page numbers contain changes.
     * Page breaks are marked as '--- Page Break ---' in the extracted text.
     */
    function computeChangedPages(rawDiffs, side) {
        const PAGE_BREAK = '--- Page Break ---'
        const changed = new Set()
        let accumulated = ''

        for (const [op, text] of rawDiffs) {
            const isChange = (side === 'left' && op === DIFF_DELETE) ||
                (side === 'right' && op === DIFF_INSERT)
            const isOtherSide = (side === 'left' && op === DIFF_INSERT) ||
                (side === 'right' && op === DIFF_DELETE)

            if (isOtherSide) continue

            if (isChange) {
                // Count page breaks accumulated so far → current page number
                const pageNum = accumulated.split(PAGE_BREAK).length
                changed.add(pageNum)
            }

            if (op === DIFF_EQUAL) accumulated += text
        }

        return [...changed].sort((a, b) => a - b)
    }

    // ── HTML generator ────────────────────────────────────
    function getDiffHtml(side) {
        let html = ''
        for (const [op, text] of diffs.value) {
            const escaped = text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>')

            if (op === DIFF_EQUAL) {
                html += `<span class="diff-equal">${escaped}</span>`
            } else if (op === DIFF_DELETE && side === 'left') {
                html += `<span class="diff-delete">${escaped}</span>`
            } else if (op === DIFF_INSERT && side === 'right') {
                html += `<span class="diff-insert">${escaped}</span>`
            }
        }
        return html
    }

    const similarityPercent = computed(() => {
        const total = stats.value.added + stats.value.removed + stats.value.unchanged
        if (total === 0) return 0
        return Math.round((stats.value.unchanged / total) * 100)
    })

    return {
        diffs, stats, similarityPercent,
        report, changedPages1, changedPages2,
        computeDiff, getDiffHtml
    }
}
