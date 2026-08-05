import PrepareTableHead from "./PrepareTableHead";
import { Table } from 'react-bootstrap';
import CustomPagination from "./Pagination";
import { Page } from "@/models/common";

type IProps = {
    headItems: string[],
    page?: Page,
    content?: any;
    onHandlePageChange: (page: number) => void
}

const PrepareTable = ({
    headItems,
    page,
    content,
    onHandlePageChange
}: IProps) => {
    console.log('content:', typeof content)
    return (

        <>
            <Table responsive hover className="text-nowrap">
                <PrepareTableHead headItems={headItems} />
                <tbody>
                    {content}
                </tbody>
            </Table>
            <CustomPagination
                page={page}
                onPageChange={page => onHandlePageChange(page)}
            />
        </>
    );
}

export default PrepareTable;