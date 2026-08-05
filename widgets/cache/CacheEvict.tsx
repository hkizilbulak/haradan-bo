import { Col, Form, Button, Row } from 'react-bootstrap';
import { useEffect } from 'react';
import FormTextField from '@/components/FormTextField';
import FormSelectField from '@/components/FormSelectField';
import { Formik } from 'formik';
import * as Yup from 'yup';
import PrepareOption, { OptionTypes } from '@/components/PrepareOption';

export type ICacheEvictForm = {
    type?: string;
    cacheName?: string;
    cacheKeyName?: string;
}

const initialValues: ICacheEvictForm = { type: '', cacheName: '', cacheKeyName: '' };

type IProps = {
    onHandleEvict: (value: ICacheEvictForm) => void;
}

export default function CacheEvict({ onHandleEvict }: IProps) {


    const validationSchema = Yup.object().shape({
        type: Yup.string()
            .required('Tür zorunludur'),
        cacheName: Yup.string().when('type', {
            is: (type: string) => type === "cacheValue" || type === "singleCacheValue",
            then: () => Yup.string()
                .required('Cache Name zorunludur'),
        }),
        cacheKeyName: Yup.string().when('type', {
            is: (type: string) => type === "singleCacheValue",
            then: () => Yup.string()
                .required('Cache Key Name zorunludur'),
        }),
    });

    const handleSubmit = async (values: ICacheEvictForm) => {
        onHandleEvict(values)
    }

    return (
        <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
        >
            {({ handleSubmit,
                isValid,
                isSubmitting, values, setFieldValue, }) => {

                useEffect(() => {
                    setFieldValue('cacheName', '')
                    setFieldValue('cacheKeyName', '')
                }, [values.type]);

                return <Form noValidate onSubmit={handleSubmit}>
                    <Row>
                        <FormSelectField
                            as={Col}
                            md={3}
                            controlId="validationType"
                            type="select"
                            name="type"
                        >
                            <PrepareOption enumType={OptionTypes.CACHE_EVICT_TYPE_OPTION} />
                        </FormSelectField>
                        {(values.type === 'cacheValue' || values.type === 'singleCacheValue') && <FormTextField
                            as={Col}
                            md={3}
                            controlId="validationCacheName"
                            type="text"
                            name="cacheName"
                        />}
                        {values.type === 'singleCacheValue' && <FormTextField
                            as={Col}
                            md={3}
                            controlId="validationCacheKeyName"
                            type="text"
                            name="cacheKeyName"
                        />}
                        <Form.Group as={Col} md={3} className={`mb-3`}>
                            <Button
                                disabled={!isValid || isSubmitting}
                                variant="danger"
                                as="input"
                                type="submit"
                                value={'Cache Sil'}
                            />
                        </Form.Group>
                    </Row>
                </Form>
            }}
        </Formik>
    );
}