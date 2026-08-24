import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { studFarmService } from '@/services';
import { toast } from 'react-toastify';
import { StudFarm } from '@/models/StudFarm';

interface AddStudFarmModalProps {
    show: boolean;
    onHide: () => void;
    onSuccess: (newStudFarm: StudFarm) => void;
}

export default function AddStudFarmModal({ show, onHide, onSuccess }: AddStudFarmModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        location: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.firstName || !formData.lastName || !formData.email) {
            toast.error("İsim, Soyisim ve E-posta alanları zorunludur.");
            return;
        }

        try {
            setLoading(true);
            const res = await studFarmService.createStudFarm(formData);
            toast.success("Hara başarıyla eklendi.");
            onSuccess(res);
            handleClose();
        } catch (error: any) {
            const errorMsg = error?.response?.data?.message || "Hara eklenirken bir hata oluştu.";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            location: ''
        });
        onHide();
    };

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Form onSubmit={handleSubmit}>
                <Modal.Header closeButton>
                    <Modal.Title>Yeni Hara Ekle</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>İsim <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="firstName"
                            placeholder="Ad giriniz"
                            value={formData.firstName}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                        <Form.Label>Soyad <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="text"
                            name="lastName"
                            placeholder="Soyad giriniz"
                            value={formData.lastName}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>E-posta <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            type="email"
                            name="email"
                            placeholder="E-posta adresi giriniz"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Telefon</Form.Label>
                        <Form.Control
                            type="text"
                            name="phone"
                            placeholder="Telefon numarası giriniz (Opsiyonel)"
                            value={formData.phone}
                            onChange={handleChange}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Konum</Form.Label>
                        <Form.Control
                            type="text"
                            name="location"
                            placeholder="Konum giriniz (Opsiyonel)"
                            value={formData.location}
                            onChange={handleChange}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose} disabled={loading}>
                        İptal
                    </Button>
                    <Button variant="primary" type="submit" disabled={loading} style={{ backgroundColor: '#6f42c1', borderColor: '#6f42c1' }}>
                        {loading ? 'Ekleniyor...' : 'Kaydet'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
