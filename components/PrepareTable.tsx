import { ReactNode } from "react";
import PrepareTableHead from "./PrepareTableHead";
import { Table } from 'react-bootstrap';
import CustomPagination from "./Pagination";
import { Page } from "@/models/common";
import { Skeleton } from "./Skeleton";

type IProps = {
    headItems: string[],
    page?: Page,
    content?: ReactNode;
    isLoading?: boolean;
    skeletonRows?: number;
    onHandlePageChange: (page: number) => void
}

const PrepareTable = ({
    headItems,
    page,
    content,
    isLoading = false,
    skeletonRows = 5,
    onHandlePageChange
}: IProps) => {
    return (
        <>
            <Table responsive hover className="text-nowrap">
                <PrepareTableHead headItems={headItems} />
                <tbody>
                    {isLoading ? (
                        Array.from({ length: skeletonRows }).map((_, rowIdx) => (
                            <tr key={`sk-row-${rowIdx}`}>
                                {headItems.map((_, colIdx) => (
                                    <td key={`sk-col-${colIdx}`}>
                                        <Skeleton
                                            width={colIdx === 0 ? '75%' : colIdx === headItems.length - 1 ? '40%' : '60%'}
                                            height="1rem"
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        content
                    )}
                </tbody>
            </Table>
            {!isLoading && (
                <CustomPagination
                    page={page}
                    onPageChange={page => onHandlePageChange(page)}
                />
            )}
        </>
    );
}

export default PrepareTable;