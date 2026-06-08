'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'

// pdfjs-dist v4.x (bundled with react-pdf v9) ships an ESM worker (.mjs)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export interface SelectionInfo {
  text: string
  pageNum: number
  rect: DOMRect          // viewport-relative bounding rect of selection
}

interface Props {
  url: string
  canAnnotate: boolean   // false for authors — disables the selection popup
  onSelect?: (info: SelectionInfo) => void
}

export default function PdfViewer({ url, canAnnotate, onSelect }: Props) {
  const [numPages, setNumPages] = useState(0)
  const [loadError, setLoadError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setLoadError(false)
  }

  const handleMouseUp = useCallback(() => {
    if (!canAnnotate || !onSelect) return
    const sel = window.getSelection()
    const text = sel?.toString().trim()
    if (!text || text.length < 2) return

    // Find which page the anchor node belongs to
    const range = sel?.getRangeAt(0)
    if (!range) return
    const rect = range.getBoundingClientRect()

    // Walk up to find the react-pdf page wrapper and its page number
    let node: HTMLElement | null = range.startContainer.parentElement
    let pageNum = 1
    while (node) {
      const p = node.getAttribute?.('data-page-number')
      if (p) { pageNum = parseInt(p); break }
      node = node.parentElement
    }

    onSelect({ text, pageNum, rect })
    // Keep selection visible so user sees what they highlighted
  }, [canAnnotate, onSelect])

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      style={{ width: '100%', userSelect: 'text', cursor: 'text' }}
    >
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={() => setLoadError(true)}
        loading={
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>
            Loading PDF…
          </div>
        }
        error={
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>
            {loadError ? 'Could not load PDF. The presigned URL may have expired — try refreshing.' : ''}
          </div>
        }
      >
        {Array.from({ length: numPages }, (_, i) => (
          <div key={i + 1} data-page-number={i + 1} style={{ marginBottom: 12 }}>
            <Page
              pageNumber={i + 1}
              width={containerRef.current?.clientWidth ?? 600}
              renderAnnotationLayer={false}
            />
          </div>
        ))}
      </Document>
    </div>
  )
}
