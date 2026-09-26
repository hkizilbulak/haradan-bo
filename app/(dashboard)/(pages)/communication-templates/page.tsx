"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Row, Col, Card, Form, Button, Toast, ToastContainer, ButtonGroup, ToggleButton, Dropdown } from 'react-bootstrap';
import { Copy, Send, Phone, MessageCircle, Mail, Smartphone } from 'react-feather';
import { COMMUNICATION_TEMPLATES, CommunicationChannel, CommunicationTopic } from '@/contants/communicationTemplates';

function CommunicationTemplatesContent() {
    const searchParams = useSearchParams();
    const initialStudName = searchParams?.get('stud_name') || '';
    const initialPersonName = searchParams?.get('person_name') || '';
    const initialPhone = searchParams?.get('phone') || '';

    const [studName, setStudName] = useState(initialStudName);
    const [personName, setPersonName] = useState(initialPersonName);
    const [phone, setPhone] = useState(initialPhone);
    const [channel, setChannel] = useState<CommunicationChannel>('PHONE');
    const [topic, setTopic] = useState<CommunicationTopic>('INTRO');
    const [showToast, setShowToast] = useState(false);
    const [previewText, setPreviewText] = useState('');

    const activeTemplate = COMMUNICATION_TEMPLATES.find(t => t.channel === channel && t.topic === topic);

    const getFormattedText = React.useCallback((text: string) => {
        let formatted = text;
        formatted = formatted.replace(/{person_name}/g, personName || '[Yetkili Adı]');
        formatted = formatted.replace(/{stud_name}/g, studName || '[Hara Adı]');
        return formatted;
    }, [personName, studName]);

    const previewSubject = activeTemplate?.subject ? getFormattedText(activeTemplate.subject) : null;

    useEffect(() => {
        if (activeTemplate) {
            setPreviewText(getFormattedText(activeTemplate.template));
        } else {
            setPreviewText('');
        }
    }, [personName, studName, channel, topic, activeTemplate, getFormattedText]);

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
        // Clean phone number (keep only digits)
        const cleanPhone = phone.replace(/\D/g, '');
        const url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
        window.open(url, '_blank');
    };

    const topics: { value: CommunicationTopic, label: string }[] = [
        { value: 'INTRO', label: 'Haradan.com Tanıtımı ve İlan Girişi Daveti' },
        { value: 'MEMBERSHIP', label: 'Üyelik / Paket Avantajları' },
        { value: 'SPONSORSHIP', label: 'Özel İş Birliği / Sponsorluk Teklifi' },
        { value: 'FOLLOWUP', label: 'Takip / Hatırlatma Araması' },
    ];

    const channels: { name: string, value: CommunicationChannel, icon: any }[] = [
        { name: 'Telefon', value: 'PHONE', icon: <Phone size={16} className="me-2" /> },
        { name: 'WhatsApp / SMS', value: 'WHATSAPP', icon: <MessageCircle size={16} className="me-2" /> },
        { name: 'Sosyal Medya', value: 'SOCIAL_MEDIA', icon: <Smartphone size={16} className="me-2" /> },
        { name: 'E-Posta', value: 'EMAIL', icon: <Mail size={16} className="me-2" /> },
    ];

    return (
        <Container fluid className="page-container" style={{ backgroundColor: '#f8f9fa' }}>
            <div className="page-heading-wrapper mb-4">
                <h3 className="fw-bold m-0 text-dark">Yazışma & Konuşma Şablonları</h3>
                <p className="text-muted mb-0 mt-1">Hızlı ve profesyonel iletişim için hazır metinleri kullanın.</p>
            </div>

            <Row>
                {/* Input Panel */}
                <Col lg={5} md={12} className="mb-4">
                    <Card className="border-0 shadow-sm rounded-3 h-100">
                        <Card.Header className="bg-white border-bottom pt-4 pb-3">
                            <h5 className="mb-0 fw-semibold">Girdi ve Parametreler</h5>
                        </Card.Header>
                        <Card.Body>
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
                                                onChange={(e) => setChannel(e.currentTarget.value as CommunicationChannel)}
                                                className={`text-start d-flex align-items-center mb-2 flex-grow-1 ${channel !== c.value ? 'bg-white' : ''}`}
                                                style={{ borderRadius: '0.375rem', flexBasis: '45%' }}
                                            >
                                                {c.icon} {c.name}
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
                                                {topics.find(t => t.value === topic)?.label}
                                            </span>
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu className="w-100 shadow-sm border-0" style={{ fontSize: '0.9rem', padding: '0.5rem', borderRadius: '0.5rem' }}>
                                            {topics.map((t, idx) => (
                                                <Dropdown.Item 
                                                    key={idx} 
                                                    onClick={() => setTopic(t.value)}
                                                    active={topic === t.value}
                                                    className="py-2 rounded mb-1"
                                                >
                                                    {t.label}
                                                </Dropdown.Item>
                                            ))}
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </Form.Group>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Output Panel */}
                <Col lg={7} md={12} className="mb-4">
                    <Card className="border-0 shadow-sm rounded-3 h-100">
                        <Card.Header className="bg-white border-bottom pt-4 pb-3 d-flex justify-content-between align-items-center flex-wrap">
                            <h5 className="mb-0 fw-semibold">Şablon Önizleme</h5>
                            <div className="d-flex gap-2 mt-2 mt-sm-0">
                                <Button variant="outline-primary" size="sm" onClick={handleCopy} className="d-flex align-items-center">
                                    <Copy size={14} className="me-2" /> Metni Kopyala
                                </Button>
                                {channel === 'WHATSAPP' && (
                                    <Button variant="success" size="sm" onClick={handleWhatsApp} className="d-flex align-items-center">
                                        <Send size={14} className="me-2" /> WhatsApp ile Gönder
                                    </Button>
                                )}
                            </div>
                        </Card.Header>
                        <Card.Body className="bg-light">
                            {previewSubject && (
                                <div className="mb-3 p-3 bg-white rounded border">
                                    <div className="text-muted small mb-1 fw-bold">E-Posta Konusu:</div>
                                    <div className="fw-medium">{previewSubject}</div>
                                </div>
                            )}
                            
                            <Form.Control
                                as="textarea"
                                className="bg-white rounded border"
                                style={{ minHeight: '300px', resize: 'vertical', lineHeight: '1.6' }}
                                value={previewText}
                                onChange={(e) => setPreviewText(e.target.value)}
                                placeholder="Şablon bulunamadı veya düzenlenecek metin yok."
                            />
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

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
