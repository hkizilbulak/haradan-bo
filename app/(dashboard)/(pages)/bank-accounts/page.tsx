"use client";
import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Modal, Form, Badge, Dropdown, Toast, ToastContainer } from 'react-bootstrap';
import { Plus, Edit2, Trash2, MoreVertical } from 'react-feather';
import { bankAccountService, BankAccount, BankAccountCreateRequest } from '@/services/bank-account.service';

export default function BankAccountsPage() {
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [formData, setFormData] = useState<BankAccountCreateRequest>({
        bank_name: '',
        account_holder: '',
        iban: '',
        branch_name: '',
        account_number: '',
        is_active: true,
        display_order: 0,
    });
    const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; target: number | null }>({ show: false, target: null });
    const [toastMessage, setToastMessage] = useState<{ show: boolean, message: string, variant: string }>({ show: false, message: '', variant: 'success' });

    const loadAccounts = async () => {
        try {
            setLoading(true);
            const data = await bankAccountService.getAllAdmin();
            setAccounts(data);
        } catch (error) {
            console.error('Failed to load bank accounts', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAccounts();
    }, []);

    const openModal = (account?: BankAccount) => {
        if (account) {
            setEditingAccount(account);
            setFormData({
                bank_name: account.bank_name,
                account_holder: account.account_holder,
                iban: account.iban,
                branch_name: account.branch_name || '',
                account_number: account.account_number || '',
                is_active: account.is_active,
                display_order: account.display_order,
            });
        } else {
            setEditingAccount(null);
            setFormData({
                bank_name: '',
                account_holder: '',
                iban: '',
                branch_name: '',
                account_number: '',
                is_active: true,
                display_order: 0,
            });
        }
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            // Very simple IBAN format masking cleanup if needed
            const payload = {
                ...formData,
                iban: formData.iban.replace(/\s+/g, '').toUpperCase()
            };

            if (editingAccount) {
                await bankAccountService.update(editingAccount.id, payload);
                setToastMessage({ show: true, message: 'Banka hesabı başarıyla güncellendi.', variant: 'success' });
            } else {
                await bankAccountService.create(payload);
                setToastMessage({ show: true, message: 'Banka hesabı başarıyla eklendi.', variant: 'success' });
            }
            setShowModal(false);
            loadAccounts();
        } catch (error) {
            console.error('Failed to save bank account', error);
            setToastMessage({ show: true, message: 'Kaydetme başarısız oldu.', variant: 'danger' });
        }
    };

    const handleDelete = (id: number) => {
        setDeleteConfirm({ show: true, target: id });
    };

    const confirmDelete = async () => {
        if (!deleteConfirm.target) return;
        try {
            await bankAccountService.delete(deleteConfirm.target);
            setToastMessage({ show: true, message: 'Banka hesabı başarıyla silindi.', variant: 'success' });
            loadAccounts();
        } catch (error) {
            console.error('Failed to delete', error);
            setToastMessage({ show: true, message: 'Silme işlemi başarısız oldu.', variant: 'danger' });
        } finally {
            setDeleteConfirm({ show: false, target: null });
        }
    };

    const handleToggleActive = async (account: BankAccount) => {
        try {
            await bankAccountService.update(account.id, {
                bank_name: account.bank_name,
                account_holder: account.account_holder,
                iban: account.iban,
                branch_name: account.branch_name,
                account_number: account.account_number,
                is_active: !account.is_active,
                display_order: account.display_order
            });
            loadAccounts();
        } catch (error) {
            console.error('Failed to toggle status', error);
        }
    };

    const formatIban = (iban: string) => {
        const val = iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
        return val;
    };

    return (
        <Container fluid className="page-container px-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="fw-bold mb-0">Banka Hesapları</h3>
                    <p className="text-muted">Sistemde tanımlı banka ve IBAN hesaplarını yönetin.</p>
                </div>
                <Button variant="primary" onClick={() => openModal()} className="d-flex align-items-center">
                    <Plus size={16} className="me-2" /> Yeni Hesap Ekle
                </Button>
            </div>

            <Card className="border-0 shadow-sm">
                <Card.Body className="p-0">
                    <Table responsive hover className="mb-0 align-middle">
                        <thead className="bg-light">
                            <tr>
                                <th className="ps-4">Banka Adı</th>
                                <th>Hesap Sahibi</th>
                                <th>IBAN</th>
                                <th>Şube / Hesap No</th>
                                <th>Sıra</th>
                                <th>Durum</th>
                                <th className="text-end pe-4">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-4">Yükleniyor...</td></tr>
                            ) : accounts.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-4 text-muted">Kayıtlı banka hesabı bulunamadı.</td></tr>
                            ) : (
                                accounts.map(account => (
                                    <tr key={account.id}>
                                        <td className="ps-4 fw-medium">{account.bank_name}</td>
                                        <td>{account.account_holder}</td>
                                        <td>
                                            <code className="text-dark bg-light px-2 py-1 rounded">
                                                {formatIban(account.iban)}
                                            </code>
                                        </td>
                                        <td>
                                            <div className="small text-muted">{account.branch_name || '-'}</div>
                                            <div className="small fw-medium">{account.account_number || '-'}</div>
                                        </td>
                                        <td>{account.display_order}</td>
                                        <td>
                                            <Form.Check 
                                                type="switch"
                                                id={`status-${account.id}`}
                                                checked={account.is_active}
                                                onChange={() => handleToggleActive(account)}
                                                label={account.is_active ? <Badge bg="success">Aktif</Badge> : <Badge bg="secondary">Pasif</Badge>}
                                            />
                                        </td>
                                        <td className="text-end pe-4">
                                            <div className="d-flex justify-content-end gap-2">
                                                <Button variant="outline-secondary" className="d-inline-flex align-items-center justify-content-center p-0" style={{ width: '28px', height: '28px' }} onClick={() => openModal(account)} title="Düzenle">
                                                    <Edit2 size={14} />
                                                </Button>
                                                <Button variant="outline-danger" className="d-inline-flex align-items-center justify-content-center p-0" style={{ width: '28px', height: '28px' }} onClick={() => handleDelete(account.id)} title="Sil">
                                                    <Trash2 size={14} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{editingAccount ? 'Hesabı Düzenle' : 'Yeni Hesap Ekle'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Banka Adı <span className="text-danger">*</span></Form.Label>
                            <Form.Control 
                                type="text" 
                                value={formData.bank_name}
                                onChange={e => setFormData({...formData, bank_name: e.target.value})}
                                placeholder="Örn: Garanti BBVA"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Hesap Sahibi (Alıcı Adı) <span className="text-danger">*</span></Form.Label>
                            <Form.Control 
                                type="text" 
                                value={formData.account_holder}
                                onChange={e => setFormData({...formData, account_holder: e.target.value})}
                                placeholder="Örn: Haradan Tarım Hayvancılık A.Ş."
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>IBAN <span className="text-danger">*</span></Form.Label>
                            <Form.Control 
                                type="text" 
                                value={formatIban(formData.iban)}
                                onChange={e => {
                                    const raw = e.target.value.replace(/[^A-Za-z0-9]/g, '');
                                    setFormData({...formData, iban: raw});
                                }}
                                maxLength={34} // IBAN spaces included approx
                                placeholder="TR00 0000 0000 0000 0000 0000 00"
                            />
                        </Form.Group>
                        <div className="row">
                            <Form.Group className="mb-3 col-6">
                                <Form.Label>Şube Adı</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    value={formData.branch_name}
                                    onChange={e => setFormData({...formData, branch_name: e.target.value})}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3 col-6">
                                <Form.Label>Hesap No</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    value={formData.account_number}
                                    onChange={e => setFormData({...formData, account_number: e.target.value})}
                                />
                            </Form.Group>
                        </div>
                        <div className="row">
                            <Form.Group className="mb-3 col-6">
                                <Form.Label>Sıra No (Display Order)</Form.Label>
                                <Form.Control 
                                    type="number" 
                                    value={formData.display_order}
                                    onChange={e => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                                />
                            </Form.Group>
                            <Form.Group className="mb-3 col-6 d-flex flex-column justify-content-end pb-2">
                                <Form.Check 
                                    type="checkbox" 
                                    label="Aktif Hesap" 
                                    checked={formData.is_active}
                                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                                />
                            </Form.Group>
                        </div>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="light" onClick={() => setShowModal(false)}>İptal</Button>
                    <Button variant="primary" onClick={handleSave} disabled={!formData.bank_name || !formData.account_holder || formData.iban.length < 20}>Kaydet</Button>
                </Modal.Footer>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={deleteConfirm.show} onHide={() => setDeleteConfirm({ show: false, target: null })} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="text-danger fw-bold fs-5">
                        Hesabı Sil
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-2 pb-4">
                    <p className="mb-0 text-secondary" style={{ fontSize: '15px' }}>
                        Bu banka hesabını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                    </p>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="light" className="fw-medium px-4" onClick={() => setDeleteConfirm({ show: false, target: null })}>
                        İptal
                    </Button>
                    <Button variant="danger" className="fw-medium px-4" onClick={confirmDelete}>
                        Evet, Sil
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Toast Notifications */}
            <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 9999 }}>
                <Toast show={toastMessage.show} onClose={() => setToastMessage({ ...toastMessage, show: false })} bg={toastMessage.variant} delay={3000} autohide>
                    <Toast.Body className="text-white d-flex align-items-center fw-medium">
                        {toastMessage.message}
                    </Toast.Body>
                </Toast>
            </ToastContainer>
        </Container>
    );
}
