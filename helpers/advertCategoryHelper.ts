import { formatDateForText, formatDateTimeForText } from './DateUtils';
import { buildAdvertDetailUrl } from '@/contants/urls';
import { ModerationAdvertResponse } from '@/models';
import { ModerationAdvertDetail } from '@/services/advert.service';

export interface SpecRow {
  label: string;
  value: string;
  isClickable?: boolean;
  href?: string;
  isBoolean?: boolean;
}

export type AdvertCategoryKind =
  | 'pansiyon'
  | 'transport'
  | 'farrier'
  | 'service'
  | 'stud'
  | 'equipment'
  | 'facility'
  | 'horse';

export type AdvertMainCategoryFilter = 'at' | 'at-hizmetleri' | 'asim';

export const HORSE_CATEGORY_IDS = new Set([
  'c1000000-0000-4000-8000-000000000001', // Satılık Atlar
  'c1000000-0000-4000-8000-000000000011', // Satılık Yarış Atı
  'c1000000-0000-4000-8000-000000000012', // Satılık Kısrak
  'c1000000-0000-4000-8000-000000000013', // Satılık Aygır
  'c1000000-0000-4000-8000-000000000014', // Satılık Binek Atı
  'c1000000-0000-4000-8000-000000000015', // Satılık Pony
]);

export const SERVICE_CATEGORY_IDS = new Set([
  'c1000000-0000-4000-8000-000000000002', // At Hizmetleri
  'c1000000-0000-4000-8000-000000000021', // Pansiyon Haralar
  'c1000000-0000-4000-8000-000000000022', // At Nakliyesi
  'c1000000-0000-4000-8000-000000000023', // Nalbantlar
]);

export const BREEDING_CATEGORY_IDS = new Set([
  'c1000000-0000-4000-8000-000000000003', // Aşım Hizmetleri
  'c1000000-0000-4000-8000-000000000031', // Arap Aygır
  'c1000000-0000-4000-8000-000000000032', // İngiliz Aygır
]);

export function getAdvertMainCategory(
  categoryId?: string | null,
  categoryName?: string | null,
  properties?: Record<string, any>
): AdvertMainCategoryFilter | 'other' {
  const catId = (categoryId ?? '').toLowerCase().trim();
  const catName = (categoryName ?? '').toLowerCase().trim();
  const text = `${catId} ${catName}`.trim();

  // 1. Direct ID matches
  if (HORSE_CATEGORY_IDS.has(catId)) return 'at';
  if (SERVICE_CATEGORY_IDS.has(catId)) return 'at-hizmetleri';
  if (BREEDING_CATEGORY_IDS.has(catId)) return 'asim';

  // 2. Satılık Aygır vs Aşım Aygır disambiguation:
  if (
    text.includes('satilik-aygir') ||
    text.includes('satılık aygır') ||
    text.includes('satilik aygir')
  ) {
    return 'at';
  }

  // 3. Aşım / Breeding
  if (
    text.includes('asim') ||
    text.includes('aşım') ||
    text.includes('arap-aygir') ||
    text.includes('arap aygır') ||
    text.includes('arap aygir') ||
    text.includes('ingiliz-aygir') ||
    text.includes('ingiliz aygır') ||
    text.includes('ingiliz aygir')
  ) {
    return 'asim';
  }

  // 4. At Hizmetleri
  if (
    text.includes('pansiyon') ||
    text.includes('haralar') ||
    text.includes('nakliye') ||
    text.includes('tasima') ||
    text.includes('taşıma') ||
    text.includes('nalbant') ||
    text.includes('farrier') ||
    text.includes('at-hizmetleri') ||
    text.includes('at hizmetleri')
  ) {
    return 'at-hizmetleri';
  }

  // 5. At / Satılık Atlar
  if (
    text.includes('satilik-atlar') ||
    text.includes('satılık at') ||
    text.includes('satilik at') ||
    text.includes('yaris-ati') ||
    text.includes('yarış atı') ||
    text.includes('yaris ati') ||
    text.includes('kisrak') ||
    text.includes('kısrak') ||
    text.includes('binek') ||
    text.includes('pony') ||
    text.includes('midilli')
  ) {
    return 'at';
  }

  // Fallback to getAdvertCategoryKind
  const kind = getAdvertCategoryKind(categoryId, categoryName, properties);
  if (kind === 'pansiyon' || kind === 'transport' || kind === 'farrier' || kind === 'service') {
    return 'at-hizmetleri';
  }
  if (kind === 'stud') {
    return 'asim';
  }
  if (kind === 'horse') {
    return 'at';
  }

  return 'other';
}

export function getAdvertCategoryKind(
  categoryId?: string | null,
  categoryName?: string | null,
  properties?: Record<string, any>
): AdvertCategoryKind {
  const catId = (categoryId ?? '').toLowerCase().trim();
  const catName = (categoryName ?? '').toLowerCase().trim();
  const text = `${catId} ${catName}`.trim();

  if (
    text.includes('pansiyon') ||
    text.includes('haralar') ||
    catId === 'c1000000-0000-4000-8000-000000000021' ||
    catId.includes('cat-pansiyon')
  ) {
    return 'pansiyon';
  }

  if (
    text.includes('nakliye') ||
    text.includes('tasima') ||
    text.includes('taşıma') ||
    text.includes('transport') ||
    catId === 'c1000000-0000-4000-8000-000000000022' ||
    catId.includes('cat-nakliye')
  ) {
    return 'transport';
  }

  if (
    text.includes('nalbant') ||
    text.includes('farrier') ||
    catId === 'c1000000-0000-4000-8000-000000000023' ||
    catId.includes('cat-nalbant')
  ) {
    return 'farrier';
  }

  if (
    text.includes('asim') ||
    text.includes('aşım') ||
    text.includes('aygir') ||
    text.includes('aygır') ||
    catId === 'c1000000-0000-4000-8000-000000000003' ||
    catId === 'c1000000-0000-4000-8000-000000000031' ||
    catId === 'c1000000-0000-4000-8000-000000000032' ||
    catId.includes('cat-asim') ||
    catId.includes('arap-aygir') ||
    catId.includes('ingiliz-aygir') ||
    text.includes('stallion') ||
    text.includes('stud')
  ) {
    return 'stud';
  }

  if (
    text.includes('ekipman') ||
    text.includes('malzeme') ||
    catId === 'c1000000-0000-4000-8000-000000000004'
  ) {
    return 'equipment';
  }

  if (
    text.includes('ahir') ||
    text.includes('ahır') ||
    text.includes('tesis') ||
    catId === 'c1000000-0000-4000-8000-000000000005'
  ) {
    return 'facility';
  }

  if (
    text.includes('hizmet') ||
    text.includes('servis') ||
    text.includes('service') ||
    catId === 'c1000000-0000-4000-8000-000000000002'
  ) {
    return 'service';
  }

  // If properties explicitly indicate pansiyon or transport fields
  if (properties) {
    if (
      properties.grassPaddock != null ||
      properties.sandPaddock != null ||
      properties.facilityGrassPaddock != null ||
      properties.facilityFoalingBarn != null
    ) {
      return 'pansiyon';
    }
    if (properties.companyName != null && properties.horseBreed == null && properties.sire == null) {
      return 'transport';
    }
  }

  return 'horse';
}

export function isRaceHorseAdvert(
  categoryId?: string | null,
  categoryName?: string | null
): boolean {
  const catId = (categoryId ?? '').toLowerCase().trim();
  const catName = (categoryName ?? '').toLowerCase().trim();
  const text = `${catId} ${catName}`.trim();

  // If explicitly non-race category, return false
  const nonRaceTerms = ['kisrak', 'kısrak', 'binek', 'pony', 'aygir', 'aygır', 'pansiyon', 'nakliye', 'nalbant', 'ekipman', 'tesis'];
  if (nonRaceTerms.some((t) => text.includes(t))) {
    return false;
  }

  return (
    catId === 'c1000000-0000-4000-8000-000000000011' ||
    catId === 'satilik-yaris-ati' ||
    catId.includes('yaris') ||
    catId.includes('yarış') ||
    catName.includes('yaris') ||
    catName.includes('yarış') ||
    catName === 'satılık yarış atı'
  );
}

export function isMareAdvert(
  categoryId?: string | null,
  categoryName?: string | null
): boolean {
  const catId = (categoryId ?? '').toLowerCase().trim();
  const catName = (categoryName ?? '').toLowerCase().trim();
  const text = `${catId} ${catName}`.trim();

  return (
    catId === 'c1000000-0000-4000-8000-000000000012' ||
    catId.includes('kisrak') ||
    catId.includes('kısrak') ||
    catName.includes('kisrak') ||
    catName.includes('kısrak')
  );
}

export function isStallionAdvert(
  categoryId?: string | null,
  categoryName?: string | null
): boolean {
  const catId = (categoryId ?? '').toLowerCase().trim();
  const catName = (categoryName ?? '').toLowerCase().trim();
  const text = `${catId} ${catName}`.trim();

  return (
    catId === 'c1000000-0000-4000-8000-000000000013' ||
    (catId.includes('aygir') && !catId.includes('asim')) ||
    catName.includes('satılık aygır') ||
    catName.includes('satilik aygir')
  );
}

export function formatHorseAge(rawAge: unknown): string {
  if (rawAge == null || rawAge === '') return '';
  const str = String(rawAge).trim();
  if (!str) return '';

  const lower = str.toLowerCase();

  // Guard against legacy corrupted "1015"
  if (lower === '1015' || lower === '1015 yaş' || lower === '1015 yas') {
    return '10-15 Yaş arası';
  }

  if (lower.includes('10-15') || lower.includes('10 - 15')) {
    return '10-15 Yaş arası';
  }

  if (lower.includes('15') && (lower.includes('üzeri') || lower.includes('uzeri') || lower.includes('+'))) {
    return '15 Yaş üzeri';
  }

  if (lower.includes('yaş') || lower.includes('yas')) {
    return str;
  }

  if (lower.includes('arası') || lower.includes('üzeri')) {
    return str;
  }

  return `${str} Yaş`;
}

export function normText(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/['’`"]/g, '')
    .replace(/[-_\s\(\)]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

export const EXCLUDED_PROP_KEYS = new Set([
  // Location
  'provinceid', 'provincename', 'sehir', 'il', 'city',
  'districtid', 'districtname', 'ilce', 'district',
  'location', 'locationname', 'adres', 'address', 'acikadres', 'acik_adres',
  // Price
  'price', 'amount', 'amountminor', 'fiyat', 'ucret', 'bedel', 'currency',
  // Description
  'description', 'aciklama', 'details',
  // Contact & Seller (Shown in dedicated seller card)
  'sellerphone', 'phone', 'telefon', 'iletisimtelefonu', 'saticitelefonu',
  'owner', 'sahip', 'ownername', 'sellername', 'owneruserid', 'owneremail',
  // System / Meta
  'id', 'identifier', 'title', 'baslik', 'status', 'version', 'mediaversion',
  'categoryid', 'horseid', 'createdat', 'publishedat', 'updatedat', 'deletedat',
  'rejectionreason', 'suspensionreason', 'categoryclearedwarning',
]);

export function buildModerationAdvertSpecRows(
  detail: ModerationAdvertDetail | null,
  advert: ModerationAdvertResponse | null,
  categoryName?: string
): SpecRow[] {
  const advertId = advert?.identifier ?? advert?.id ?? detail?.id;
  const currentStatus = detail?.status ?? advert?.status ?? 'PENDING_REVIEW';
  const isPublished = currentStatus === 'PUBLISHED' || advert?.status === 'PUBLISHED';

  const properties = (detail?.properties || {}) as Record<string, any>;
  const resolvedCategory =
    categoryName || detail?.categoryId || advert?.categoryId || 'Kategori Belirtilmemiş';

  const usedKeys = new Set<string>();

  const getProp = (keys: string[], defaultVal?: string): string => {
    const normKeys = keys.map(normText);
    for (const [pk, pv] of Object.entries(properties)) {
      if (pv == null || pv === '') continue;
      const pkNorm = normText(pk);
      if (normKeys.some((k) => k === pkNorm)) {
        usedKeys.add(pkNorm);
        return String(pv).trim();
      }
    }
    for (const [pk, pv] of Object.entries(properties)) {
      if (pv == null || pv === '') continue;
      const pkNorm = normText(pk);
      if (normKeys.some((k) => pkNorm.includes(k) || k.includes(pkNorm))) {
        usedKeys.add(pkNorm);
        return String(pv).trim();
      }
    }
    return defaultVal ?? '';
  };

  const getBoolProp = (keys: string[], defaultVal: boolean | string | null = null): string | null => {
    const raw = getProp(keys);
    if (raw) {
      const lower = raw.toLowerCase();
      if (lower === 'true' || lower === 'evet' || lower === '1') return 'Evet';
      if (lower === 'false' || lower === 'hayır' || lower === 'hayir' || lower === '0') return 'Hayır';
      return raw;
    }
    if (defaultVal != null) {
      if (typeof defaultVal === 'boolean') return defaultVal ? 'Evet' : 'Hayır';
      return defaultVal;
    }
    return null;
  };

  const list: SpecRow[] = [];

  // 1. İlan No
  list.push({
    label: 'İlan No',
    value: String(advertId || '-'),
    isClickable: isPublished && Boolean(advertId),
    href: isPublished && advertId ? buildAdvertDetailUrl(advertId) : undefined,
  });

  // 2. İlan Gönderim Tarihi (Varsa)
  const submissionDate = detail?.createdAt || advert?.createdAt;
  if (submissionDate) {
    list.push({
      label: 'İlan Gönderim Tarihi',
      value: formatDateForText(submissionDate),
    });
  }

  // 3. Yayın Tarihi / İlan Tarihi
  list.push({
    label: isPublished ? 'Yayın Tarihi' : 'İlan Tarihi',
    value: detail?.publishedAt
      ? (isPublished ? formatDateForText(detail.publishedAt) : formatDateTimeForText(detail.publishedAt))
      : (isPublished ? formatDateForText(new Date().toISOString()) : formatDateTimeForText(new Date().toISOString())),
  });

  // 4. Kategori
  list.push({ label: 'Kategori', value: resolvedCategory });

  // 5. Category-Specific Fields
  const categoryKind = getAdvertCategoryKind(detail?.categoryId || advert?.categoryId, resolvedCategory, properties);

  if (categoryKind === 'pansiyon') {
    const grass = getBoolProp(['grassPaddock', 'facilityGrassPaddock', 'cimPadok', 'çim padok'], 'Hayır');
    if (grass) list.push({ label: 'Çim Padok', value: grass, isBoolean: true });

    const sand = getBoolProp(['sandPaddock', 'facilitySandPaddock', 'kumPadok', 'kum padok'], 'Hayır');
    if (sand) list.push({ label: 'Kum Padok', value: sand, isBoolean: true });

    const stallion = getBoolProp(['stallionPaddock', 'facilityStallionPaddock', 'aygirPadogu', 'aygır padoğu'], 'Hayır');
    if (stallion) list.push({ label: 'Aygır Padoğu', value: stallion, isBoolean: true });

    const foaling = getBoolProp(['foalingBarn', 'facilityFoalingBarn', 'dogumhane', 'doğumhane'], 'Hayır');
    if (foaling) list.push({ label: 'Doğumhane', value: foaling, isBoolean: true });

    const farrier = getBoolProp(['farrier', 'facilityFarrier', 'nalbant'], 'Hayır');
    if (farrier) list.push({ label: 'Nalbant', value: farrier, isBoolean: true });

    const vet = getBoolProp(['vet', 'facilityVeterinarian', 'veteriner', 'veterinerHekim'], 'Hayır');
    if (vet) list.push({ label: 'Veteriner Hekim', value: vet, isBoolean: true });

    const track = getProp(['trainingTrack', 'facilityTrainingTrack', 'idmanPisti', 'idman pisti']);
    if (track) {
      const isBool = track.toLowerCase() === 'true' || track.toLowerCase() === 'false' || track.toLowerCase() === 'evet' || track.toLowerCase() === 'hayir';
      const formattedTrack = track.toLowerCase() === 'true' ? 'Evet' : track.toLowerCase() === 'false' ? 'Hayır' : track;
      list.push({ label: 'İdman Pisti', value: formattedTrack, isBoolean: isBool });
    } else {
      list.push({ label: 'İdman Pisti', value: 'Hayır', isBoolean: true });
    }
  } else if (categoryKind === 'transport') {
    const compName = getProp(['companyName', 'firmaAdi', 'sirket', 'company']) || detail?.title || advert?.title || '';
    if (compName) {
      list.push({ label: 'Firma Adı', value: compName });
    }

    const website = getProp(['websiteUrl', 'website', 'webSitesi']);
    if (website) {
      list.push({ label: 'Web Sitesi', value: website, isClickable: true, href: website });
    }

    list.push({ label: 'Hizmet', value: 'At Nakliyesi & Taşımacılık' });
  } else if (categoryKind === 'stud') {
    const studName = getProp(['registeredName', 'atAdi', 'aygirAdi', 'isim', 'horseName', 'studHorseName']) || detail?.title || advert?.title || '-';
    if (studName && studName !== '-') list.push({ label: 'Aygır Adı', value: studName });

    const sire = getProp(['baba', 'sire', 'babaAdi', 'studSire']);
    if (sire && sire !== '-') {
      list.push({
        label: 'Baba (Sire)',
        value: sire,
        isClickable: true,
        href: `https://www.tjk.org/TR/YarisSever/Info/Sehir/AtSorgula?AtAdi=${encodeURIComponent(sire)}`,
      });
    }

    const dam = getProp(['anne', 'dam', 'anneAdi', 'studDam']);
    if (dam && dam !== '-') {
      list.push({
        label: 'Anne (Dam)',
        value: dam,
        isClickable: true,
        href: `https://www.tjk.org/TR/YarisSever/Info/Sehir/AtSorgula?AtAdi=${encodeURIComponent(dam)}`,
      });
    }

    const damsire = getProp(['damsire', 'anneBabasi', 'kisrakBabasi', 'annesininBabasi', 'studDamSire']);
    if (damsire && damsire !== '-') {
      list.push({
        label: 'Anne Babası (Damsire)',
        value: damsire,
        isClickable: true,
        href: `https://www.tjk.org/TR/YarisSever/Info/Sehir/AtSorgula?AtAdi=${encodeURIComponent(damsire)}`,
      });
    }

    const breed = getProp(['stallionBreed', 'horseBreed', 'irk', 'ırk', 'breed', 'atIrki']) || 'İngiliz';
    list.push({ label: 'At Irkı', value: breed });

    const ageRaw = getProp(['stallionAge', 'horseAge', 'yas', 'yaş', 'age']);
    const age = formatHorseAge(ageRaw);
    if (age) list.push({ label: 'Yaş', value: age });

    list.push({ label: 'Cinsiyet', value: 'Erkek' });

    const coat = getProp(['coatColor', 'donu', 'don', 'renk']);
    if (coat && coat !== '-') list.push({ label: 'Donu', value: coat });
  } else if (categoryKind === 'equipment') {
    const eqType = getProp(['equipmentType', 'malzemeTuru', 'tur']);
    if (eqType) list.push({ label: 'Malzeme Türü', value: eqType });

    const condition = getProp(['condition', 'durum', 'kullanimDurumu']);
    if (condition) list.push({ label: 'Kullanım Durumu', value: condition });

    const brand = getProp(['brandName', 'brand', 'marka', 'uretici']);
    if (brand) list.push({ label: 'Marka / Üretici', value: brand });
  } else if (categoryKind === 'facility') {
    const facType = getProp(['facilityType', 'tesisTuru', 'tur']);
    if (facType) list.push({ label: 'Tesis Türü', value: facType });

    const boxes = getProp(['boxCount', 'boksKapasitesi', 'kapasite']);
    if (boxes) list.push({ label: 'Boks / Ahır Kapasitesi', value: boxes });

    const area = getProp(['totalAreaM2', 'toplamAlan', 'alan']);
    if (area) list.push({ label: 'Toplam Alan (m²)', value: `${area} m²` });

    const we = getBoolProp(['waterElectricity', 'elektrikSu', 'altyapi']);
    if (we) list.push({ label: 'Elektrik ve Su Altyapısı', value: we, isBoolean: true });
  } else if (categoryKind === 'farrier' || categoryKind === 'service') {
    list.push({ label: 'Hizmet Türü', value: resolvedCategory });
  } else {
    // Horse adverts (Satılık Yarış Atı, Satılık Kısrak, Satılık Aygır, Satılık Binek Atı, Satılık Pony)
    const horseName = getProp(['registeredName', 'atAdi', 'isim', 'horseName']) || detail?.title || advert?.title || '-';
    if (horseName && horseName !== '-') list.push({ label: 'At Adı', value: horseName });

    const sire = getProp(['baba', 'sire', 'babaAdi', 'babaSire']);
    if (sire && sire !== '-') {
      list.push({
        label: 'Baba (Sire)',
        value: sire,
        isClickable: true,
        href: `https://www.tjk.org/TR/YarisSever/Info/Sehir/AtSorgula?AtAdi=${encodeURIComponent(sire)}`,
      });
    }

    const dam = getProp(['anne', 'dam', 'anneAdi', 'anneDam']);
    if (dam && dam !== '-') {
      list.push({
        label: 'Anne (Dam)',
        value: dam,
        isClickable: true,
        href: `https://www.tjk.org/TR/YarisSever/Info/Sehir/AtSorgula?AtAdi=${encodeURIComponent(dam)}`,
      });
    }

    const damsire = getProp(['damsire', 'anneBabasi', 'kisrakBabasi', 'annesininBabasi']);
    if (damsire && damsire !== '-') {
      list.push({
        label: 'Anne Babası (Damsire)',
        value: damsire,
        isClickable: true,
        href: `https://www.tjk.org/TR/YarisSever/Info/Sehir/AtSorgula?AtAdi=${encodeURIComponent(damsire)}`,
      });
    }

    const breed = getProp(['horseBreed', 'irk', 'ırk', 'breed', 'atIrki']) || 'İngiliz';
    list.push({ label: 'At Irkı', value: breed });

    const ageRaw = getProp(['horseAge', 'yas', 'yaş', 'age']);
    const age = formatHorseAge(ageRaw);
    if (age) list.push({ label: 'Yaş', value: age });

    const isMare = isMareAdvert(detail?.categoryId || advert?.categoryId, resolvedCategory);
    const isStallion = isStallionAdvert(detail?.categoryId || advert?.categoryId, resolvedCategory);
    const gender = isMare ? 'Dişi' : isStallion ? 'Erkek' : getProp(['horseGender', 'cinsiyet', 'gender']) || '-';
    if (gender && gender !== '-') list.push({ label: 'Cinsiyet', value: gender });

    const coat = getProp(['coatColor', 'donu', 'don', 'renk']);
    if (coat && coat !== '-') list.push({ label: 'Donu', value: coat });

    // Race Horse specific properties
    const isRaceHorse = isRaceHorseAdvert(detail?.categoryId || advert?.categoryId, resolvedCategory);
    if (isRaceHorse) {
      list.push({
        label: 'İdmanda mı',
        value: getBoolProp(['IN_TRAINING', 'inTraining', 'idmanda'], true) ?? 'Evet',
        isBoolean: true,
      });

      list.push({
        label: 'Koşar durumda mı',
        value: getBoolProp(['IS_RACE_READY', 'isRaceReady', 'kosar', 'koşar'], true) ?? 'Evet',
        isBoolean: true,
      });

      list.push({
        label: 'Kiralık mı',
        value: getBoolProp(['IS_FOR_RENT', 'isForRent', 'kiralik', 'kiralık'], false) ?? 'Hayır',
        isBoolean: true,
      });
    }

    // Mare pregnancy properties
    const isPregnant = getBoolProp(['IS_PREGNANT', 'isPregnant', 'gebe', 'gebemi', 'gebe mi']);
    if (isPregnant != null) {
      list.push({
        label: 'Gebe mi',
        value: isPregnant,
        isBoolean: true,
      });

      if (isPregnant === 'Evet') {
        const coveringStallion = getProp(['COVERING_STALLION', 'coveringStallion', 'gebeOlduguAygir', 'aygir', 'aygır']);
        if (coveringStallion && coveringStallion !== '-') {
          list.push({
            label: 'Gebe Olduğu Aygır',
            value: coveringStallion,
            isClickable: true,
            href: `https://www.tjk.org/TR/YarisSever/Info/Sehir/AtSorgula?AtAdi=${encodeURIComponent(coveringStallion)}`,
          });
        }

        const stage = getProp(['PREGNANCY_STAGE', 'pregnancyStage', 'gebelikDurumu', 'gebelik']);
        if (stage && stage !== '-') {
          list.push({ label: 'Gebelik Durumu', value: stage });
        }

        const coveringDate = getProp(['LAST_COVERING_DATE', 'lastCoveringDate', 'sonAsimTarihi', 'son aşım tarihi', 'coveringDate']);
        if (coveringDate && coveringDate !== '-') {
          list.push({ label: 'Son Aşım Tarihi', value: coveringDate });
        }
      }
    }
  }

  // Add remaining dynamic properties not already used and not in EXCLUDED_PROP_KEYS
  for (const [key, val] of Object.entries(properties)) {
    if (val == null || val === '') continue;
    const normKey = normText(key);
    if (usedKeys.has(normKey) || EXCLUDED_PROP_KEYS.has(normKey)) continue;

    const readableKey = key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const isBool = typeof val === 'boolean' || val === 'true' || val === 'false' || val === 'Evet' || val === 'Hayır';
    const formattedVal =
      val === true || val === 'true'
        ? 'Evet'
        : val === false || val === 'false'
        ? 'Hayır'
        : String(val);

    list.push({
      label: readableKey,
      value: formattedVal,
      isBoolean: isBool,
    });
  }

  return list;
}
