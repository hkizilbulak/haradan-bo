import React, { useMemo } from 'react';
import { ModerationAdvertResponse } from '@/models';
import { ModerationAdvertDetail } from '@/services/advert.service';
import { PROVINCES_BY_UUID } from '@/helpers/location';
import { getAdvertCategoryKind } from '@/helpers/advertCategoryHelper';
import { parseMoneyInput } from '@/helpers/money';

export interface LiveAdvertCardPreviewProps {
  advert: ModerationAdvertResponse;
  detail: ModerationAdvertDetail | null;
  coverUrl: string | null;
  displayUrgent: boolean;
  displayVitrin: boolean;
  pendingUrgent: boolean | null;
  pendingVitrin: boolean | null;
  theme?: 'dark' | 'light';
  editTitle?: string;
  editPrice?: string;
  editProvinceId?: string;
  editGender?: string;
  editAge?: string;
  editBreed?: string;
  editHeightCm?: string;
}

function getPropValue(props: Record<string, any>, targetKeys: string[]): any {
  if (!props || typeof props !== 'object') return null;
  const normTargets = targetKeys.map((k) => k.toLowerCase().replace(/[-_\s]/g, ''));
  for (const [pk, pv] of Object.entries(props)) {
    if (pv == null || pv === '' || pv === '-') continue;
    const normKey = pk.toLowerCase().replace(/[-_\s]/g, '');
    if (normTargets.includes(normKey)) {
      return pv;
    }
  }
  return null;
}

export default function LiveAdvertCardPreview({
  advert,
  detail,
  coverUrl,
  displayUrgent,
  displayVitrin,
  pendingUrgent,
  pendingVitrin,
  theme = 'light',
  editTitle,
  editPrice,
  editProvinceId,
  editGender,
  editAge,
  editBreed,
  editHeightCm,
}: LiveAdvertCardPreviewProps) {
  const isDark = theme === 'dark';

  // Palette matching haradan-fe (Colors.dark vs Colors.light)
  const colors = useMemo(() => {
    if (isDark) {
      return {
        cardBg: '#1d2129',
        border: '#2c313c',
        chipBg: '#151820',
        text: '#f3f5f9',
        textSecondary: '#cbd5e1',
        textMuted: '#9ca3af',
        divider: '#2c313c',
        heartColor: '#1d2129',
        heartBg: '#ffffff',
      };
    }
    return {
      cardBg: '#ffffff',
      border: '#e3e9ef',
      chipBg: '#f3f5f9',
      text: '#1d2129',
      textSecondary: '#6c727f',
      textMuted: '#9ca3af',
      divider: '#e3e9ef',
      heartColor: '#1d2129',
      heartBg: '#ffffff',
    };
  }, [isDark]);

  // 1. Title
  const title = (
    editTitle?.trim() ||
    detail?.title ||
    advert?.title ||
    'İlan Başlığı'
  ).trim();

  // 2. Location
  const cityLabel = useMemo(() => {
    if (detail?.provinceName?.trim()) return detail.provinceName.trim();
    if (advert?.provinceName?.trim()) return advert.provinceName.trim();

    const provId = detail?.provinceId || advert?.provinceId || editProvinceId;
    if (provId && PROVINCES_BY_UUID[String(provId)]) {
      return PROVINCES_BY_UUID[String(provId)];
    }

    const loc = detail?.locationName || advert?.locationName;
    if (loc && typeof loc === 'string') {
      const parts = loc.split(',');
      const candidate = parts[parts.length - 1]?.trim();
      if (candidate) return candidate;
    }

    return 'Türkiye';
  }, [detail, advert, editProvinceId]);

  // 3. Price
  const formattedPrice = useMemo(() => {
    let amountMinor: number | null | undefined = null;
    let currency = 'TRY';

    if (editPrice && editPrice.trim()) {
      const parsed = parseMoneyInput(editPrice);
      if (parsed.kind === 'valid') {
        amountMinor = parsed.amountMinor;
      }
    }

    if (amountMinor == null) {
      const pObj = detail?.price || advert?.price;
      if (pObj) {
        if (pObj.amountMinor != null && !isNaN(Number(pObj.amountMinor))) {
          amountMinor = Number(pObj.amountMinor);
        } else if (pObj.amount != null && !isNaN(Number(pObj.amount))) {
          amountMinor = Math.round(Number(pObj.amount) * 100);
        }
        if (pObj.currency) currency = pObj.currency;
      }
    }

    if (amountMinor != null && amountMinor > 0) {
      const major = amountMinor / 100;
      const hasCents = amountMinor % 100 !== 0;
      try {
        return new Intl.NumberFormat('tr-TR', {
          style: 'currency',
          currency,
          minimumFractionDigits: hasCents ? 2 : 0,
          maximumFractionDigits: hasCents ? 2 : 0,
        }).format(major);
      } catch {
        return `${major.toLocaleString('tr-TR')} ${currency}`;
      }
    }

    return 'Fiyat Belirtilmemiş';
  }, [editPrice, detail?.price, advert?.price]);

  // 4. Attributes (Gender, Age, Breed, Height, ServiceCategory)
  const attrs = useMemo(() => {
    const rawProps = (detail?.properties || advert?.properties || {}) as Record<string, any>;
    const catId = (detail?.categoryId || advert?.categoryId || '').toLowerCase();
    const catName = ((detail as any)?.categoryName || (advert as any)?.categoryName || '').toLowerCase();
    const titleLower = title.toLowerCase();

    // Check service category
    let serviceCategory: string | null = null;
    if (
      catId === 'c1000000-0000-4000-8000-000000000021' ||
      catId.includes('pansiyon') ||
      catName.includes('pansiyon') ||
      titleLower.includes('pansiyon') ||
      titleLower.includes('hara')
    ) {
      serviceCategory = 'Pansiyon / Hara';
    } else if (
      catId === 'c1000000-0000-4000-8000-000000000022' ||
      catId.includes('nakliye') ||
      catName.includes('nakliye') ||
      titleLower.includes('nakliye')
    ) {
      serviceCategory = 'At Nakliyesi';
    } else if (
      catId === 'c1000000-0000-4000-8000-000000000023' ||
      catId.includes('nalbant') ||
      catName.includes('nalbant') ||
      titleLower.includes('nalbant')
    ) {
      serviceCategory = 'Nalbant';
    } else if (catId.includes('ekipman') || catName.includes('ekipman') || catId.includes('tesis')) {
      serviceCategory = 'Ekipman / Tesis';
    }

    if (serviceCategory) {
      return { gender: null, age: null, breed: null, height: null, serviceCategory };
    }

    // Gender
    let gender: string | null = null;
    const rawGender =
      getPropValue(rawProps, ['HORSE_GENDER', 'horsegender', 'horse_gender', 'cinsiyet', 'gender', 'studgender']) ||
      editGender;

    if (rawGender) {
      const gStr = String(rawGender).trim().toLowerCase();
      if (
        gStr === 'd' ||
        gStr === 'k' ||
        gStr.includes('dişi') ||
        gStr.includes('disi') ||
        gStr.includes('kısrak') ||
        gStr.includes('kisrak') ||
        gStr.includes('mare') ||
        gStr.includes('filly')
      ) {
        gender = 'Dişi';
      } else if (gStr.includes('iğdiş') || gStr.includes('igdis') || gStr.includes('gelding')) {
        gender = 'İğdiş';
      } else {
        gender = 'Erkek';
      }
    } else {
      if (
        catId === 'c1000000-0000-4000-8000-000000000012' ||
        catId.includes('kisrak') ||
        catName.includes('kısrak') ||
        titleLower.includes('kısrak') ||
        titleLower.includes('dişi')
      ) {
        gender = 'Dişi';
      } else if (
        catId === 'c1000000-0000-4000-8000-000000000013' ||
        catId === 'c1000000-0000-4000-8000-000000000031' ||
        catId === 'c1000000-0000-4000-8000-000000000032' ||
        catId.includes('aygir') ||
        catName.includes('aygır') ||
        titleLower.includes('aygır')
      ) {
        gender = 'Erkek';
      } else if (titleLower.includes('iğdiş') || titleLower.includes('igdis')) {
        gender = 'İğdiş';
      } else {
        gender = 'Erkek';
      }
    }

    // Age
    let age: string | null = null;
    const rawAge =
      getPropValue(rawProps, ['HORSE_AGE', 'horseage', 'horse_age', 'yas', 'yaş', 'age', 'stallionage', 'studage']) ||
      editAge;

    const rawBirthYear = getPropValue(rawProps, ['birthYear', 'birth_year']);
    const rawBirthDate = getPropValue(rawProps, ['BIRTH_DATE', 'birthDate', 'birth_date']);

    if (rawAge != null && String(rawAge).trim() && String(rawAge) !== '-') {
      const aStr = String(rawAge).trim();
      const aLower = aStr.toLowerCase();
      if (aLower.includes('15') && (aLower.includes('üzeri') || aLower.includes('uzeri') || aLower.includes('+'))) {
        age = '15+ yaş';
      } else if (aLower.includes('10-15') || aLower.includes('10 - 15')) {
        age = '10-15 yaş';
      } else if (aLower.includes('yaş') || aLower.includes('yas')) {
        age = aStr;
      } else {
        age = `${aStr} yaş`;
      }
    } else if (rawBirthYear && Number(rawBirthYear) > 1990) {
      const calc = new Date().getFullYear() - Number(rawBirthYear);
      age = `${calc} yaş`;
    } else if (rawBirthDate && typeof rawBirthDate === 'string') {
      const yMatch = rawBirthDate.match(/\b(19\d{2}|20\d{2})\b/);
      if (yMatch) {
        const calc = new Date().getFullYear() - Number(yMatch[1]);
        age = `${calc} yaş`;
      }
    } else {
      const match = title.match(/(\d+\s*(?:-\s*\d+)?|\d+\+?)\s*(?:yaş|yas)\b/i);
      if (match) {
        age = `${match[1].trim()} yaş`;
      }
    }

    // Breed
    let breed: string | null = null;
    const rawBreed =
      getPropValue(rawProps, ['HORSE_BREED', 'horsebreed', 'horse_breed', 'irk', 'ırk', 'breed', 'stallionbreed', 'studbreed']) ||
      editBreed;

    if (rawBreed != null && String(rawBreed).trim() && String(rawBreed) !== '-') {
      const bStr = String(rawBreed).toLowerCase();
      if (bStr.includes('arap') || bStr.includes('arabian')) {
        breed = 'Arap';
      } else if (bStr.includes('ingiliz') || bStr.includes('thoroughbred')) {
        breed = 'İngiliz';
      } else if (bStr.includes('haflinger')) {
        breed = 'Haflinger';
      } else if (bStr.includes('shetland')) {
        breed = 'Shetland';
      } else if (bStr.includes('warmblood')) {
        breed = 'Warmblood';
      } else if (bStr.includes('pony')) {
        breed = 'Pony';
      } else if (bStr.includes('friesian')) {
        breed = 'Friesian';
      } else {
        breed = String(rawBreed).trim().split(/[\s\n]+/)[0];
      }
    } else if (catId === 'c1000000-0000-4000-8000-000000000031' || titleLower.includes('arap')) {
      breed = 'Arap';
    } else if (catId === 'c1000000-0000-4000-8000-000000000032' || titleLower.includes('ingiliz') || titleLower.includes('thoroughbred')) {
      breed = 'İngiliz';
    } else if (titleLower.includes('haflinger')) {
      breed = 'Haflinger';
    } else if (titleLower.includes('shetland')) {
      breed = 'Shetland';
    } else if (titleLower.includes('pony')) {
      breed = 'Pony';
    } else if (titleLower.includes('warmblood')) {
      breed = 'Warmblood';
    }

    // Height
    let height: string | null = null;
    const rawHeight =
      getPropValue(rawProps, ['HORSE_HEIGHT', 'horseheight', 'horse_height', 'cidago', 'boy', 'height']) ||
      editHeightCm;

    if (rawHeight != null && String(rawHeight).trim() && String(rawHeight) !== '-') {
      const hStr = String(rawHeight).trim();
      if (hStr.toLowerCase().includes('cm')) {
        height = hStr;
      } else {
        const matchNum = hStr.match(/\d+/);
        if (matchNum) {
          height = `${matchNum[0]} cm`;
        }
      }
    }

    return { gender, age, breed, height, serviceCategory: null };
  }, [detail, advert, title, editGender, editAge, editBreed, editHeightCm]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '300px',
        backgroundColor: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: isDark
          ? '0 8px 24px -4px rgba(0, 0, 0, 0.45)'
          : '0 4px 18px -2px rgba(15, 23, 42, 0.08)',
        transition: 'all 0.2s ease',
        userSelect: 'none',
      }}
    >
      {/* Görsel Alanı */}
      <div
        style={{
          width: '100%',
          aspectRatio: '694.6 / 440',
          position: 'relative',
          borderTopLeftRadius: '19px',
          borderTopRightRadius: '19px',
          overflow: 'hidden',
          backgroundColor: '#0a0d14',
        }}
      >
        {coverUrl ? (
          <>
            {/* Buğulu Arka Plan (Yayındaki ilan kartı bokeh efekti) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
            >
              <img
                src={coverUrl}
                alt=""
                aria-hidden="true"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: 'scale(1.25)',
                  opacity: 0.85,
                  filter: 'blur(20px)',
                  WebkitFilter: 'blur(20px)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                }}
              />
            </div>

            {/* Net Ön Plan Fotoğrafı */}
            <img
              src={coverUrl}
              alt={title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                position: 'relative',
                zIndex: 1,
                display: 'block',
              }}
            />
          </>
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textMuted,
            }}
          >
            <i className="fe fe-image" style={{ fontSize: '32px', opacity: 0.5, marginBottom: '6px' }} />
            <span style={{ fontSize: '11px' }}>Görsel Yok</span>
          </div>
        )}

        {/* Sol Üst Rozet: ● ACİL veya ★ Öne Çıkan */}
        {displayUrgent && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              backgroundColor: '#e11d48',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4.5px 9px',
              borderRadius: '999px',
              boxShadow: '0 2px 8px rgba(225, 29, 72, 0.35)',
              zIndex: 2,
              fontWeight: 800,
              fontSize: '9.5px',
              letterSpacing: '1.1px',
              lineHeight: 1,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            <span>ACİL</span>
            {pendingUrgent !== null && (
              <span style={{ fontSize: '7.5px', opacity: 0.85, fontWeight: 500, letterSpacing: 'normal' }}>
                (kaydedilmedi)
              </span>
            )}
          </div>
        )}

        {displayVitrin && !displayUrgent && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              backgroundColor: '#0c0c0e',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4.5px 9px',
              borderRadius: '999px',
              zIndex: 2,
              fontWeight: 700,
              fontSize: '9.5px',
              letterSpacing: '0.4px',
              lineHeight: 1,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Öne çıkan</span>
            {pendingVitrin !== null && (
              <span style={{ fontSize: '7.5px', opacity: 0.85, fontWeight: 500, letterSpacing: 'normal' }}>
                (kaydedilmedi)
              </span>
            )}
          </div>
        )}

        {/* Sağ Üst Yuvarlak Beyaz Favori Butonu */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: colors.heartBg,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.heartColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
      </div>

      {/* Kart Gövdesi */}
      <div
        style={{
          padding: '10px 12px 12px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {/* 1. Başlık */}
        <div
          style={{
            fontSize: '13.5px',
            fontWeight: 700,
            lineHeight: '18px',
            letterSpacing: '-0.2px',
            color: colors.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={title}
        >
          {title}
        </div>

        {/* 2. Fiyat ve İl Satırı */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: '0px',
          }}
        >
          <span
            style={{
              fontSize: '16px',
              fontWeight: 800,
              letterSpacing: '-0.3px',
              color: colors.text,
              flexShrink: 0,
            }}
          >
            {formattedPrice}
          </span>

          <div
            style={{
              width: '1px',
              height: '14px',
              margin: '0 8px',
              backgroundColor: colors.divider,
              opacity: 0.8,
              flexShrink: 0,
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              flexShrink: 1,
              minWidth: 0,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.textSecondary}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 500,
                letterSpacing: '-0.1px',
                color: colors.textSecondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {cityLabel}
            </span>
          </div>
        </div>

        {/* 3. İkonlu Kutucuklar (Cinsiyet, Yaş, Irk, Boy) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '4px',
            marginTop: '4px',
          }}
        >
          {attrs.serviceCategory ? (
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '5px 8px',
                borderRadius: '999px',
                backgroundColor: colors.chipBg,
                gap: '4px',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.textSecondary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 600,
                  color: colors.textSecondary,
                  letterSpacing: '-0.3px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {attrs.serviceCategory}
              </span>
            </div>
          ) : (
            <>
              {/* Kutucuk 1: Cinsiyet */}
              {attrs.gender && (
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '5px 3px',
                    borderRadius: '999px',
                    backgroundColor: colors.chipBg,
                    gap: '3px',
                  }}
                >
                  {attrs.gender === 'Dişi' ? (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={colors.textSecondary}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0 }}
                    >
                      <circle cx="12" cy="9" r="5" />
                      <line x1="12" y1="14" x2="12" y2="21" />
                      <line x1="9" y1="18" x2="15" y2="18" />
                    </svg>
                  ) : attrs.gender === 'İğdiş' ? (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={colors.textSecondary}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0 }}
                    >
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="2" x2="12" y2="7" />
                      <line x1="12" y1="17" x2="12" y2="22" />
                    </svg>
                  ) : (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={colors.textSecondary}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0 }}
                    >
                      <circle cx="10" cy="14" r="5" />
                      <line x1="19" y1="5" x2="13.6" y2="10.4" />
                      <polyline points="19 11 19 5 13 5" />
                    </svg>
                  )}
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      color: colors.textSecondary,
                      letterSpacing: '-0.3px',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {attrs.gender}
                  </span>
                </div>
              )}

              {/* Kutucuk 2: Yaş */}
              {attrs.age && (
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '5px 3px',
                    borderRadius: '999px',
                    backgroundColor: colors.chipBg,
                    gap: '3px',
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={colors.textSecondary}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      color: colors.textSecondary,
                      letterSpacing: '-0.3px',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {attrs.age}
                  </span>
                </div>
              )}

              {/* Kutucuk 3: Irk */}
              {attrs.breed && (
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '5px 3px',
                    borderRadius: '999px',
                    backgroundColor: colors.chipBg,
                    gap: '3px',
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 512 512"
                    fill={colors.textSecondary}
                    style={{ flexShrink: 0 }}
                  >
                    <path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c10.7 34.6 7 73.1-11.4 105.4L400 396.2c-5.7 10-16.3 16.2-27.8 16.2H320c-17.7 0-32-14.3-32-32V320c0-17.7-14.3-32-32-32H192c-8.8 0-16-7.2-16-16V224c0-35.3 28.7-64 64-64h16c8.8 0 16-7.2 16-16V80c0-26.5 21.5-48 48-48h32c13.3 0 24 10.7 24 24v24c0 13.3 10.7 24 24 24h16c22.1 0 40 17.9 40 40v3.4c17.5 4.3 32.7 15.6 41.9 31.2z" />
                  </svg>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      color: colors.textSecondary,
                      letterSpacing: '-0.3px',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {attrs.breed}
                  </span>
                </div>
              )}

              {/* Kutucuk 4: Boy (Cidago) - varsa */}
              {attrs.height && (
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '5px 3px',
                    borderRadius: '999px',
                    backgroundColor: colors.chipBg,
                    gap: '3px',
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={colors.textSecondary}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <path d="M2 12h20M7 12v3M12 12v5M17 12v3" />
                  </svg>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      color: colors.textSecondary,
                      letterSpacing: '-0.3px',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {attrs.height}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
