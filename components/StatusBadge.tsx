import { getGenericStatusText } from "@/helpers/EnumUtils";
import { Badge } from "react-bootstrap";

type IProps = {
    status?: string | null
}

const StatusBadge = ({
    status
}: IProps) => {

    const getBadgeClass = () => {
        if (status === 'ACTIVE' || status === 'SUCCEEDED' || status === 'PUBLISHED') return "success"
        if (status === 'DELETED' || status === 'FAILED' || status === 'CLOSED' || status === 'REJECTED') return "danger"
        if (status === 'WAITING_APPROVAL' || status === 'PENDING_REVIEW' || status === 'QUEUED' || status === 'CHANGES_REQUESTED') return "warning"
        if (status === 'PASSIVE' || status === 'INACTIVE' || status === 'DISABLED' || status === 'ARCHIVED' || status === 'CANCELLED' || status === 'SUSPENDED') return "secondary"
        if (status === 'NOT_COMPLETED') return "light"
        if (status === 'SOLD' || status === 'RUNNING' || status === 'LEASED' || status === 'PARTIAL_SUCCESS') return "info"
        if (status === 'DEFAULT' || status === 'DRAFT') return "primary"
        return "primary"
    }

    const badgeClass = getBadgeClass();

    return (
        <Badge bg={badgeClass} text={badgeClass === 'light' ? 'dark' : 'white'}>{getGenericStatusText(status ?? undefined)}</Badge>
    );
}

export default StatusBadge;