'use client';

import React, { useEffect, useState } from 'react';
import { studFarmService } from '@/services/StudFarmService';
import { Spinner } from 'react-bootstrap';

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
}

export default function StudFarmNotesTimeline({ studFarmId, refreshTrigger }: Props) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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
                        style={{ width: '180px' }}
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
                            left: '173px',
                            top: '6px',
                            zIndex: 2,
                            border: '2px solid #8b5cf6'
                        }}
                    ></div>

                    {/* Right side: Interviewer & Notes */}
                    <div className="ps-4 text-start">
                        <div className="fw-bold text-dark mb-1" style={{ whiteSpace: 'pre-line' }}>
                            {note.interviewer_name || 'Bilinmiyor'}
                        </div>
                        <div className="text-secondary" style={{ whiteSpace: 'pre-wrap' }}>
                            {note.notes || 'Görüşme notu bulunmuyor.'}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
