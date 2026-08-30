'use client';

import React, { useState, useEffect } from 'react';
import { Offcanvas, Button, Form, Spinner } from 'react-bootstrap';
import { studFarmService } from '@/services/StudFarmService';
import { toast } from 'react-toastify';

interface Props {
    show: boolean;
    onHide: () => void;
    studFarmId: string;
    onSuccess: () => void;
    existingNote?: {
        id: string;
        interview_date: string;
        interviewer_name: string;
        notes: string;
    } | null;
}

export default function AddStudFarmNoteModal({ show, onHide, studFarmId, onSuccess, existingNote }: Props) {
    const [interviewDate, setInterviewDate] = useState('');
    const [interviewerName, setInterviewerName] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (show && existingNote) {
            // Pre-fill for edit
            setInterviewDate(existingNote.interview_date ? existingNote.interview_date.split('T')[0] : '');
            setInterviewerName(existingNote.interviewer_name || '');
            setNotes(existingNote.notes || '');
        } else if (show) {
            // Reset for new
            setInterviewDate('');
            setInterviewerName('');
            setNotes('');
        }
    }, [show, existingNote]);

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

            if (existingNote) {
                await studFarmService.updateStudFarmNote(studFarmId, existingNote.id, {
                    interview_date: formattedDate,
                    interviewer_name: interviewerName,
                    notes: notes
                });
                toast.success("Görüşme kaydı başarıyla güncellendi.");
            } else {
                await studFarmService.addStudFarmNote(studFarmId, {
                    interview_date: formattedDate,
                    interviewer_name: interviewerName,
                    notes: notes
                });
                toast.success("Görüşme kaydı başarıyla eklendi.");
            }
            
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
        <Offcanvas show={show} onHide={onHide} placement="end" style={{ maxWidth: 540 }} className="w-100">
            <Offcanvas.Header closeButton>
                <Offcanvas.Title className="h5 mb-0">{existingNote ? 'Görüşme Düzenle' : 'Yeni Görüşme Ekle'}</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
                <Form onSubmit={handleSubmit} className="d-flex flex-column h-100">
                    <div className="flex-grow-1">
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
                    </div>
                    
                    <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                        <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>
                            İptal
                        </Button>
                        <Button variant="primary" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Spinner size="sm" /> : 'Kaydet'}
                        </Button>
                    </div>
                </Form>
            </Offcanvas.Body>
        </Offcanvas>
    );
}
