import React from 'react';
import { Card } from 'react-bootstrap';
import { Skeleton } from './Skeleton';

interface LoadingProps {
  rows?: number;
}

const Loading: React.FC<LoadingProps> = ({ rows = 3 }) => {
  return (
    <Card className="border-0 shadow-sm p-4 mb-4" style={{ borderRadius: '12px' }}>
      <div className="d-flex align-items-center gap-3 mb-4">
        <Skeleton width="40px" height="40px" borderRadius="10px" />
        <div className="flex-grow-1">
          <Skeleton width="30%" height="1.1rem" className="mb-2" />
          <Skeleton width="50%" height="0.85rem" />
        </div>
      </div>
      <div className="d-flex flex-column gap-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="d-flex align-items-center justify-content-between gap-3">
            <Skeleton width="40%" height="1rem" />
            <Skeleton width="25%" height="1rem" />
            <Skeleton width="15%" height="1rem" />
          </div>
        ))}
      </div>
    </Card>
  );
};

export default Loading;