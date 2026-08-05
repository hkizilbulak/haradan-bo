import { Col, Form, Button, Offcanvas } from 'react-bootstrap';
import FormTextField from '@/components/FormTextField';
import FormSelectField from '@/components/FormSelectField';
import { Formik } from 'formik';
import * as Yup from 'yup';
import PrepareOption, { OptionTypes } from '@/components/PrepareOption';
import { copyMatchingKeyValues } from '@/helpers/HelperUtils';
import { UserRequest, UserResponse } from '@/models';
import { ChannelTypeEnum, EntityStatusEnum } from '@/models/enums';
import { PatternFormat } from 'react-number-format';
import MaskedFormTextField from '@/components/MaskedFormTextField';

const initialValues: UserRequest = {
    identifier: '',
    channel: ChannelTypeEnum.ADMIN_FORM,
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    status: EntityStatusEnum.ACTIVE,
    admin: 'false'
};

type IProps = {
    selectedUser?: UserResponse;
    onClose: () => void;
    onHandleSave: (value: UserRequest) => void;

}

export default function UserModal({ selectedUser, onClose, onHandleSave }: IProps) {


    const validationSchema = Yup.object().shape({
        firstName: Yup.string()
            .required('Ad zorunludur'),
        lastName: Yup.string()
            .required('Soyad zorunludur'),
        email: Yup.string()
            .required('E-posta adresi zorunludur')
            .email('Geçerli bir e-posta adresi girin'),
        password: Yup.string()
            .required('Şifre zorunludur'),
        phoneNumber: Yup.string()
            .required('Telefon No zorunludur'),
        status: Yup.string()
            .required('Statü zorunludur')
    });

    const handleSubmit = async (values: UserRequest) => {
        onHandleSave(values)
    }

    const isNew = !selectedUser?.identifier;
    const initialValuesCopy = Object.assign({}, initialValues);
    const user = isNew ? initialValues : copyMatchingKeyValues(initialValuesCopy, selectedUser);

    return <Offcanvas show={true} onHide={onClose} scroll={true} placement={'end'}>
        <Offcanvas.Header closeButton>
            <Offcanvas.Title>{isNew ? "Yeni Kullanıcı Ekle" : "Kullanıcı Düzenle"}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
            <Formik
                initialValues={user}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ handleSubmit,
                    isValid,
                    isSubmitting, }) => {

                    return <Form noValidate onSubmit={handleSubmit}>
                        {!isNew &&
                            <FormTextField
                                as={Col}
                                md={12}
                                disabled={true}
                                label="ID"
                                type="text"
                                name="identifier"
                            />}
                        <FormTextField
                            as={Col}
                            md={12}
                            controlId="validationFirstName"
                            label="Ad"
                            type="text"
                            name="firstName"
                        />
                        <FormTextField
                            as={Col}
                            md={12}
                            controlId="validationLastName"
                            label="Soyad"
                            type="text"
                            name="lastName"
                        />
                        {isNew && <>
                            <FormTextField
                                as={Col}
                                md={12}
                                controlId="validationEmail"
                                label="E-posta Adresi"
                                type="text"
                                name="email"
                            />
                            <FormTextField
                                as={Col}
                                md={12}
                                controlId="validationPassword"
                                label="Şifre"
                                type="password"
                                name="password"
                            /></>}
                        <MaskedFormTextField
                            as={Col}
                            md={12}
                            controlId="validationPhoneNumber"
                            label="Telefon No"
                            type="text"
                            name="phoneNumber"
                            inputAs={PatternFormat}
                        />
                        <FormSelectField
                            as={Col}
                            md={12}
                            controlId="validationStatu"
                            label="Statü"
                            type="select"
                            name="status"
                        >
                            <PrepareOption enumType={OptionTypes.ENTITY_STATUS_OPTION} />
                        </FormSelectField>
                        <FormSelectField
                            as={Col}
                            md={12}
                            controlId="validationAdmin"
                            label="Admin"
                            type="select"
                            name="admin"
                        >
                            <PrepareOption enumType={OptionTypes.YES_NO_OPTION} />
                        </FormSelectField>
                        <Button
                            disabled={!isValid || isSubmitting}
                            variant="primary"
                            as="input"
                            type="submit"
                            value={isNew ? "Ekle" : "Güncelle"}
                        />
                    </Form>
                }}
            </Formik>
        </Offcanvas.Body>
    </Offcanvas>

}