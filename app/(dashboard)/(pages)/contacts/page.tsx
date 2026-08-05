"use client"
import { useState } from "react";
import StatusBadge from '@/components/StatusBadge';
import { formatDateForText } from '@/helpers/DateUtils';
import { ContactResponse } from '@/models';
import { PageHeading } from '@/widgets';
import ContactFilter from '@/widgets/contact/ContactFilter';
import { Col, Row, Container } from 'react-bootstrap';
import { contactService } from '@/services';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import useApi from '@/hooks/useApi';
import { PatternFormat } from 'react-number-format';

const headItems = [
    'Tarih',
    'Ad Soyad',
    'Mesaj',
    'E-posta Adresi',
    'Telefon No',
    'Durum',
]

export default function Contacts() {

    const [{ data, isLoading, handleFilter, handlePageChange }] = useApi<ContactResponse>({ service: contactService });
    const [openFilter, setOpenFilter] = useState(false);

    const content = data?.content?.map((contact) => (
        <tr key={contact.identifier}>
            <td>{formatDateForText(contact.createDate)}</td>
            <td>{contact.name}</td>
            <td>{contact.message}</td>
            <td>{contact.email}</td>
            <td><PatternFormat value={contact.phoneNumber} displayType="text" format="0(###) ### ####" /></td>
            <td><StatusBadge status={contact.status} /></td>
        </tr>));

    return (

        <Container fluid className="p-3 lg:p-6">
            <Row>
                <Col lg={12} md={12} sm={12}>
                    <PageHeading
                        heading='Mesajlar'
                        showCreateButton={false}
                        onToggleFilter={() => setOpenFilter(!openFilter)} />
                </Col>
            </Row>

            {openFilter && <ContactFilter onFilter={(values: string) => handleFilter(values)} />}

            {isLoading && <Loading />}

            {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={(page) => handlePageChange(page)} />}

        </Container>

    );


}
