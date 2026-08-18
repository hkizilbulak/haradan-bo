"use client"
import { useMemo, useState } from "react";
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import CursorPagination from '@/components/CursorPagination';
import StatusBadge from '@/components/StatusBadge';
import { buildMediaUrl } from '@/contants/urls';
import { getBannerPlacementText, getMediaLifecycleText } from '@/helpers/EnumUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import useCursorApi from '@/hooks/useCursorApi';
import useModal from '@/hooks/useModal';
import { BannerRequest, BannerResponse } from '@/models';
import { bannerService } from '@/services';
import { PageHeading } from '@/widgets';
import BannerFilter from '@/widgets/banner/BannerFilter';
import BannerModal from '@/widgets/banner/BannerModal';
import { Alert, Button, Col, Container, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';

const headItems = [
  'Sıralama',
  'Önizleme',
  'Başlık',
  'Yerleşim',
  'Durum',
  'Görsel Durumu',
  ''
];

function parsePlacement(filter?: string): 'HOMEPAGE_HERO' | 'HOMEPAGE_PROMO' | 'HOMEPAGE' | 'LISTING_DETAIL' | 'SEARCH' | null {
  if (!filter) return null;
  const match = filter.split(';').find((part) => part.startsWith('placement=='));
  if (!match) return null;
  const value = match.slice('placement=='.length);
  if (
    value === 'HOMEPAGE_HERO' ||
    value === 'HOMEPAGE_PROMO' ||
    value === 'HOMEPAGE' ||
    value === 'LISTING_DETAIL' ||
    value === 'SEARCH'
  ) {
    return value as any;
  }
  return null;
}

export default function Banners() {
  const [{
    data,
    isLoading,
    isError,
    handleFilter,
    refetch,
    goNext,
    goPrev,
    canGoPrev,
    canGoNext,
    pageIndex,
    filter,
  }] = useCursorApi<BannerResponse>({
    service: bannerService,
    pageSize: 20,
    params: { filter: '', pageRequest: { page: 0, size: 20 } },
  });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [openFilter, setOpenFilter] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  /** Full placement list while in reorder mode (not just the current cursor page). */
  const [reorderItems, setReorderItems] = useState<BannerResponse[] | null>(null);
  const [reorderBaselineIds, setReorderBaselineIds] = useState<string>('');
  const [reorderBusy, setReorderBusy] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);

  const placementFilter = parsePlacement(filter);
  const reorderMode = reorderItems !== null;
  const displayItems = reorderMode ? reorderItems : (data?.content ?? []);
  const orderDirty = useMemo(() => {
    if (!reorderItems) return false;
    return reorderItems.map((item) => item.id).join(',') !== reorderBaselineIds;
  }, [reorderItems, reorderBaselineIds]);

  const openBannerModal = (banner?: BannerResponse) => {
    openModal(<BannerModal selectedBanner={banner} onClose={closeModal} onHandleSave={handleSave} />);
  };

  const exitReorderMode = () => {
    setReorderItems(null);
    setReorderBaselineIds('');
  };

  const handleSave = async (values: BannerRequest) => {
    try {
      if (values.identifier) {
        await bannerService.update(values);
      } else {
        await bannerService.create(values);
      }
      closeModal();
      exitReorderMode();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleToggleStatus = async (banner: BannerResponse) => {
    const id = banner.identifier ?? banner.id;
    if (!id || statusBusyId || reorderMode) {
      return;
    }

    setStatusBusyId(id);
    try {
      await bannerService.setStatus(
        {
          identifier: id,
          expectedVersion: banner.version,
          assetId: banner.assetId,
          placement: banner.placement,
          title: banner.title ?? undefined,
          altText: banner.altText ?? undefined,
          targetUrl: banner.targetUrl ?? undefined,
          sortOrder: banner.sortOrder,
        },
        banner.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      );
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setStatusBusyId(null);
    }
  };

  const enterReorderMode = async () => {
    if (!placementFilter || reorderBusy || reorderLoading) {
      return;
    }
    setReorderLoading(true);
    try {
      const all = await bannerService.fetchAll({ placement: placementFilter });
      // Stable display: BE sort_order then id
      const sorted = [...all].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.id.localeCompare(b.id);
      });
      setReorderItems(sorted);
      setReorderBaselineIds(sorted.map((item) => item.id).join(','));
    } catch (error) {
      toast.error(getErrorMessage(error));
      exitReorderMode();
    } finally {
      setReorderLoading(false);
    }
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    if (!reorderItems) {
      return;
    }
    const target = index + direction;
    if (target < 0 || target >= reorderItems.length) {
      return;
    }
    const next = [...reorderItems];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    setReorderItems(next);
  };

  const cancelReorder = () => {
    exitReorderMode();
  };

  const saveReorder = async () => {
    if (!placementFilter || !reorderItems || reorderBusy || !orderDirty) {
      return;
    }
    setReorderBusy(true);
    try {
      await bannerService.reorder(
        placementFilter,
        reorderItems.map((item, sortOrder) => ({
          id: item.id,
          expectedVersion: item.version,
          sortOrder,
        })),
      );
      toast.success('Banner sırası kaydedildi');
      exitReorderMode();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
      exitReorderMode();
      refetch();
    } finally {
      setReorderBusy(false);
    }
  };

  const content = displayItems.map((banner, index) => {
    const id = banner.identifier ?? banner.id;
    return (
      <tr key={id}>
        <td className="text-nowrap">
          {reorderMode ? (
            <>
              <Button
                size="sm"
                variant="outline-secondary"
                className="me-1"
                disabled={reorderBusy || index === 0}
                onClick={() => moveRow(index, -1)}
              >
                ↑
              </Button>
              <Button
                size="sm"
                variant="outline-secondary"
                disabled={reorderBusy || index === displayItems.length - 1}
                onClick={() => moveRow(index, 1)}
              >
                ↓
              </Button>
            </>
          ) : (
            <span className="text-muted small">Yerleşime göre</span>
          )}
        </td>
        <td style={{ width: 96 }}>
          {banner.assetId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={buildMediaUrl(banner.assetId, 'BANNER')}
              alt={banner.altText || banner.title || 'Banner'}
              style={{ width: 72, height: 40, objectFit: 'cover', borderRadius: 6 }}
            />
          ) : (
            '-'
          )}
        </td>
        <td>{banner.title || '-'}</td>
        <td>{getBannerPlacementText(banner.placement)}</td>
        <td><StatusBadge status={banner.status} /></td>
        <td>{getMediaLifecycleText(banner.assetLifecycleStatus)}</td>
        <td>
          <a
            className="font-medium text-cyan-600 me-3 cp"
            onClick={() => openBannerModal(banner)}>
            <i className={`fe fe-edit`}></i>
          </a>
          <Button
            size="sm"
            variant={banner.status === 'ACTIVE' ? 'warning' : 'success'}
            disabled={statusBusyId === id || reorderBusy || reorderMode}
            onClick={() => void handleToggleStatus(banner)}>
            {banner.status === 'ACTIVE' ? 'Pasife Al' : 'Aktifleştir'}
          </Button>
        </td>
      </tr>
    );
  });

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <PageHeading
            heading='Bannerlar'
            createButtonText='Banner Ekle'
            onCreate={() => openBannerModal(undefined)}
            onToggleFilter={() => setOpenFilter(!openFilter)} />
        </Col>
      </Row>

      {openFilter && (
        <BannerFilter
          onFilter={(values: string) => {
            exitReorderMode();
            handleFilter(values);
          }}
        />
      )}

      {!placementFilter && (
        <Alert variant="light" className="border small">
          Sıralamayı değiştirmek için önce bir yerleşim seçin (Ana Sayfa / İlan Detay / Arama).
        </Alert>
      )}

      {placementFilter && !reorderMode && (
        <div className="mb-3">
          <Button
            size="sm"
            variant="outline-primary"
            disabled={reorderLoading || isLoading}
            onClick={() => void enterReorderMode()}
          >
            {reorderLoading ? 'Sıralama yükleniyor...' : 'Bu yerleşimin sırasını düzenle'}
          </Button>
        </div>
      )}

      {reorderMode && (
        <Alert variant={orderDirty ? 'warning' : 'info'} className="d-flex justify-content-between align-items-center">
          <span>
            {orderDirty
              ? `Sıra değişti (${reorderItems?.length ?? 0} banner). Kaydedilmeden çıkılırsa kaybolur.`
              : `Sıralama modu: bu yerleşimdeki tüm bannerlar (${reorderItems?.length ?? 0}). ↑/↓ ile düzenleyin.`}
          </span>
          <div className="d-flex gap-2">
            <Button size="sm" variant="outline-secondary" disabled={reorderBusy} onClick={cancelReorder}>
              İptal
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={reorderBusy || !orderDirty}
              onClick={() => void saveReorder()}
            >
              {reorderBusy ? 'Kaydediliyor...' : 'Sırayı Kaydet'}
            </Button>
          </div>
        </Alert>
      )}

      {isModalOpen && modalContent}

      {(isLoading || reorderLoading) && <Loading />}

      {!isLoading && !reorderLoading && isError && !reorderMode && (
        <Alert variant="danger" className="d-flex justify-content-between align-items-center">
          <span>Bannerlar yüklenirken bir hata oluştu.</span>
          <Button size="sm" variant="outline-danger" onClick={() => refetch()}>Tekrar Dene</Button>
        </Alert>
      )}

      {!isLoading && !reorderLoading && !isError && displayItems.length === 0 && (
        <Alert variant="light" className="border text-muted">Henüz banner bulunmuyor. İlk bannerı ekleyebilirsiniz.</Alert>
      )}

      {!isLoading && !reorderLoading && !isError && displayItems.length > 0 && (
        <>
          <PrepareTable
            headItems={headItems}
            content={content}
            page={undefined}
            onHandlePageChange={() => undefined}
          />
          {!reorderMode && (
            <CursorPagination
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
              onPrev={goPrev}
              onNext={goNext}
              pageIndex={pageIndex}
              disabled={reorderBusy}
            />
          )}
        </>
      )}
    </Container>
  );
}
