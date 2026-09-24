"use client"
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Modal, Button, Form, Badge, Table, Alert, Row, Col, Card, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { buildMediaUrl } from '@/contants/urls';
import { formatDateForText, formatDateTimeForText } from '@/helpers/DateUtils';

import { formatMoney, getErrorMessage } from '@/helpers/HelperUtils';
import ConfirmModal from '@/components/ConfirmModal';
import { ModerationAdvertResponse } from '@/models';
import {
  advertService,
  AdvertPackageAssignment,
  AssignPackageRequest,
  packageService,
  PackageResponse,
  ModerationAdvertDetail,
  AdminAdvertPaymentResponse,
  DEFAULT_MOCK_MEDIA,
} from '@/services';
import { PROVINCES_BY_UUID } from '@/helpers/location';
import { apiRequest } from '@/helpers/api/openapiClient';
import { mediaService } from '@/services/media.service';
import {
  getAdvertCategoryKind,
  isRaceHorseAdvert,
  isMareAdvert,
  isStallionAdvert,
} from '@/helpers/advertCategoryHelper';
import LiveAdvertCardPreview from './LiveAdvertCardPreview';
import ImageCropperModal from '@/components/ImageCropperModal';

const HORSE_BREED_OPTIONS = [
  'Safkan Arap',
  'İngiliz (Thoroughbred)',
  'Warmblood / Spor Atı',
  'Konkur / Engel Atlama',
  'Rahvan',
  'Pony / Midilli',
  'Haflinger',
];

const STUD_BREED_OPTIONS = ['Safkan Arap', 'İngiliz (Thoroughbred)'];

const COAT_COLOR_OPTIONS = [
  'Doru',
  'Al',
  'Kır',
  'Beyaz',
  'Yağız',
  'Kula',
  'Boz',
  'Kestane',
];

const HORSE_AGE_OPTIONS = [
  '0', '1', '1.5', '2', '3', '4', '5', '6', '7', '8', '9', '10-15 arası', '15 üzeri',
];

const GENDER_OPTIONS = ['Erkek', 'Dişi', 'İğdiş'];

const PREGNANCY_STAGE_OPTIONS = ['K1', 'K2', 'K3'];

const EQUIPMENT_TYPE_OPTIONS = [
  'Eyer & Semer',
  'Başlık & Gem',
  'Yelek & Kask',
  'Çizme & Bot',
  'Ahır Malzemesi',
  'Tımar Malzemesi',
  'Battaniye & Koruma',
];

const ITEM_CONDITION_OPTIONS = [
  'Sıfır (Kullanılmamış)',
  'İkinci El (Çok İyi)',
  'İkinci El (İyi)',
  'İkinci El (Kullanılmış)',
];

const FACILITY_TYPE_OPTIONS = [
  'Ahır Kiralama',
  'Hara Kompleksi',
  'Padok Alanı',
  'Binicilik Tesisi',
  'Çiftlik Arazisi',
];

const FARRIER_SPECIALTY_OPTIONS = [
  'Ortopedik Nallama',
  'Yarış Atı Nallama',
  'Sıcak Nallama',
  'Rutin Bakım & Tırnak Düzeltme',
  'Genel Nalbant Hizmeti',
];

const TRANSPORT_SCOPE_OPTIONS = [
  'Şehirlerarası Taşıma',
  'Uluslararası Taşıma',
  'Şehiriçi & Şehirlerarası',
  'Tüm Türkiye',
];

const IconicSwitch = ({
  value,
  compact = true,
}: {
  value: boolean;
  compact?: boolean;
}) => {
  const width = compact ? 46 : 52;
  const height = compact ? 26 : 28;
  const knobSize = compact ? 20 : 22;
  const knobOffset = width - knobSize - 6;

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: `${height / 2}px`,
        backgroundColor: value ? '#16a34a' : '#ef4444',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        padding: '3px',
        cursor: 'pointer',
        transition: 'background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        userSelect: 'none',
        boxShadow: value
          ? '0 1px 3px rgba(22, 163, 74, 0.3)'
          : '0 1px 3px rgba(239, 68, 68, 0.3)',
      }}
    >
      {/* Track Icon: Checkmark when ON, X when OFF */}
      {value ? (
        <span
          style={{
            position: 'absolute',
            left: compact ? '8px' : '9px',
            color: '#ffffff',
            fontSize: compact ? '11px' : '12px',
            fontWeight: 800,
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          ✓
        </span>
      ) : (
        <span
          style={{
            position: 'absolute',
            right: compact ? '8px' : '9px',
            color: '#ffffff',
            fontSize: compact ? '11px' : '12px',
            fontWeight: 800,
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          ✕
        </span>
      )}

      {/* Knob */}
      <div
        style={{
          width: `${knobSize}px`,
          height: `${knobSize}px`,
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
          transform: value ? `translateX(${knobOffset}px)` : 'translateX(0px)',
          transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </div>
  );
};

const BooleanToggle = ({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  icon?: string;
}) => {
  const isChecked = value === 'Evet' || value === 'true';

  return (
    <div
      onClick={() => onChange(isChecked ? 'Hayır' : 'Evet')}
      className="d-flex align-items-center justify-content-between p-2 rounded-3 border mb-2 bg-white"
      style={{
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        borderColor: isChecked ? '#bbf7d0' : '#e2e8f0',
        backgroundColor: isChecked ? '#f0fdf4' : '#ffffff',
        minHeight: '44px',
      }}
      role="switch"
      aria-checked={isChecked}
    >
      <div className={`d-flex align-items-center ${icon ? 'gap-2' : ''} me-1 overflow-hidden`}>
        {icon && (
          <div
            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: '26px',
              height: '26px',
              backgroundColor: isChecked ? '#dcfce7' : '#f1f5f9',
              color: isChecked ? '#16a34a' : '#64748b',
              fontSize: '11px',
            }}
          >
            <i className={`fe ${icon}`} />
          </div>
        )}
        <span
          className="fw-semibold text-truncate"
          style={{
            fontSize: '0.76rem',
            color: isChecked ? '#15803d' : '#334155',
          }}
          title={label}
        >
          {label}
        </span>
      </div>
      <IconicSwitch value={isChecked} compact />
    </div>
  );
};

interface PackageModalProps {
  advert: ModerationAdvertResponse;
  onClose: () => void;
  onDone: () => void;
  initialTab?: 'manage' | 'edit' | 'card' | 'history' | 'payments';
}

export default function PackageModal({ advert, onClose, onDone, initialTab = 'edit' }: PackageModalProps) {
  const advertId = advert.identifier ?? advert.id;
  const [tab, setTab] = useState<'manage' | 'edit' | 'card' | 'history' | 'payments'>(initialTab);
  const [packages, setPackages] = useState<PackageResponse[]>([]);
  const [currentPackage, setCurrentPackage] = useState<AdvertPackageAssignment | null>(null);
  const [selectedPackageCode, setSelectedPackageCode] = useState('');
  const [assignReason, setAssignReason] = useState('');
  const [history, setHistory] = useState<AdvertPackageAssignment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [payments, setPayments] = useState<AdminAdvertPaymentResponse[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState<ModerationAdvertDetail | null>(null);
  const [isUrgentActive, setIsUrgentActive] = useState<boolean>(false);
  // Pending değişiklikler — null = değişiklik yok
  const [pendingUrgent, setPendingUrgent] = useState<boolean | null>(null);
  const [pendingVitrin, setPendingVitrin] = useState<boolean | null>(null);

  // Edit Tab State
  const [savingAdvert, setSavingAdvert] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editProvinceId, setEditProvinceId] = useState('');
  const [editDistrictId, setEditDistrictId] = useState('');
  const [editDistricts, setEditDistricts] = useState<Array<{ id: string; name: string }>>([]);
  const [editHorseName, setEditHorseName] = useState('');
  const [editSire, setEditSire] = useState('');
  const [editDam, setEditDam] = useState('');
  const [editDamsire, setEditDamsire] = useState('');
  const [editBreed, setEditBreed] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editCoatColor, setEditCoatColor] = useState('');
  const [editHeightCm, setEditHeightCm] = useState('');
  const [editTjkNumber, setEditTjkNumber] = useState('');
  const [editInTraining, setEditInTraining] = useState('');
  const [editIsRacing, setEditIsRacing] = useState('');
  const [editIsForRent, setEditIsForRent] = useState('');

  // Mare specific
  const [editIsPregnant, setEditIsPregnant] = useState('');
  const [editCoveringStallion, setEditCoveringStallion] = useState('');
  const [editPregnancyStage, setEditPregnancyStage] = useState('');
  const [editLastCoveringDate, setEditLastCoveringDate] = useState('');

  // Stud specific
  const [editLiveFoalGuarantee, setEditLiveFoalGuarantee] = useState('');

  // Pansiyon & Facility specific
  const [editFacilityName, setEditFacilityName] = useState('');
  const [editBoxCount, setEditBoxCount] = useState('');
  const [editTotalArea, setEditTotalArea] = useState('');
  const [editPaddockCount, setEditPaddockCount] = useState('');
  const [editGrassPaddock, setEditGrassPaddock] = useState('');
  const [editSandPaddock, setEditSandPaddock] = useState('');
  const [editStallionPaddock, setEditStallionPaddock] = useState('');
  const [editVet, setEditVet] = useState('');
  const [editFarrierFacility, setEditFarrierFacility] = useState('');
  const [editFoalingBarn, setEditFoalingBarn] = useState('');
  const [editTrainingTrack, setEditTrainingTrack] = useState('');
  const [editWaterElectricity, setEditWaterElectricity] = useState('');
  const [editFacilityType, setEditFacilityType] = useState('');

  // Transport specific
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editVehicleType, setEditVehicleType] = useState('');
  const [editWebsiteUrl, setEditWebsiteUrl] = useState('');
  const [editServiceScope, setEditServiceScope] = useState('');
  const [editHasCamera, setEditHasCamera] = useState('');
  const [editHasAirConditioning, setEditHasAirConditioning] = useState('');
  const [editIsInsured, setEditIsInsured] = useState('');
  const [editLiveGps, setEditLiveGps] = useState('');

  // Farrier specific
  const [editFarrierName, setEditFarrierName] = useState('');
  const [editHotShoeing, setEditHotShoeing] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editExperienceYears, setEditExperienceYears] = useState('');
  const [editMobileService, setEditMobileService] = useState('');

  // Equipment specific
  const [editEquipmentType, setEditEquipmentType] = useState('');
  const [editItemCondition, setEditItemCondition] = useState('');
  const [editBrandName, setEditBrandName] = useState('');

  const [editMediaList, setEditMediaList] = useState<Array<{
    assetId: string;
    displayOrder: number;
    isCover: boolean;
    previewUrl?: string;
    file?: File;
  }>>([]);
  const [isEditInitialized, setIsEditInitialized] = useState(false);
  const [initialEditSnapshot, setInitialEditSnapshot] = useState<string>('');
  const [editLightboxIndex, setEditLightboxIndex] = useState<number | null>(null);
  const [cropModalIndex, setCropModalIndex] = useState<number | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Category detection
  const categoryKind = useMemo(() => {
    return getAdvertCategoryKind(
      advert?.categoryId || detail?.categoryId,
      (advert as any)?.categoryName || (detail as any)?.categoryName,
      (detail?.properties || advert?.properties) as any
    );
  }, [advert, detail]);

  const isRaceHorse = useMemo(() => {
    return isRaceHorseAdvert(
      advert?.categoryId || detail?.categoryId,
      (advert as any)?.categoryName || (detail as any)?.categoryName
    );
  }, [advert, detail]);

  const isMare = useMemo(() => {
    return isMareAdvert(
      advert?.categoryId || detail?.categoryId,
      (advert as any)?.categoryName || (detail as any)?.categoryName
    );
  }, [advert, detail]);

  const isStallion = useMemo(() => {
    return isStallionAdvert(
      advert?.categoryId || detail?.categoryId,
      (advert as any)?.categoryName || (detail as any)?.categoryName
    );
  }, [advert, detail]);

  useEffect(() => {
    if (!advertId) return;

    setLoadingCurrent(true);
    setHistoryLoading(true);
    Promise.all([
      packageService.search({ pageRequest: { page: 0, size: 200 } }),
      advertService.getPackage(advertId).catch(() => null),
      advertService.getDetail(advertId).catch(() => null),
      advertService.getUrgent(advertId).catch(() => null),
      advertService.getPackageHistory(advertId).catch(() => []),
    ])
      .then(([packagePage, assignment, advertDetail, urgentStatus, pkgHist]) => {
        const activePackages = (packagePage.content || []).filter((item) => item.isActive);
        setPackages(activePackages);
        setCurrentPackage(assignment);
        if (advertDetail) {
          setDetail(advertDetail);
        }
        if (urgentStatus != null) {
          setIsUrgentActive(urgentStatus.isUrgent);
        }
        if (pkgHist) {
          setHistory(pkgHist);
        }
        if (assignment?.packageCode) {
          setSelectedPackageCode(assignment.packageCode);
        } else if (activePackages.length > 0) {
          setSelectedPackageCode(activePackages[0].code);
        }
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => {
        setLoadingCurrent(false);
        setHistoryLoading(false);
      });
  }, [advertId]);

  const loadHistory = useCallback(() => {
    if (!advertId) return;
    setHistoryLoading(true);
    Promise.all([
      advertService.getPackageHistory(advertId).catch(() => []),
      advertService.getDetail(advertId).catch(() => null),
    ])
      .then(([pkgHist, advDetail]) => {
        setHistory(pkgHist);
        if (advDetail) {
          setDetail(advDetail);
        }
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setHistoryLoading(false));
  }, [advertId]);

  const loadPayments = useCallback(() => {
    if (!advertId) return;
    setPaymentsLoading(true);
    advertService
      .getPayments(advertId)
      .then(setPayments)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setPaymentsLoading(false));
  }, [advertId]);

  useEffect(() => {
    if (tab === 'history' || tab === 'manage') {
      loadHistory();
    } else if (tab === 'payments') {
      loadPayments();
    }
  }, [tab, loadHistory, loadPayments]);

  const handleAssign = async (targetCode?: string, customReason?: string) => {
    const codeToAssign = (targetCode ?? selectedPackageCode).trim();
    if (!advertId || !codeToAssign || submitting) return;
    setSubmitting(true);
    try {
      const request: AssignPackageRequest = {
        packageCode: codeToAssign,
        reason: (customReason ?? assignReason).trim() || undefined,
      };
      await advertService.assignPackage(advertId, request);
      toast.success('Paket başarıyla atandı');
      setSelectedPackageCode(codeToAssign);
      const [updated, pkgHist, advDetail] = await Promise.all([
        advertService.getPackage(advertId).catch(() => null),
        advertService.getPackageHistory(advertId).catch(() => []),
        advertService.getDetail(advertId).catch(() => null),
      ]);
      setCurrentPackage(updated);
      setHistory(pkgHist);
      if (advDetail) {
        setDetail(advDetail);
      }
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // İlan Kartı toggle'ları — anında API çağrısı yapmaz, pending state'e yazar
  const handleToggleUrgentPending = (activate: boolean) => {
    setPendingUrgent(activate === isUrgentActive ? null : activate);
  };

  const handleToggleVitrinPending = (enable: boolean) => {
    setPendingVitrin(enable === isVitrinActive ? null : enable);
  };

  // İlan Kartı değişikliklerini kaydet
  const handleCardSave = async () => {
    if (!advertId || submitting) return;
    if (pendingUrgent === null && pendingVitrin === null) return;
    setSubmitting(true);
    try {
      // Acil İlan değişikliği
      if (pendingUrgent !== null) {
        if (pendingUrgent) {
          await advertService.activateUrgent(advertId);
          setIsUrgentActive(true);
        } else {
          await advertService.deactivateUrgent(advertId);
          setIsUrgentActive(false);
        }
        setPendingUrgent(null);
      }

      // Vitrin değişikliği
      if (pendingVitrin !== null) {
        if (pendingVitrin) {
          if (!vitrinPkg) throw new Error('Vitrin destekli paket bulunamadı.');
          await advertService.assignPackage(advertId, {
            packageCode: vitrinPkg.code,
            reason: 'Vitrin ilanı olarak tanımlandı',
          });
        } else {
          if (!standardPkg) throw new Error('Standart paket bulunamadı.');
          await advertService.assignPackage(advertId, {
            packageCode: standardPkg.code,
            reason: 'Vitrin özelliği kapatıldı',
          });
        }
        const [updated, pkgHist, advDetail] = await Promise.all([
          advertService.getPackage(advertId).catch(() => null),
          advertService.getPackageHistory(advertId).catch(() => []),
          advertService.getDetail(advertId).catch(() => null),
        ]);
        setCurrentPackage(updated);
        setHistory(pkgHist);
        if (advDetail) {
          setDetail(advDetail);
        }
        if (updated?.packageCode) setSelectedPackageCode(updated.packageCode);
        setPendingVitrin(null);
      }

      toast.success('Değişiklikler kaydedildi.');
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!advertId || deleting) return;
    setDeleting(true);
    try {
      await advertService.delete(advertId);
      toast.success('İlan başarıyla veritabanından silindi');
      setShowDeleteConfirm(false);
      onDone();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const currentAdvStatus = ((detail?.status || advert?.status) ?? '').toUpperCase();
  const canDelete = currentAdvStatus === 'SUSPENDED' || currentAdvStatus === 'ARCHIVED' || currentAdvStatus === 'REJECTED';

  const selectedPkgObj = packages.find((p) => p.code === selectedPackageCode);
  const currentPkgObj = packages.find((p) => p.code === currentPackage?.packageCode);
  const activePackageAllowsUrgent = currentPkgObj?.allowsUrgent ?? true;
  const isVitrinActive = Boolean(currentPkgObj?.showcaseEligible);

  const vitrinPkg =
    packages.find((p) => p.showcaseEligible) ||
    packages.find((p) => p.code.toLowerCase().includes('ultimate')) ||
    packages[packages.length - 1];

  const standardPkg =
    packages.find((p) => !p.showcaseEligible && p.code.toLowerCase().includes('standart')) ||
    packages.find((p) => !p.showcaseEligible) ||
    packages[0];

  // Görüntülenen (preview) state = gerçek + pending
  const displayUrgent = pendingUrgent !== null ? pendingUrgent : isUrgentActive;
  const displayVitrin = pendingVitrin !== null ? pendingVitrin : isVitrinActive;
  const hasCardChanges = pendingUrgent !== null || pendingVitrin !== null;

  const statusVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'EXPIRED':
        return 'warning';
      case 'CANCELLED':
        return 'danger';
      case 'SUPERSEDED':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  interface UnifiedHistoryRow {
    id: string;
    packageCode: string;
    statusText: string;
    statusVariant: string;
    date: string;
    reason: string;
    sortTime: number;
    isCurrent?: boolean;
  }

  const unifiedHistory = React.useMemo<UnifiedHistoryRow[]>(() => {
    const rows: UnifiedHistoryRow[] = [];
    const statusHist = detail?.statusHistory || [];
    const currentAdvStatus = detail?.status || advert?.status;
    const activePkgCode = currentPackage?.packageCode || (advert as any)?.packageCode || (detail as any)?.packageCode || (packages[0]?.code) || 'STANDART';

    // DRAFT iç durumdur, admin/ilan geçmişinde gösterilmez
    const meaningfulStatusHist = statusHist.filter((s) => s.toStatus && s.toStatus !== 'DRAFT');

    // 1. İlan Durum Geçmişi Kayıtları (Status History) - Eskiden yeniye sıralı
    const sortedStatusHist = [...meaningfulStatusHist].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sortedStatusHist.forEach((sh, idx) => {
      const isLast = idx === sortedStatusHist.length - 1;
      const nextItem = !isLast ? sortedStatusHist[idx + 1] : null;

      const shTime = new Date(sh.createdAt).getTime();
      const matchingPkg = history.find((p) => {
        const pTime = new Date(p.startsAt || p.assignedAt || p.createdAt).getTime();
        return pTime <= shTime;
      });
      const rowPkgCode = matchingPkg?.packageCode || activePkgCode;

      let stText = 'Durum Güncellendi';
      let stVariant = 'secondary';
      let defaultReason = '';

      const prevStatuses = sortedStatusHist.slice(0, idx).map((s) => s.toStatus);

      switch (sh.toStatus) {
        case 'PUBLISHED':
          if (prevStatuses.includes('SUSPENDED') || prevStatuses.includes('ARCHIVED')) {
            stText = 'Tekrar Yayında';
            defaultReason = 'İlan tekrar yayına alındı';
          } else if (prevStatuses.includes('REJECTED')) {
            stText = 'Onaylandı (Yayında)';
            defaultReason = 'İlan onaylanarak yayına alındı';
          } else {
            stText = 'Yayında';
            defaultReason = 'İlan onaylandı';
          }
          stVariant = 'success';
          break;
        case 'SUSPENDED':
          stText = 'Yayından Kaldırıldı';
          stVariant = 'secondary';
          defaultReason = 'İlan yayından kaldırıldı';
          break;
        case 'REJECTED':
          stText = 'Reddedildi';
          stVariant = 'danger';
          defaultReason = 'İlan kriterlere uygun bulunmadı';
          break;
        case 'PENDING_REVIEW':
          stText = 'İnceleme Bekliyor';
          defaultReason = prevStatuses.includes('REJECTED') || prevStatuses.includes('CHANGES_REQUESTED')
            ? 'Düzenlendi, tekrar incelemeye gönderildi'
            : 'İlan onaya gönderildi';
          stVariant = 'warning';
          break;
        case 'CHANGES_REQUESTED':
          stText = 'Düzeltme İstendi';
          stVariant = 'warning';
          defaultReason = 'İlanda revizyon talep edildi';
          break;
        case 'SOLD':
          stText = 'Satıldı';
          stVariant = 'dark';
          defaultReason = 'İlan satıldı olarak işaretlendi';
          break;
        case 'ARCHIVED':
          stText = 'Arşivlendi';
          stVariant = 'secondary';
          defaultReason = 'İlan arşivlendi';
          break;
        default:
          stText = sh.toStatus;
          stVariant = 'secondary';
      }

      rows.push({
        id: `sh-${idx}-${sh.createdAt}`,
        packageCode: rowPkgCode,
        statusText: stText,
        statusVariant: stVariant,
        date: sh.createdAt ? formatDateForText(sh.createdAt) : '-',
        reason: sh.reason || defaultReason || '-',
        sortTime: shTime,
      });
    });

    // 4. Durum Kaydı Olmaması veya En Son Durumun Eksik Olması Hali:
    const latestStatusInHist = sortedStatusHist.length > 0 ? sortedStatusHist[sortedStatusHist.length - 1].toStatus : null;
    const needsCurrentRow = !latestStatusInHist || latestStatusInHist !== currentAdvStatus;

    if (needsCurrentRow && currentAdvStatus && currentAdvStatus !== 'DRAFT') {
      let curText = 'Mevcut Durum';
      let curVariant = 'secondary';
      let curReason = (detail as any)?.rejectionReason || (advert as any)?.rejectionReason || '';

      switch (currentAdvStatus) {
        case 'PUBLISHED':
          curText = 'Yayında';
          curVariant = 'success';
          if (!curReason) curReason = 'İlan onaylandı';
          break;
        case 'SUSPENDED':
          curText = 'Yayından Kaldırıldı';
          curVariant = 'secondary';
          if (!curReason) curReason = 'İlan yayından kaldırıldı';
          break;
        case 'REJECTED':
          curText = 'Reddedildi';
          curVariant = 'danger';
          if (!curReason) curReason = 'İlan kriterlere uygun bulunmadı';
          break;
        case 'PENDING_REVIEW':
          curText = 'İnceleme Bekliyor';
          curVariant = 'warning';
          if (!curReason) curReason = 'İlan onaya gönderildi';
          break;
        case 'CHANGES_REQUESTED':
          curText = 'Düzeltme İstendi';
          curVariant = 'warning';
          break;
        case 'SOLD':
          curText = 'Satıldı';
          curVariant = 'dark';
          break;
        case 'ARCHIVED':
          curText = 'Arşivlendi';
          curVariant = 'secondary';
          break;
        default:
          curText = currentAdvStatus;
      }

      rows.push({
        id: 'current-state-head',
        packageCode: activePkgCode,
        statusText: curText,
        statusVariant: curVariant,
        date: advert?.updatedAt ? formatDateForText(advert.updatedAt) : (advert?.publishedAt ? formatDateForText(advert.publishedAt) : (advert?.createdAt ? formatDateForText(advert.createdAt) : '-')),
        reason: curReason || '-',
        sortTime: Date.now() + 100000,
        isCurrent: true,
      });
    }

    // Sıralama: En yeni en üstte
    rows.sort((a, b) => b.sortTime - a.sortTime);

    // En üstteki ilk satırı "Şu Anki Hali" olarak işaretle
    if (rows.length > 0 && !rows.some((r) => r.isCurrent)) {
      rows[0].isCurrent = true;
    }

    return rows;
  }, [detail, advert, history, currentPackage, packages]);

  const isSamePackage = Boolean(
    currentPackage && selectedPackageCode === currentPackage.packageCode
  );
  const hasReason = Boolean(assignReason.trim());
  const isUpdateDisabled = submitting || !selectedPackageCode.trim() || (isSamePackage && !hasReason);

  const coverMedia = detail?.media?.find((m) => m.isCover) ?? detail?.media?.[0];
  const coverUrl =
    editMediaList.find((m) => m.isCover)?.previewUrl ||
    (coverMedia?.assetId ? buildMediaUrl(coverMedia.assetId, 'DETAIL') : null) ||
    editMediaList[0]?.previewUrl ||
    (advert as any)?.cover?.publicUrl ||
    (advert as any)?.cover?.url ||
    null;
  const advertPrice = detail?.price?.amount
    ? formatMoney(detail.price.amount, detail.price.currency || 'TRY')
    : null;

  const renderHistoryCard = (packageOnly = false) => {
    const rows = packageOnly
      ? [...history]
          .sort((a, b) => new Date(b.assignedAt || b.startsAt || b.createdAt || 0).getTime()
                        - new Date(a.assignedAt || a.startsAt || a.createdAt || 0).getTime())
          .map((pkg, idx) => ({
            id: `pkg-${pkg.id || idx}`,
            packageCode: pkg.packageCode || '',
            statusText: pkg.status === 'ACTIVE' ? 'Aktif Paket' : pkg.status === 'SUPERSEDED' ? 'Değiştirildi' : 'Pasif',
            statusVariant: pkg.status === 'ACTIVE' ? 'success' : 'secondary',
            date: pkg.assignedAt ? formatDateForText(pkg.assignedAt) : (pkg.startsAt ? formatDateForText(pkg.startsAt) : '-'),
            reason: pkg.reason || 'Paket atandı',
            isCurrent: idx === 0,
          }))
      : unifiedHistory;

    const isEmpty = rows.length === 0;

    return (
      <Card className="border-0 shadow-sm rounded-3 bg-white mt-2">
        <Card.Header className="bg-white border-bottom py-2 px-3 d-flex justify-content-between align-items-center">
          <div>
            <span className="small fw-bold text-dark d-flex align-items-center gap-1">
              <i className="fe fe-clock text-secondary" style={{ fontSize: '12px' }} />
              {packageOnly ? 'Paket Değişiklik Geçmişi' : 'İlan & Paket Güncelleme Geçmişi'}
            </span>
            <span className="text-muted d-block" style={{ fontSize: '10px' }}>
              {packageOnly
                ? 'Pakete ait atama geçmişi (en güncel en üstte)'
                : 'İlanın durum ve paket değişiklikleri (en güncel durum en üstte)'}
            </span>
          </div>
          <Badge bg="secondary" pill style={{ fontSize: '10px' }}>
            {rows.length} Kayıt
          </Badge>
        </Card.Header>
        <Card.Body className="p-0">
          {historyLoading && (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" variant="primary" />
              <div className="small text-muted mt-1">Geçmiş yükleniyor...</div>
            </div>
          )}

          {!historyLoading && isEmpty && (
            <div className="text-center py-3 text-muted small">Geçmiş kaydı bulunamadı.</div>
          )}

          {!historyLoading && !isEmpty && (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0" style={{ fontSize: '0.78rem' }}>
                <thead className="table-light">
                  <tr>
                    <th style={{ minWidth: '110px', padding: '6px 12px', fontWeight: 600 }}>Paket</th>
                    <th style={{ minWidth: '110px', padding: '6px 12px', fontWeight: 600 }}>Durum</th>
                    <th style={{ minWidth: '105px', padding: '6px 12px', fontWeight: 600 }}>Gönderim Tarihi</th>
                    <th style={{ padding: '6px 12px', fontWeight: 600 }}>Gerekçe</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr
                      key={item.id}
                      style={{
                        backgroundColor: item.isCurrent ? '#f8faff' : undefined,
                      }}
                    >
                      <td style={{ padding: '5px 12px' }}>
                        <div className="d-flex align-items-center gap-1 flex-wrap">
                          <span className="fw-semibold text-dark">{item.packageCode}</span>
                          {item.isCurrent && (
                            <span
                              className="badge rounded-pill border"
                              style={{
                                backgroundColor: '#eef2ff',
                                color: '#4338ca',
                                borderColor: '#c7d2fe',
                                fontSize: '8.5px',
                                fontWeight: 600,
                                padding: '1px 5px',
                              }}
                            >
                              Şu Anki Hali
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '5px 12px' }}>
                        <Badge bg={item.statusVariant as any} text={item.statusVariant === 'warning' ? 'dark' : 'white'} style={{ fontSize: '10px' }}>
                          {item.statusText}
                        </Badge>
                      </td>
                      <td className="text-dark" style={{ padding: '5px 12px', fontWeight: 500 }}>{item.date}</td>
                      <td className="text-muted" style={{ padding: '5px 12px', maxWidth: '300px', wordBreak: 'break-word' }}>
                        {item.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  const provinceOptions = useMemo(() => {
    return Object.entries(PROVINCES_BY_UUID)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, []);

  const loadDistrictsForProvince = async (provId: string) => {
    if (!provId) {
      setEditDistricts([]);
      return;
    }
    try {
      const res = await apiRequest<{ items: Array<{ id: string; name: string }> }>(
        'GET',
        `/api/v1/provinces/${provId}/districts`
      );
      if (res?.items && Array.isArray(res.items)) {
        setEditDistricts(res.items.sort((a, b) => a.name.localeCompare(b.name, 'tr')));
      } else {
        setEditDistricts([]);
      }
    } catch {
      setEditDistricts([]);
    }
  };

  const normText = (s: string) =>
    (s || '')
      .toLowerCase()
      .replace(/['’`"]/g, '')
      .replace(/[-_\s\(\)]/g, '')
      .replace(/ı/g, 'i')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c');

  const getProp = (keys: string[]): string => {
    const props = ((detail?.properties || advert?.properties) || {}) as Record<string, any>;
    const normKeys = keys.map(normText);
    // 1. Exact match
    for (const [pk, pv] of Object.entries(props)) {
      if (pv == null || pv === '') continue;
      const pkNorm = normText(pk);
      if (normKeys.some((k) => k === pkNorm)) {
        return String(pv).trim();
      }
    }
    // 2. Safe prefix / suffix match (only keys with length >= 4, ignoring timestamp / date keys)
    for (const [pk, pv] of Object.entries(props)) {
      if (pv == null || pv === '') continue;
      const pkNorm = normText(pk);
      if (['createdat', 'updatedat', 'birthdate', 'publishedat', 'deletedat'].includes(pkNorm)) continue;
      if (normKeys.some((k) => k.length >= 4 && (pkNorm === k || pkNorm.startsWith(k) || k.startsWith(pkNorm)))) {
        return String(pv).trim();
      }
    }
    return '';
  };

  const getBoolProp = (keys: string[]): string => {
    const val = getProp(keys);
    if (!val) return '';
    const lower = val.toLowerCase().trim();
    if (lower === 'true' || lower === 'evet' || lower === '1') return 'Evet';
    if (lower === 'false' || lower === 'hayır' || lower === 'hayir' || lower === '0') return 'Hayır';
    return '';
  };

  const resolveMediaSrc = (m: any): string => {
    if (!m) return '';
    if (typeof m === 'string') return buildMediaUrl(m, 'DETAIL');
    if (m.assetId && typeof m.assetId === 'string' && m.assetId.trim()) {
      return buildMediaUrl(m.assetId, 'DETAIL');
    }
    const url = m.publicUrl || m.url || m.imageUrl || m.src;
    if (url && typeof url === 'string' && url.trim()) {
      return buildMediaUrl(url, 'DETAIL');
    }
    return '';
  };

  const populateEditFields = (d: ModerationAdvertDetail | null) => {
    const rawPrice = d?.price?.amountMinor != null
      ? (d.price.amountMinor / 100).toString()
      : d?.price?.amount != null
      ? d.price.amount.toString()
      : getProp(['fiyat', 'price', 'ucret', 'satisfiyati']);

    setEditTitle(d?.title || advert.title || '');
    setEditDescription(d?.description || '');
    setEditPrice(rawPrice || '');

    const provId = (d?.provinceId || (d?.location as any)?.provinceId || (advert as any).provinceId || '') as string;
    const distId = (d?.districtId || (d?.location as any)?.districtId || (advert as any).districtId || '') as string;

    setEditProvinceId(provId ? String(provId) : '');
    setEditDistrictId(distId ? String(distId) : '');
    if (provId) {
      void loadDistrictsForProvince(String(provId));
    }

    // Horse & Breeding fields
    setEditHorseName(getProp(['atadi', 'at_adi', 'horsename', 'horse_name', 'registeredname', 'registered_name', 'aygiradi', 'aygir_adi', 'studhorsename', 'stud_horse_name']) || d?.title || advert.title || '');
    setEditSire(getProp(['baba', 'sire', 'studsire', 'stud_sire', 'father']) || '');
    setEditDam(getProp(['anne', 'dam', 'studdam', 'stud_dam', 'mother']) || '');
    setEditDamsire(getProp(['annebabasi', 'anne_babasi', 'damsire', 'studdamsire', 'kisrakbabasi']) || '');
    setEditBreed(getProp(['atirki', 'at_irki', 'irk', 'breed', 'horsebreed', 'stallionbreed', 'studbreed']) || '');
    setEditAge(getProp(['yas', 'age', 'horseage', 'stallionage', 'studage']) || '');
    setEditGender(getProp(['cinsiyet', 'gender', 'horsegender']) || '');
    setEditCoatColor(getProp(['don', 'donu', 'renk', 'coatcolor', 'coat_color', 'color']) || '');
    setEditHeightCm(getProp(['cidago', 'heightcm', 'height_cm', 'boy']) || '');
    setEditTjkNumber(getProp(['tjknumber', 'tjk_number', 'tjkno', 'tjk_no', 'mikrocip', 'microchip']) || '');

    // Race horse flags
    setEditInTraining(getBoolProp(['idmandami', 'idmanda_mi', 'idmanda', 'intraining', 'in_training']));
    setEditIsRacing(getBoolProp(['kosardurumdamı', 'kosardurumda_mi', 'kosardurumda', 'kosar', 'israceready', 'is_race_ready', 'isracing']));
    setEditIsForRent(getBoolProp(['kiralikmi', 'kiralik_mi', 'kiralik', 'isforrent', 'is_for_rent', 'forrent']));

    // Mare pregnancy
    setEditIsPregnant(getBoolProp(['ispregnant', 'is_pregnant', 'gebemi', 'gebe_mi', 'gebe']));
    setEditCoveringStallion(getProp(['coveringstallion', 'covering_stallion', 'gebeolduguaygir', 'gebe_oldugu_aygir', 'pregnantstallion']));
    setEditPregnancyStage(getProp(['pregnancystage', 'pregnancy_stage', 'gebelikdurumu', 'gebelik_durumu', 'gebelik']));
    setEditLastCoveringDate(getProp(['lastcoveringdate', 'last_covering_date', 'sonasimtarihi', 'son_asim_tarihi', 'sonasım', 'coveringdate']));

    // Stud
    setEditLiveFoalGuarantee(getBoolProp(['canlitaygarantisi', 'canlitay', 'livefoalguarantee', 'garanti']));

    // Pansiyon / Facility
    setEditFacilityName(getProp(['tesisadi', 'tesis_adi', 'haraadi', 'hara_adi', 'ciftlikadi', 'facilityname', 'facility_name', 'unvan']) || d?.title || advert.title || '');
    setEditBoxCount(getProp(['boxcount', 'box_count', 'bokssayisi', 'bokskapasitesi', 'kapasite', 'ahirkapasitesi']));
    setEditTotalArea(getProp(['totalaream2', 'totalarea', 'toplamalan', 'alan', 'arazibuyuklugu', 'm2']));
    setEditPaddockCount(getProp(['padoksayisi', 'padok_sayisi', 'paddockcount', 'paddock_count']));
    setEditGrassPaddock(getBoolProp(['grasspaddock', 'grass_paddock', 'cimpadok', 'cim_padok', 'facilitygrasspaddock']));
    setEditSandPaddock(getBoolProp(['sandpaddock', 'sand_paddock', 'kumpadok', 'kum_padok', 'facilitysandpaddock']));
    setEditStallionPaddock(getBoolProp(['stallionpaddock', 'stallion_paddock', 'aygirpadogu', 'aygir_padogu', 'facilitystallionpaddock']));
    setEditVet(getBoolProp(['vet', 'veteriner', 'veterinerhekim', 'veterinerhekimhizmeti', 'facilityveterinarian', 'veterinarian']));
    setEditFarrierFacility(getBoolProp(['farrier', 'nalbant', 'nalbanthizmeti', 'facilityfarrier']));
    setEditFoalingBarn(getBoolProp(['foalingbarn', 'foaling_barn', 'dogumhane', 'facilityfoalingbarn', 'maternity']));
    setEditTrainingTrack(getBoolProp(['trainingtrack', 'training_track', 'idmanpisti', 'idman_pisti', 'facilitytrainingtrack']));
    setEditWaterElectricity(getBoolProp(['waterelectricity', 'water_electricity', 'elektriksu', 'elektrik_su', 'altyapi']));
    setEditFacilityType(getProp(['facilitytype', 'facility_type', 'tesisturu', 'tesis_turu']));

    // Transport
    setEditCompanyName(getProp(['companyname', 'company_name', 'firmaadi', 'firma_adi', 'nakliyefirmasi', 'sirketadi']) || d?.title || advert.title || '');
    setEditVehicleType(getProp(['vehicletype', 'vehicle_type', 'aractipi', 'arac_tipi', 'kapasite', 'arackapasitesi']));
    setEditWebsiteUrl(getProp(['websiteurl', 'website_url', 'website', 'websitesi', 'url']));
    setEditServiceScope(getProp(['servicescope', 'service_scope', 'hizmetbolgesi', 'hizmet_bolgesi', 'hizmetturu']));
    setEditHasCamera(getBoolProp(['hascamera', 'has_camera', 'kamera', 'kameratakip', 'kamerasistemi']));
    setEditHasAirConditioning(getBoolProp(['hasairconditioning', 'havalandirma', 'klima']));
    setEditIsInsured(getBoolProp(['isinsured', 'is_insured', 'sigortali', 'sigortalitasima', 'kaskolu']));
    setEditLiveGps(getBoolProp(['livegps', 'live_gps', 'konumpaylasimi', 'canlikonum', 'gpstakip']));

    // Farrier
    setEditFarrierName(getProp(['farriername', 'farrier_name', 'nalbantadi', 'nalbant_adi', 'ustaadi']) || d?.title || advert.title || '');
    setEditHotShoeing(getBoolProp(['sicak_uygulama', 'sicakuygulama', 'sicak', 'sıcak', 'hotshoeing', 'hot_shoeing']));
    setEditSpecialty(getProp(['specialty', 'uzmanlik', 'uzmanlikalani', 'hizmetturu']));
    setEditExperienceYears(getProp(['experienceyears', 'experience_years', 'tecrube', 'deneyim', 'yil']));
    setEditMobileService(getBoolProp(['mobileservice', 'mobile_service', 'gezici', 'geziciservis', 'yerindehizmet']));

    // Equipment
    setEditEquipmentType(getProp(['equipmenttype', 'equipment_type', 'malzemeturu', 'malzeme_turu', 'tur']));
    setEditItemCondition(getProp(['condition', 'itemcondition', 'kullanimdurumu', 'durum']));
    setEditBrandName(getProp(['brandname', 'brand_name', 'marka', 'brand', 'uretici']));

    let list: any[] = [];
    if (d?.media && Array.isArray(d.media) && d.media.length > 0) {
      list = d.media;
    } else if ((advert as any).media && Array.isArray((advert as any).media) && (advert as any).media.length > 0) {
      list = (advert as any).media;
    } else if ((d as any)?.cover || (advert as any).cover) {
      const c = (d as any)?.cover || (advert as any).cover;
      list = [{ assetId: c.publicUrl || c.url || c.assetId, displayOrder: 0, isCover: true }];
    } else if (DEFAULT_MOCK_MEDIA[String(advertId)]) {
      list = DEFAULT_MOCK_MEDIA[String(advertId)];
    }

    const mediaMapped = list.map((m: any, idx: number) => ({
      assetId: typeof m === 'string' ? m : (m.assetId || m.publicUrl || m.url),
      displayOrder: idx,
      isCover: Boolean(m.isCover ?? idx === 0),
      previewUrl: resolveMediaSrc(m),
    }));

    setEditMediaList(mediaMapped);

    const initialSnapshot = JSON.stringify({
      title: (d?.title || advert.title || '').trim(),
      description: (d?.description || '').trim(),
      price: String(rawPrice || '').trim(),
      provinceId: String(provId ? String(provId) : ''),
      districtId: String(distId ? String(distId) : ''),
      horseName: (getProp(['atadi', 'at_adi', 'horsename', 'horse_name', 'registeredname', 'registered_name', 'aygiradi', 'aygir_adi', 'studhorsename', 'stud_horse_name']) || d?.title || advert.title || '').trim(),
      sire: (getProp(['baba', 'sire', 'studsire', 'stud_sire', 'father']) || '').trim(),
      dam: (getProp(['anne', 'dam', 'studdam', 'stud_dam', 'mother']) || '').trim(),
      damsire: (getProp(['annebabasi', 'anne_babasi', 'damsire', 'studdamsire', 'kisrakbabasi']) || '').trim(),
      breed: (getProp(['atirki', 'at_irki', 'irk', 'breed', 'horsebreed', 'stallionbreed', 'studbreed']) || '').trim(),
      age: (getProp(['yas', 'age', 'horseage', 'stallionage', 'studage']) || '').trim(),
      gender: (getProp(['cinsiyet', 'gender', 'horsegender']) || '').trim(),
      coatColor: (getProp(['don', 'donu', 'renk', 'coatcolor', 'coat_color', 'color']) || '').trim(),
      heightCm: (getProp(['cidago', 'heightcm', 'height_cm', 'boy']) || '').trim(),
      tjkNumber: (getProp(['tjknumber', 'tjk_number', 'tjkno', 'tjk_no', 'mikrocip', 'microchip']) || '').trim(),
      inTraining: getBoolProp(['idmandami', 'idmanda_mi', 'idmanda', 'intraining', 'in_training']),
      isRacing: getBoolProp(['kosardurumdamı', 'kosardurumda_mi', 'kosardurumda', 'kosar', 'israceready', 'is_race_ready', 'isracing']),
      isForRent: getBoolProp(['kiralikmi', 'kiralik_mi', 'kiralik', 'isforrent', 'is_for_rent', 'forrent']),
      isPregnant: getBoolProp(['ispregnant', 'is_pregnant', 'gebemi', 'gebe_mi', 'gebe']),
      coveringStallion: (getProp(['coveringstallion', 'covering_stallion', 'gebeolduguaygir', 'gebe_oldugu_aygir', 'pregnantstallion']) || '').trim(),
      pregnancyStage: (getProp(['pregnancystage', 'pregnancy_stage', 'gebelikdurumu', 'gebelik_durumu', 'gebelik']) || '').trim(),
      lastCoveringDate: (getProp(['lastcoveringdate', 'last_covering_date', 'sonasimtarihi', 'son_asim_tarihi', 'sonasım', 'coveringdate']) || '').trim(),
      liveFoalGuarantee: getBoolProp(['canlitaygarantisi', 'canlitay', 'livefoalguarantee', 'garanti']),
      facilityName: (getProp(['tesisadi', 'tesis_adi', 'haraadi', 'hara_adi', 'ciftlikadi', 'facilityname', 'facility_name', 'unvan']) || d?.title || advert.title || '').trim(),
      boxCount: (getProp(['boxcount', 'box_count', 'bokssayisi', 'bokskapasitesi', 'kapasite', 'ahirkapasitesi']) || '').trim(),
      totalArea: (getProp(['totalaream2', 'totalarea', 'toplamalan', 'alan', 'arazibuyuklugu', 'm2']) || '').trim(),
      paddockCount: (getProp(['padoksayisi', 'padok_sayisi', 'paddockcount', 'paddock_count']) || '').trim(),
      grassPaddock: getBoolProp(['grasspaddock', 'grass_paddock', 'cimpadok', 'cim_padok', 'facilitygrasspaddock']),
      sandPaddock: getBoolProp(['sandpaddock', 'sand_paddock', 'kumpadok', 'kum_padok', 'facilitysandpaddock']),
      stallionPaddock: getBoolProp(['stallionpaddock', 'stallion_paddock', 'aygirpadogu', 'aygir_padogu', 'facilitystallionpaddock']),
      vet: getBoolProp(['vet', 'veteriner', 'veterinerhekim', 'veterinerhekimhizmeti', 'facilityveterinarian', 'veterinarian']),
      farrierFacility: getBoolProp(['farrier', 'nalbant', 'nalbanthizmeti', 'facilityfarrier']),
      foalingBarn: getBoolProp(['foalingbarn', 'foaling_barn', 'dogumhane', 'facilityfoalingbarn', 'maternity']),
      trainingTrack: getBoolProp(['trainingtrack', 'training_track', 'idmanpisti', 'idman_pisti', 'facilitytrainingtrack']),
      waterElectricity: getBoolProp(['waterelectricity', 'water_electricity', 'elektriksu', 'elektrik_su', 'altyapi']),
      facilityType: (getProp(['facilitytype', 'facility_type', 'tesisturu', 'tesis_turu']) || '').trim(),
      companyName: (getProp(['companyname', 'company_name', 'firmaadi', 'firma_adi', 'nakliyefirmasi', 'sirketadi']) || d?.title || advert.title || '').trim(),
      vehicleType: (getProp(['vehicletype', 'vehicle_type', 'aractipi', 'arac_tipi', 'kapasite', 'arackapasitesi']) || '').trim(),
      websiteUrl: (getProp(['websiteurl', 'website_url', 'website', 'websitesi', 'url']) || '').trim(),
      serviceScope: (getProp(['servicescope', 'service_scope', 'hizmetbolgesi', 'hizmet_bolgesi', 'hizmetturu']) || '').trim(),
      hasCamera: getBoolProp(['hascamera', 'has_camera', 'kamera', 'kameratakip', 'kamerasistemi']),
      hasAirConditioning: getBoolProp(['hasairconditioning', 'havalandirma', 'klima']),
      isInsured: getBoolProp(['isinsured', 'is_insured', 'sigortali', 'sigortalitasima', 'kaskolu']),
      liveGps: getBoolProp(['livegps', 'live_gps', 'konumpaylasimi', 'canlikonum', 'gpstakip']),
      farrierName: (getProp(['farriername', 'farrier_name', 'nalbantadi', 'nalbant_adi', 'ustaadi']) || d?.title || advert.title || '').trim(),
      hotShoeing: getBoolProp(['sicak_uygulama', 'sicakuygulama', 'sicak', 'sıcak', 'hotshoeing', 'hot_shoeing']),
      specialty: (getProp(['specialty', 'uzmanlik', 'uzmanlikalani', 'hizmetturu']) || '').trim(),
      experienceYears: (getProp(['experienceyears', 'experience_years', 'tecrube', 'deneyim', 'yil']) || '').trim(),
      mobileService: getBoolProp(['mobileservice', 'mobile_service', 'gezici', 'geziciservis', 'yerindehizmet']),
      equipmentType: (getProp(['equipmenttype', 'equipment_type', 'malzemeturu', 'malzeme_turu', 'tur']) || '').trim(),
      itemCondition: (getProp(['condition', 'itemcondition', 'kullanimdurumu', 'durum']) || '').trim(),
      brandName: (getProp(['brandname', 'brand_name', 'marka', 'brand', 'uretici']) || '').trim(),
      media: mediaMapped.map((m: any) => ({ assetId: m.assetId, isCover: m.isCover })),
    });

    setInitialEditSnapshot(initialSnapshot);
    setIsEditInitialized(true);
  };

  const currentEditSnapshot = useMemo(() => {
    return JSON.stringify({
      title: editTitle.trim(),
      description: editDescription.trim(),
      price: String(editPrice || '').trim(),
      provinceId: String(editProvinceId || ''),
      districtId: String(editDistrictId || ''),
      horseName: editHorseName.trim(),
      sire: editSire.trim(),
      dam: editDam.trim(),
      damsire: editDamsire.trim(),
      breed: editBreed.trim(),
      age: editAge.trim(),
      gender: editGender.trim(),
      coatColor: editCoatColor.trim(),
      heightCm: editHeightCm.trim(),
      tjkNumber: editTjkNumber.trim(),
      inTraining: editInTraining,
      isRacing: editIsRacing,
      isForRent: editIsForRent,
      isPregnant: editIsPregnant,
      coveringStallion: editCoveringStallion.trim(),
      pregnancyStage: editPregnancyStage.trim(),
      lastCoveringDate: editLastCoveringDate.trim(),
      liveFoalGuarantee: editLiveFoalGuarantee,
      facilityName: editFacilityName.trim(),
      boxCount: editBoxCount.trim(),
      totalArea: editTotalArea.trim(),
      paddockCount: editPaddockCount.trim(),
      grassPaddock: editGrassPaddock,
      sandPaddock: editSandPaddock,
      stallionPaddock: editStallionPaddock,
      vet: editVet,
      farrierFacility: editFarrierFacility,
      foalingBarn: editFoalingBarn,
      trainingTrack: editTrainingTrack,
      waterElectricity: editWaterElectricity,
      facilityType: editFacilityType.trim(),
      companyName: editCompanyName.trim(),
      vehicleType: editVehicleType.trim(),
      websiteUrl: editWebsiteUrl.trim(),
      serviceScope: editServiceScope.trim(),
      hasCamera: editHasCamera,
      hasAirConditioning: editHasAirConditioning,
      isInsured: editIsInsured,
      liveGps: editLiveGps,
      farrierName: editFarrierName.trim(),
      hotShoeing: editHotShoeing,
      specialty: editSpecialty.trim(),
      experienceYears: editExperienceYears.trim(),
      mobileService: editMobileService,
      equipmentType: editEquipmentType.trim(),
      itemCondition: editItemCondition.trim(),
      brandName: editBrandName.trim(),
      media: editMediaList.map((m) => ({ assetId: m.assetId, isCover: m.isCover })),
    });
  }, [
    editTitle, editDescription, editPrice, editProvinceId, editDistrictId,
    editHorseName, editSire, editDam, editDamsire, editBreed, editAge, editGender, editCoatColor, editHeightCm, editTjkNumber,
    editInTraining, editIsRacing, editIsForRent, editIsPregnant, editCoveringStallion, editPregnancyStage, editLastCoveringDate, editLiveFoalGuarantee,
    editFacilityName, editBoxCount, editTotalArea, editPaddockCount, editGrassPaddock, editSandPaddock, editStallionPaddock, editVet, editFarrierFacility, editFoalingBarn, editTrainingTrack, editWaterElectricity, editFacilityType,
    editCompanyName, editVehicleType, editWebsiteUrl, editServiceScope, editHasCamera, editHasAirConditioning, editIsInsured, editLiveGps,
    editFarrierName, editHotShoeing, editSpecialty, editExperienceYears, editMobileService,
    editEquipmentType, editItemCondition, editBrandName,
    editMediaList,
  ]);

  const hasEditChanges = isEditInitialized && Boolean(initialEditSnapshot) && currentEditSnapshot !== initialEditSnapshot;

  useEffect(() => {
    if (detail && !isEditInitialized) {
      populateEditFields(detail);
    }
  }, [detail, isEditInitialized]);

  useEffect(() => {
    if (tab === 'edit' && !isEditInitialized && detail) {
      populateEditFields(detail);
    }
  }, [tab, isEditInitialized, detail]);

  useEffect(() => {
    if (editLightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setEditLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowRight') {
        setEditLightboxIndex((prev) => (prev !== null && prev < editMediaList.length - 1 ? prev + 1 : prev));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editLightboxIndex, editMediaList.length]);

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setUploadStage('Görseller yükleniyor...');
    const newItems = [...editMediaList];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`${file.name}: Yalnızca JPEG, PNG veya WebP görseller yüklenebilir.`);
        continue;
      }
      try {
        setUploadStage(`${file.name} yükleniyor (${i + 1}/${files.length})...`);
        const status = await mediaService.uploadAdminAsset(file);
        if (status?.assetId) {
          newItems.push({
            assetId: status.assetId,
            displayOrder: newItems.length,
            isCover: newItems.length === 0,
            previewUrl: URL.createObjectURL(file),
          });
          toast.success(`${file.name} başarıyla yüklendi.`);
        }
      } catch (err: any) {
        toast.error(`${file.name} yüklenemedi: ${err?.message || 'Bilinmeyen hata'}`);
      }
    }

    setEditMediaList(newItems);
    setUploadingImage(false);
    setUploadStage('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleSetCover = (targetIdx: number) => {
    setEditMediaList((prev) =>
      prev.map((m, idx) => ({
        ...m,
        isCover: idx === targetIdx,
      }))
    );
  };

  const handleDeletePhoto = (targetIdx: number) => {
    setEditMediaList((prev) => {
      const filtered = prev.filter((_, idx) => idx !== targetIdx);
      if (filtered.length > 0 && !filtered.some((m) => m.isCover)) {
        filtered[0].isCover = true;
      }
      return filtered.map((m, idx) => ({ ...m, displayOrder: idx }));
    });
  };

  const handleMovePhoto = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= editMediaList.length) return;
    setEditMediaList((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((m, i) => ({ ...m, displayOrder: i }));
    });
  };

  const handleCropSave = async (croppedUri: string, croppedFile: File) => {
    if (cropModalIndex === null) return;
    const targetIdx = cropModalIndex;

    try {
      const status = await mediaService.uploadAdminAsset(croppedFile);
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!status?.assetId || !UUID_REGEX.test(status.assetId)) {
        throw new Error('Görsel sunucuya yüklenemedi veya geçersiz yanıt alındı.');
      }

      setEditMediaList((prev) => {
        const next = [...prev];
        if (next[targetIdx]) {
          next[targetIdx] = {
            ...next[targetIdx],
            assetId: status.assetId,
            previewUrl: croppedUri,
            file: croppedFile,
          };
        }
        return next;
      });

      setCropModalIndex(null);
    } catch (err: any) {
      toast.error('Fotoğraf yüklenirken hata oluştu: ' + (err?.message || 'Bilinmeyen hata'));
    }
  };

  const handleSaveEdit = async () => {
    if (!advertId || savingAdvert) return;
    if (!editTitle.trim()) {
      toast.warning('İlan başlığı boş bırakılamaz.');
      return;
    }
    if (editMediaList.length === 0) {
      toast.warning('İlanda en az bir fotoğraf bulunmalıdır.');
      return;
    }

    setSavingAdvert(true);
    try {
      const cleanPrice = String(editPrice).replace(/[^\d]/g, '');
      const priceMinor = cleanPrice ? parseInt(cleanPrice, 10) * 100 : undefined;

      const currentProps = { ...(((detail?.properties || advert?.properties) || {}) as Record<string, any>) };

      // Horse / Breeding - DB code'larıyla birlikte kaydet (REGISTERED_NAME, SIRE, DAM, DAMSIRE, TJK_NUMBER, HORSE_BREED, HORSE_AGE, HORSE_GENDER, COAT_COLOR)
      currentProps['REGISTERED_NAME'] = editHorseName; currentProps['atAdi'] = editHorseName; currentProps['horseName'] = editHorseName;
      currentProps['SIRE'] = editSire; currentProps['baba'] = editSire; currentProps['sire'] = editSire;
      currentProps['DAM'] = editDam; currentProps['anne'] = editDam; currentProps['dam'] = editDam;
      currentProps['DAMSIRE'] = editDamsire; currentProps['anneBabasi'] = editDamsire; currentProps['damsire'] = editDamsire;
      if (editBreed) {
        currentProps['HORSE_BREED'] = editBreed;
        currentProps['STALLION_BREED'] = editBreed;
        currentProps['atIrki'] = editBreed;
        currentProps['breed'] = editBreed;
      }
      if (editAge) {
        currentProps['HORSE_AGE'] = editAge;
        currentProps['STALLION_AGE'] = editAge;
        currentProps['yas'] = editAge;
        currentProps['age'] = editAge;
      }
      if (editGender) {
        currentProps['HORSE_GENDER'] = editGender;
        currentProps['cinsiyet'] = editGender;
        currentProps['gender'] = editGender;
      }
      if (editCoatColor) {
        currentProps['COAT_COLOR'] = editCoatColor;
        currentProps['donu'] = editCoatColor;
        currentProps['don'] = editCoatColor;
        currentProps['coatColor'] = editCoatColor;
      }
      if (editHeightCm) { currentProps['cidago'] = editHeightCm; currentProps['HEIGHT_CM'] = editHeightCm; currentProps['heightCm'] = editHeightCm; }
      if (editTjkNumber) { currentProps['TJK_NUMBER'] = editTjkNumber; currentProps['tjkNumber'] = editTjkNumber; currentProps['tjkNo'] = editTjkNumber; }

      // Race horse flags - DB code'larıyla birlikte kaydet (IN_TRAINING, IS_RACE_READY, IS_FOR_RENT)
      if (isRaceHorse) {
        const inTrainingBool = editInTraining === 'Evet' || editInTraining === 'true';
        currentProps['IN_TRAINING'] = inTrainingBool;
        currentProps['inTraining'] = inTrainingBool;
        currentProps['idmandaMi'] = inTrainingBool ? 'Evet' : 'Hayır';
        currentProps['idmanda'] = inTrainingBool ? 'Evet' : 'Hayır';

        const isRacingBool = editIsRacing === 'Evet' || editIsRacing === 'true';
        currentProps['IS_RACE_READY'] = isRacingBool;
        currentProps['isRaceReady'] = isRacingBool;
        currentProps['kosarDurumdaMi'] = isRacingBool ? 'Evet' : 'Hayır';
        currentProps['kosar'] = isRacingBool ? 'Evet' : 'Hayır';

        const isForRentBool = editIsForRent === 'Evet' || editIsForRent === 'true';
        currentProps['IS_FOR_RENT'] = isForRentBool;
        currentProps['isForRent'] = isForRentBool;
        currentProps['kiralikMi'] = isForRentBool ? 'Evet' : 'Hayır';
        currentProps['kiralik'] = isForRentBool ? 'Evet' : 'Hayır';
      }

      // Mare
      if (editIsPregnant) currentProps['isPregnant'] = editIsPregnant;
      if (editCoveringStallion) currentProps['coveringStallion'] = editCoveringStallion;
      if (editPregnancyStage) currentProps['pregnancyStage'] = editPregnancyStage;
      if (editLastCoveringDate) currentProps['lastCoveringDate'] = editLastCoveringDate;

      // Stud
      if (editLiveFoalGuarantee) currentProps['canliTayGarantisi'] = editLiveFoalGuarantee;

      // Pansiyon & Facility
      if (editFacilityName) currentProps['facilityName'] = editFacilityName;
      if (editBoxCount) currentProps['boxCount'] = editBoxCount;
      if (editTotalArea) currentProps['totalAreaM2'] = editTotalArea;
      if (editPaddockCount) currentProps['paddockCount'] = editPaddockCount;
      if (editGrassPaddock) {
        const isGrass = editGrassPaddock === 'Evet' || editGrassPaddock === 'true';
        currentProps['grassPaddock'] = isGrass;
        currentProps['facilityGrassPaddock'] = isGrass;
      }
      if (editSandPaddock) {
        const isSand = editSandPaddock === 'Evet' || editSandPaddock === 'true';
        currentProps['sandPaddock'] = isSand;
        currentProps['facilitySandPaddock'] = isSand;
      }
      if (editStallionPaddock) {
        const isStallion = editStallionPaddock === 'Evet' || editStallionPaddock === 'true';
        currentProps['stallionPaddock'] = isStallion;
        currentProps['facilityStallionPaddock'] = isStallion;
      }
      if (editVet) {
        const isVet = editVet === 'Evet' || editVet === 'true';
        currentProps['veterinarian'] = isVet;
        currentProps['vet'] = isVet;
        currentProps['facilityVeterinarian'] = isVet;
        currentProps['veteriner'] = isVet;
      }
      if (editFarrierFacility) {
        const isFarrier = editFarrierFacility === 'Evet' || editFarrierFacility === 'true';
        currentProps['farrier'] = isFarrier;
        currentProps['facilityFarrier'] = isFarrier;
        currentProps['nalbant'] = isFarrier;
      }
      if (editFoalingBarn) {
        const isFoaling = editFoalingBarn === 'Evet' || editFoalingBarn === 'true';
        currentProps['maternity'] = isFoaling;
        currentProps['foalingBarn'] = isFoaling;
        currentProps['facilityFoalingBarn'] = isFoaling;
        currentProps['dogumhane'] = isFoaling;
      }
      if (editTrainingTrack) {
        const isTrack = editTrainingTrack === 'Evet' || editTrainingTrack === 'true';
        currentProps['trainingTrack'] = isTrack ? (currentProps['trainingTrack'] || '1200m Kum Pist') : '';
        currentProps['facilityTrainingTrack'] = isTrack;
        currentProps['idmanPisti'] = isTrack;
      }
      if (editWaterElectricity) currentProps['waterElectricity'] = editWaterElectricity;
      if (editFacilityType) currentProps['facilityType'] = editFacilityType;

      // Transport
      if (editCompanyName) currentProps['companyName'] = editCompanyName;
      if (editVehicleType) currentProps['vehicleType'] = editVehicleType;
      if (editWebsiteUrl) currentProps['websiteUrl'] = editWebsiteUrl;
      if (editServiceScope) currentProps['serviceScope'] = editServiceScope;
      if (editHasCamera) currentProps['hasCamera'] = editHasCamera;
      if (editHasAirConditioning) currentProps['hasAirConditioning'] = editHasAirConditioning;
      if (editIsInsured) currentProps['isInsured'] = editIsInsured;
      if (editLiveGps) currentProps['liveGps'] = editLiveGps;

      // Farrier
      if (editFarrierName) currentProps['farrierName'] = editFarrierName;
      if (editCompanyName) currentProps['companyName'] = editCompanyName;
      if (editHotShoeing) {
        const isHot = editHotShoeing === 'Evet' || editHotShoeing === 'true';
        currentProps['SICAK_UYGULAMA'] = isHot;
        currentProps['sicakUygulama'] = isHot;
        currentProps['sicak_uygulama'] = isHot;
      }
      if (editSpecialty) currentProps['specialty'] = editSpecialty;
      if (editExperienceYears) currentProps['experienceYears'] = editExperienceYears;
      if (editMobileService) currentProps['mobileService'] = editMobileService;

      // Equipment
      if (editEquipmentType) currentProps['equipmentType'] = editEquipmentType;
      if (editItemCondition) currentProps['condition'] = editItemCondition;
      if (editBrandName) currentProps['brandName'] = editBrandName;

      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const validMediaList = editMediaList.filter((m) => m.assetId && UUID_REGEX.test(m.assetId));
      if (validMediaList.length === 0) {
        toast.warning('İlanda en az bir geçerli fotoğraf bulunmalıdır.');
        setSavingAdvert(false);
        return;
      }
      if (!validMediaList.some((m) => m.isCover)) {
        validMediaList[0].isCover = true;
      }

      const payload = {
        expectedVersion: detail?.version ?? advert?.version,
        title: editTitle.trim(),
        description: editDescription.trim(),
        price: priceMinor ? { amountMinor: priceMinor, currency: 'TRY' } : undefined,
        districtId: editDistrictId || undefined,
        properties: currentProps,
        media: validMediaList.map((m, i) => ({
          assetId: m.assetId,
          displayOrder: i,
          isCover: m.isCover,
        })),
      };

      const updated = await advertService.updateAdvert(advertId, payload);
      setDetail(updated);
      setInitialEditSnapshot(currentEditSnapshot);
      toast.success('İlan bilgileri ve fotoğrafları başarıyla kaydedildi.');
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingAdvert(false);
    }
  };

  const renderEditTab = () => {
    return (
      <Row className="g-3">
        {/* SOL KOLON: FOTOĞRAF YÖNETİMİ & AÇIKLAMA */}
        <Col lg={6}>
          {/* Fotoğraf Yönetimi Card */}
          <Card className="border-0 shadow-sm rounded-3 mb-3">
            <Card.Header className="bg-white border-bottom py-2.5 d-flex justify-content-between align-items-center">
              <span className="fw-bold text-dark small d-flex align-items-center gap-1.5">
                <i className="fe fe-image text-primary fs-5" /> İlan Fotoğrafları
                <Badge bg="primary-subtle" text="primary" pill className="ms-1 px-2 fw-bold" style={{ fontSize: '11px' }}>
                  {editMediaList.length}
                </Badge>
              </span>
              <Button
                size="sm"
                variant="outline-primary"
                className="d-flex align-items-center gap-1 py-1 px-2.5 fw-semibold"
                style={{ fontSize: '12px' }}
                disabled={uploadingImage}
                onClick={() => fileInputRef.current?.click()}
              >
                <i className="fe fe-plus" /> Fotoğraf Ekle
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="d-none"
                disabled={uploadingImage}
                onChange={handleFileUpload}
              />
            </Card.Header>
            <Card.Body className="p-3">
              {uploadingImage && (
                <Alert variant="info" className="py-2 px-3 small d-flex align-items-center gap-2 mb-3 shadow-none">
                  <Spinner size="sm" animation="border" />
                  <span>{uploadStage || 'Görseller yükleniyor...'}</span>
                </Alert>
              )}

              {editMediaList.length === 0 ? (
                <div className="text-center py-4 border rounded-3 bg-light text-muted small">
                  <i className="fe fe-camera fs-3 d-block mb-1 text-secondary" />
                  Henüz fotoğraf eklenmemiş. &quot;Fotoğraf Ekle&quot; butonu ile yükleyebilirsiniz.
                </div>
              ) : (
                <div style={{ maxHeight: '420px', overflowY: 'auto' }} className="pe-1">
                  <Row className="g-2">
                    {editMediaList.map((m, idx) => (
                      <Col xs={6} key={m.assetId || idx}>
                        <div
                          className={`card h-100 border position-relative overflow-hidden shadow-none ${
                            m.isCover ? 'border-primary' : ''
                          }`}
                          style={{
                            borderRadius: '10px',
                            backgroundColor: m.isCover ? '#f8faff' : '#ffffff',
                            borderWidth: m.isCover ? '2px' : '1px',
                            borderColor: m.isCover ? '#4f46e5' : '#e2e8f0',
                            transition: 'all 0.15s ease-in-out',
                          }}
                        >
                          {/* Image Preview Container (Tıklandığında Lightbox ile Büyür) */}
                          <div
                            className="position-relative overflow-hidden"
                            style={{
                              aspectRatio: '694.6 / 440',
                              minHeight: '125px',
                              backgroundColor: '#0a0d14',
                              cursor: 'pointer',
                            }}
                            onClick={() => setEditLightboxIndex(idx)}
                            title="Büyütmek için tıklayın"
                          >
                            {/* Buğulu Arka Plan (Yayındaki ilan galerisi bokeh efekti) */}
                            <div
                              className="position-absolute top-0 start-0 w-100 h-100 overflow-hidden"
                              style={{ pointerEvents: 'none' }}
                            >
                              <img
                                src={m.previewUrl || buildMediaUrl(m.assetId, 'DETAIL')}
                                alt=""
                                aria-hidden="true"
                                className="w-100 h-100"
                                style={{
                                  objectFit: 'cover',
                                  transform: 'scale(1.25)',
                                  opacity: 0.85,
                                  filter: 'blur(20px)',
                                  WebkitFilter: 'blur(20px)',
                                }}
                              />
                              <div
                                className="position-absolute top-0 start-0 w-100 h-100"
                                style={{ backgroundColor: 'rgba(0, 0, 0, 0.25)' }}
                              />
                            </div>

                            {/* Net Ön Plan Fotoğrafı - contain ile boşluk varsa boşluğuyla yayındaki gibi görünür */}
                            <img
                              src={m.previewUrl || buildMediaUrl(m.assetId, 'DETAIL')}
                              alt={`Fotoğraf ${idx + 1}`}
                              className="w-100 h-100 position-relative"
                              style={{
                                objectFit: 'contain',
                                zIndex: 1,
                                transition: 'transform 0.2s ease',
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%23f1f5f9"/><text x="100" y="80" text-anchor="middle" font-size="13" fill="%2394a3b8">Görsel Yüklenemedi</text></svg>';
                              }}
                            />

                            {/* Hover Overlay with Zoom Icon */}
                            <div
                              className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center text-white"
                              style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                opacity: 0,
                                transition: 'opacity 0.2s ease',
                                zIndex: 2,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                            >
                              <div className="d-flex align-items-center gap-1 bg-dark bg-opacity-75 px-2.5 py-1 rounded-pill small fw-semibold shadow-sm">
                                <i className="fe fe-zoom-in" /> Büyüt
                              </div>
                            </div>

                            {/* Düzenle Butonu (Sol Üst) */}
                            <button
                              type="button"
                              className="position-absolute top-0 start-0 m-1.5 px-2 py-0.5 d-flex align-items-center gap-1 border-0 shadow-sm"
                              style={{
                                backgroundColor: 'rgba(12, 12, 14, 0.75)',
                                color: '#ffffff',
                                borderRadius: '50rem',
                                fontSize: '11px',
                                fontWeight: 600,
                                zIndex: 3,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCropModalIndex(idx);
                              }}
                              title="Fotoğrafı kırp ve düzenle"
                            >
                              <i className="fe fe-crop" style={{ fontSize: '11px' }} />
                              <span>Düzenle</span>
                            </button>

                            {/* Delete Button */}
                            <Button
                              size="sm"
                              variant="danger"
                              className="position-absolute top-0 end-0 m-1.5 p-0 d-flex align-items-center justify-content-center shadow-sm rounded-circle"
                              style={{ width: '24px', height: '24px', fontSize: '11px', opacity: 0.95, zIndex: 3 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePhoto(idx);
                              }}
                              title="Fotoğrafı Sil"
                            >
                              <i className="fe fe-trash-2" />
                            </Button>
                          </div>

                          {/* Card Footer / Controls */}
                          <div className="p-2 d-flex align-items-center justify-content-between gap-1 bg-white border-top">
                            {m.isCover ? (
                              <span className="badge text-primary bg-primary-subtle fw-bold px-2 py-1" style={{ fontSize: '10px' }}>
                                Kapak Fotoğrafı
                              </span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline-primary"
                                className="py-0 px-2 fw-semibold d-flex align-items-center gap-1"
                                style={{ fontSize: '11px', height: '25px' }}
                                onClick={() => handleSetCover(idx)}
                                title="Bu fotoğrafı vitrin kapağı yap"
                              >
                                <i className="fe fe-star" style={{ fontSize: '10px' }} /> Kapak Yap
                              </Button>
                            )}

                            <div className="d-flex align-items-center gap-1 ms-auto">
                              <Button
                                size="sm"
                                variant="light"
                                className="border p-0 d-flex align-items-center justify-content-center text-secondary"
                                style={{ width: '25px', height: '25px' }}
                                disabled={idx === 0}
                                onClick={() => handleMovePhoto(idx, 'up')}
                                title="Öne Taşı"
                              >
                                <i className="fe fe-arrow-left" style={{ fontSize: '12px' }} />
                              </Button>
                              <Button
                                size="sm"
                                variant="light"
                                className="border p-0 d-flex align-items-center justify-content-center text-secondary"
                                style={{ width: '25px', height: '25px' }}
                                disabled={idx === editMediaList.length - 1}
                                onClick={() => handleMovePhoto(idx, 'down')}
                                title="Arkaya Taşı"
                              >
                                <i className="fe fe-arrow-right" style={{ fontSize: '12px' }} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Başlık ve Açıklama Card */}
          <Card className="border-0 shadow-sm rounded-3">
            <Card.Header className="bg-white border-bottom py-2">
              <span className="fw-bold text-dark small">
                <i className="fe fe-file-text me-1 text-primary" /> İlan Başlığı & Açıklaması
              </span>
            </Card.Header>
            <Card.Body className="p-3">
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-dark">
                  İlan Başlığı <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="rounded-3 shadow-none"
                  placeholder="İlan başlığını giriniz..."
                />
              </Form.Group>

              <Form.Group>
                <Form.Label className="small fw-bold text-dark">İlan Açıklaması</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="rounded-3 shadow-none"
                  placeholder="İlan açıklaması..."
                />
              </Form.Group>
            </Card.Body>
          </Card>
        </Col>

        {/* SAĞ KOLON: FİYAT, LOKASYON & AT BİLGİLERİ */}
        <Col lg={6}>
          {/* Fiyat ve Lokasyon Card */}
          <Card className="border-0 shadow-sm rounded-3 mb-3">
            <Card.Header className="bg-white border-bottom py-2">
              <span className="fw-bold text-dark small">
                <i className="fe fe-map-pin me-1 text-primary" /> Fiyat ve Lokasyon
              </span>
            </Card.Header>
            <Card.Body className="p-3">
              <Form.Group as={Row} className="mb-3 align-items-center">
                <Form.Label column xs={12} sm={3} className="small fw-bold text-dark text-nowrap">
                  Fiyat (TL):
                </Form.Label>
                <Col xs={12} sm={9}>
                  <Form.Control
                    type="text"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="rounded-3 shadow-none"
                    placeholder="Örn: 250000"
                  />
                </Col>
              </Form.Group>

              <Form.Group as={Row} className="align-items-center">
                <Form.Label column xs={12} sm={3} className="small fw-bold text-dark text-nowrap">
                  İl / İlçe:
                </Form.Label>
                <Col xs={12} sm={9}>
                  <Row className="g-2">
                    <Col xs={6}>
                      <Form.Select
                        value={editProvinceId}
                        onChange={(e) => {
                          const pid = e.target.value;
                          setEditProvinceId(pid);
                          setEditDistrictId('');
                          void loadDistrictsForProvince(pid);
                        }}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">İl Seçiniz</option>
                        {provinceOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col xs={6}>
                      <Form.Select
                        value={editDistrictId}
                        onChange={(e) => setEditDistrictId(e.target.value)}
                        className="rounded-3 shadow-none"
                        disabled={!editProvinceId || editDistricts.length === 0}
                      >
                        <option value="">İlçe Seçiniz</option>
                        {editDistricts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                  </Row>
                </Col>
              </Form.Group>
            </Card.Body>
          </Card>

          {/* Kategoriye Özel Sorular & Özellikler Card */}
          {isRaceHorse && (
            <Card className="border-0 shadow-sm rounded-3 mb-3">
              <Card.Header className="bg-white border-bottom py-2.5 d-flex justify-content-between align-items-center">
                <span className="fw-bold text-dark small d-flex align-items-center gap-1.5">
                  <i className="fe fe-activity text-primary fs-5" /> Satılık Yarış Atı Özellikleri & Soy Ağacı
                </span>
                <Badge bg="primary" className="fw-semibold px-2 py-1" style={{ fontSize: '10.5px' }}>
                  Yarış Atı
                </Badge>
              </Card.Header>
              <Card.Body className="p-3">
                <Row className="g-2 mb-2">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">At Adı</Form.Label>
                      <Form.Control
                        type="text"
                        value={editHorseName}
                        onChange={(e) => setEditHorseName(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Atın tam tescilli adı"
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Anne Babası (Damsire)</Form.Label>
                      <Form.Control
                        type="text"
                        value={editDamsire}
                        onChange={(e) => setEditDamsire(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Anne babası"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2 mb-2">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Baba (Sire)</Form.Label>
                      <Form.Control
                        type="text"
                        value={editSire}
                        onChange={(e) => setEditSire(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Baba adı"
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Anne (Dam)</Form.Label>
                      <Form.Control
                        type="text"
                        value={editDam}
                        onChange={(e) => setEditDam(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Anne adı"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2 mb-2">
                  <Col sm={5}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">At Irkı</Form.Label>
                      <Form.Select
                        value={editBreed}
                        onChange={(e) => setEditBreed(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Irk Seçiniz</option>
                        {HORSE_BREED_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col sm={3}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Yaş</Form.Label>
                      <Form.Select
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Seçiniz</option>
                        {HORSE_AGE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col sm={4}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Cinsiyet</Form.Label>
                      <Form.Select
                        value={editGender}
                        onChange={(e) => setEditGender(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Seçiniz</option>
                        {GENDER_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2 mb-3">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Donu (Renk)</Form.Label>
                      <Form.Select
                        value={editCoatColor}
                        onChange={(e) => setEditCoatColor(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Don Seçiniz</option>
                        {COAT_COLOR_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">TJK No / Mikroçip</Form.Label>
                      <Form.Control
                        type="text"
                        value={editTjkNumber}
                        onChange={(e) => setEditTjkNumber(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Örn: 123456"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="p-2.5 rounded-3 border bg-light">
                  <div className="small fw-bold text-dark mb-2">
                    Yarış & İdman Durum Bilgileri
                  </div>
                  <Row className="g-2">
                    <Col sm={4}>
                      <BooleanToggle
                        label="Koşar Durumda"
                        value={editIsRacing}
                        onChange={setEditIsRacing}
                      />
                    </Col>
                    <Col sm={4}>
                      <BooleanToggle
                        label="İdmanda mı?"
                        value={editInTraining}
                        onChange={setEditInTraining}
                      />
                    </Col>
                    <Col sm={4}>
                      <BooleanToggle
                        label="Kiralık mı?"
                        value={editIsForRent}
                        onChange={setEditIsForRent}
                      />
                    </Col>
                  </Row>
                </div>
              </Card.Body>
            </Card>
          )}

          {isMare && !isRaceHorse && (
            <Card className="border-0 shadow-sm rounded-3 mb-3">
              <Card.Header className="bg-white border-bottom py-2.5 d-flex justify-content-between align-items-center">
                <span className="fw-bold text-dark small d-flex align-items-center gap-1.5">
                  <i className="fe fe-heart text-danger fs-5" /> Satılık Kısrak Özellikleri & Gebelik Durumu
                </span>
                <Badge bg="danger" className="fw-semibold px-2 py-1" style={{ fontSize: '10.5px' }}>
                  Kısrak
                </Badge>
              </Card.Header>
              <Card.Body className="p-3">
                <Row className="g-2 mb-2">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Kısrak Adı</Form.Label>
                      <Form.Control
                        type="text"
                        value={editHorseName}
                        onChange={(e) => setEditHorseName(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Kısrağın adı"
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Anne Babası (Damsire)</Form.Label>
                      <Form.Control
                        type="text"
                        value={editDamsire}
                        onChange={(e) => setEditDamsire(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Anne babası"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2 mb-2">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Baba (Sire)</Form.Label>
                      <Form.Control
                        type="text"
                        value={editSire}
                        onChange={(e) => setEditSire(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Baba adı"
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Anne (Dam)</Form.Label>
                      <Form.Control
                        type="text"
                        value={editDam}
                        onChange={(e) => setEditDam(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Anne adı"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2 mb-2">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Irk</Form.Label>
                      <Form.Select
                        value={editBreed}
                        onChange={(e) => setEditBreed(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Irk Seçiniz</option>
                        {HORSE_BREED_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col sm={3}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Yaş</Form.Label>
                      <Form.Select
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Seçiniz</option>
                        {HORSE_AGE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col sm={3}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Don (Renk)</Form.Label>
                      <Form.Select
                        value={editCoatColor}
                        onChange={(e) => setEditCoatColor(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Seçiniz</option>
                        {COAT_COLOR_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2 mb-3">
                  <Col sm={12}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">TJK No / Mikroçip</Form.Label>
                      <Form.Control
                        type="text"
                        value={editTjkNumber}
                        onChange={(e) => setEditTjkNumber(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Örn: 123456"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Gebelik Durumu Section */}
                <div className="p-3 rounded-3 border bg-light">
                  <div className="small fw-bold text-dark mb-2 d-flex align-items-center gap-1">
                    <i className="fe fe-heart text-danger" style={{ fontSize: '13px' }} />
                    <span>Gebelik & Damızlık Durumu</span>
                  </div>
                  <BooleanToggle
                    label="Kısrak Gebe mi?"
                    value={editIsPregnant}
                    onChange={setEditIsPregnant}
                    icon="fe-heart"
                  />
                  {editIsPregnant === 'Evet' && (
                    <div className="pt-2 mt-2 border-top">
                      <Row className="g-2">
                        <Col sm={6}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold text-dark mb-1">Gebe Olduğu Aygır</Form.Label>
                            <Form.Control
                              type="text"
                              value={editCoveringStallion}
                              onChange={(e) => setEditCoveringStallion(e.target.value)}
                              className="rounded-3 shadow-none"
                              placeholder="Aygır adı"
                            />
                          </Form.Group>
                        </Col>
                        <Col sm={3}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold text-dark mb-1">Gebelik Durumu</Form.Label>
                            <Form.Select
                              value={editPregnancyStage}
                              onChange={(e) => setEditPregnancyStage(e.target.value)}
                              className="rounded-3 shadow-none"
                            >
                              <option value="">Seçiniz</option>
                              {PREGNANCY_STAGE_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col sm={3}>
                          <Form.Group>
                            <Form.Label className="small fw-semibold text-dark mb-1">Son Aşım Tarihi</Form.Label>
                            <Form.Control
                              type="text"
                              value={editLastCoveringDate}
                              onChange={(e) => setEditLastCoveringDate(e.target.value)}
                              className="rounded-3 shadow-none"
                              placeholder="GG.AA.YYYY"
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          )}

          {categoryKind === 'horse' && !isRaceHorse && !isMare && (
            <Card className="border-0 shadow-sm rounded-3 mb-3">
              <Card.Header className="bg-white border-bottom py-2.5 d-flex justify-content-between align-items-center">
                <span className="fw-bold text-dark small d-flex align-items-center gap-1.5">
                  <i className="fe fe-activity text-primary fs-5" /> At Özellikleri & Soy Ağacı
                </span>
                <Badge bg="primary" className="fw-semibold px-2 py-1" style={{ fontSize: '10.5px' }}>
                  {isStallion ? 'Satılık Aygır' : 'At'}
                </Badge>
              </Card.Header>
              <Card.Body className="p-3">
                <Row className="g-2 mb-2">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">At Adı</Form.Label>
                      <Form.Control
                        type="text"
                        value={editHorseName}
                        onChange={(e) => setEditHorseName(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Atın adı"
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Anne Babası (Damsire)</Form.Label>
                      <Form.Control
                        type="text"
                        value={editDamsire}
                        onChange={(e) => setEditDamsire(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Anne babası"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2 mb-2">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Baba (Sire)</Form.Label>
                      <Form.Control
                        type="text"
                        value={editSire}
                        onChange={(e) => setEditSire(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Baba adı"
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Anne (Dam)</Form.Label>
                      <Form.Control
                        type="text"
                        value={editDam}
                        onChange={(e) => setEditDam(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Anne adı"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2 mb-2">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Irk</Form.Label>
                      <Form.Select
                        value={editBreed}
                        onChange={(e) => setEditBreed(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Irk Seçiniz</option>
                        {HORSE_BREED_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col sm={3}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Yaş</Form.Label>
                      <Form.Select
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Seçiniz</option>
                        {HORSE_AGE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col sm={3}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Cinsiyet</Form.Label>
                      <Form.Select
                        value={isStallion ? 'Erkek' : editGender}
                        disabled={isStallion}
                        onChange={(e) => setEditGender(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Seçiniz</option>
                        {GENDER_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2">
                  <Col sm={4}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Don (Renk)</Form.Label>
                      <Form.Select
                        value={editCoatColor}
                        onChange={(e) => setEditCoatColor(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Seçiniz</option>
                        {COAT_COLOR_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col sm={4}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Cidago (cm)</Form.Label>
                      <Form.Control
                        type="text"
                        value={editHeightCm}
                        onChange={(e) => setEditHeightCm(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Örn: 165"
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={4}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">TJK No</Form.Label>
                      <Form.Control
                        type="text"
                        value={editTjkNumber}
                        onChange={(e) => setEditTjkNumber(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="TJK No / Çip"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {categoryKind === 'stud' && (
            <Card className="border-0 shadow-sm rounded-3 mb-3">
              <Card.Header className="bg-white border-bottom py-2.5 d-flex justify-content-between align-items-center">
                <span className="fw-bold text-dark small d-flex align-items-center gap-1.5">
                  <i className="fe fe-award text-warning fs-5" /> Aşım Hizmeti & Aygır Detayları
                </span>
                <Badge bg="warning" text="dark" className="fw-semibold px-2 py-1" style={{ fontSize: '10.5px' }}>
                  Aşım Hizmeti
                </Badge>
              </Card.Header>
              <Card.Body className="p-3">
                <Row className="g-2 mb-2">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Aygır Adı</Form.Label>
                      <Form.Control
                        type="text"
                        value={editHorseName}
                        onChange={(e) => setEditHorseName(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Aygırın adı"
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Anne Babası (Damsire)</Form.Label>
                      <Form.Control
                        type="text"
                        value={editDamsire}
                        onChange={(e) => setEditDamsire(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Anne babası"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2 mb-2">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Baba (Sire)</Form.Label>
                      <Form.Control
                        type="text"
                        value={editSire}
                        onChange={(e) => setEditSire(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Baba adı"
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Anne (Dam)</Form.Label>
                      <Form.Control
                        type="text"
                        value={editDam}
                        onChange={(e) => setEditDam(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Anne adı"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2 mb-2">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Aygır Irkı</Form.Label>
                      <Form.Select
                        value={editBreed}
                        onChange={(e) => setEditBreed(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Irk Seçiniz</option>
                        {STUD_BREED_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col sm={3}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Yaş</Form.Label>
                      <Form.Select
                        value={editAge}
                        onChange={(e) => setEditAge(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Seçiniz</option>
                        {HORSE_AGE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col sm={3}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Don (Renk)</Form.Label>
                      <Form.Select
                        value={editCoatColor}
                        onChange={(e) => setEditCoatColor(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Seçiniz</option>
                        {COAT_COLOR_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2 mb-3">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Bulunduğu Hara / Tesis</Form.Label>
                      <Form.Control
                        type="text"
                        value={editFacilityName}
                        onChange={(e) => setEditFacilityName(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Örn: Karacabey Harası"
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">TJK No</Form.Label>
                      <Form.Control
                        type="text"
                        value={editTjkNumber}
                        onChange={(e) => setEditTjkNumber(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="TJK Tescil No"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="p-2.5 rounded-3 border bg-light">
                  <BooleanToggle
                    label="Canlı Tay Garantisi Var mı?"
                    value={editLiveFoalGuarantee}
                    onChange={setEditLiveFoalGuarantee}
                    icon="fe-shield"
                  />
                </div>
              </Card.Body>
            </Card>
          )}

          {categoryKind === 'pansiyon' && (
            <Card className="border-0 shadow-sm rounded-3 mb-3">
              <Card.Header className="bg-white border-bottom py-2.5 d-flex justify-content-between align-items-center">
                <span className="fw-bold text-dark small d-flex align-items-center gap-1.5">
                  <i className="fe fe-home text-success fs-5" /> Pansiyon Hara & Çiftlik Detayları
                </span>
                <Badge bg="success" className="fw-semibold px-2 py-1" style={{ fontSize: '10.5px' }}>
                  Pansiyon Hara
                </Badge>
              </Card.Header>
              <Card.Body className="p-3">
                <div className="p-2.5 rounded-3 border bg-light">
                  <div className="small fw-bold text-dark mb-2 d-flex align-items-center gap-1">
                    <i className="fe fe-check-circle text-success" style={{ fontSize: '13px' }} />
                    <span>Tesis İmkânları ve Özellikleri</span>
                  </div>
                  <Row className="g-2">
                    <Col sm={6}>
                      <BooleanToggle label="Çim Padok" value={editGrassPaddock} onChange={setEditGrassPaddock} icon="fe-sun" />
                    </Col>
                    <Col sm={6}>
                      <BooleanToggle label="Kum Padok" value={editSandPaddock} onChange={setEditSandPaddock} icon="fe-layers" />
                    </Col>
                    <Col sm={6}>
                      <BooleanToggle label="Aygır Padoğu" value={editStallionPaddock} onChange={setEditStallionPaddock} icon="fe-shield" />
                    </Col>
                    <Col sm={6}>
                      <BooleanToggle label="Doğumhane" value={editFoalingBarn} onChange={setEditFoalingBarn} icon="fe-heart" />
                    </Col>
                    <Col sm={6}>
                      <BooleanToggle label="Nalbant" value={editFarrierFacility} onChange={setEditFarrierFacility} icon="fe-tool" />
                    </Col>
                    <Col sm={6}>
                      <BooleanToggle label="Veteriner Hekim" value={editVet} onChange={setEditVet} icon="fe-plus-circle" />
                    </Col>
                    <Col sm={6}>
                      <BooleanToggle label="İdman Pisti" value={editTrainingTrack} onChange={setEditTrainingTrack} icon="fe-compass" />
                    </Col>
                  </Row>
                </div>
              </Card.Body>
            </Card>
          )}

          {categoryKind === 'transport' && (
            <Card className="border-0 shadow-sm rounded-3 mb-3">
              <Card.Header className="bg-white border-bottom py-2.5 d-flex justify-content-between align-items-center">
                <span className="fw-bold text-dark small d-flex align-items-center gap-1.5">
                  <i className="fe fe-truck text-info fs-5" /> At Nakliyesi & Taşıma Detayları
                </span>
                <Badge bg="info" className="fw-semibold px-2 py-1" style={{ fontSize: '10.5px' }}>
                  At Nakliyesi
                </Badge>
              </Card.Header>
              <Card.Body className="p-3">
                <Row className="g-2">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Firma Adı</Form.Label>
                      <Form.Control
                        type="text"
                        value={editCompanyName}
                        onChange={(e) => setEditCompanyName(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Örn: Anadolu At Taşımacılığı"
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Web Sitesi</Form.Label>
                      <Form.Control
                        type="text"
                        value={editWebsiteUrl}
                        onChange={(e) => setEditWebsiteUrl(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="https://..."
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {categoryKind === 'farrier' && (
            <Card className="border-0 shadow-sm rounded-3 mb-3">
              <Card.Header className="bg-white border-bottom py-2.5 d-flex justify-content-between align-items-center">
                <span className="fw-bold text-dark small d-flex align-items-center gap-1.5">
                  <i className="fe fe-tool text-primary fs-5" /> Nalbant Hizmet Detayları
                </span>
                <Badge bg="info" className="fw-semibold px-2 py-1" style={{ fontSize: '10.5px' }}>
                  Nalbant
                </Badge>
              </Card.Header>
              <Card.Body className="p-3">
                <Row className="g-2 mb-2">
                  <Col sm={12}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Firma / Nalbant Adı</Form.Label>
                      <Form.Control
                        type="text"
                        value={editCompanyName || editFarrierName}
                        onChange={(e) => {
                          setEditCompanyName(e.target.value);
                          setEditFarrierName(e.target.value);
                        }}
                        className="rounded-3 shadow-none"
                        placeholder="Nalbant veya firma adı"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="p-2.5 rounded-3 border bg-light">
                  <BooleanToggle
                    label="Sıcak Uygulama"
                    value={editHotShoeing}
                    onChange={setEditHotShoeing}
                    icon="fe-zap"
                  />
                </div>
              </Card.Body>
            </Card>
          )}

          {categoryKind === 'equipment' && (
            <Card className="border-0 shadow-sm rounded-3 mb-3">
              <Card.Header className="bg-white border-bottom py-2.5 d-flex justify-content-between align-items-center">
                <span className="fw-bold text-dark small d-flex align-items-center gap-1.5">
                  <i className="fe fe-box text-warning fs-5" /> Ekipman & Malzeme Detayları
                </span>
                <Badge bg="warning" text="dark" className="fw-semibold px-2 py-1" style={{ fontSize: '10.5px' }}>
                  Ekipman
                </Badge>
              </Card.Header>
              <Card.Body className="p-3">
                <Row className="g-2 mb-2">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Malzeme Türü</Form.Label>
                      <Form.Select
                        value={editEquipmentType}
                        onChange={(e) => setEditEquipmentType(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Tür Seçiniz</option>
                        {EQUIPMENT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Kullanım Durumu</Form.Label>
                      <Form.Select
                        value={editItemCondition}
                        onChange={(e) => setEditItemCondition(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Durum Seçiniz</option>
                        {ITEM_CONDITION_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2">
                  <Col sm={12}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Marka / Üretici</Form.Label>
                      <Form.Control
                        type="text"
                        value={editBrandName}
                        onChange={(e) => setEditBrandName(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Örn: Kieffer, Stubben, Pikeur"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {categoryKind === 'facility' && (
            <Card className="border-0 shadow-sm rounded-3 mb-3">
              <Card.Header className="bg-white border-bottom py-2.5 d-flex justify-content-between align-items-center">
                <span className="fw-bold text-dark small d-flex align-items-center gap-1.5">
                  <i className="fe fe-grid text-secondary fs-5" /> Ahır & Tesis Detayları
                </span>
                <Badge bg="secondary" className="fw-semibold px-2 py-1" style={{ fontSize: '10.5px' }}>
                  Ahır & Tesis
                </Badge>
              </Card.Header>
              <Card.Body className="p-3">
                <Row className="g-2 mb-2">
                  <Col sm={12}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Tesis Türü</Form.Label>
                      <Form.Select
                        value={editFacilityType}
                        onChange={(e) => setEditFacilityType(e.target.value)}
                        className="rounded-3 shadow-none"
                      >
                        <option value="">Seçiniz</option>
                        {FACILITY_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-2 mb-3">
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Boks / Ahır Kapasitesi</Form.Label>
                      <Form.Control
                        type="text"
                        value={editBoxCount}
                        onChange={(e) => setEditBoxCount(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Örn: 20"
                      />
                    </Form.Group>
                  </Col>
                  <Col sm={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold text-dark mb-1">Toplam Alan (m²)</Form.Label>
                      <Form.Control
                        type="text"
                        value={editTotalArea}
                        onChange={(e) => setEditTotalArea(e.target.value)}
                        className="rounded-3 shadow-none"
                        placeholder="Örn: 10000"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="p-2.5 rounded-3 border bg-light">
                  <BooleanToggle
                    label="Elektrik ve Su Altyapısı Mevcut mu?"
                    value={editWaterElectricity}
                    onChange={setEditWaterElectricity}
                    icon="fe-zap"
                  />
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    );
  };

  return (
    <>
      <Modal show onHide={onClose} size={tab === 'edit' ? 'xl' : 'lg'} centered backdrop="static">
      {/* Header */}
      <Modal.Header closeButton className="border-bottom bg-white py-3 px-4">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div
            className="rounded-3 d-flex align-items-center justify-content-center text-primary"
            style={{ width: '38px', height: '38px', backgroundColor: '#eef2ff' }}
          >
            <i className="fe fe-package fs-4" />
          </div>
          <div>
            <h5 className="modal-title mb-0 fw-bold text-dark">Paket & Öne Çıkarma Yönetimi</h5>
            <small className="text-muted">
              İlan: <span className="fw-semibold text-dark">{advert.title ?? advertId}</span> (#{advertId})
            </small>
          </div>
        </div>
      </Modal.Header>

      {/* Body */}
      <Modal.Body className="p-3 bg-light">
        {/* Navigation Tabs */}
        <div className="d-flex gap-1 mb-3 bg-white p-1 rounded-3 shadow-sm border">
          <Button
            variant={tab === 'edit' ? 'primary' : 'light'}
            size="sm"
            className="rounded-2 fw-semibold d-flex align-items-center gap-1 border-0 px-3"
            onClick={() => setTab('edit')}
          >
            <i className="fe fe-edit" /> İlan Düzenle
          </Button>
          <Button
            variant={tab === 'manage' ? 'primary' : 'light'}
            size="sm"
            className="rounded-2 fw-semibold d-flex align-items-center gap-1 border-0 px-3"
            onClick={() => setTab('manage')}
          >
            <i className="fe fe-package" /> Paket Yönetimi
          </Button>
          <Button
            variant={tab === 'card' ? 'primary' : 'light'}
            size="sm"
            className="rounded-2 fw-semibold d-flex align-items-center gap-1 border-0 px-3"
            onClick={() => setTab('card')}
          >
            <i className="fe fe-credit-card" /> İlan Kartı
          </Button>
          <Button
            variant={tab === 'history' ? 'primary' : 'light'}
            size="sm"
            className="rounded-2 fw-semibold d-flex align-items-center gap-1 border-0 px-3"
            onClick={() => setTab('history')}
          >
            <i className="fe fe-clock" /> Geçmiş
          </Button>
          <Button
            variant={tab === 'payments' ? 'primary' : 'light'}
            size="sm"
            className="rounded-2 fw-semibold d-flex align-items-center gap-1 border-0 px-3"
            onClick={() => setTab('payments')}
          >
            <i className="fe fe-dollar-sign" /> Ödemeler
            {payments.length > 0 && (
              <Badge bg={tab === 'payments' ? 'light' : 'secondary'} text={tab === 'payments' ? 'dark' : 'white'} pill style={{ fontSize: '10px' }}>
                {payments.length}
              </Badge>
            )}
          </Button>
        </div>

        {loadingCurrent && (
          <div className="text-center py-5 bg-white rounded-3 shadow-sm">
            <Spinner animation="border" variant="primary" role="status" />
            <div className="mt-2 text-muted fw-semibold">Paket ve ilan bilgileri yükleniyor...</div>
          </div>
        )}

        {!loadingCurrent && (
          <>
            {/* TAB 1: PAKET YÖNETİMİ */}
            {tab === 'manage' && (
              <>
                <Card className="border-0 shadow-sm rounded-3 bg-white">
                <Card.Header className="bg-white border-bottom py-2 px-3 d-flex justify-content-between align-items-center">
                  <span className="small fw-bold text-dark d-flex align-items-center gap-1">
                    <i className="fe fe-grid text-primary" /> {currentPackage ? 'Paket Değiştir / Yenile' : 'Yeni Paket Ata'}
                  </span>
                  {currentPkgObj && (
                    <span className="small text-muted d-flex align-items-center gap-1">
                      Şu anki: <strong className="text-primary ms-1">{currentPkgObj.displayName}</strong>
                    </span>
                  )}
                </Card.Header>
                <Card.Body className="p-2">
                  {/* Paket Kartları */}
                  <Row className="g-2 mb-2">
                    {packages.map((item) => {
                      const isSelected = selectedPackageCode === item.code;
                      const isCurrent = currentPackage?.packageCode === item.code;
                      const priceFormatted = item.displayPrice?.amountMinor
                        ? formatMoney(item.displayPrice.amountMinor, item.currencyCode || 'TRY')
                        : 'Ücretsiz';

                      return (
                        <Col xs={4} key={item.code}>
                          <div
                            onClick={() => setSelectedPackageCode(item.code)}
                            className="p-2 rounded-3 h-100 position-relative"
                            style={{
                              cursor: 'pointer',
                              border: isSelected ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
                              backgroundColor: isSelected ? '#f8f9ff' : '#ffffff',
                              boxShadow: isSelected
                                ? '0 0 0 3px rgba(79, 70, 229, 0.12), 0 2px 8px rgba(79, 70, 229, 0.06)'
                                : '0 1px 2px rgba(0, 0, 0, 0.04)',
                              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          >
                            {/* Header: Title + Radio */}
                            <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                              <div className="d-flex align-items-center gap-1 flex-wrap">
                                <span className="fw-bold text-dark" style={{ fontSize: '0.85rem', letterSpacing: '-0.01em' }}>
                                  {item.displayName}
                                </span>
                                {item.badgeText && (
                                  <span
                                    className="badge rounded-pill"
                                    style={{
                                      fontSize: '9px',
                                      backgroundColor: '#fef3c7',
                                      color: '#92400e',
                                      fontWeight: 600,
                                      border: '1px solid #fde68a',
                                      padding: '1px 6px',
                                    }}
                                  >
                                    {item.badgeText}
                                  </span>
                                )}
                                {isCurrent && (
                                  <span
                                    className="badge rounded-pill"
                                    style={{
                                      fontSize: '9px',
                                      backgroundColor: '#dcfce7',
                                      color: '#166534',
                                      fontWeight: 600,
                                      border: '1px solid #bbf7d0',
                                      padding: '1px 6px',
                                    }}
                                  >
                                    Mevcut Paketiniz
                                  </span>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                {isSelected ? (
                                  <div
                                    className="rounded-circle d-flex align-items-center justify-content-center text-white"
                                    style={{ width: '18px', height: '18px', backgroundColor: '#4f46e5', flexShrink: 0 }}
                                  >
                                    <i className="fe fe-check" style={{ fontSize: '10px' }} />
                                  </div>
                                ) : (
                                  <div
                                    className="rounded-circle border"
                                    style={{ width: '18px', height: '18px', borderColor: '#cbd5e1', backgroundColor: '#fff', flexShrink: 0 }}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Price & Duration */}
                            <div className="d-flex align-items-baseline gap-1 mb-1">
                              <span className="fw-bold" style={{ fontSize: '1.05rem', color: isSelected ? '#4f46e5' : '#0f172a' }}>
                                {priceFormatted}
                              </span>
                              <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                / {item.defaultDurationDays ? `${item.defaultDurationDays} Gün` : 'Süresiz'}
                              </span>
                            </div>

                            {/* Feature Badges */}
                            <div className="d-flex flex-wrap gap-1">
                              {item.allowsUrgent && (
                                <span
                                  className="badge rounded-2"
                                  style={{
                                    fontSize: '9.5px',
                                    padding: '2px 6px',
                                    backgroundColor: '#fffbeb',
                                    color: '#b45309',
                                    border: '1px solid #fef3c7',
                                    fontWeight: 500,
                                  }}
                                >
                                  ⚡ Acil İlan Destekli
                                </span>
                              )}
                              {item.showcaseEligible && (
                                <span
                                  className="badge rounded-2"
                                  style={{
                                    fontSize: '9.5px',
                                    padding: '2px 6px',
                                    backgroundColor: '#eff6ff',
                                    color: '#1d4ed8',
                                    border: '1px solid #dbeafe',
                                    fontWeight: 500,
                                  }}
                                >
                                  ⭐ Vitrin
                                </span>
                              )}
                              {item.searchPriority > 0 && (
                                <span
                                  className="badge rounded-2"
                                  style={{
                                    fontSize: '9.5px',
                                    padding: '2px 6px',
                                    backgroundColor: '#f8fafc',
                                    color: '#475569',
                                    border: '1px solid #e2e8f0',
                                    fontWeight: 500,
                                  }}
                                >
                                  Öncelik: +{item.searchPriority}
                                </span>
                              )}
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>

                  {/* Gerekçe + Aksiyon — tek satırda */}
                  <div
                    className="d-flex align-items-center gap-2 p-2 rounded-3"
                    style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                  >
                    <Form.Control
                      size="sm"
                      placeholder="İşlem gerekçesi (opsiyonel)…"
                      value={assignReason}
                      onChange={(e) => setAssignReason(e.target.value)}
                      style={{ flex: 1, fontSize: '0.8rem' }}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isUpdateDisabled}
                      onClick={() => void handleAssign()}
                      className="d-flex align-items-center gap-1 fw-semibold px-3 flex-shrink-0"
                      style={{
                        opacity: isUpdateDisabled ? 0.45 : 1,
                        cursor: isUpdateDisabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {submitting ? (
                        <><Spinner size="sm" animation="border" /> İşleniyor...</>
                      ) : (
                        <><i className="fe fe-check" /> {currentPackage ? 'Paketi Güncelle / Ata' : 'Paketi Tanımla'}</>
                      )}
                    </Button>
                  </div>

                </Card.Body>
              </Card>
              {renderHistoryCard(true)}
            </>
            )}

            {/* TAB: İLAN DÜZENLE */}
            {tab === 'edit' && renderEditTab()}

            {/* TAB 2: İLAN KARTI (VİTRİN & ACİL İLAN YÖNETİMİ) */}
            {tab === 'card' && (
              <Row className="g-4">
                {/* Left Column: Live Advert Card Preview */}
                <Col lg={5} md={12}>
                  <div
                    className="bg-white rounded-3 border shadow-sm overflow-hidden"
                    style={{ position: 'sticky', top: '10px' }}
                  >
                    <div className="bg-white px-3 py-2 border-bottom d-flex align-items-center justify-content-between">
                      <span className="small fw-bold text-dark d-flex align-items-center gap-1">
                        <i className="fe fe-eye text-primary" /> İlan Kartı Önizlemesi
                      </span>
                    </div>

                    {/* Preview Presentation Stage */}
                    <div
                      className="p-3 d-flex flex-column align-items-center justify-content-center"
                      style={{
                        backgroundColor: '#f8fafc',
                        minHeight: '360px',
                      }}
                    >
                      <LiveAdvertCardPreview
                        advert={advert}
                        detail={detail}
                        coverUrl={coverUrl}
                        displayUrgent={displayUrgent}
                        displayVitrin={displayVitrin}
                        pendingUrgent={pendingUrgent}
                        pendingVitrin={pendingVitrin}
                        theme="light"
                        editTitle={editTitle}
                        editPrice={editPrice}
                        editProvinceId={editProvinceId}
                        editGender={editGender}
                        editAge={editAge}
                        editBreed={editBreed}
                        editHeightCm={editHeightCm}
                      />
                    </div>
                  </div>
                </Col>

                {/* Right Column: Vitrin & Acil Controls */}
                <Col lg={7} md={12}>
                  {/* Vitrin İlanı Card */}
                  <Card className="border-0 shadow-sm rounded-3 bg-white mb-4 overflow-hidden">
                    <Card.Header className="bg-white border-bottom py-2.5 px-3 d-flex justify-content-between align-items-center">
                      <span className="fw-bold text-dark d-flex align-items-center gap-2">
                        <i className="fe fe-star text-warning fs-5" /> Vitrin İlanı (Anasayfa Vitrini)
                      </span>
                      <Badge
                        bg={displayVitrin ? 'warning' : 'secondary'}
                        text={displayVitrin ? 'dark' : 'white'}
                        className="px-2 py-1"
                        style={{ opacity: pendingVitrin !== null ? 0.65 : 1 }}
                      >
                        {displayVitrin ? 'Vitrinde Aktif' : 'Pasif'}
                        {pendingVitrin !== null && ' *'}
                      </Badge>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <p className="text-muted small mb-3">
                        Vitrin özelliği, ilanın Haradan anasayfasının en üstündeki şık <strong>Vitrin Bandı</strong>nda ve öne çıkan vitrin kartı görünümünde sergilenmesini sağlar.
                      </p>

                      <div className="d-flex gap-2 flex-wrap">
                        {!displayVitrin ? (
                          <Button
                            variant={pendingVitrin === true ? 'success' : 'outline-success'}
                            className="d-flex align-items-center gap-2 fw-semibold px-3 py-2"
                            disabled={submitting}
                            onClick={() => handleToggleVitrinPending(true)}
                          >
                            <i className="fe fe-star" /> Vitrin İlanı Yap
                            {vitrinPkg && <span className="opacity-75 fw-normal">({vitrinPkg.displayName})</span>}
                          </Button>
                        ) : (
                          <Button
                            variant={pendingVitrin === false ? 'secondary' : 'outline-secondary'}
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            disabled={submitting}
                            onClick={() => handleToggleVitrinPending(false)}
                          >
                            <i className="fe fe-x" /> Vitrini Kapat
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>

                  {/* Acil İlan Card */}
                  <Card className="border-0 shadow-sm rounded-3 bg-white overflow-hidden">
                    <Card.Header className="bg-white border-bottom py-2.5 px-3 d-flex justify-content-between align-items-center">
                      <span className="fw-bold text-dark d-flex align-items-center gap-2">
                        <i className="fe fe-zap text-danger fs-5" /> Acil İlan Rozeti
                      </span>
                      <Badge
                        bg={displayUrgent ? 'danger' : 'secondary'}
                        className="px-2 py-1"
                        style={{ opacity: pendingUrgent !== null ? 0.65 : 1 }}
                      >
                        {displayUrgent ? 'Aktif' : 'Pasif'}
                        {pendingUrgent !== null && ' *'}
                      </Badge>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <p className="text-muted small mb-3">
                        Acil İlan özelliği, ilanın listelerde ve aramalarda dikkat çekici kırmızı <strong>&quot;ACİL&quot;</strong> rozetiyle öne çıkmasını ve ziyaretçilerin hızlıca dikkatini çekmesini sağlar.
                      </p>

                      <div className="d-flex gap-2 flex-wrap">
                        {!displayUrgent ? (
                          <Button
                            variant={pendingUrgent === true ? 'warning' : 'outline-warning'}
                            className="d-flex align-items-center gap-2 fw-semibold px-3 py-2"
                            disabled={submitting}
                            onClick={() => handleToggleUrgentPending(true)}
                          >
                            <i className="fe fe-zap" /> Acil İlanı Aktifleştir
                          </Button>
                        ) : (
                          <Button
                            variant={pendingUrgent === false ? 'secondary' : 'outline-secondary'}
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            disabled={submitting}
                            onClick={() => handleToggleUrgentPending(false)}
                          >
                            <i className="fe fe-x" /> Acil İlanı Kapat
                          </Button>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}

            {/* TAB 3: GEÇMİŞ */}
            {tab === 'history' && renderHistoryCard()}

            {/* TAB 4: ÖDEMELER */}
            {tab === 'payments' && (
              <Card className="border-0 shadow-sm rounded-3 bg-white">
                <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                  <h6 className="mb-0 fw-bold text-dark">Ödeme Geçmişi</h6>
                  <Badge bg="secondary" pill>
                    {payments.length} Kayıt
                  </Badge>
                </Card.Header>
                <Card.Body className="p-0">
                  {paymentsLoading && (
                    <div className="text-center py-4">
                      <Spinner animation="border" size="sm" variant="primary" />
                      <div className="small text-muted mt-1">Ödemeler yükleniyor...</div>
                    </div>
                  )}

                  {!paymentsLoading && payments.length === 0 && (
                    <div className="text-center py-4 text-muted">Ödeme kaydı bulunamadı.</div>
                  )}

                  {!paymentsLoading && payments.length > 0 && (
                    <div className="table-responsive">
                      <Table hover className="align-middle mb-0 small">
                        <thead className="table-light">
                          <tr>
                            <th>ID</th>
                            <th>Paket</th>
                            <th>Yöntem</th>
                            <th>Tutar</th>
                            <th>Durum</th>
                            <th>Tarih</th>
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((item) => (
                            <tr key={item.id}>
                              <td className="text-muted" style={{ fontSize: '11px' }}>
                                {item.id.split('-')[0]}
                              </td>
                              <td>
                                <span className="fw-bold text-dark">{item.packageCode}</span>
                              </td>
                              <td>
                                <Badge bg="info">{item.paymentMethod}</Badge>
                              </td>
                              <td>
                                <span className="fw-semibold">
                                  {formatMoney(item.amountMinor, item.currencyCode)}
                                </span>
                              </td>
                              <td>
                                <Badge bg={item.status === 'SUCCEEDED' ? 'success' : item.status === 'PENDING' ? 'warning' : 'danger'}>
                                  {item.status}
                                </Badge>
                              </td>
                              <td>{formatDateTimeForText(item.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}
          </>
        )}
      </Modal.Body>

      {/* Footer */}
      <Modal.Footer className="bg-white border-top px-4 py-3 d-flex justify-content-between align-items-center">
        <Button variant="secondary" size="sm" className="px-4" onClick={onClose} disabled={deleting}>
          Kapat
        </Button>

        <div className="d-flex align-items-center gap-2">
          {/* İlan Kartı sekmesinde kaydet butonu */}
          {tab === 'card' && (
            <div className="d-flex align-items-center gap-3">
              {hasCardChanges && (
                <span className="small text-warning fw-semibold d-flex align-items-center gap-1">
                  <i className="fe fe-alert-circle" /> Kaydedilmemiş değişiklikler var
                </span>
              )}
              <Button
                variant={hasCardChanges ? 'primary' : 'secondary'}
                size="sm"
                className="px-4 d-flex align-items-center gap-2 fw-semibold"
                disabled={!hasCardChanges || submitting || deleting}
                onClick={() => void handleCardSave()}
                style={{
                  opacity: hasCardChanges ? 1 : 0.35,
                  cursor: hasCardChanges ? 'pointer' : 'not-allowed',
                  transition: 'all 0.25s ease',
                  boxShadow: hasCardChanges ? '0 2px 8px rgba(79, 70, 229, 0.3)' : 'none',
                }}
              >
                {submitting ? (
                  <><Spinner size="sm" animation="border" /> Kaydediliyor...</>
                ) : (
                  <><i className="fe fe-save" /> Değişiklikleri Kaydet</>
                )}
              </Button>
            </div>
          )}

          {tab === 'edit' && (
            <Button
              variant={hasEditChanges ? 'primary' : 'secondary'}
              size="sm"
              className="px-4 fw-semibold d-flex align-items-center gap-2"
              disabled={!hasEditChanges || savingAdvert || uploadingImage}
              onClick={handleSaveEdit}
              style={{
                opacity: hasEditChanges ? 1 : 0.45,
                cursor: hasEditChanges ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                boxShadow: hasEditChanges ? '0 2px 8px rgba(79, 70, 229, 0.3)' : 'none',
              }}
            >
              {savingAdvert && <Spinner size="sm" animation="border" />}
              <i className="fe fe-check" /> Değişiklikleri Kaydet
            </Button>
          )}

          {canDelete && (
            <Button
              variant="outline-danger"
              size="sm"
              className="d-flex align-items-center gap-1 px-3 fw-semibold shadow-sm"
              disabled={deleting || submitting}
              onClick={() => setShowDeleteConfirm(true)}
              title="İlanı veritabanından tamamen sil"
            >
              <i className="fe fe-trash-2" /> Sil
            </Button>
          )}
        </div>
      </Modal.Footer>
    </Modal>

    <ConfirmModal
      show={showDeleteConfirm}
      onHide={() => !deleting && setShowDeleteConfirm(false)}
      onConfirm={() => void handleDeleteConfirm()}
      title="İlanı Kalıcı Olarak Sil"
      message={
        <div>
          <p className="mb-2 text-dark">
            Bu ilanı veritabanından kalıcı olarak silmek istediğinize emin misiniz?
          </p>
          <div className="p-2 rounded bg-danger-subtle text-danger small text-start border border-danger-subtle">
            <i className="fe fe-alert-triangle me-1 fw-bold" />
            <strong>Dikkat:</strong> Bu işlem geri alınamaz ve ilana ait tüm veriler (medyalar, geçmiş, ödemeler vs.) tamamen silinecektir.
          </div>
        </div>
      }
      confirmText="Evet, Kalıcı Olarak Sil"
      cancelText="Vazgeç"
      type="danger"
      isLoading={deleting}
    />

    {/* Lightbox Büyütme Modalı */}
    {editLightboxIndex !== null && editMediaList[editLightboxIndex] && (
      <Modal
        show={true}
        onHide={() => setEditLightboxIndex(null)}
        size="lg"
        centered
        contentClassName="bg-transparent border-0"
      >
        <div className="position-relative bg-dark rounded-4 overflow-hidden shadow-lg p-3 text-center border border-secondary border-opacity-25">
          {/* Üst Bar: Sayı, Kapak Durumu ve Butonlar */}
          <div className="d-flex justify-content-between align-items-center text-white px-2 py-1 mb-2">
            <div className="d-flex align-items-center gap-2">
              <span className="small fw-semibold">
                Fotoğraf {editLightboxIndex + 1} / {editMediaList.length}
              </span>
              {editMediaList[editLightboxIndex].isCover ? (
                <Badge bg="primary" className="fw-semibold px-2 py-1" style={{ fontSize: '10.5px' }}>
                  ★ Kapak Fotoğrafı
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline-light"
                  className="py-0 px-2 fw-semibold"
                  style={{ fontSize: '11px', height: '24px' }}
                  onClick={() => handleSetCover(editLightboxIndex)}
                >
                  Kapak Yap
                </Button>
              )}
            </div>
            <div className="d-flex align-items-center gap-2">
              <Button
                size="sm"
                variant="outline-danger"
                className="py-0 px-2"
                style={{ fontSize: '11px', height: '24px' }}
                onClick={() => {
                  handleDeletePhoto(editLightboxIndex);
                  if (editMediaList.length <= 1) {
                    setEditLightboxIndex(null);
                  } else if (editLightboxIndex >= editMediaList.length - 1) {
                    setEditLightboxIndex(editMediaList.length - 2);
                  }
                }}
                title="Fotoğrafı Sil"
              >
                <i className="fe fe-trash-2 me-1" /> Sil
              </Button>
              <Button
                size="sm"
                variant="link"
                className="text-white p-0 fs-4 text-decoration-none lh-1 ms-2"
                onClick={() => setEditLightboxIndex(null)}
                title="Kapat (ESC)"
              >
                <i className="fe fe-x" />
              </Button>
            </div>
          </div>

          {/* Büyük Görsel Alanı */}
          <div
            className="d-flex align-items-center justify-content-center position-relative rounded-3 overflow-hidden"
            style={{ minHeight: '440px', backgroundColor: '#0a0d14' }}
          >
            {/* Buğulu Arka Plan */}
            <div
              className="position-absolute top-0 start-0 w-100 h-100 overflow-hidden"
              style={{ pointerEvents: 'none' }}
            >
              <img
                src={
                  editMediaList[editLightboxIndex].previewUrl ||
                  buildMediaUrl(editMediaList[editLightboxIndex].assetId, 'DETAIL')
                }
                alt=""
                aria-hidden="true"
                className="w-100 h-100"
                style={{
                  objectFit: 'cover',
                  transform: 'scale(1.25)',
                  opacity: 0.85,
                  filter: 'blur(28px)',
                  WebkitFilter: 'blur(28px)',
                }}
              />
              <div
                className="position-absolute top-0 start-0 w-100 h-100"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }}
              />
            </div>

            <img
              src={
                editMediaList[editLightboxIndex].previewUrl ||
                buildMediaUrl(editMediaList[editLightboxIndex].assetId, 'DETAIL')
              }
              alt={`Fotoğraf ${editLightboxIndex + 1}`}
              className="img-fluid rounded-2 position-relative"
              style={{ maxHeight: '72vh', maxWidth: '100%', objectFit: 'contain', zIndex: 1 }}
            />
          </div>

          {/* Önceki / Sonraki Ok Butonları */}
          {editMediaList.length > 1 && (
            <>
              <Button
                size="sm"
                variant="dark"
                className="rounded-circle position-absolute top-50 start-0 translate-middle-y ms-4 d-flex align-items-center justify-content-center shadow"
                style={{
                  width: '44px',
                  height: '44px',
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
                disabled={editLightboxIndex === 0}
                onClick={() => setEditLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
                title="Önceki (←)"
              >
                <i className="fe fe-chevron-left text-white fs-4" />
              </Button>
              <Button
                size="sm"
                variant="dark"
                className="rounded-circle position-absolute top-50 end-0 translate-middle-y me-4 d-flex align-items-center justify-content-center shadow"
                style={{
                  width: '44px',
                  height: '44px',
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
                disabled={editLightboxIndex === editMediaList.length - 1}
                onClick={() =>
                  setEditLightboxIndex((prev) =>
                    prev !== null && prev < editMediaList.length - 1 ? prev + 1 : prev
                  )
                }
                title="Sonraki (→)"
              >
                <i className="fe fe-chevron-right text-white fs-4" />
              </Button>
            </>
          )}
        </div>
      </Modal>
    )}

    {/* Görsel Kırpma ve Düzenleme Modalı */}
    {cropModalIndex !== null && editMediaList[cropModalIndex] && (
      <ImageCropperModal
        show={cropModalIndex !== null}
        imageUri={
          editMediaList[cropModalIndex].previewUrl ||
          buildMediaUrl(editMediaList[cropModalIndex].assetId, 'DETAIL')
        }
        fileName={`advert-media-${cropModalIndex + 1}.jpg`}
        onClose={() => setCropModalIndex(null)}
        onSave={handleCropSave}
      />
    )}
  </>
);
}
