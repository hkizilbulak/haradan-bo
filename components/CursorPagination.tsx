import { Form } from 'react-bootstrap';

type IProps = {
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  pageIndex?: number;
  pageSize?: number;
  totalElements?: number;
  totalPages?: number;
  onPageSizeChange?: (size: number) => void;
  disabled?: boolean;
};

export default function CursorPagination({
  pageIndex = 0,
  pageSize = 10,
  totalElements = 0,
  totalPages = 1,
  onPageSizeChange,
}: IProps) {
  if (totalElements === 0) {
    return null;
  }

  return (
    <div className="d-flex align-items-center text-muted small mt-3">
      <span className="me-2">Sayfa başına:</span>
      <Form.Select 
        size="sm" 
        className="me-3" 
        style={{ width: '70px', display: 'inline-block' }} 
        value={pageSize} 
        onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </Form.Select>
      <span>Toplam {totalElements} kayıt, sayfa {pageIndex + 1} / {totalPages}</span>
    </div>
  );
}
