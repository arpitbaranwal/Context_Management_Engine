import { Overlay } from '../../components/ui/Overlay'
import type { Source } from '../../api/types'

export function SourceDrawer({ source, onClose }: { source: Source | null; onClose: () => void }) {
  return (
    <Overlay open={!!source} onClose={onClose} placement="right" title={source ? `${source.label} · ${source.documentName}` : 'Source'}>
      {source && (
        <div>
          <p className="mb-4 flex gap-4 text-[13px] text-muted">
            {source.page != null && <span>Page {source.page}</span>}
            <span>Chunk {source.chunkId}</span>
            <span>{source.text.length.toLocaleString()} characters</span>
          </p>
          <p className="whitespace-pre-wrap font-serif text-[16.5px] leading-relaxed">{source.text}</p>
        </div>
      )}
    </Overlay>
  )
}
