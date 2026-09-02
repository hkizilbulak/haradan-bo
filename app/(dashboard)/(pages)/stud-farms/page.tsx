"use client";
import React, { useState } from 'react';
import { formatDateForText } from '@/helpers/DateUtils';
import { capitalizeSentence } from '@/helpers/HelperUtils';
import useCursorApi from '@/hooks/useCursorApi';
import { StudFarm, StudFarmResponse } from '@/models/StudFarm';
import { studFarmService } from '@/services';
import CursorPagination from '@/components/CursorPagination';
import { Skeleton } from '@/components/Skeleton';
import { Col, Row, Container, Card, Table, Button, Alert, Form } from 'react-bootstrap';
import { Trash2, Plus, ChevronDown, ChevronUp, Edit } from 'react-feather';
import AddStudFarmModal from './components/AddStudFarmModal';
import AddStudFarmNoteModal from './components/AddStudFarmNoteModal';
import DeleteModal from '@/components/DeleteModal';
import StudFarmNotesTimeline from './components/StudFarmNotesTimeline';
import { toast } from 'react-toastify';

export default function StudFarms() {
    const [pageSize, setPageSize] = useState(10);
    const [{ data, isLoading, isError, handleFilter, goNext, goPrev, canGoPrev, canGoNext, pageIndex, refetch }] = useCursorApi<StudFarm>({
        service: studFarmService,
        pageSize,
    });

    const [showAddModal, setShowAddModal] = useState(false);
    const [editStudFarm, setEditStudFarm] = useState<StudFarm | null>(null);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [selectedStudFarmId, setSelectedStudFarmId] = useState<string | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [notesRefreshTrigger, setNotesRefreshTrigger] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteStudFarmId, setDeleteStudFarmId] = useState<string | null>(null);

    const toggleRow = (id: string) => {
        if (expandedRow === id) {
            setExpandedRow(null);
        } else {
            setExpandedRow(id);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        handleFilter(searchTerm ? `search=${searchTerm}` : '');
    };

    const handleClear = () => {
        setSearchTerm('');
        handleFilter('');
    };

    const confirmDelete = async () => {
        if (!deleteStudFarmId) return;
        try {
            await studFarmService.deleteStudFarm(deleteStudFarmId);
            toast.success("Hara başarıyla silindi.");
            setDeleteStudFarmId(null);
            refetch({ silent: true });
        } catch (error) {
            toast.error("Hara silinirken bir hata oluştu.");
        }
    };

    const rows = data?.content ?? [];

    return (
        <Container fluid className="page-container" style={{ backgroundColor: '#f8f9fa' }}>
            <div className="page-heading-wrapper mb-4 d-flex justify-content-between align-items-center">
                <h3 className="fw-bold m-0 text-dark">Haralar</h3>
                <Button 
                    variant="primary" 
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus size={18} className="me-2" /> Yeni Ekle
                </Button>
            </div>

            {/* Filter Section */}
            <Card className="mb-4 border-0 shadow-sm rounded-3">
                <Card.Body>
                    <Form onSubmit={handleSearch}>
                        <Row className="align-items-end">
                            <Col md={4} sm={12} className="mb-3 mb-md-0">
                                <Form.Group>
                                    <Form.Label className="text-muted small mb-1">Arama</Form.Label>
                                    <div className="position-relative">
                                        <Form.Control
                                            type="text"
                                            placeholder="Arama"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ paddingLeft: '35px' }}
                                        />
                                        <i className="fe fe-search position-absolute text-muted" style={{ left: '12px', top: '10px' }}></i>
                                    </div>
                                </Form.Group>
                            </Col>
                            <Col md={8} sm={12} className="d-flex justify-content-end align-items-end">
                                <Button variant="outline-secondary" className="me-2 px-4" onClick={handleClear}>
                                    Temizle
                                </Button>
                                <Button variant="primary" type="submit" className="px-4">
                                    Ara
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            {isError && (
                <Alert variant="danger">
                    Haralar yüklenirken bir hata oluştu.
                </Alert>
            )}

            {!isError && (
                <div className="table-wrapper">
                    <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
                        <Card.Body className="p-0">
                            <div className="table-responsive">
                                <Table className="mb-0 align-middle">
                                    <thead style={{ backgroundColor: '#f4f5f7' }}>
                                        <tr>
                                            <th style={{ width: '40px' }}></th>
                                            <th className="text-muted fw-semibold">Hara Adı</th>
                                            <th className="text-muted fw-semibold">Hara Sorumlusu Ad Soyadı</th>
                                            <th className="text-muted fw-semibold">E-Posta</th>
                                            <th className="text-muted fw-semibold">Telefon</th>
                                            <th className="text-muted fw-semibold" style={{ maxWidth: '37ch' }}>Konum</th>
                                            <th className="text-muted fw-semibold">Görüşme Sayısı</th>
                                            <th className="text-muted fw-semibold">Eklenme Tarihi</th>
                                            <th className="text-end text-muted fw-semibold" style={{ paddingRight: '24px' }}>İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            Array.from({ length: 5 }).map((_, rowIdx) => (
                                                <tr key={`sk-row-${rowIdx}`}>
                                                    <td></td>
                                                    <td><Skeleton width="75%" height="1rem" /></td>
                                                    <td><Skeleton width="75%" height="1rem" /></td>
                                                    <td><Skeleton width="60%" height="1rem" /></td>
                                                    <td><Skeleton width="50%" height="1rem" /></td>
                                                    <td><Skeleton width="40%" height="1rem" /></td>
                                                    <td><Skeleton width="30%" height="1rem" /></td>
                                                    <td><Skeleton width="50%" height="1rem" /></td>
                                                    <td className="text-end"><Skeleton width="60px" height="1rem" /></td>
                                                </tr>
                                            ))
                                        ) : rows.length > 0 ? (
                                            rows.map((item) => {
                                                const isExpanded = expandedRow === item.id;
                                                return (
                                                    <React.Fragment key={item.id}>
                                                        <tr style={{ backgroundColor: isExpanded ? '#f8f9fa' : 'white', transition: 'all 0.2s' }}>
                                                            <td className="text-center">
                                                                <span
                                                                    onClick={() => toggleRow(item.id)}
                                                                    style={{ cursor: 'pointer', padding: '5px' }}
                                                                    className="text-muted"
                                                                >
                                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                                </span>
                                                            </td>
                                                            <td className="fw-medium text-dark">
                                                                {capitalizeSentence(item.firstName)}
                                                            </td>
                                                            <td className="fw-medium text-dark">
                                                                {capitalizeSentence(item.lastName)}
                                                            </td>
                                                            <td>{item.email}</td>
                                                            <td>{item.phone || '-'}</td>
                                                            <td style={{ maxWidth: '37ch', whiteSpace: 'normal', wordWrap: 'break-word' }}>{item.location || '-'}</td>
                                                            <td>{item.interviewCount || 0}</td>
                                                            <td>{formatDateForText(item.createdAt)}</td>
                                                            <td className="text-end" style={{ paddingRight: '24px' }}>
                                                                <div className="d-flex justify-content-end align-items-center gap-2">
                                                                    <Button
                                                                        variant="success"
                                                                        size="sm"
                                                                        title="Görüşme Ekle"
                                                                        className="text-white border-0 d-flex align-items-center justify-content-center"
                                                                        style={{ padding: '4px 8px', height: '32px' }}
                                                                        onClick={() => {
                                                                            setSelectedStudFarmId(item.id);
                                                                            setShowNoteModal(true);
                                                                        }}
                                                                    >
                                                                        <Plus size={16} />
                                                                    </Button>
                                                                    <Button 
                                                                        variant="light" 
                                                                        size="sm" 
                                                                        title="Hara Düzenle"
                                                                        className="bg-white border d-flex align-items-center justify-content-center"
                                                                        style={{ width: '32px', height: '32px', padding: 0 }}
                                                                        onClick={() => {
                                                                            setEditStudFarm(item);
                                                                            setShowAddModal(true);
                                                                        }}
                                                                    >
                                                                        <Edit size={16} className="text-secondary" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="light"
                                                                        size="sm"
                                                                        className="text-danger border-0 d-flex align-items-center justify-content-center"
                                                                        style={{ padding: '4px 8px', height: '32px' }}
                                                                        title="Sil"
                                                                        onClick={() => setDeleteStudFarmId(item.id)}
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        
                                                        {isExpanded && (
                                                            <tr>
                                                                <td colSpan={9} className="p-0 border-0">
                                                                    <div className="bg-white">
                                                                        <StudFarmNotesTimeline 
                                                                            studFarmId={item.id} 
                                                                            refreshTrigger={notesRefreshTrigger}
                                                                            onNoteDeleted={() => {
                                                                                setNotesRefreshTrigger(prev => prev + 1);
                                                                                refetch({ silent: true });
                                                                            }}
                                                                        />
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={9} className="text-center py-4 text-muted">
                                                    Henüz kayıt bulunamadı.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>
                </div>
            )}

            {!isLoading && !isError && rows.length > 0 && (
                <div className="mt-3">
                    <CursorPagination
                        canGoPrev={canGoPrev}
                        canGoNext={canGoNext}
                        onPrev={goPrev}
                        onNext={goNext}
                        pageIndex={pageIndex}
                        pageSize={pageSize}
                        totalElements={data?.page?.totalElements}
                        totalPages={data?.page?.totalPages}
                        onPageSizeChange={setPageSize}
                    />
                </div>
            )}

            <AddStudFarmModal 
                show={showAddModal} 
                onHide={() => { setShowAddModal(false); setEditStudFarm(null); }} 
                onSuccess={() => refetch({ silent: true })} 
                existingStudFarm={editStudFarm}
            />
            {selectedStudFarmId && (
                <AddStudFarmNoteModal 
                    show={showNoteModal} 
                    onHide={() => {
                        setShowNoteModal(false);
                        setSelectedStudFarmId(null);
                    }} 
                    studFarmId={selectedStudFarmId}
                    onSuccess={() => {
                        setNotesRefreshTrigger(prev => prev + 1);
                        refetch({ silent: true });
                    }} 
                />
            )}
            {deleteStudFarmId && (
                <DeleteModal 
                    onClose={() => setDeleteStudFarmId(null)}
                    onHandleDelete={confirmDelete}
                />
            )}
        </Container>
    );
}
