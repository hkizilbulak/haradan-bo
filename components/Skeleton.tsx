import React from 'react';
import { Card, Row, Col, Table } from 'react-bootstrap';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius,
  className = '',
  style = {},
}) => {
  return (
    <span
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
};

interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ columns = 5, rows = 5 }) => {
  return (
    <div className="table-responsive">
      <Table responsive hover className="text-nowrap mb-0">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, colIdx) => (
              <th key={colIdx}>
                <Skeleton width={`${50 + Math.random() * 30}%`} height="1.1rem" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx}>
                  <Skeleton
                    width={colIdx === 0 ? '70%' : colIdx === columns - 1 ? '40%' : '55%'}
                    height="1rem"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

interface CardSkeletonProps {
  count?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ count = 4 }) => {
  return (
    <Row className="g-4 mb-6">
      {Array.from({ length: count }).map((_, idx) => (
        <Col xl={3} lg={6} md={6} sm={12} key={idx}>
          <Card className="border-0 shadow-sm h-100 p-3">
            <Card.Body className="d-flex align-items-center gap-3 p-2">
              <Skeleton width="48px" height="48px" borderRadius="12px" />
              <div className="flex-grow-1">
                <Skeleton width="60%" height="0.85rem" className="mb-2" />
                <Skeleton width="40%" height="1.4rem" />
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default Skeleton;
