import { getEntityStatusEnumText } from "@/helpers/EnumUtils";
import { EntityStatusEnum } from '@/models/enums';
import { Badge } from "react-bootstrap";

type IProps = {
    status: EntityStatusEnum
}

const StatusBadge = ({
    status
}: IProps) => {

    const getBadgeClass = () => {
        if (status === EntityStatusEnum.ACTIVE) return "success"
        if (status === EntityStatusEnum.DELETED) return "danger"
        if (status === EntityStatusEnum.WAITING_APPROVAL) return "warning"
        if (status === EntityStatusEnum.PASSIVE) return "secondary"
        if (status === EntityStatusEnum.NOT_COMPLETED) return "light"
        if (status === EntityStatusEnum.SOLD) return "info"
        if (status === EntityStatusEnum.REJECTED) return "dark"
        if (status === EntityStatusEnum.DEFAULT) return "primary"
        return "primary"
    }

    const badgeClass = getBadgeClass();

    return (
        <Badge bg={badgeClass} text={badgeClass === 'light' ? 'dark' : 'white'}>{getEntityStatusEnumText(status)}</Badge>
    );
}

export default StatusBadge;