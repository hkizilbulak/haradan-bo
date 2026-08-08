import { Button } from 'react-bootstrap';

type IProps = {
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  pageIndex?: number;
  disabled?: boolean;
};

export default function CursorPagination({
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  pageIndex = 0,
  disabled = false,
}: IProps) {
  if (!canGoPrev && !canGoNext) {
    return null;
  }

  return (
    <div className="d-flex justify-content-center align-items-center gap-3 mt-3">
      <Button
        size="sm"
        variant="outline-secondary"
        disabled={disabled || !canGoPrev}
        onClick={onPrev}
      >
        ← Önceki
      </Button>
      <span className="text-muted small">Sayfa {pageIndex + 1}</span>
      <Button
        size="sm"
        variant="outline-secondary"
        disabled={disabled || !canGoNext}
        onClick={onNext}
      >
        Sonraki →
      </Button>
    </div>
  );
}
