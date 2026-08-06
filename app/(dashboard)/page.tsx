'use client'
import { Fragment, useState, useEffect } from "react";
import { Container, Row, Col, Card, Spinner, Table, Button } from "react-bootstrap";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from "@/context/AuthContext";
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import { ModerationAdvertResponse } from '@/models';
import { advertService, jobService, packageService, userService, tjkService } from '@/services';
import { toast } from 'react-toastify';

export default function Home() {
    const { session } = useAuth();
    const router = useRouter();

    const [loadingStats, setLoadingStats] = useState(true);
    const [stats, setStats] = useState({
        pendingAdvertsCount: 0,
        totalUsers: 0,
        totalPackages: 0,
        totalJobs: 0,
        activeBanners: 0,
        activeTjkRuns: 0,
    });
    const [recentAdverts, setRecentAdverts] = useState<ModerationAdvertResponse[]>([]);

    const loadDashboardData = async () => {
        setLoadingStats(true);
        try {
            const [advertsRes, usersRes, packagesRes, jobsRes, tjkRes] = await Promise.allSettled([
                advertService.search({ pageRequest: { page: 0, size: 5 } }),
                userService.search({ pageRequest: { page: 0, size: 100 } }),
                packageService.search({ pageRequest: { page: 0, size: 100 } }),
                jobService.search({ pageRequest: { page: 0, size: 100 } }),
                tjkService.search({ pageRequest: { page: 0, size: 10 } }),
            ]);

            let pendingCount = 0;
            let advertList: ModerationAdvertResponse[] = [];
            if (advertsRes.status === 'fulfilled') {
                advertList = advertsRes.value.content || [];
                pendingCount = advertsRes.value.page?.totalElements || advertList.length;
            }

            let uCount = 0;
            if (usersRes.status === 'fulfilled') {
                uCount = usersRes.value.page?.totalElements || (usersRes.value.content || []).length;
            }

            let pCount = 0;
            if (packagesRes.status === 'fulfilled') {
                pCount = packagesRes.value.page?.totalElements || (packagesRes.value.content || []).length;
            }

            let jCount = 0;
            if (jobsRes.status === 'fulfilled') {
                jCount = jobsRes.value.page?.totalElements || (jobsRes.value.content || []).length;
            }

            let tjkActiveCount = 0;
            if (tjkRes.status === 'fulfilled') {
                tjkActiveCount = (tjkRes.value.content || []).filter(
                    r => r.status === 'RUNNING' || r.status === 'QUEUED'
                ).length;
            }

            setStats({
                pendingAdvertsCount: pendingCount,
                totalUsers: uCount,
                totalPackages: pCount,
                totalJobs: jCount,
                activeBanners: 0,
                activeTjkRuns: tjkActiveCount,
            });

            setRecentAdverts(advertList.slice(0, 5));
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoadingStats(false);
        }
    };

    useEffect(() => {
        void loadDashboardData();
    }, []);

    const handleApprove = async (advert: ModerationAdvertResponse) => {
        if (!advert.identifier || !advert.version) return;
        try {
            await advertService.approve(advert.identifier, advert.version);
            toast.success('İlan onaylandı');
            void loadDashboardData();
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    };

    const userName = session?.user
        ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim()
        : 'Yönetici';

    return (
        <Fragment>
            <Container fluid className="px-6 py-4">

                {/* Main Card Container */}
                <Card className="border-0 shadow-sm mb-6" style={{ borderRadius: '16px', backgroundColor: '#ffffff' }}>
                    <Card.Body className="p-4">
                        
                        {/* Header */}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div className="d-flex align-items-center gap-2">
                                <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '32px', height: '32px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                                    <i className="fe fe-grid fs-5"></i>
                                </div>
                                <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '15.5px', letterSpacing: '-0.2px' }}>
                                    Genel Bakış ve Bekleyen İşlemler — Hoş Geldiniz, {userName} 👋
                                </h5>
                            </div>
                            <div 
                                className="d-flex align-items-center gap-2 px-3 py-1.5 rounded-pill cp" 
                                style={{ backgroundColor: 'rgba(99, 102, 241, 0.08)', color: '#6366f1', fontSize: '11.5px', fontWeight: 600 }}
                                onClick={() => void loadDashboardData()}
                            >
                                <i className="fe fe-activity"></i>
                                Canlı Sistem Özeti (Yenile)
                            </div>
                        </div>

                        {/* Divider */}
                        <hr className="my-3" style={{ borderColor: '#f1f5f9', opacity: 0.8 }} />

                        {/* Row 1: Large Stat Cards (3 Columns) */}
                        <Row className="g-4 mb-4">
                            {/* Card 1: Moderasyon Bekleyen İlanlar */}
                            <Col xl={4} lg={4} md={12} xs={12}>
                                <div
                                    className="d-flex align-items-center gap-3 p-4"
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease-in-out',
                                        border: '1px solid #e0e7ff',
                                        borderRadius: '12px',
                                        backgroundColor: '#f5f7ff'
                                    }}
                                    onClick={() => router.push('/listings')}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(99, 102, 241, 0.08)';
                                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.35)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = '#e0e7ff';
                                    }}
                                >
                                    <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '56px', height: '56px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#4f46e5', flexShrink: 0 }}>
                                        <i className="fe fe-database fs-3"></i>
                                    </div>
                                    <div className="d-flex flex-column gap-0.5">
                                        <span className="fw-bold" style={{ fontSize: '13px', color: '#4f46e5' }}>Moderasyon Bekleyen İlanlar</span>
                                        <h1 className="mb-0 fw-bold" style={{ fontSize: '28px', lineHeight: 1.2, color: '#3730a3' }}>
                                            {loadingStats ? (
                                                <Spinner animation="border" role="status" size="sm">
                                                    <span className="visually-hidden">Yükleniyor...</span>
                                                </Spinner>
                                            ) : stats.pendingAdvertsCount}
                                        </h1>
                                    </div>
                                </div>
                            </Col>

                            {/* Card 2: Kayıtlı Kullanıcılar */}
                            <Col xl={4} lg={4} md={12} xs={12}>
                                <div
                                    className="d-flex align-items-center gap-3 p-4"
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease-in-out',
                                        border: '1px solid #c7d2fe',
                                        borderRadius: '12px',
                                        backgroundColor: '#eef2ff'
                                    }}
                                    onClick={() => router.push('/users')}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(79, 70, 229, 0.08)';
                                        e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = '#c7d2fe';
                                    }}
                                >
                                    <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '56px', height: '56px', backgroundColor: 'rgba(79, 70, 229, 0.15)', color: '#4338ca', flexShrink: 0 }}>
                                        <i className="fe fe-users fs-3"></i>
                                    </div>
                                    <div className="d-flex flex-column gap-0.5">
                                        <span className="fw-bold" style={{ fontSize: '13px', color: '#4338ca' }}>Kayıtlı Kullanıcılar</span>
                                        <h1 className="mb-0 fw-bold" style={{ fontSize: '28px', lineHeight: 1.2, color: '#3730a3' }}>
                                            {loadingStats ? (
                                                <Spinner animation="border" role="status" size="sm">
                                                    <span className="visually-hidden">Yükleniyor...</span>
                                                </Spinner>
                                            ) : stats.totalUsers}
                                        </h1>
                                    </div>
                                </div>
                            </Col>

                            {/* Card 3: Dinamik Paket Kataloğu */}
                            <Col xl={4} lg={4} md={12} xs={12}>
                                <div
                                    className="d-flex align-items-center gap-3 p-4"
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease-in-out',
                                        border: '1px solid #a5b4fc',
                                        borderRadius: '12px',
                                        backgroundColor: '#e0e7ff'
                                    }}
                                    onClick={() => router.push('/packages')}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(67, 56, 202, 0.1)';
                                        e.currentTarget.style.borderColor = 'rgba(67, 56, 202, 0.5)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = '#a5b4fc';
                                    }}
                                >
                                    <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '56px', height: '56px', backgroundColor: 'rgba(67, 56, 202, 0.18)', color: '#3730a3', flexShrink: 0 }}>
                                        <i className="fe fe-package fs-3"></i>
                                    </div>
                                    <div className="d-flex flex-column gap-0.5">
                                        <span className="fw-bold" style={{ fontSize: '13px', color: '#3730a3' }}>Dinamik Paket Kataloğu</span>
                                        <h1 className="mb-0 fw-bold" style={{ fontSize: '28px', lineHeight: 1.2, color: '#312e81' }}>
                                            {loadingStats ? (
                                                <Spinner animation="border" role="status" size="sm">
                                                    <span className="visually-hidden">Yükleniyor...</span>
                                                </Spinner>
                                            ) : stats.totalPackages}
                                        </h1>
                                    </div>
                                </div>
                            </Col>
                        </Row>

                        {/* Divider */}
                        <hr className="my-3" style={{ borderColor: '#f1f5f9', opacity: 0.8 }} />

                        {/* Row 2: Small Cards (3 Columns) */}
                        <Row className="g-4">
                            {/* Small Card 1: Sistem Jobları */}
                            <Col xl={4} lg={4} md={6} xs={12}>
                                <div
                                    className="d-flex align-items-center gap-3 p-3"
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease-in-out',
                                        border: '1px solid #fce7f3',
                                        borderRadius: '12px',
                                        backgroundColor: '#fdf2f8'
                                    }}
                                    onClick={() => router.push('/jobs')}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(219, 39, 119, 0.08)';
                                        e.currentTarget.style.borderColor = 'rgba(219, 39, 119, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = '#fce7f3';
                                    }}
                                >
                                    <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '42px', height: '42px', backgroundColor: 'rgba(219, 39, 119, 0.12)', color: '#db2777', flexShrink: 0 }}>
                                        <i className="fe fe-cpu fs-4"></i>
                                    </div>
                                    <div className="d-flex flex-column gap-0.5">
                                        <span className="fw-bold" style={{ fontSize: '13px', color: '#be185d' }}>Tanımlı Zamanlanmış İşler (Joblar)</span>
                                        <div className="d-flex align-items-center gap-2">
                                            <h2 className="mb-0 fw-bold" style={{ fontSize: '18px', lineHeight: 1, color: '#9d174d' }}>
                                                {loadingStats ? (
                                                    <Spinner animation="border" role="status" size="sm">
                                                        <span className="visually-hidden">Yükleniyor...</span>
                                                    </Spinner>
                                                ) : stats.totalJobs}
                                            </h2>
                                        </div>
                                    </div>
                                </div>
                            </Col>

                            {/* Small Card 2: TJK Senkronizasyonu */}
                            <Col xl={4} lg={4} md={6} xs={12}>
                                <div
                                    className="d-flex align-items-center gap-3 p-3"
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease-in-out',
                                        border: '1px solid #ccfbf1',
                                        borderRadius: '12px',
                                        backgroundColor: '#f0fdf4'
                                    }}
                                    onClick={() => router.push('/tjk')}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(16, 185, 129, 0.08)';
                                        e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = '#ccfbf1';
                                    }}
                                >
                                    <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '42px', height: '42px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981', flexShrink: 0 }}>
                                        <i className="fe fe-activity fs-4"></i>
                                    </div>
                                    <div className="d-flex flex-column gap-0.5">
                                        <span className="fw-bold" style={{ fontSize: '13px', color: '#047857' }}>TJK Senkronizasyon Durumu</span>
                                        <div className="d-flex align-items-center gap-2">
                                            <h2 className="mb-0 fw-bold" style={{ fontSize: '18px', lineHeight: 1, color: '#065f46' }}>
                                                {loadingStats ? (
                                                    <Spinner animation="border" role="status" size="sm">
                                                        <span className="visually-hidden">Yükleniyor...</span>
                                                    </Spinner>
                                                ) : stats.activeTjkRuns > 0 ? `${stats.activeTjkRuns} Aktif` : 'Hazır'}
                                            </h2>
                                        </div>
                                    </div>
                                </div>
                            </Col>

                            {/* Small Card 3: Bildirim & Kampanya */}
                            <Col xl={4} lg={4} md={6} xs={12}>
                                <div
                                    className="d-flex align-items-center gap-3 p-3"
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease-in-out',
                                        border: '1px solid #fef3c7',
                                        borderRadius: '12px',
                                        backgroundColor: '#fffbeb'
                                    }}
                                    onClick={() => router.push('/notifications')}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(245, 158, 11, 0.08)';
                                        e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = '#fef3c7';
                                    }}
                                >
                                    <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '42px', height: '42px', backgroundColor: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', flexShrink: 0 }}>
                                        <i className="fe fe-mail fs-4"></i>
                                    </div>
                                    <div className="d-flex flex-column gap-0.5">
                                        <span className="fw-bold" style={{ fontSize: '13px', color: '#b45309' }}>Bildirim Şablonları & Kampanyalar</span>
                                        <div className="d-flex align-items-center gap-2">
                                            <h2 className="mb-0 fw-bold" style={{ fontSize: '18px', lineHeight: 1, color: '#78350f' }}>
                                                Yönetim
                                            </h2>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Section 2: Recent Moderation Adverts Table */}
                <Row>
                    <Col lg={12} md={12} xs={12}>
                        <Card className="border-0 shadow-sm" style={{ borderRadius: '16px' }}>
                            <Card.Header className="bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-2">
                                    <i className="fe fe-clock text-primary fs-5"></i>
                                    <h5 className="mb-0 fw-bold">Moderasyon Bekleyen Son İlanlar</h5>
                                </div>
                                <Link href="/listings" className="btn btn-sm btn-outline-primary fw-semibold">
                                    Tüm Moderasyon Kuyruğuna Git &rarr;
                                </Link>
                            </Card.Header>
                            <Card.Body className="p-0">
                                {loadingStats && (
                                    <div className="p-4 text-center">
                                        <Spinner animation="border" role="status" variant="primary" />
                                    </div>
                                )}
                                {!loadingStats && recentAdverts.length === 0 && (
                                    <div className="p-5 text-center text-muted">
                                        <i className="fe fe-check-circle fs-1 text-success mb-2 d-block"></i>
                                        <p className="mb-0">Moderasyon bekleyen ilan bulunmamaktadır.</p>
                                    </div>
                                )}
                                {!loadingStats && recentAdverts.length > 0 && (
                                    <Table responsive hover className="mb-0 align-middle">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="px-4">İlan Başlığı</th>
                                                <th>Durum</th>
                                                <th>Yayın Tarihi</th>
                                                <th>Versiyon</th>
                                                <th className="text-end px-4">İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentAdverts.map((advert) => (
                                                <tr key={advert.identifier}>
                                                    <td className="px-4 fw-semibold" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {advert.title ?? advert.identifier}
                                                    </td>
                                                    <td>
                                                        <StatusBadge status={advert.status} />
                                                    </td>
                                                    <td className="small text-muted">
                                                        {advert.publishedAt ? formatDateTimeForText(advert.publishedAt) : '-'}
                                                    </td>
                                                    <td>{advert.version}</td>
                                                    <td className="text-end px-4">
                                                        <Button size="sm" variant="success" className="me-2" onClick={() => void handleApprove(advert)}>
                                                            Onayla
                                                        </Button>
                                                        <Button size="sm" variant="outline-primary" onClick={() => router.push('/listings')}>
                                                            İncele
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </Fragment>
    );
}
