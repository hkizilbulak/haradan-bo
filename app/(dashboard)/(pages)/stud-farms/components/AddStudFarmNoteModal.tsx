'use client';

import React, { useState } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { studFarmService } from '@/services/StudFarmService';
import { toast } from 'react-toastify';

interface Props {
    show: boolean;
    onHide: () => void;
    studFarmId: string;
    onSuccess: () => void;
}

export default function AddStudFarmNoteModal({ show, onHide, studFarmId, onSuccess }: Props) {
    const [interviewDate, setInterviewDate] = useState('');
    const [interviewerName, setInterviewerName] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!interviewDate || !interviewerName || !notes) {
            toast.error("Lütfen tüm alanları doldurun.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Convert to RFC3339 format required by backend
            const dateObj = new Date(interviewDate);
            const formattedDate = dateObj.toISOString();

            await studFarmService.addStudFarmNote(studFarmId, {
                interview_date: formattedDate,
                interviewer_name: interviewerName,
                notes: notes
            });
            toast.success("Görüşme kaydı başarıyla eklendi.");
            
            // Reset form
            setInterviewDate('');
            setInterviewerName('');
            setNotes('');
            
            onSuccess();
            onHide();
        } catch (error: any) {
            console.error("Error adding note:", error);
            toast.error("Görüşme kaydı eklenirken bir hata oluştu.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Yeni Görüşme Ekle</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Görüşme Tarihi <span className="text-danger">*</span></Form.Label>
                        <Form.Control 
                            type="date" 
                            required 
                            value={interviewDate}
                            onChange={(e) => setInterviewDate(e.target.value)}
                        />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                        <Form.Label>Görüşmeci <span className="text-danger">*</span></Form.Label>
                        <Form.Control 
                            type="text" 
                            placeholder="Görüşmeci adı" 
                            required 
                            value={interviewerName}
                            onChange={(e) => setInterviewerName(e.target.value)}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Notlar <span className="text-danger">*</span></Form.Label>
                        <Form.Control 
                            as="textarea" 
                            rows={4} 
                            placeholder="Görüşme notları..." 
                            required 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>
                        İptal
                    </Button>
                    <Button variant="primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner size="sm" /> : 'Kaydet'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
