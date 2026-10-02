"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Row, Col, Card, Form, Button, Toast, ToastContainer, ButtonGroup, ToggleButton, Dropdown, Modal } from 'react-bootstrap';
import { Copy, Send, Phone, MessageCircle, Mail, Smartphone, Edit2, Plus, Trash2 } from 'react-feather';
import { communicationTemplateService, CommunicationTemplate } from '@/services/communication-template.service';
import { useSession } from '@/context/AuthContext';

interface TemplateFormState {
  title: string;
  activeChannel: string;
  contents: {
    [key: string]: string;
  };
}

function CommunicationTemplatesContent() {
    const searchParams = useSearchParams();
    const initialStudName = searchParams?.get('stud_name') || '';
    const initialPersonName = searchParams?.get('person_name') || '';
    const initialPhone = searchParams?.get('phone') || '';

    const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
    const [loading, setLoading] = useState(true);

    const [studName, setStudName] = useState(initialStudName);
    const [personName, setPersonName] = useState(initialPersonName);
    const [phone, setPhone] = useState(initialPhone);
    const [channel, setChannel] = useState<string>('PHONE');
    const [topic, setTopic] = useState<string>(''); 
    
    const [showToast, setShowToast] = useState(false);
    const [previewText, setPreviewText] = useState('');
    
    const { data: session } = useSession();
    const [agentName, setAgentName] = useState('');

    useEffect(() => {
        if (session?.user && !agentName) {
            setAgentName(`${session.user.firstName} ${session.user.lastName}`.trim());
        }
    }, [session?.user, agentName]);

    // Modal state for CRUD
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null);
    const [formData, setFormData] = useState<TemplateFormState>({
        title: '',
        activeChannel: 'PHONE',
        contents: {}
    });

    // Confirmation Modal state
    const [deleteConfirm, setDeleteConfirm] = useState<{
        show: boolean;
        type: 'TEMPLATE' | 'TOPIC';
        target: string;
        message: string;
    }>({ show: false, type: 'TEMPLATE', target: '', message: '' });

    const loadTemplates = React.useCallback(async () => {
        try {
            setLoading(true);
            const data = await communicationTemplateService.getAll();
            const validData = Array.isArray(data) ? data : (data && typeof data === 'object' && 'data' in data && Array.isArray((data as any).data) ? (data as any).data : []);
            setTemplates(validData);
        } catch (error) {
            console.error('Failed to load templates:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const uniqueTopics = React.useMemo(() => {
        return Array.isArray(templates) 
            ? Array.from(new Set(templates.filter(t => t.channel === channel).map(t => t.title))) 
            : [];
    }, [templates, channel]);

    useEffect(() => {
        if (uniqueTopics.length > 0 && (!topic || !uniqueTopics.includes(topic))) {
            setTopic(uniqueTopics[0]);
        } else if (uniqueTopics.length === 0 && topic) {
            setTopic('');
        }
    }, [uniqueTopics, topic]);

    const activeTemplate = Array.isArray(templates) ? templates.find(t => t.channel === channel && t.title === topic) : undefined;

    const getFormattedText = React.useCallback((text: string) => {
        if (!text) return '';
        let formatted = text;
        formatted = formatted.replace(/\{person_name\}/g, personName || '[Yetkili Adı]');
        formatted = formatted.replace(/\{stud_name\}/g, studName || '[Hara Adı]');
        formatted = formatted.replace(/\{agent_name\}/g, agentName || '[Temsilci Adı]');
        return formatted;
    }, [personName, studName, agentName]);

    const previewSubject = activeTemplate?.subject ? getFormattedText(activeTemplate.subject) : null;

    useEffect(() => {
        if (activeTemplate) {
            setPreviewText(getFormattedText(activeTemplate.content));
        } else {
            setPreviewText('');
        }
    }, [personName, studName, agentName, channel, topic, activeTemplate, getFormattedText]);

    const handleCopy = () => {
        let textToCopy = previewText;
        if (previewSubject) {
            textToCopy = `Konu: ${previewSubject}\n\n${textToCopy}`;
        }
        navigator.clipboard.writeText(textToCopy).then(() => {
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        });
    };

    const handleWhatsApp = () => {
        const encodedText = encodeURIComponent(previewText);
        const cleanPhone = phone.replace(/\D/g, '');
        const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
        window.open(url, '_blank');
    };

    const handleSaveTemplate = async () => {
        try {
            const allChannels = Array.from(new Set([
                ...Object.keys(formData.contents),
                ...(editingTemplate ? templates.filter(t => t.title === editingTemplate.title).map(t => t.channel) : [])
            ]));

            for (const ch of allChannels) {
                const content = formData.contents[ch] || '';
                const existingTemplate = editingTemplate 
                    ? templates.find(t => t.title === editingTemplate.title && t.channel === ch)
                    : null;

                if (content.trim().length > 0) {
                    const payload = {
                        title: formData.title,
                        channel: ch,
                        content: content.trim()
                    };
                    if (existingTemplate) {
                        await communicationTemplateService.update(existingTemplate.id, payload);
                    } else {
                        await communicationTemplateService.create(payload);
                    }
                } else {
                    if (existingTemplate) {
                        await communicationTemplateService.delete(existingTemplate.id);
                    }
                }
            }

            setShowModal(false);
            setChannel(formData.activeChannel);
            setTopic(formData.title);
            loadTemplates();
        } catch (error) {
            console.error('Failed to save template', error);
            alert('Şablon kaydedilemedi.');
        }
    };

    const handleDeleteTemplate = (id: string) => {
        setDeleteConfirm({
            show: true,
            type: 'TEMPLATE',
            target: id,
            message: 'Bu şablonu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
        });
    };

    const handleDeleteTopic = (topicTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteConfirm({
            show: true,
            type: 'TOPIC',
            target: topicTitle,
            message: `"${topicTitle}" konusuna ait TÜM şablonları (tüm kanallardaki) silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
        });
    };

    const confirmDelete = async () => {
        try {
            if (deleteConfirm.type === 'TEMPLATE') {
                await communicationTemplateService.delete(deleteConfirm.target);
            } else if (deleteConfirm.type === 'TOPIC') {
                const templatesToDelete = templates.filter(t => t.title === deleteConfirm.target);
                await Promise.all(templatesToDelete.map(t => communicationTemplateService.delete(t.id)));
                if (topic === deleteConfirm.target) setTopic('');
            }
            setDeleteConfirm({ ...deleteConfirm, show: false });
            loadTemplates();
        } catch (error) {
            console.error('Failed to delete', error);
            alert('Silme işlemi sırasında hata oluştu.');
        }
    };

    const openEditModal = (template?: CommunicationTemplate) => {
        if (template) {
            setEditingTemplate(template);
            
            const topicTemplates = templates.filter(t => t.title === template.title);
            const contents: Record<string, string> = {};
            topicTemplates.forEach(t => {
                contents[t.channel] = t.content;
            });

            setFormData({ 
                title: template.title, 
                activeChannel: template.channel, 
                contents 
            });
        } else {
            setEditingTemplate(null);
            setFormData({ title: '', activeChannel: 'PHONE', contents: {} });
        }
        setShowModal(true);
    };


    const channels = [
        { name: 'Konuşma', value: 'PHONE', icon: <Phone size={20} /> },
        { name: 'Yazışma', value: 'WHATSAPP', icon: <MessageCircle size={20} /> },
    ];

    if (loading) return <div className="p-4">Yükleniyor...</div>;

    return (
        <Container fluid className="page-container px-2 px-md-4" style={{ backgroundColor: '#f8f9fa' }}>
            <div className="page-heading-wrapper mb-4 d-flex justify-content-between align-items-center">
                <div>
                    <h3 className="fw-bold m-0 text-dark">Yazışma & Konuşma Şablonları</h3>
                    <p className="text-muted mb-0 mt-1">Hızlı ve profesyonel iletişim için hazır metinleri kullanın.</p>
                </div>
                <Button variant="primary" onClick={() => openEditModal()}><Plus size={16} className="me-0 me-md-2" /> <span className="d-none d-md-inline">Yeni Şablon Ekle</span></Button>
            </div>

            <Row>
                {/* Input Panel */}
                <Col lg={4} md={12} className="mb-4">
                    <Card className="border-0 shadow-sm rounded-3 h-100">
                        <Card.Header className="bg-white border-bottom pt-3 pb-3 px-3 px-md-4">
                            <h5 className="mb-0 fw-semibold">Girdi ve Parametreler</h5>
                        </Card.Header>
                        <Card.Body className="p-2 p-md-4">
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-muted small fw-medium">Hara Adı</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Örn. Kurt Harası"
                                        value={studName}
                                        onChange={(e) => setStudName(e.target.value)}
                                    />
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label className="text-muted small fw-medium">Yetkili / Kişi Adı</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Örn. Ahmet Bey"
                                        value={personName}
                                        onChange={(e) => setPersonName(e.target.value)}
                                    />
                                </Form.Group>
                                
                                <Form.Group className="mb-3">
                                    <Form.Label className="text-muted small fw-medium">Görüşmeyi Yapan (Temsilci)</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="Örn. Temsilci Adı"
                                        value={agentName}
                                        onChange={(e) => setAgentName(e.target.value)}
                                    />
                                </Form.Group>

                                {channel === 'WHATSAPP' && (
                                    <Form.Group className="mb-4">
                                        <Form.Label className="text-muted small fw-medium">Telefon Numarası</Form.Label>
                                        <Form.Control
                                            type="text"
                                            placeholder="Örn. +905551234567"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </Form.Group>
                                )}

                                <Form.Group className="mb-4 mt-4">
                                    <Form.Label className="text-muted small fw-medium mb-2 d-block">Kanal Seçimi</Form.Label>
                                    <ButtonGroup className="w-100 d-flex flex-wrap gap-2" style={{ boxShadow: 'none' }}>
                                        {channels.map((c, idx) => (
                                            <ToggleButton
                                                key={idx}
                                                id={`channel-radio-${idx}`}
                                                type="radio"
                                                variant={channel === c.value ? 'primary' : 'outline-secondary'}
                                                name="channel-radio"
                                                value={c.value}
                                                checked={channel === c.value}
                                                onChange={(e) => setChannel(e.currentTarget.value)}
                                                className={`d-flex justify-content-center align-items-center mb-2 flex-grow-1 ${channel !== c.value ? 'bg-white' : ''}`}
                                                style={{ borderRadius: '0.375rem', flexBasis: '45%' }}
                                                title={c.name}
                                            >
                                                {c.icon}
                                            </ToggleButton>
                                        ))}
                                    </ButtonGroup>
                                </Form.Group>

                                <Form.Group className="mb-3 mt-4">
                                    <Form.Label className="text-muted small fw-medium">Görüşme Konusu / Amacı</Form.Label>
                                    <Dropdown>
                                        <Dropdown.Toggle 
                                            className="w-100 text-start d-flex justify-content-between align-items-center shadow-none bg-white form-control py-2 text-dark"
                                        >
                                            <span className="text-truncate">
                                                {topic || 'Konu Seçiniz'}
                                            </span>
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu className="w-100 shadow-sm border-0" style={{ fontSize: '0.9rem', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                            {uniqueTopics.map((t, idx) => (
                                                <div key={idx} className={`d-flex justify-content-between align-items-center py-2 px-3 rounded mb-1 dropdown-item ${topic === t ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setTopic(t)}>
                                                    <span className="text-truncate">{t}</span>
                                                    <Trash2 
                                                        size={14} 
                                                        className="text-danger" 
                                                        onClick={(e) => handleDeleteTopic(t, e)}
                                                        style={{ minWidth: '14px' }}
                                                    />
                                                </div>
                                            ))}
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </Form.Group>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Output Panel */}
                <Col lg={8} md={12} className="mb-4">
                    <Card className="border-0 shadow-sm rounded-3 h-100">
                        <Card.Header className="bg-white border-bottom pt-3 pb-3 px-3 px-md-4 d-flex justify-content-between align-items-center flex-wrap">
                            <h5 className="mb-0 fw-semibold">Şablon Önizleme</h5>
                            <div className="d-flex gap-2 mt-2 mt-sm-0">
                                {activeTemplate && (
                                    <>
                                        <Button variant="outline-secondary" size="sm" onClick={() => openEditModal(activeTemplate)} className="d-flex align-items-center" title="Düzenle">
                                            <Edit2 size={16} />
                                        </Button>
                                        <Button variant="outline-danger" size="sm" onClick={() => handleDeleteTemplate(activeTemplate.id)} className="d-flex align-items-center" title="Sil">
                                            <Trash2 size={16} />
                                        </Button>
                                    </>
                                )}
                                <Button variant="outline-primary" size="sm" onClick={handleCopy} className="d-flex align-items-center" disabled={!previewText} title="Metni Kopyala">
                                    <Copy size={16} />
                                </Button>
                                {channel === 'WHATSAPP' && (
                                    <Button variant="success" size="sm" onClick={handleWhatsApp} className="d-flex align-items-center" disabled={!previewText} title="WhatsApp ile Gönder">
                                        <Send size={16} />
                                    </Button>
                                )}
                            </div>
                        </Card.Header>
                        <Card.Body className="bg-light p-2 p-md-4">
                            {previewSubject && (
                                <div className="mb-3 p-3 bg-white rounded border">
                                    <div className="text-muted small mb-1 fw-bold">E-Posta Konusu:</div>
                                    <div className="fw-medium">{previewSubject}</div>
                                </div>
                            )}
                            
                            <Form.Control
                                as="textarea"
                                className="bg-white rounded border"
                                style={{ minHeight: '600px', resize: 'vertical', lineHeight: '1.6' }}
                                value={previewText}
                                onChange={(e) => setPreviewText(e.target.value)}
                                placeholder="Şablon bulunamadı veya düzenlenecek metin yok."
                            />
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{editingTemplate ? 'Şablon Düzenle' : 'Yeni Şablon Ekle'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Şablon Konusu / Amacı (Örn. Tanıtım)</Form.Label>
                            <Form.Control 
                                type="text" 
                                value={formData.title} 
                                onChange={e => setFormData({...formData, title: e.target.value})} 
                                placeholder="Haradan.com Tanıtımı"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Kanal</Form.Label>
                            <Form.Select 
                                value={formData.activeChannel}
                                onChange={e => setFormData({...formData, activeChannel: e.target.value})}
                            >
                                {channels.map(c => <option key={c.value} value={c.value}>{c.name}</option>)}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Şablon Metni</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={8}
                                value={formData.contents[formData.activeChannel] || ''} 
                                onChange={e => setFormData({
                                    ...formData, 
                                    contents: {
                                        ...formData.contents,
                                        [formData.activeChannel]: e.target.value
                                    }
                                })} 
                                placeholder="Merhaba {person_name}, {stud_name} için..."
                            />
                            <Form.Text className="text-muted">
                                Değişkenler: <code>{`{person_name}`}</code>, <code>{`{stud_name}`}</code>, <code>{`{agent_name}`}</code>
                            </Form.Text>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>İptal</Button>
                    <Button variant="primary" onClick={handleSaveTemplate}>Kaydet</Button>
                </Modal.Footer>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal show={deleteConfirm.show} onHide={() => setDeleteConfirm({ ...deleteConfirm, show: false })} centered>
                <Modal.Header closeButton className="border-0 pb-0">
                    <Modal.Title className="text-danger fw-bold fs-5">
                        {deleteConfirm.type === 'TOPIC' ? 'Konuyu Sil' : 'Şablonu Sil'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-2 pb-4">
                    <p className="mb-0 text-secondary" style={{ fontSize: '15px' }}>
                        {deleteConfirm.message}
                    </p>
                </Modal.Body>
                <Modal.Footer className="border-0 pt-0">
                    <Button variant="light" className="fw-medium px-4" onClick={() => setDeleteConfirm({ ...deleteConfirm, show: false })}>
                        İptal
                    </Button>
                    <Button variant="danger" className="fw-medium px-4" onClick={confirmDelete}>
                        Evet, Sil
                    </Button>
                </Modal.Footer>
            </Modal>

            <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 9999 }}>
                <Toast show={showToast} onClose={() => setShowToast(false)} bg="success" delay={3000} autohide>
                    <Toast.Body className="text-white d-flex align-items-center fw-medium">
                        <Copy size={16} className="me-2" /> Metin panoya kopyalandı!
                    </Toast.Body>
                </Toast>
            </ToastContainer>
        </Container>
    );
}

export default function CommunicationTemplatesPage() {
    return (
        <Suspense fallback={<div className="p-4">Yükleniyor...</div>}>
            <CommunicationTemplatesContent />
        </Suspense>
    );
}
