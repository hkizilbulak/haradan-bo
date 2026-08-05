type IProps = {
    headItems: string[]
}

const PrepareTableHead = ({
    headItems
}: IProps) => {
    return (
        <thead>
            <tr>
                {headItems.map((item, index) => {
                    return <th key={index} scope="col" className="fw-bold">{item}</th>
                })}
            </tr>
        </thead>

    );
}

export default PrepareTableHead;