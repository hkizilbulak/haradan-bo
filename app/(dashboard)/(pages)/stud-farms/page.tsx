"use client";
import React, { useState, useEffect, useRef } from 'react';
import { formatDateForText } from '@/helpers/DateUtils';
import { capitalizeSentence } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import { StudFarm } from '@/models/StudFarm';
import { studFarmService } from '@/services';
import CustomPagination from '@/components/Pagination';
import { Skeleton } from '@/components/Skeleton';
import { Col, Row, Container, Card, Table, Button, Alert, Form } from 'react-bootstrap';
import { Plus, ChevronDown, ChevronUp, Edit, MessageCircle, ArrowUp, ArrowDown } from 'react-feather';
import AddStudFarmModal from './components/AddStudFarmModal';
import AddStudFarmNoteModal from './components/AddStudFarmNoteModal';
import StudFarmNotesTimeline from './components/StudFarmNotesTimeline';
import { useRouter } from 'next/navigation';

type SortField = 'firstName' | 'lastName' | 'latestInterviewDate' | 'interviewCount' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export default function StudFarms() {
    const router = useRouter();
    const [{ data, parameters, isLoading, isError, handleFilter, handlePageChange, setParameters, refetch }] = useApi<StudFarm>({
        service: studFarmService,
    });

    const [showAddModal, setShowAddModal] = useState(false);
    const [editStudFarm, setEditStudFarm] = useState<StudFarm | null>(null);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [selectedStudFarmId, setSelectedStudFarmId] = useState<string | null>(null);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [notesRefreshTrigger, setNotesRefreshTrigger] = useState(0);

    // Search and debounce handling (avoids duplicate/looping requests)
    const [searchTerm, setSearchTerm] = useState('');
    const lastFilterRef = useRef<string>('');
    const handleFilterRef = useRef(handleFilter);
    handleFilterRef.current = handleFilter;

    // Sorting state
    const [sortField, setSortField] = useState<SortField | null>('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const toggleRow = (id: string) => {
        if (expandedRow === id) {
            setExpandedRow(null);
        } else {
            setExpandedRow(id);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            const trimmed = searchTerm.trim();
            const targetFilter = trimmed.length >= 3 ? `search=${trimmed}` : '';

            if (trimmed.length === 0 || trimmed.length >= 3) {
                if (targetFilter !== lastFilterRef.current) {
                    lastFilterRef.current = targetFilter;
                    handleFilterRef.current(targetFilter);
                }
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = searchTerm.trim();
        const targetFilter = trimmed.length >= 3 ? `search=${trimmed}` : '';
        if (targetFilter !== lastFilterRef.current) {
            lastFilterRef.current = targetFilter;
            handleFilter(targetFilter);
        }
    };

    const handleClear = () => {
        setSearchTerm('');
        if (lastFilterRef.current !== '') {
            lastFilterRef.current = '';
            handleFilter('');
        }
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection(field === 'firstName' || field === 'lastName' ? 'asc' : 'desc');
        }
    };

    const rows = data?.content ?? [];

    const sortedRows = React.useMemo(() => {
        const list = [...rows];
        if (!sortField) return list;

        return list.sort((a, b) => {
            let valA: any = a[sortField];
            let valB: any = b[sortField];

            if (sortField === 'firstName' || sortField === 'lastName') {
                valA = (valA || '').toString().toLowerCase();
                valB = (valB || '').toString().toLowerCase();
                const cmp = valA.localeCompare(valB, 'tr');
                return sortDirection === 'asc' ? cmp : -cmp;
            }

            if (sortField === 'interviewCount') {
                valA = Number(valA || 0);
                valB = Number(valB || 0);
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            }

            if (sortField === 'createdAt' || sortField === 'latestInterviewDate') {
                const timeA = valA ? new Date(valA).getTime() : 0;
                const timeB = valB ? new Date(valB).getTime() : 0;
                return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
            }

            return 0;
        });
    }, [rows, sortField, sortDirection]);

    const renderSortHeader = (label: string, field: SortField) => {
        const isActive = sortField === field;
        return (
            <th
                className="text-muted fw-semibold user-select-none"
                style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                onClick={() => handleSort(field)}
                title={`${label} ile sırala`}
            >
                <div className="d-inline-flex align-items-center gap-1">
                    <span>{label}</span>
                    <span className="text-secondary" style={{ opacity: isActive ? 1 : 0.35, display: 'inline-flex' }}>
                        {isActive ? (
                            sortDirection === 'asc' ? <ArrowUp size={13} className="text-primary" /> : <ArrowDown size={13} className="text-primary" />
                        ) : (
                            <ArrowDown size={13} />
                        )}
                    </span>
                </div>
            </th>
        );
    };

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
                                            placeholder="Hara adı, sorumlu, telefon veya e-posta ile ara..."
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
                                            {renderSortHeader('Hara Adı', 'firstName')}
                                            {renderSortHeader('Sorumlu', 'lastName')}
                                            <th className="text-muted fw-semibold">E-Posta</th>
                                            <th className="text-muted fw-semibold">Telefon</th>
                                            <th className="text-muted fw-semibold" style={{ maxWidth: '37ch' }}>Konum</th>
                                            {renderSortHeader('Son Görüşme', 'latestInterviewDate')}
                                            {renderSortHeader('Görüşme Sayısı', 'interviewCount')}
                                            {renderSortHeader('Eklenme Tarihi', 'createdAt')}
                                            <th className="text-center text-muted fw-semibold">İşlemler</th>
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
                                                    <td><Skeleton width="40%" height="1rem" /></td>
                                                    <td><Skeleton width="30%" height="1rem" /></td>
                                                    <td><Skeleton width="50%" height="1rem" /></td>
                                                    <td className="text-end"><Skeleton width="60px" height="1rem" /></td>
                                                </tr>
                                            ))
                                        ) : sortedRows.length > 0 ? (
                                            sortedRows.map((item) => {
                                                const isExpanded = expandedRow === item.id;
                                                return (
                                                    <React.Fragment key={item.id}>
                                                        <tr style={{ backgroundColor: isExpanded ? '#f8f9fa' : 'white', transition: 'all 0.2s' }}>
                                                            <td className="text-center">
                                                                <span
                                                                    onClick={() => toggleRow(item.id)}
                                                                    style={{ cursor: 'pointer', padding: '5px' }}
                                                                    className="text-muted"
                                                                    title="Görüşme geçmişini aç / kapat"
                                                                >
                                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                                </span>
                                                            </td>
                                                            <td className="fw-medium text-dark">
                                                                {capitalizeSentence(item.firstName)}
                                                            </td>
                                                            <td className="fw-medium text-dark">
                                                                {item.lastName ? capitalizeSentence(item.lastName) : '-'}
                                                            </td>
                                                            <td>{item.email || '-'}</td>
                                                            <td>{item.phone || '-'}</td>
                                                            <td style={{ maxWidth: '37ch', whiteSpace: 'normal', wordWrap: 'break-word' }}>{item.location || '-'}</td>
                                                            <td>
                                                                {item.latestInterviewDate ? (
                                                                    <span className="text-dark fw-medium">
                                                                        {formatDateForText(item.latestInterviewDate)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted">-</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <span
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onClick={() => toggleRow(item.id)}
                                                                    className="badge bg-light text-primary border px-2 py-1 fw-semibold d-inline-flex align-items-center gap-1 user-select-none"
                                                                    style={{ cursor: 'pointer', fontSize: '0.85rem' }}
                                                                    title="Görüşme geçmişini aç / kapat"
                                                                >
                                                                    {item.interviewCount || 0}
                                                                    <MessageCircle size={12} className="text-muted" />
                                                                </span>
                                                            </td>
                                                            <td>{formatDateForText(item.createdAt)}</td>
                                                            <td className="text-center">
                                                                <div className="d-flex justify-content-center align-items-center gap-2">
                                                                    <Button 
                                                                        variant="outline-info" 
                                                                        className="d-inline-flex align-items-center justify-content-center p-0"
                                                                        style={{ width: '28px', height: '28px' }}
                                                                        title="Yazışma Hazırla"
                                                                        aria-label="Yazışma Hazırla"
                                                                        onClick={() => {
                                                                            const rawPersonName = (item.lastName || '').trim();
                                                                            const personName = rawPersonName.split(/\s+/)[0] || '';
                                                                            const studName = item.firstName || '';
                                                                            const phone = item.phone || '';
                                                                            router.push(`/communication-templates?stud_name=${encodeURIComponent(studName)}&person_name=${encodeURIComponent(personName)}&phone=${encodeURIComponent(phone)}`);
                                                                        }}
                                                                    >
                                                                        <MessageCircle size={14} />
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline-success"
                                                                        className="d-inline-flex align-items-center justify-content-center p-0"
                                                                        style={{ width: '28px', height: '28px' }}
                                                                        title="Görüşme Ekle"
                                                                        aria-label="Görüşme Ekle"
                                                                        onClick={() => {
                                                                            setSelectedStudFarmId(item.id);
                                                                            setShowNoteModal(true);
                                                                        }}
                                                                    >
                                                                        <Plus size={14} />
                                                                    </Button>
                                                                    <Button 
                                                                        variant="outline-primary" 
                                                                        className="d-inline-flex align-items-center justify-content-center p-0"
                                                                        style={{ width: '28px', height: '28px' }}
                                                                        title="Hara Düzenle"
                                                                        aria-label="Hara Düzenle"
                                                                        onClick={() => {
                                                                            setEditStudFarm(item);
                                                                            setShowAddModal(true);
                                                                        }}
                                                                    >
                                                                        <Edit size={14} />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        
                                                        {isExpanded && (
                                                            <tr>
                                                                <td colSpan={10} className="p-0 border-0">
                                                                    <div className="bg-white">
                                                                        <StudFarmNotesTimeline 
                                                                            studFarmId={item.id} 
                                                                            refreshTrigger={notesRefreshTrigger}
                                                                            onNoteDeleted={() => {
                                                                                setNotesRefreshTrigger(prev => prev + 1);
                                                                                refetch();
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
                                                <td colSpan={10} className="text-center py-4 text-muted">
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
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 mt-3 pt-3">
                    <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-md-start gap-2 text-muted small w-100 w-md-auto">
                        <span className="text-nowrap fw-medium">Sayfa başına:</span>
                        <Form.Select 
                            size="sm" 
                            className="rounded-2 shadow-none border text-center fw-medium" 
                            style={{ width: '85px', minWidth: '85px', display: 'inline-block', cursor: 'pointer' }} 
                            value={parameters?.pageRequest?.size || 10} 
                            onChange={(e) => setParameters({ ...parameters, pageRequest: { ...parameters.pageRequest, size: Number(e.target.value), page: 0 } })}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </Form.Select>
                        <span className="text-nowrap ms-md-2">
                            Toplam <strong>{data?.page?.totalElements ?? 0}</strong> kayıt (Sayfa {(parameters?.pageRequest?.page ?? 0) + 1} / {data?.page?.totalPages ?? 1})
                        </span>
                    </div>
                    
                    <div className="d-flex justify-content-center align-items-center w-100 w-md-auto overflow-auto">
                        <CustomPagination page={data?.page} onPageChange={handlePageChange} />
                    </div>
                </div>
            )}

            <AddStudFarmModal 
                show={showAddModal} 
                onHide={() => { setShowAddModal(false); setEditStudFarm(null); }} 
                onSuccess={() => refetch()} 
                onDeleteSuccess={() => refetch()}
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
                        refetch();
                    }} 
                />
            )}
        </Container>
    );
}
