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
                    const alignCenter = item === 'İşlemler' || item === '';
                    return <th key={index} scope="col" className={`fw-bold ${alignCenter ? 'text-center' : ''}`}>{item}</th>
                })}
            </tr>
        </thead>

    );
}

export default PrepareTableHead;