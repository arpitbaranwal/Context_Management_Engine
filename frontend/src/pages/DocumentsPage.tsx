import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { EmptyState, Notice } from '../components/ui/Feedback'
import { PageHeader } from '../components/ui/PageHeader'
import { DocumentList, DocumentListSkeleton } from '../features/documents/DocumentList'
import { UploadDialog } from '../features/upload/UploadDialog'
import { useDocuments } from '../state/documents'

export default function DocumentsPage() {
  const { documents, loading, error, refresh } = useDocuments()
  const [uploading, setUploading] = useState(false)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="Documents"
        description="Manage the documents used by your research workspace."
        actions={<Button variant="primary" icon={<Plus aria-hidden className="size-4" />} onClick={() => setUploading(true)}>Upload</Button>}
      />
      {error && <Notice action={<Button size="sm" onClick={() => void refresh()}>Retry</Button>}>{error}</Notice>}
      {loading ? <DocumentListSkeleton rows={4} /> : documents.length === 0 && !error ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="No documents yet." body="Upload a document to start researching." action={<Button variant="primary" onClick={() => setUploading(true)}>Upload document</Button>} />
        </div>
      ) : <DocumentList documents={documents} />}
      <UploadDialog open={uploading} onClose={() => setUploading(false)} />
    </div>
  )
}
