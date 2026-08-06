import React from 'react';
import { DOTS, usePagination } from '@/hooks/usePagination';
import { Pagination } from 'react-bootstrap';
import { Page } from '@/models/common';

type IProps = {
    page?: Page,
    siblingCount?: number,
    onPageChange: (pageNumber: number) => void;
}
const CustomPagination = ({ onPageChange, page, siblingCount = 1 }: IProps) => {
    const currentPage = page?.number ?? 0;
    const totalCount = page?.totalElements ?? 0;
    const pageSize = page?.size ?? 1;

    const paginationRange = usePagination({
        currentPage,
        totalCount,
        siblingCount,
        pageSize
    });

    if (!page) {
        return null;
    }

    if (currentPage === -1 || (paginationRange && paginationRange.length < 2)) {
        return null;
    }

    const onNext = () => {
        onPageChange(currentPage + 1);
    };

    const onPrevious = () => {
        onPageChange(currentPage - 1);
    };

    let lastPage = paginationRange && paginationRange[paginationRange.length - 1];
    return (

        <Pagination className='d-flex justify-content-center'>
            <Pagination.Prev disabled={currentPage + 1 === 1} onClick={onPrevious} />
            {paginationRange?.map((pageNumber, index) => {
                if (pageNumber === DOTS) {
                    return <Pagination.Ellipsis key={index} />
                }

                const newPageNumber = typeof pageNumber === 'number' ? pageNumber - 1 : 0;
                return (
                    <Pagination.Item key={index} onClick={() => onPageChange(newPageNumber)} active={newPageNumber === currentPage}>{pageNumber}</Pagination.Item>
                );
            })}
            <Pagination.Next disabled={currentPage + 1 === lastPage} onClick={onNext} />
        </Pagination>
    );
};

export default CustomPagination;
