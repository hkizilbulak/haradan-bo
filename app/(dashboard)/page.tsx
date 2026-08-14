'use client'
import { Fragment, useState, useEffect } from "react";
import { Container, Row, Col, Card, Table, Button, Badge } from "react-bootstrap";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from "@/context/AuthContext";
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import { ModerationAdvertResponse } from '@/models';
import { advertService, jobService, packageService, userService, tjkService, bannerService } from '@/services';
import { toast } from 'react-toastify';
import { Skeleton, TableSkeleton } from '@/components/Skeleton';

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
            const [advertsRes, usersRes, packagesRes, jobsRes, tjkRes, bannersRes] = await Promise.allSettled([
                advertService.search({ filter: 'status==PENDING_REVIEW', pageRequest: { page: 0, size: 5 } }),
                userService.fetchAll(),
                packageService.search({ pageRequest: { page: 0, size: 100 } }),
                jobService.search({ pageRequest: { page: 0, size: 100 } }),
                tjkService.search({ pageRequest: { page: 0, size: 10 } }),
                bannerService.search({ filter: 'status==ACTIVE', pageRequest: { page: 0, size: 100 } }),
            ]);

            let pendingCount = 0;
            let advertList: ModerationAdvertResponse[] = [];
            if (advertsRes.status === 'fulfilled') {
                advertList = advertsRes.value.content || [];
                pendingCount = advertsRes.value.page?.totalElements || advertList.length;
            }

            let uCount = 0;
            if (usersRes.status === 'fulfilled') {
                uCount = usersRes.value.length;
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

            let activeBannerCount = 0;
            if (bannersRes.status === 'fulfilled') {
                activeBannerCount = bannersRes.value.page?.totalElements || (bannersRes.value.content || []).length;
            }

            setStats({
                pendingAdvertsCount: pendingCount,
                totalUsers: uCount,
                totalPackages: pCount,
                totalJobs: jCount,
                activeBanners: activeBannerCount,
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
            <Container fluid className="p-3 p-lg-4">

                {/* Hoş Geldiniz Mesajı (Kartezya HR Style Header) */}
                <Row className="mb-4 align-items-center">
                    <Col lg={12} md={12} xs={12} className="d-flex justify-content-between align-items-center">
                        <h4 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.4rem' }}>
                            Hoş geldiniz, {userName}! 👋
                        </h4>
                        <Button 
                            variant="light" 
                            size="sm" 
                            className="border shadow-sm d-flex align-items-center gap-2 fw-semibold text-secondary"
                            onClick={() => void loadDashboardData()}
                        >
                            <i className="fe fe-refresh-cw"></i> Verileri Yenile
                        </Button>
                    </Col>
                </Row>

                {/* Üst İki Büyük Gradient Kart (Kartezya HR Row 1 Style) */}
                <Row className="mb-4 g-4">
                    {/* Pembe / Roz Gradient Kart (Çalışan Kartı Benzeri) */}
                    <Col xl={6} lg={6} md={12} xs={12}>
                        <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '16px' }}>
                            <Card.Body className="p-4 text-white">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="mb-0 text-white-50 fw-semibold">Sistem Özet Kartı</h5>
                                    <div style={{ fontSize: '2rem', opacity: 0.9 }}>📊</div>
                                </div>
                                <div className="row g-3">
                                    <Col md={6}>
                                        <h6 className="text-white-50 mb-1 small">Yönetici</h6>
                                        <p className="mb-0 fw-bold text-white fs-6">{userName}</p>
                                    </Col>
                                    <Col md={6}>
                                        <h6 className="text-white-50 mb-1 small">E-posta</h6>
                                        <p className="mb-0 text-white-75 small">{session?.user?.email || 'admin@haradan.com'}</p>
                                    </Col>
                                    <Col md={6}>
                                        <h6 className="text-white-50 mb-1 small">Bekleyen İlanlar</h6>
                                        <p className="mb-0 text-white-75 fw-semibold">{loadingStats ? '...' : `${stats.pendingAdvertsCount} İlan`}</p>
                                    </Col>
                                    <Col md={6}>
                                        <h6 className="text-white-50 mb-1 small">Kayıtlı Kullanıcılar</h6>
                                        <p className="mb-0 text-white-75 fw-semibold">{loadingStats ? '...' : `${stats.totalUsers} Kullanıcı`}</p>
                                    </Col>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Mor / İndigo Gradient Kart (Ne Zamandır Bizimlesin Benzeri) */}
                    <Col xl={6} lg={6} md={12} xs={12}>
                        <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px' }}>
                            <Card.Body className="p-4 text-white d-flex flex-column justify-content-between">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h5 className="mb-0 text-white-50 fw-semibold">İlan & Moderasyon Durumu</h5>
                                    <div style={{ fontSize: '2rem', opacity: 0.9 }}>🎉</div>
                                </div>
                                <div>
                                    <h1 className="fw-bold mb-1 text-white" style={{ fontSize: '2.2rem' }}>
                                        {loadingStats ? '...' : stats.pendingAdvertsCount > 0 ? `${stats.pendingAdvertsCount} Bekleyen İlan` : 'İşlem Beklemiyor'}
                                    </h1>
                                    <p className="mb-0 text-white-75 small">
                                        <i className="fe fe-check-circle me-1"></i>
                                        Sistem canlı moderasyon akışı aktif. Tüm ilan onay işlemlerinizi kolayca yönetebilirsiniz.
                                    </p>
                                </div>
                                <div className="mt-3">
                                    <Link href="/listings" className="btn btn-sm btn-light text-primary fw-bold px-3 py-2 rounded-3 shadow-sm">
                                        Moderasyon İşlemlerine Git &rarr;
                                    </Link>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* 4'lü İstatistik Kartları (Kartezya HR Row 2 Style) */}
                <Row className="mb-4 g-4">
                    {/* Kart 1: İzin Bakiyesi -> Moderasyon Bekleyen */}
                    <Col xl={3} lg={6} md={6} xs={12}>
                        <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '14px' }}>
                            <Card.Body className="p-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="mb-0 fw-bold text-secondary">Moderasyon Bekleyen</h6>
                                    <div className="icon-shape icon-md bg-light-primary text-primary rounded-3">
                                        <i className="fe fe-database fs-4"></i>
                                    </div>
                                </div>
                                <div>
                                    <h1 className="fw-bold mb-1 text-dark" style={{ fontSize: '2rem' }}>
                                        {loadingStats ? <Skeleton width="50px" height="30px" /> : stats.pendingAdvertsCount}
                                    </h1>
                                    <p className="mb-0 small text-muted">
                                        <span className="text-primary me-1 fw-semibold">
                                            <i className="fe fe-clock me-1"></i>
                                        </span>
                                        Onay bekleyen ilanlar
                                    </p>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Kart 2: Onay Bekleyen -> Kayıtlı Kullanıcılar */}
                    <Col xl={3} lg={6} md={6} xs={12}>
                        <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '14px' }}>
                            <Card.Body className="p-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="mb-0 fw-bold text-secondary">Kayıtlı Kullanıcılar</h6>
                                    <div className="icon-shape icon-md bg-light-warning text-warning rounded-3">
                                        <i className="fe fe-users fs-4"></i>
                                    </div>
                                </div>
                                <div>
                                    <h1 className="fw-bold mb-1 text-dark" style={{ fontSize: '2rem' }}>
                                        {loadingStats ? <Skeleton width="50px" height="30px" /> : stats.totalUsers}
                                    </h1>
                                    <p className="mb-0 small text-muted">
                                        <span className="text-warning me-1 fw-semibold">
                                            <i className="fe fe-user-check me-1"></i>
                                        </span>
                                        Toplam sistem kullanıcısı
                                    </p>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Kart 3: Onaylanan -> İlan Paketleri */}
                    <Col xl={3} lg={6} md={6} xs={12}>
                        <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '14px' }}>
                            <Card.Body className="p-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="mb-0 fw-bold text-secondary">Aktif Paketler</h6>
                                    <div className="icon-shape icon-md bg-light-info text-info rounded-3">
                                        <i className="fe fe-package fs-4"></i>
                                    </div>
                                </div>
                                <div>
                                    <h1 className="fw-bold mb-1 text-dark" style={{ fontSize: '2rem' }}>
                                        {loadingStats ? <Skeleton width="50px" height="30px" /> : stats.totalPackages}
                                    </h1>
                                    <p className="mb-0 small text-muted">
                                        <span className="text-info me-1 fw-semibold">
                                            <i className="fe fe-check-circle me-1"></i>
                                        </span>
                                        Tanımlı ilan paketleri
                                    </p>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Kart 4: Reddedilen -> Zamanlanmış İşler */}
                    <Col xl={3} lg={6} md={6} xs={12}>
                        <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '14px' }}>
                            <Card.Body className="p-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="mb-0 fw-bold text-secondary">Zamanlanmış İşler</h6>
                                    <div className="icon-shape icon-md bg-light-danger text-danger rounded-3">
                                        <i className="fe fe-cpu fs-4"></i>
                                    </div>
                                </div>
                                <div>
                                    <h1 className="fw-bold mb-1 text-dark" style={{ fontSize: '2rem' }}>
                                        {loadingStats ? <Skeleton width="50px" height="30px" /> : stats.totalJobs}
                                    </h1>
                                    <p className="mb-0 small text-muted">
                                        <span className="text-danger me-1 fw-semibold">
                                            <i className="fe fe-activity me-1"></i>
                                        </span>
                                        Aktif sistem işleri
                                    </p>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Alt Tablo & Kariyer/Sistem Geçmişi (Kartezya HR Row 3 Style) */}
                <Row className="g-4">
                    {/* Sol: Bekleyen İlan Talepleri Tablosu */}
                    <Col lg={7} md={12} xs={12}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="fw-bold mb-0 text-dark fs-6">Moderasyon Bekleyen Son İlanlar</h6>
                            <Link href="/listings" className="text-decoration-none small fw-semibold text-primary">
                                Tümünü Gör &rarr;
                            </Link>
                        </div>
                        <Card className="border-0 shadow-sm" style={{ borderRadius: '14px' }}>
                            <Card.Body className="p-0">
                                <div className="table-box">
                                    <div className="table-responsive">
                                        {loadingStats ? (
                                            <div className="p-3">
                                                <TableSkeleton columns={4} rows={4} />
                                            </div>
                                        ) : recentAdverts.length > 0 ? (
                                            <Table hover className="mb-0 align-middle">
                                                <thead>
                                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #dee2e6' }}>
                                                        <th style={{ padding: '12px 16px' }}>İLAN BAŞLIĞI</th>
                                                        <th style={{ padding: '12px 16px' }}>DURUM</th>
                                                        <th style={{ padding: '12px 16px' }}>TARİH</th>
                                                        <th style={{ padding: '12px 16px' }} className="text-end">İŞLEM</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {recentAdverts.map((advert) => (
                                                        <tr key={advert.identifier}>
                                                            <td style={{ padding: '12px 16px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} className="fw-semibold text-dark">
                                                                {advert.title ?? advert.identifier}
                                                            </td>
                                                            <td style={{ padding: '12px 16px' }}>
                                                                <StatusBadge status={advert.status} />
                                                            </td>
                                                            <td style={{ padding: '12px 16px' }} className="small text-muted">
                                                                {advert.publishedAt ? formatDateTimeForText(advert.publishedAt) : '-'}
                                                            </td>
                                                            <td style={{ padding: '12px 16px' }} className="text-end">
                                                                <Button size="sm" variant="success" className="me-1 py-1 px-2 small" onClick={() => void handleApprove(advert)}>
                                                                    Onayla
                                                                </Button>
                                                                <Button size="sm" variant="outline-primary" className="py-1 px-2 small" onClick={() => router.push('/listings')}>
                                                                    İncele
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        ) : (
                                            <div className="p-5 text-center text-muted">
                                                <i className="fe fe-check-circle fs-1 text-success mb-2 d-block"></i>
                                                <p className="mb-0 small">Bekleyen izin/moderasyon talebiniz yok.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Sağ: Sistem & TJK Senkronizasyon Durumu (Kartezya Timeline Style) */}
                    <Col lg={5} md={12} xs={12}>
                        <h6 className="fw-bold mb-3 text-dark fs-6">Sistem & Senkronizasyon Geçmişi</h6>
                        <Card className="border-0 shadow-sm" style={{ borderRadius: '14px' }}>
                            <Card.Body className="p-4">
                                <div style={{ position: 'relative', paddingLeft: '20px' }}>
                                    
                                    {/* Item 1: TJK Sync */}
                                    <div style={{ marginBottom: '24px', position: 'relative' }}>
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: '-25px',
                                                top: '6px',
                                                width: '12px',
                                                height: '12px',
                                                backgroundColor: '#10b981',
                                                borderRadius: '50%',
                                                border: '3px solid white',
                                                boxShadow: '0 0 0 2px #10b981',
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: '-20px',
                                                top: '24px',
                                                width: '2px',
                                                height: '45px',
                                                backgroundColor: '#e2e8f0',
                                            }}
                                        />
                                        <div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <h6 className="mb-1 fw-semibold text-dark">TJK Aşım & At Veri Servisi</h6>
                                                <Badge bg={stats.activeTjkRuns > 0 ? 'warning' : 'success'}>
                                                    {stats.activeTjkRuns > 0 ? 'Çalışıyor' : 'Hazır'}
                                                </Badge>
                                            </div>
                                            <p className="mb-1 small text-muted">
                                                TJK AsimRaporu ve aygır/kısrak verileri entegre durumda.
                                            </p>
                                            <Link href="/tjk" className="small text-primary text-decoration-none fw-semibold">
                                                TJK Yönetimine Git &rarr;
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Item 2: Active Banners */}
                                    <div style={{ marginBottom: '24px', position: 'relative' }}>
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: '-25px',
                                                top: '6px',
                                                width: '12px',
                                                height: '12px',
                                                backgroundColor: '#6366f1',
                                                borderRadius: '50%',
                                                border: '3px solid white',
                                                boxShadow: '0 0 0 2px #6366f1',
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: '-20px',
                                                top: '24px',
                                                width: '2px',
                                                height: '45px',
                                                backgroundColor: '#e2e8f0',
                                            }}
                                        />
                                        <div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <h6 className="mb-1 fw-semibold text-dark">Banner Yerleşimleri</h6>
                                                <Badge bg="info">{stats.activeBanners} Aktif</Badge>
                                            </div>
                                            <p className="mb-1 small text-muted">
                                                Ana sayfa ve detay sayfalarında yayınlanan bannerlar.
                                            </p>
                                            <Link href="/banners" className="small text-primary text-decoration-none fw-semibold">
                                                Banner Yöneticisi &rarr;
                                            </Link>
                                        </div>
                                    </div>

                                    {/* Item 3: Scheduled Jobs */}
                                    <div style={{ position: 'relative' }}>
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: '-25px',
                                                top: '6px',
                                                width: '12px',
                                                height: '12px',
                                                backgroundColor: '#f59e0b',
                                                borderRadius: '50%',
                                                border: '3px solid white',
                                                boxShadow: '0 0 0 2px #f59e0b',
                                            }}
                                        />
                                        <div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <h6 className="mb-1 fw-semibold text-dark">Zamanlanmış İşler (Cron Jobs)</h6>
                                                <Badge bg="secondary">{stats.totalJobs} İş</Badge>
                                            </div>
                                            <p className="mb-1 small text-muted">
                                                Paket süresi kontrolü ve medya temizleme görevleri.
                                            </p>
                                            <Link href="/jobs" className="small text-primary text-decoration-none fw-semibold">
                                                Zamanlanmış Görevler &rarr;
                                            </Link>
                                        </div>
                                    </div>

                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </Fragment>
    );
}
