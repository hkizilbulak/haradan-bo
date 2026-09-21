'use client'
import { Fragment, useState, useEffect } from "react";
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Form } from "react-bootstrap";
import Link from 'next/link';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from "@/context/AuthContext";
import { formatDateForText, formatDateTimeForText } from '@/helpers/DateUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import { ModerationAdvertResponse } from '@/models';
import { advertService, jobService, packageService, userService, bannerService, campaignService, categoryService, commentService, AdvertComment, ModerationReasonRequest } from '@/services';
import { toast } from 'react-toastify';
import { Skeleton, TableSkeleton } from '@/components/Skeleton';
import { AdvertDetailModal, PackageModal } from '@/widgets';

export default function Home() {
    const { session } = useAuth();

    const [loadingStats, setLoadingStats] = useState(true);
    const [stats, setStats] = useState({
        activeAdvertsCount: 0,
        activeUsersCount: 0,
        dailySuccessfulLogins: 0,
        pendingAdvertsCount: 0,
        totalUsers: 0,
        totalPackages: 0,
        totalJobs: 0,
        activeBanners: 0,
        activeCampaigns: 0,
    });
    const [recentAdverts, setRecentAdverts] = useState<ModerationAdvertResponse[]>([]);
    const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
    const [userMap, setUserMap] = useState<Map<string, { name?: string; email?: string }>>(new Map());
    const [detailAdvert, setDetailAdvert] = useState<ModerationAdvertResponse | null>(null);
    const [packageAdvert, setPackageAdvert] = useState<ModerationAdvertResponse | null>(null);
    const [pendingAction, setPendingAction] = useState<{
        advert: ModerationAdvertResponse;
        action: 'reject' | 'suspend';
    } | null>(null);
    const [reason, setReason] = useState('');
    const [actionBusy, setActionBusy] = useState(false);
    const [pendingComments, setPendingComments] = useState<AdvertComment[]>([]);
    const [pendingCommentsCount, setPendingCommentsCount] = useState(0);
    const [loadingComments, setLoadingComments] = useState(true);
    const [commentActionLoading, setCommentActionLoading] = useState<string | null>(null);

    const loadCategories = async () => {
        try {
            const res = await categoryService.search({ pageRequest: { page: 0, size: 100 } });
            const map = new Map<string, string>();
            const extract = (items: Array<{ identifier?: string; id?: string; name?: string; children?: unknown[] }>) => {
                for (const item of items) {
                    const id = item.identifier ?? item.id;
                    if (id && item.name) {
                        map.set(id, item.name);
                    }
                    if (item.children && Array.isArray(item.children)) {
                        extract(item.children as Array<{ identifier?: string; id?: string; name?: string; children?: unknown[] }>);
                    }
                }
            };
            if (res?.content) {
                extract(res.content as Array<{ identifier?: string; id?: string; name?: string; children?: unknown[] }>);
            }
            setCategoryMap(map);
        } catch { }
    };

    const loadDashboardData = async () => {
        setLoadingStats(true);
        try {
            const [
                pendingAdvertsRes,
                publishedAdvertsRes,
                activeUsersRes,
                totalUsersRes,
                packagesRes,
                jobsRes,
                bannersRes,
                campaignsRes,
            ] = await Promise.allSettled([
                advertService.search({ filter: 'status==PENDING_REVIEW', pageRequest: { page: 0, size: 5 } }),
                advertService.search({ filter: 'status==PUBLISHED', pageRequest: { page: 0, size: 1 } }),
                userService.search({ filter: 'status==ACTIVE', pageRequest: { page: 0, size: 1 } }),
                userService.search({ pageRequest: { page: 0, size: 1 } }),
                packageService.search({ pageRequest: { page: 0, size: 1 } }),
                jobService.getJobs(),
                bannerService.fetchAll({ status: 'ACTIVE' }),
                campaignService.search({ pageRequest: {} }),
            ]);

            let pendingCount = 0;
            let advertList: ModerationAdvertResponse[] = [];
            if (pendingAdvertsRes.status === 'fulfilled') {
                advertList = pendingAdvertsRes.value.content || [];
                pendingCount = pendingAdvertsRes.value.page?.totalElements || advertList.length;
            }

            let activeAdvCount = 0;
            if (publishedAdvertsRes.status === 'fulfilled') {
                activeAdvCount = publishedAdvertsRes.value.page?.totalElements || (publishedAdvertsRes.value.content || []).length;
            }

            let activeUserCount = 0;
            if (activeUsersRes.status === 'fulfilled') {
                activeUserCount = activeUsersRes.value.page?.totalElements || (activeUsersRes.value.content || []).length;
            }

            let uCount = 0;
            if (totalUsersRes.status === 'fulfilled') {
                uCount = totalUsersRes.value.page?.totalElements || (totalUsersRes.value.content || []).length;
            }

            // Fetch owner account details for only the 5 pending adverts
            const uniqueOwnerIds = Array.from(new Set(advertList.map(a => a.ownerUserId).filter(Boolean))) as string[];
            const uMap = new Map<string, { name?: string; email?: string }>();
            const defaultAdmin = {
                name: 'Sistem Yöneticisi',
                email: 'admin@haradan.com',
            };
            uMap.set('u1000000-0000-4000-8000-000000000001', defaultAdmin);

            if (uniqueOwnerIds.length > 0) {
                const ownerResults = await Promise.allSettled(uniqueOwnerIds.map(id => userService.getById(id)));
                for (const res of ownerResults) {
                    if (res.status === 'fulfilled' && res.value) {
                        const u = res.value;
                        const id = u.identifier ?? u.id;
                        if (id) {
                            const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
                            const info = { name: fullName || undefined, email: u.email || undefined };
                            uMap.set(id, info);
                            uMap.set(id.toLowerCase(), info);
                        }
                    }
                }
            }
            setUserMap(uMap);

            let pCount = 0;
            if (packagesRes.status === 'fulfilled') {
                pCount = packagesRes.value.page?.totalElements || (packagesRes.value.content || []).length;
            }

            let jCount = 0;
            if (jobsRes.status === 'fulfilled' && Array.isArray(jobsRes.value)) {
                jCount = jobsRes.value.length;
            }

            let activeBannerCount = 0;
            if (bannersRes.status === 'fulfilled' && Array.isArray(bannersRes.value)) {
                activeBannerCount = bannersRes.value.length;
            }

            let activeCampaignCount = 0;
            if (campaignsRes.status === 'fulfilled' && campaignsRes.value?.content) {
                activeCampaignCount = campaignsRes.value.content.filter(c => c.isActive).length;
            }

            // Günlük başarılı giriş sayısı hesabı
            let todayLogins = 0;
            if (session?.user?.id) {
                try {
                    const events = await userService.getSecurityEvents(session.user.id, 50);
                    const todayStr = new Date().toISOString().slice(0, 10);
                    const todayEvents = events.filter(
                        (e) => e.eventType === 'LOGIN_SUCCESS' && e.createdAt && e.createdAt.startsWith(todayStr)
                    );
                    todayLogins = Math.max(todayEvents.length, 1);
                } catch {
                    todayLogins = Math.max(activeUserCount > 0 ? Math.min(activeUserCount, 1) : 1, 1);
                }
            } else {
                todayLogins = Math.max(activeUserCount > 0 ? Math.min(activeUserCount, 1) : 1, 1);
            }

            setStats({
                activeAdvertsCount: activeAdvCount,
                activeUsersCount: activeUserCount,
                dailySuccessfulLogins: todayLogins,
                pendingAdvertsCount: pendingCount,
                totalUsers: uCount,
                totalPackages: pCount,
                totalJobs: jCount,
                activeBanners: activeBannerCount,
                activeCampaigns: activeCampaignCount,
            });

            setRecentAdverts(advertList.slice(0, 5));
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoadingStats(false);
        }
    };

    const loadPendingComments = async () => {
        setLoadingComments(true);
        try {
            const res = await commentService.getComments({ statuses: ['PENDING'] }, 1, 5);
            setPendingComments(res.items || []);
            setPendingCommentsCount(res.totalCount ?? (res.items || []).length);
        } catch (err) {
            console.error('Pending comments load error:', err);
        } finally {
            setLoadingComments(false);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            if (!isMounted) return;
            await Promise.all([
                loadDashboardData(),
                loadPendingComments(),
                loadCategories(),
            ]);
        };
        void init();
        return () => {
            isMounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user?.id]);

    const handleApproveComment = async (id: string) => {
        setCommentActionLoading(id);
        try {
            await commentService.approveComment(id);
            toast.success('Yorum onaylandı');
            await loadPendingComments();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setCommentActionLoading(null);
        }
    };

    const handleRejectComment = async (id: string) => {
        setCommentActionLoading(id);
        try {
            await commentService.rejectComment(id);
            toast.success('Yorum reddedildi');
            await loadPendingComments();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setCommentActionLoading(null);
        }
    };

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

    const closeActionModal = () => {
        setPendingAction(null);
        setReason('');
    };

    const openActionModal = (advert: ModerationAdvertResponse, action: 'reject' | 'suspend') => {
        setPendingAction({ advert, action });
        setReason('');
    };

    const handleReasonedAction = async () => {
        const advertId = pendingAction?.advert.identifier ?? pendingAction?.advert.id;
        if (!advertId || !pendingAction?.advert.version || actionBusy) {
            return;
        }

        if (reason.trim().length === 0) {
            toast.error('Gerekçe zorunludur');
            return;
        }

        const payload: ModerationReasonRequest = {
            expectedVersion: pendingAction.advert.version,
            reason: reason.trim(),
        };

        setActionBusy(true);
        try {
            if (pendingAction.action === 'reject') {
                await advertService.reject(advertId, payload);
                toast.success('İlan reddedildi');
            } else {
                await advertService.suspend(advertId, payload);
                toast.success('İlan yayından kaldırıldı');
            }
            closeActionModal();
            void loadDashboardData();
        } catch (error) {
            toast.error(getErrorMessage(error));
        } finally {
            setActionBusy(false);
        }
    };

    const userName = session?.user
        ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim()
        : 'Yönetici';

    return (
        <Fragment>
            <Container fluid className="px-6 py-4">

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

                {/* Genel Bakış ve Bekleyen İşlemler Panel (Personel Örnek Düzeni) */}
                <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '16px' }}>
                    <Card.Body className="p-4">
                        {/* Başlık ve Durum Rozeti */}
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div className="d-flex align-items-center gap-2">
                                <div
                                    className="d-flex align-items-center justify-content-center rounded-3"
                                    style={{ width: '38px', height: '38px', backgroundColor: '#eff2fe', color: '#4f46e5' }}
                                >
                                    <i className="fe fe-grid fs-5"></i>
                                </div>
                                <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.2rem' }}>
                                    Genel Bakış ve Bekleyen İşlemler
                                </h5>
                            </div>
                            <span
                                className="badge rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-1"
                                style={{ backgroundColor: '#eff2fe', color: '#4f46e5', fontSize: '0.82rem' }}
                            >
                                <i className="fe fe-activity"></i> Canlı Sistem Özeti
                            </span>
                        </div>

                        {/* Üst Satır (3 Büyük Metrik Kartı: Aktif İlan, Aktif Kullanıcı, Günlük Başarılı Login) */}
                        <Row className="g-3 mb-3">
                            {/* Kart 1: Aktif İlan Sayısı */}
                            <Col md={4} sm={12}>
                                <Link href="/listings?tab=published" className="text-decoration-none d-block h-100">
                                    <div
                                        className="p-3 d-flex align-items-center gap-3 h-100 dashboard-stat-card"
                                        style={{
                                            backgroundColor: '#eff2fe',
                                            borderRadius: '14px',
                                            border: '1px solid #dce4fd'
                                        }}
                                    >
                                        <div
                                            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                            style={{ width: '48px', height: '48px', backgroundColor: '#dbe4fc', color: '#4f46e5' }}
                                        >
                                            <i className="fe fe-file-text fs-4"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="d-block text-secondary fw-semibold small mb-1" style={{ fontSize: '0.85rem' }}>
                                                Aktif İlanlar
                                            </span>
                                            <h3 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.85rem' }}>
                                                {loadingStats ? <Skeleton width="50px" height="32px" /> : stats.activeAdvertsCount}
                                            </h3>
                                        </div>
                                    </div>
                                </Link>
                            </Col>

                            {/* Kart 2: Aktif Kullanıcı Sayısı */}
                            <Col md={4} sm={12}>
                                <Link href="/users" className="text-decoration-none d-block h-100">
                                    <div
                                        className="p-3 d-flex align-items-center gap-3 h-100 dashboard-stat-card"
                                        style={{
                                            backgroundColor: '#eff2fe',
                                            borderRadius: '14px',
                                            border: '1px solid #dce4fd'
                                        }}
                                    >
                                        <div
                                            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                            style={{ width: '48px', height: '48px', backgroundColor: '#dbe4fc', color: '#4f46e5' }}
                                        >
                                            <i className="fe fe-users fs-4"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="d-block text-secondary fw-semibold small mb-1" style={{ fontSize: '0.85rem' }}>
                                                Aktif Kullanıcılar
                                            </span>
                                            <h3 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.85rem' }}>
                                                {loadingStats ? <Skeleton width="50px" height="32px" /> : stats.activeUsersCount}
                                            </h3>
                                        </div>
                                    </div>
                                </Link>
                            </Col>

                            {/* Kart 3: Günlük Başarılı Login Sayısı */}
                            <Col md={4} sm={12}>
                                <Link href="/users" className="text-decoration-none d-block h-100">
                                    <div
                                        className="p-3 d-flex align-items-center gap-3 h-100 dashboard-stat-card"
                                        style={{
                                            backgroundColor: '#eff2fe',
                                            borderRadius: '14px',
                                            border: '1px solid #dce4fd'
                                        }}
                                    >
                                        <div
                                            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                            style={{ width: '48px', height: '48px', backgroundColor: '#dbe4fc', color: '#4f46e5' }}
                                        >
                                            <i className="fe fe-check-circle fs-4"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="d-block text-secondary fw-semibold small mb-1" style={{ fontSize: '0.85rem' }}>
                                                Günlük Başarılı Giriş
                                            </span>
                                            <h3 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.85rem' }}>
                                                {loadingStats ? <Skeleton width="50px" height="32px" /> : stats.dailySuccessfulLogins}
                                            </h3>
                                        </div>
                                    </div>
                                </Link>
                            </Col>
                        </Row>

                        {/* Alt Satır (5 Kompakt Kart: Pembe/Roz Tonu - Bekleyen & Sistem Durumları) */}
                        <Row className="g-3 row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-xl-5">
                            {/* Kart 1: Onay Bekleyen İlanlar */}
                            <Col>
                                <Link href="/listings?tab=unpublished" className="text-decoration-none d-block h-100">
                                    <div 
                                        className="d-flex align-items-center gap-3 h-100 dashboard-stat-card-rose"
                                        style={{ 
                                            backgroundColor: '#fff1f5', 
                                            borderRadius: '12px',
                                            border: '1px solid #fce7ef',
                                            minHeight: '68px',
                                            padding: '14px 18px'
                                        }}
                                    >
                                        <div 
                                            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                            style={{ width: '40px', height: '40px', backgroundColor: '#fed7e2', color: '#e11d48' }}
                                        >
                                            <i className="fe fe-clock fs-5"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="d-block fw-semibold mb-0" style={{ color: '#be185d', fontSize: '0.82rem' }}>
                                                Onay Bekleyen İlanlar
                                            </span>
                                            <h4 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.5rem' }}>
                                                {loadingStats ? <Skeleton width="30px" height="24px" /> : stats.pendingAdvertsCount}
                                            </h4>
                                        </div>
                                    </div>
                                </Link>
                            </Col>

                            {/* Kart 2: Tanımlı Paketler */}
                            <Col>
                                <Link href="/packages" className="text-decoration-none d-block h-100">
                                    <div 
                                        className="d-flex align-items-center gap-3 h-100 dashboard-stat-card-rose"
                                        style={{ 
                                            backgroundColor: '#fff1f5', 
                                            borderRadius: '12px',
                                            border: '1px solid #fce7ef',
                                            minHeight: '68px',
                                            padding: '14px 18px'
                                        }}
                                    >
                                        <div 
                                            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                            style={{ width: '40px', height: '40px', backgroundColor: '#fed7e2', color: '#e11d48' }}
                                        >
                                            <i className="fe fe-package fs-5"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="d-block fw-semibold mb-0" style={{ color: '#be185d', fontSize: '0.82rem' }}>
                                                Aktif Paketler
                                            </span>
                                            <h4 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.5rem' }}>
                                                {loadingStats ? <Skeleton width="30px" height="24px" /> : stats.totalPackages}
                                            </h4>
                                        </div>
                                    </div>
                                </Link>
                            </Col>

                            {/* Kart 3: Aktif Kampanyalar */}
                            <Col>
                                <Link href="/campaigns" className="text-decoration-none d-block h-100">
                                    <div 
                                        className="d-flex align-items-center gap-3 h-100 dashboard-stat-card-rose"
                                        style={{ 
                                            backgroundColor: '#fff1f5', 
                                            borderRadius: '12px',
                                            border: '1px solid #fce7ef',
                                            minHeight: '68px',
                                            padding: '14px 18px'
                                        }}
                                    >
                                        <div 
                                            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                            style={{ width: '40px', height: '40px', backgroundColor: '#fed7e2', color: '#e11d48' }}
                                        >
                                            <i className="fe fe-tag fs-5"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="d-block fw-semibold mb-0" style={{ color: '#be185d', fontSize: '0.82rem' }}>
                                                Aktif Kampanyalar
                                            </span>
                                            <h4 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.5rem' }}>
                                                {loadingStats ? <Skeleton width="30px" height="24px" /> : stats.activeCampaigns}
                                            </h4>
                                        </div>
                                    </div>
                                </Link>
                            </Col>

                            {/* Kart 4: Aktif Bannerlar */}
                            <Col>
                                <Link href="/banners" className="text-decoration-none d-block h-100">
                                    <div 
                                        className="d-flex align-items-center gap-3 h-100 dashboard-stat-card-rose"
                                        style={{ 
                                            backgroundColor: '#fff1f5', 
                                            borderRadius: '12px',
                                            border: '1px solid #fce7ef',
                                            minHeight: '68px',
                                            padding: '14px 18px'
                                        }}
                                    >
                                        <div 
                                            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                            style={{ width: '40px', height: '40px', backgroundColor: '#fed7e2', color: '#e11d48' }}
                                        >
                                            <i className="fe fe-layout fs-5"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="d-block fw-semibold mb-0" style={{ color: '#be185d', fontSize: '0.82rem' }}>
                                                Aktif Bannerlar
                                            </span>
                                            <h4 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.5rem' }}>
                                                {loadingStats ? <Skeleton width="30px" height="24px" /> : stats.activeBanners}
                                            </h4>
                                        </div>
                                    </div>
                                </Link>
                            </Col>

                            {/* Kart 5: Zamanlanmış Görevler */}
                            <Col>
                                <Link href="/job-management" className="text-decoration-none d-block h-100">
                                    <div 
                                        className="d-flex align-items-center gap-3 h-100 dashboard-stat-card-rose"
                                        style={{ 
                                            backgroundColor: '#fff1f5', 
                                            borderRadius: '12px',
                                            border: '1px solid #fce7ef',
                                            minHeight: '68px',
                                            padding: '14px 18px'
                                        }}
                                    >
                                        <div 
                                            className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                            style={{ width: '40px', height: '40px', backgroundColor: '#fed7e2', color: '#e11d48' }}
                                        >
                                            <i className="fe fe-clock fs-5"></i>
                                        </div>
                                        <div className="min-w-0">
                                            <span className="d-block fw-semibold mb-0" style={{ color: '#be185d', fontSize: '0.82rem' }}>
                                                Zamanlanmış Görevler
                                            </span>
                                            <h4 className="mb-0 fw-bold text-dark" style={{ fontSize: '1.5rem' }}>
                                                {loadingStats ? <Skeleton width="30px" height="24px" /> : stats.totalJobs}
                                            </h4>
                                        </div>
                                    </div>
                                </Link>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Alt Tablo & Kariyer/Sistem Geçmişi (Kartezya HR Row 3 Style) */}
                <Row className="g-4">
                    {/* Sol: Bekleyen İlan Talepleri Tablosu (İlanlar Sayfası Düzeni) */}
                    <Col xl={6} lg={6} md={12} xs={12}>
                        <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '14px', overflow: 'hidden' }}>
                            <Card.Header className="bg-white py-3 px-4 border-bottom d-flex align-items-center justify-content-between">
                                <h6 className="fw-bold mb-0 text-dark fs-6">Moderasyon Bekleyen Son İlanlar</h6>
                                <Link href="/listings" className="text-decoration-none small fw-semibold text-primary d-flex align-items-center gap-1">
                                    <span>Tümünü Gör</span>
                                    <i className="fe fe-arrow-right" style={{ fontSize: '12px' }}></i>
                                </Link>
                            </Card.Header>
                            <Card.Body className="p-0">
                                <div className="table-box">
                                    <div className="table-responsive">
                                        {loadingStats ? (
                                            <div className="p-3">
                                                <TableSkeleton columns={4} rows={4} />
                                            </div>
                                        ) : recentAdverts.length > 0 ? (
                                            <Table hover className="mb-0 align-middle text-nowrap">
                                                <thead>
                                                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #dee2e6' }}>
                                                        <th style={{ padding: '12px 16px' }}>İLANİ GÖNDEREN</th>
                                                        <th style={{ padding: '12px 16px' }}>GÖNDERİM TARİHİ</th>
                                                        <th style={{ padding: '12px 16px' }}>DURUM</th>
                                                        <th style={{ padding: '12px 16px' }} className="text-center">İŞLEMLER</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {recentAdverts.map((advert) => {
                                                        const advertId = advert.identifier ?? advert.id ?? '';
                                                        const ownerInfo = (advert.ownerUserId ? (userMap.get(advert.ownerUserId) || userMap.get(advert.ownerUserId.toLowerCase())) : undefined)
                                                            || (advert.ownerName ? { name: advert.ownerName, email: (advert as any).properties?.ownerEmail } : undefined)
                                                            || ((advert as any).properties?.ownerName ? { name: (advert as any).properties.ownerName, email: (advert as any).properties?.ownerEmail } : undefined);

                                                        const primaryText = ownerInfo?.name || ownerInfo?.email || advert.title || 'Sistem Yöneticisi';
                                                        const secondaryText = (ownerInfo?.name && ownerInfo?.email)
                                                            ? ownerInfo.email
                                                            : (advert.title && advert.title !== primaryText ? advert.title : (ownerInfo?.email || null));
                                                        const tooltipText = [ownerInfo?.name, ownerInfo?.email, advert.title].filter(Boolean).join(' - ');

                                                        const createdDateValue = advert.createdAt
                                                            || (advert as any).properties?.createdAt
                                                            || (advert as any).updatedAt
                                                            || advert.publishedAt;
                                                        const createdDateText = createdDateValue ? formatDateForText(createdDateValue) : '-';

                                                        return (
                                                            <tr key={advertId}>
                                                                <td style={{ maxWidth: '240px', padding: '12px 16px' }} title={tooltipText}>
                                                                    <div>
                                                                        <div className="fw-semibold text-dark text-truncate">
                                                                            {primaryText}
                                                                        </div>
                                                                        {secondaryText && (
                                                                            <div className="text-muted text-truncate" style={{ fontSize: '0.78rem', lineHeight: '1.2' }}>
                                                                                {secondaryText}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: '12px 16px' }}>
                                                                    {createdDateText}
                                                                </td>
                                                                <td style={{ padding: '12px 16px' }}>
                                                                    <StatusBadge status={advert.status} />
                                                                </td>
                                                                <td style={{ padding: '12px 16px' }} className="text-center">
                                                                    <div className="d-flex gap-1 align-items-center justify-content-center">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline-primary"
                                                                            className="d-inline-flex align-items-center justify-content-center"
                                                                            style={{ width: '32px', height: '32px', padding: 0 }}
                                                                            title="Detay"
                                                                            onClick={() => setDetailAdvert(advert)}
                                                                        >
                                                                            <i className="fe fe-eye" />
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline-secondary"
                                                                            className="d-inline-flex align-items-center justify-content-center"
                                                                            style={{ width: '32px', height: '32px', padding: 0 }}
                                                                            title="Paket ve İlan Düzenle"
                                                                            onClick={() => setPackageAdvert(advert)}
                                                                        >
                                                                            <i className="fe fe-edit" />
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
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

                    {/* Sağ: Yorum Onaylama Kısayolu */}
                    <Col xl={6} lg={6} md={12} xs={12}>
                        <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '14px', overflow: 'hidden' }}>
                            <Card.Header className="bg-white py-3 px-4 border-bottom d-flex align-items-center justify-content-between">
                                <h6 className="fw-bold mb-0 text-dark fs-6">Yorum Onaylama</h6>
                                <Link href="/comments" className="small text-primary text-decoration-none fw-semibold d-flex align-items-center gap-1">
                                    <span>Tümünü Gör</span>
                                    <i className="fe fe-arrow-right" style={{ fontSize: '12px' }}></i>
                                </Link>
                            </Card.Header>
                            <Card.Body className="p-3">
                                {loadingComments ? (
                                    <div className="py-3 px-2">
                                        <Skeleton height="50px" className="mb-2 rounded-3" />
                                        <Skeleton height="50px" className="mb-2 rounded-3" />
                                        <Skeleton height="50px" className="rounded-3" />
                                    </div>
                                ) : pendingComments.length === 0 ? (
                                    <div className="py-5 px-3 text-center text-muted">
                                        <div
                                            className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                                            style={{ width: '52px', height: '52px', backgroundColor: '#f0fdf4', color: '#16a34a' }}
                                        >
                                            <i className="fe fe-check-circle fs-2"></i>
                                        </div>
                                        <h6 className="fw-semibold text-dark mb-1">Onay Bekleyen Yorum Yok</h6>
                                        <p className="small text-muted mb-0">Tüm kullanıcı yorumları incelendi ve güncel.</p>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column gap-2">
                                        {pendingComments.map((cmt) => {
                                            const authorDisplay = cmt.authorName || 'Anonim Kullanıcı';
                                            const initial = authorDisplay.charAt(0).toUpperCase();

                                            return (
                                                <div
                                                    key={cmt.id}
                                                    className="p-2.5 px-3 rounded-3 d-flex align-items-center justify-content-between gap-3"
                                                    style={{
                                                        backgroundColor: '#f8fafc',
                                                        border: '1px solid #e2e8f0',
                                                        transition: 'all 0.2s ease',
                                                        minHeight: '52px'
                                                    }}
                                                >
                                                    {/* Kullanıcı Bilgisi */}
                                                    <div className="d-flex align-items-center gap-2 flex-shrink-0" style={{ minWidth: '150px', maxWidth: '190px' }}>
                                                        <div
                                                            className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm flex-shrink-0"
                                                            style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                fontSize: '12px',
                                                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                                                            }}
                                                        >
                                                            {initial}
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <span className="fw-bold text-dark d-block text-truncate" style={{ fontSize: '13px', lineHeight: '1.2' }} title={authorDisplay}>
                                                                {authorDisplay}
                                                            </span>
                                                            <span className="text-muted" style={{ fontSize: '11px' }}>
                                                                {formatDateTimeForText(cmt.createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Yorum İçeriği (Tek Satır) */}
                                                    <div className="flex-grow-1 overflow-hidden d-flex align-items-center gap-2">
                                                        {cmt.rating && (
                                                            <Badge bg="warning" className="text-dark d-inline-flex align-items-center gap-1 flex-shrink-0" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                                                <i className="fe fe-star" style={{ fontSize: '9px' }}></i> {cmt.rating}/5
                                                            </Badge>
                                                        )}
                                                        <div
                                                            className="text-dark small text-truncate fw-medium"
                                                            style={{
                                                                color: '#334155',
                                                                fontSize: '13px',
                                                                fontStyle: 'italic'
                                                            }}
                                                            title={cmt.content}
                                                        >
                                                            &ldquo;{cmt.content}&rdquo;
                                                        </div>
                                                        {cmt.advertTitle && (
                                                            <span className="text-muted text-truncate small opacity-75 d-none d-xxl-inline flex-shrink-0" style={{ fontSize: '11px', maxWidth: '130px' }} title={cmt.advertTitle}>
                                                                • {cmt.advertTitle}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Aksiyon Butonları */}
                                                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                                        <Button
                                                            size="sm"
                                                            variant="outline-danger"
                                                            className="d-inline-flex align-items-center gap-1 px-2.5 py-1"
                                                            style={{ fontSize: '12px', borderRadius: '6px' }}
                                                            disabled={commentActionLoading === cmt.id}
                                                            onClick={() => void handleRejectComment(cmt.id)}
                                                        >
                                                            <i className="fe fe-x"></i> Reddet
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="success"
                                                            className="d-inline-flex align-items-center gap-1 px-3 py-1 text-white"
                                                            style={{ fontSize: '12px', borderRadius: '6px' }}
                                                            disabled={commentActionLoading === cmt.id}
                                                            onClick={() => void handleApproveComment(cmt.id)}
                                                        >
                                                            <i className="fe fe-check"></i> Onayla
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>

            {detailAdvert && (
                <AdvertDetailModal
                    advert={detailAdvert}
                    categoryName={
                        detailAdvert?.categoryId
                            ? categoryMap.get(detailAdvert.categoryId) || detailAdvert.categoryId
                            : undefined
                    }
                    onClose={() => setDetailAdvert(null)}
                    onApprove={async (adv) => {
                        setDetailAdvert(null);
                        await handleApprove(adv);
                    }}
                    onReject={(adv) => {
                        setDetailAdvert(null);
                        openActionModal(adv, 'reject');
                    }}
                    onSuspend={(adv) => {
                        setDetailAdvert(null);
                        openActionModal(adv, 'suspend');
                    }}
                />
            )}

            {/* Moderasyon İşlemi Açılan Penceresi (Modal) */}
            <Modal show={pendingAction !== null} onHide={closeActionModal} centered backdrop="static">
                <Modal.Header closeButton={!actionBusy} className="border-bottom-0 pb-1">
                    <div className="d-flex align-items-center gap-3">
                        <div
                            className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
                                pendingAction?.action === 'reject'
                                    ? 'bg-danger-subtle text-danger'
                                    : 'bg-secondary-subtle text-secondary'
                            }`}
                            style={{ width: '44px', height: '44px' }}
                        >
                            <i
                                className={`fs-4 fe ${
                                    pendingAction?.action === 'reject'
                                        ? 'fe-x-circle'
                                        : 'fe-pause-circle'
                                }`}
                            />
                        </div>
                        <div>
                            <Modal.Title className="h5 mb-0 fw-bold">
                                {pendingAction?.action === 'reject'
                                    ? 'İlanı Reddet'
                                    : 'Yayından Kaldır'}
                            </Modal.Title>
                            <small className="text-muted">
                                {pendingAction?.action === 'reject'
                                    ? 'İlanın reddedilme gerekçesini belirtiniz.'
                                    : 'İlanın yayından kaldırılma gerekçesini belirtiniz.'}
                            </small>
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body className="pt-3">
                    {pendingAction?.advert && (
                        <div className="p-3 bg-light rounded-3 mb-3 border">
                            <div className="text-muted small mb-1">İşlem Yapılan İlan:</div>
                            <div className="fw-semibold text-dark text-truncate">
                                {pendingAction.advert.title || 'Başlıksız İlan'}
                            </div>
                        </div>
                    )}
                    <Form.Group>
                        <Form.Label className="small fw-semibold text-secondary">
                            Gerekçe <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={4}
                            value={reason}
                            placeholder={
                                pendingAction?.action === 'reject'
                                    ? 'İlanın neden reddedildiğini detaylıca açıklayınız (kullanıcıya gösterilecektir)...'
                                    : 'Gerekçe açıklamasını giriniz...'
                            }
                            className="rounded-3 shadow-none"
                            onChange={(event) => setReason(event.target.value)}
                            autoFocus
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer className="border-top-0 pt-1">
                    <Button variant="outline-secondary" className="rounded-3 px-3" onClick={closeActionModal} disabled={actionBusy}>
                        Vazgeç
                    </Button>
                    <Button
                        variant={pendingAction?.action === 'reject' ? 'danger' : 'secondary'}
                        className="rounded-3 px-4 fw-semibold text-white"
                        disabled={reason.trim().length === 0 || actionBusy}
                        onClick={() => void handleReasonedAction()}
                    >
                        {actionBusy ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                                İşleniyor...
                            </>
                        ) : pendingAction?.action === 'reject' ? (
                            'İlanı Reddet'
                        ) : (
                            'Yayından Kaldır'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {packageAdvert && (
                <PackageModal
                    advert={packageAdvert}
                    onClose={() => setPackageAdvert(null)}
                    onDone={() => {
                        setPackageAdvert(null);
                        void loadDashboardData();
                    }}
                />
            )}
        </Fragment>
    );
}
