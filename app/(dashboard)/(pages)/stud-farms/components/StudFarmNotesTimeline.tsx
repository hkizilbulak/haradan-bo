'use client';

import React, { useEffect, useState } from 'react';
import { studFarmService } from '@/services/StudFarmService';
import { Spinner, Button } from 'react-bootstrap';
import { Trash2, Edit2 } from 'react-feather';
import AddStudFarmNoteModal from './AddStudFarmNoteModal';
import DeleteModal from '@/components/DeleteModal';
import { toast } from 'react-toastify';

interface Note {
    id: string;
    interview_date: string;
    interviewer_name: string;
    notes: string;
    created_at: string;
}

interface Props {
    studFarmId: string;
    refreshTrigger: number;
    onNoteDeleted: () => void;
}

export default function StudFarmNotesTimeline({ studFarmId, refreshTrigger, onNoteDeleted }: Props) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
    const [editNote, setEditNote] = useState<Note | null>(null);

    const handleDeleteNote = async () => {
        if (!deleteNoteId) return;
        try {
            await studFarmService.deleteStudFarmNote(studFarmId, deleteNoteId);
            toast.success('Not başarıyla silindi.');
            onNoteDeleted();
        } catch (error) {
            toast.error('Not silinirken bir hata oluştu.');
        } finally {
            setDeleteNoteId(null);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const fetchNotes = async () => {
            setIsLoading(true);
            try {
                const data = await studFarmService.listStudFarmNotes(studFarmId);
                if (isMounted) {
                    setNotes(data || []);
                }
            } catch (error) {
                console.error("Error fetching notes:", error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchNotes();

        return () => {
            isMounted = false;
        };
    }, [studFarmId, refreshTrigger]);

    if (isLoading && notes.length === 0) {
        return (
            <div className="d-flex justify-content-center p-4 w-100">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    if (!isLoading && notes.length === 0) {
        return (
            <div className="text-center p-4 text-muted w-100">
                Henüz görüşme kaydı bulunmuyor.
            </div>
        );
    }

    return (
        <div className="position-relative py-3 w-100 bg-white">
            {/* Timeline vertical line */}
            <div 
                className="position-absolute" 
                style={{
                    left: '180px',
                    top: '20px',
                    bottom: '20px',
                    width: '2px',
                    backgroundColor: '#e9ecef',
                    zIndex: 1
                }}
            ></div>

            {notes.map((note, index) => (
                <div key={note.id} className="d-flex position-relative mb-4">
                    {/* Left side: Date */}
                    <div 
                        className="text-end pe-4 d-flex flex-column justify-content-start pt-1" 
                        style={{ width: '180px', minWidth: '180px', flexShrink: 0 }}
                    >
                        <div className="fs-5 text-dark" style={{ lineHeight: '1.2' }}>
                            {new Date(note.interview_date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                    </div>

                    {/* Timeline dot */}
                    <div 
                        className="position-absolute rounded-circle bg-white"
                        style={{
                            width: '16px',
                            height: '16px',
                            left: '171px',
                            top: '6px',
                            zIndex: 2,
                            border: '2px solid #8b5cf6'
                        }}
                    ></div>

                    {/* Right side: Interviewer & Notes & Delete */}
                    <div className="text-start w-100 position-relative" style={{ paddingLeft: '32px', paddingRight: '32px' }}>
                        <div className="d-flex justify-content-between align-items-start">
                            <div className="fw-bold text-dark mb-1" style={{ whiteSpace: 'pre-line' }}>
                                {note.interviewer_name || 'Bilinmiyor'}
                            </div>
                            <div className="d-flex">
                                <Button 
                                    variant="light" 
                                    size="sm"
                                    className="me-2 text-primary border-0 p-1" 
                                    onClick={() => setEditNote(note)}
                                >
                                    <Edit2 size={16} />
                                </Button>
                                <Button 
                                    variant="light" 
                                    size="sm"
                                    className="me-2 text-danger border-0 p-1" 
                                    onClick={() => setDeleteNoteId(note.id)}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </div>
                        <div className="text-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                            {note.notes || 'Görüşme notu bulunmuyor.'}
                        </div>
                    </div>
                </div>
            ))}

            {deleteNoteId && (
                <DeleteModal
                    onClose={() => setDeleteNoteId(null)}
                    onHandleDelete={handleDeleteNote}
                />
            )}
            
            {editNote && (
                <AddStudFarmNoteModal
                    show={!!editNote}
                    onHide={() => setEditNote(null)}
                    studFarmId={studFarmId}
                    onSuccess={() => {
                        setEditNote(null);
                        onNoteDeleted(); // Reuse this to trigger refresh
                    }}
                    existingNote={editNote}
                />
            )}
        </div>
    );
}
