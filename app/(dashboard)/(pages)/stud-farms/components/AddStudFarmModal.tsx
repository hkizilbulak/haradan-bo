import React, { useState, useEffect } from 'react';
import { Offcanvas, Button, Form } from 'react-bootstrap';
import { studFarmService } from '@/services';
import { toast } from 'react-toastify';
import { StudFarm } from '@/models/StudFarm';

interface AddStudFarmModalProps {
    show: boolean;
    onHide: () => void;
    onSuccess: (newStudFarm: StudFarm) => void;
    existingStudFarm?: StudFarm | null;
}

export default function AddStudFarmModal({ show, onHide, onSuccess, existingStudFarm }: AddStudFarmModalProps) {
    const [loading, setLoading] = useState(false);
    
    useEffect(() => {
        if (show && existingStudFarm) {
            setFormData({
                firstName: existingStudFarm.firstName || '',
                lastName: existingStudFarm.lastName || '',
                email: existingStudFarm.email || '',
                phone: existingStudFarm.phone || '',
                location: existingStudFarm.location || ''
            });
        }
    }, [show, existingStudFarm]);

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
            toast.error("Hara Adı, Hara Sorumlusu Ad Soyadı ve E-posta alanları zorunludur.");
            return;
        }


        try {
            setLoading(true);
            if (existingStudFarm) {
                await studFarmService.updateStudFarm(existingStudFarm.id, formData);
                toast.success("Hara başarıyla güncellendi.");
                onSuccess({ ...existingStudFarm, ...formData } as StudFarm);
            } else {
                const res = await studFarmService.createStudFarm(formData);
                toast.success("Hara başarıyla eklendi.");
                onSuccess(res);
            }
            handleClose();
        } catch (error: any) {
            const errorMsg = error?.response?.data?.message || "İşlem sırasında bir hata oluştu.";
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
        <Offcanvas show={show} onHide={handleClose} placement="end" style={{ maxWidth: 540 }} className="w-100">
            <Offcanvas.Header closeButton>
                <Offcanvas.Title className="h5 mb-0">{existingStudFarm ? 'Hara Düzenle' : 'Yeni Hara Ekle'}</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
                <Form onSubmit={handleSubmit} className="d-flex flex-column h-100">
                    <div className="flex-grow-1">
                        <Form.Group className="mb-3">
                            <Form.Label>Hara Adı <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="text"
                                name="firstName"
                                placeholder="Hara Adı giriniz"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                            />
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                            <Form.Label>Hara Sorumlusu Ad Soyadı <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                type="text"
                                name="lastName"
                                placeholder="Ad Soyad giriniz"
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
                    </div>
                    
                    <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                        <Button variant="secondary" onClick={handleClose} disabled={loading}>
                            İptal
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading} style={{ backgroundColor: '#6f42c1', borderColor: '#6f42c1' }}>
                            {loading ? 'Ekleniyor...' : 'Kaydet'}
                        </Button>
                    </div>
                </Form>
            </Offcanvas.Body>
        </Offcanvas>
    );
}
