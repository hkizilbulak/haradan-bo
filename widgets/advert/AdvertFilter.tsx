import { useEffect } from 'react';
import { Col, Form, Row } from 'react-bootstrap';
import { ModerationAdvertStatus } from '@/models';
import { useFormik } from 'formik';
import { appendOperator } from '@/helpers/HelperUtils';

export type IAdvertFilterForm = {
    status?: ModerationAdvertStatus;
}

const initialValues: IAdvertFilterForm = {};

type IProps = {
    onFilter: (values: string) => void;
    tab: 'published' | 'unpublished';
}

export default function AdvertFilter({ onFilter, tab }: IProps) {

    const formik = useFormik({
        initialValues,
        onSubmit: values => {
            let filter = '';

            if (tab === 'published') {
                filter = appendOperator(filter, `status==PUBLISHED`);
            } else {
                if (values.status && (values.status as string) !== '') {
                    filter = appendOperator(filter, `status==${values.status}`);
                } else {
                    filter = appendOperator(filter, `status!=PUBLISHED;status!=DRAFT`);
                }
            }
            onFilter(filter);
        },
    });

    useEffect(() => {
        formik.submitForm();
    }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

    return <Form noValidate onSubmit={formik.handleSubmit} className={'mb-3'}>
        {tab === 'unpublished' && (
        <Row>
            <Form.Group as={Col} md={3}>
                <Form.Select
                    name="status"
                    onChange={(e) => {
                        formik.handleChange(e);
                        formik.submitForm();
                    }}
                    value={formik.values.status || ''}
                >
                    <option value="">Tüm durumlar</option>
                    <option value="PENDING_REVIEW">İnceleme Bekliyor</option>
                    <option value="CHANGES_REQUESTED">Düzeltme İstendi</option>
                    <option value="REJECTED">Reddedildi</option>
                    <option value="SUSPENDED">Askıya Alındı</option>
                    <option value="SOLD">Satıldı</option>
                    <option value="ARCHIVED">Arşivlendi</option>
                </Form.Select>
            </Form.Group>
        </Row>
        )}
    </Form>;
}
