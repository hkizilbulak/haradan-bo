import React, { useState, useEffect } from 'react';
import { Offcanvas, Button, Form } from 'react-bootstrap';
import { Trash2 } from 'react-feather';
import { studFarmService } from '@/services';
import { toast } from 'react-toastify';
import { StudFarm } from '@/models/StudFarm';
import DeleteModal from '@/components/DeleteModal';

interface AddStudFarmModalProps {
    show: boolean;
    onHide: () => void;
    onSuccess: (newStudFarm: StudFarm) => void;
    onDeleteSuccess?: () => void;
    existingStudFarm?: StudFarm | null;
}

export default function AddStudFarmModal({ show, onHide, onSuccess, onDeleteSuccess, existingStudFarm }: AddStudFarmModalProps) {
    const [loading, setLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
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
        
        if (!formData.firstName.trim()) {
            toast.error("Hara Adı alanı zorunludur.");
            return;
        }

        if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            toast.error("Lütfen geçerli bir e-posta adresi giriniz.");
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

    const handleDelete = async () => {
        if (!existingStudFarm) return;
        try {
            setDeleteLoading(true);
            await studFarmService.deleteStudFarm(existingStudFarm.id);
            toast.success("Hara başarıyla silindi.");
            setShowDeleteModal(false);
            handleClose();
            if (onDeleteSuccess) {
                onDeleteSuccess();
            } else {
                onSuccess(existingStudFarm);
            }
        } catch (error: any) {
            const errorMsg = error?.response?.data?.message || "Hara silinirken bir hata oluştu.";
            toast.error(errorMsg);
        } finally {
            setDeleteLoading(false);
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
        setShowDeleteModal(false);
        onHide();
    };

    return (
        <>
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
                                <Form.Label>Hara Sorumlusu Ad Soyadı</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="lastName"
                                    placeholder="Ad Soyad giriniz (Opsiyonel)"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>E-posta</Form.Label>
                                <Form.Control
                                    type="email"
                                    name="email"
                                    placeholder="E-posta adresi giriniz (Opsiyonel)"
                                    value={formData.email}
                                    onChange={handleChange}
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
                        
                        <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                            {existingStudFarm ? (
                                <Button 
                                    variant="outline-danger" 
                                    type="button" 
                                    onClick={() => setShowDeleteModal(true)} 
                                    disabled={loading || deleteLoading}
                                    className="d-flex align-items-center gap-1"
                                >
                                    <Trash2 size={16} />
                                    <span>Sil</span>
                                </Button>
                            ) : (
                                <div />
                            )}
                            <div className="d-flex gap-2">
                                <Button variant="secondary" onClick={handleClose} disabled={loading || deleteLoading}>
                                    İptal
                                </Button>
                                <Button variant="primary" type="submit" disabled={loading || deleteLoading} style={{ backgroundColor: '#6f42c1', borderColor: '#6f42c1' }}>
                                    {loading ? (existingStudFarm ? 'Güncelleniyor...' : 'Ekleniyor...') : (existingStudFarm ? 'Kaydet' : 'Ekle')}
                                </Button>
                            </div>
                        </div>
                    </Form>
                </Offcanvas.Body>
            </Offcanvas>

            {showDeleteModal && existingStudFarm && (
                <DeleteModal
                    title="Harayı Sil"
                    message={`"${existingStudFarm.firstName}" adlı harayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
                    onClose={() => setShowDeleteModal(false)}
                    isLoading={deleteLoading}
                    onHandleDelete={handleDelete}
                />
            )}
        </>
    );
}
