"use client"
import { useState } from "react";
import StatusBadge from '@/components/StatusBadge';
import { formatDateForText } from '@/helpers/DateUtils';
import { PaymentResponse } from '@/models';
import { paymentService } from '@/services';
import { PageHeading } from '@/widgets';
import PaymentFilter from '@/widgets/payment/PaymentFilter';
import PaymentModal from '@/widgets/payment/PaymentModal';
import { Col, Row, Container } from 'react-bootstrap';
import { capitalizeSentence } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';

const headItems = [
    'İlan ID',
    'Ad Soyad',
    'E-posta Adresi',
    'Ödeme Tarihi',
    'Tutar',
    'Durum',
    ''
]

export default function Payments() {

    const [{ data, isLoading, handleFilter, handlePageChange }] = useApi<PaymentResponse>({ service: paymentService });
    const { isModalOpen, openModal, closeModal, modalContent } = useModal();
    const [openFilter, setOpenFilter] = useState(false);

    const openPaymentModal = (payment?: PaymentResponse) => {
        openModal(<PaymentModal selectedPayment={payment} onClose={closeModal} />)
    }

    const content = data?.content?.map((payment) => (
        <tr key={payment.identifier}>
            <td>{payment.productId}</td>
            <td>{capitalizeSentence(payment.userName)}</td>
            <td>{payment.userEmail}</td>
            <td>{formatDateForText(payment.createDate)}</td>
            <td>{payment.paymentAmount}</td>
            <td><StatusBadge status={payment.status} /></td>
            <td>
                <a
                    className="font-medium text-cyan-600 me-5"
                    onClick={() => openPaymentModal(payment)}>
                    <i className={`fe fe-eye`}></i>
                </a></td>
        </tr>));

    return (

        <Container fluid className="p-3 lg:p-6">
            <Row>
                <Col lg={12} md={12} sm={12}>
                    <PageHeading
                        heading='Ödemeler'
                        showCreateButton={false}
                        onToggleFilter={() => setOpenFilter(!openFilter)} />
                </Col>
            </Row>

            {openFilter && <PaymentFilter onFilter={(values: string) => handleFilter(values)} />}

            {isModalOpen && modalContent}

            {isLoading && <Loading />}

            {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={(page) => handlePageChange(page)} />}

        </Container>

    );

}
