import { Overlay } from '../../components/ui/Overlay'
import { Button } from '../../components/ui/Button'
import { UploadPanel } from './UploadPanel'

export function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Overlay open={open} onClose={onClose} title="Upload documents" footer={<Button onClick={onClose}>Done</Button>}>
      <UploadPanel compact />
    </Overlay>
  )
}
