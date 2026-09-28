import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ErrorMessage } from './ErrorMessage';

// "Are you sure?" dialog used before deleting a project or a task.
export function ConfirmDialog({ title, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setIsWorking(true);
    setError('');
    try {
      await onConfirm();
    } catch (confirmError) {
      setError(confirmError.message);
      setIsWorking(false);
    }
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <p>{message}</p>
      <ErrorMessage message={error} />
      <div className="form-actions">
        <Button variant="secondary" onClick={onCancel} disabled={isWorking}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          isLoading={isWorking}
          loadingText="Deleting…"
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
