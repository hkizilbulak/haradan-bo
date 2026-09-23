import { buildModerationAdvertSpecRows, getAdvertCategoryKind, getAdvertMainCategory } from './advertCategoryHelper';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(`FAIL: ${msg}`);
  }
}

// 1. Transport Test (At Nakliyesi)
{
  const mockDetail = {
    id: '69',
    title: 'yılmaz nakliye',
    status: 'PUBLISHED' as const,
    version: 1,
    ownerUserId: 'u-1',
    createdAt: '2026-09-03T10:00:00Z',
    publishedAt: '2026-09-03T10:00:00Z',
    categoryId: 'c1000000-0000-4000-8000-000000000022',
    properties: {
      companyName: 'yılmaz nakliye',
      websiteUrl: 'https://yilmaznakliye.com',
      districtName: 'Çan',
      ilce: 'Çan',
      provinceName: 'Çanakkale',
      sehir: 'Çanakkale',
      owner: 'Sami Avcı',
      price: 60000,
    },
  };

  const rows = buildModerationAdvertSpecRows(mockDetail as any, null, 'At Nakliyesi');
  const labels = rows.map((r) => r.label);

  assert(labels.includes('İlan No'), 'has İlan No');
  assert(labels.includes('Kategori'), 'has Kategori');
  assert(labels.includes('Firma Adı'), 'has Firma Adı');
  assert(labels.includes('Hizmet'), 'has Hizmet');
  assert(labels.includes('Web Sitesi'), 'has Web Sitesi');

  assert(!labels.includes('At Adı'), 'must NOT have At Adı');
  assert(!labels.includes('Baba (Sire)'), 'must NOT have Baba');
  assert(!labels.includes('District Name'), 'must NOT have District Name');
  assert(!labels.includes('Ilce'), 'must NOT have Ilce');
  assert(!labels.includes('Province Name'), 'must NOT have Province Name');
  assert(!labels.includes('Sehir'), 'must NOT have Sehir');
  assert(!labels.includes('Sahip'), 'must NOT have Sahip');
  assert(!labels.includes('Price'), 'must NOT have Price');

  console.log('✓ Transport category test passed');
}

// 2. Pansiyon Test (Pansiyon Haralar)
{
  const mockDetail = {
    id: '70',
    title: 'Yeşil Vadi Harası',
    status: 'PUBLISHED' as const,
    version: 1,
    ownerUserId: 'u-2',
    createdAt: '2026-09-01T10:00:00Z',
    publishedAt: '2026-09-01T10:00:00Z',
    categoryId: 'c1000000-0000-4000-8000-000000000021',
    properties: {
      grassPaddock: true,
      sandPaddock: true,
      stallionPaddock: false,
      foalingBarn: true,
      vet: true,
      farrier: true,
      trainingTrack: '1200m Kum Pist',
      districtName: 'Silivri',
      provinceName: 'İstanbul',
    },
  };

  const rows = buildModerationAdvertSpecRows(mockDetail as any, null, 'Pansiyon Haralar');
  const labels = rows.map((r) => r.label);

  assert(labels.includes('Çim Padok'), 'has Çim Padok');
  assert(labels.includes('Kum Padok'), 'has Kum Padok');
  assert(labels.includes('Doğumhane'), 'has Doğumhane');
  assert(labels.includes('Veteriner Hekim'), 'has Veteriner Hekim');
  assert(labels.includes('İdman Pisti'), 'has İdman Pisti');

  assert(!labels.includes('At Adı'), 'pansiyon must NOT have At Adı');
  assert(!labels.includes('Baba (Sire)'), 'pansiyon must NOT have Baba');
  assert(!labels.includes('District Name'), 'must NOT have District Name');

  console.log('✓ Pansiyon category test passed');
}

// 3. Race Horse Test (Satılık Yarış Atı)
{
  const mockDetail = {
    id: '120',
    title: 'ADA BABA',
    status: 'PUBLISHED' as const,
    version: 1,
    ownerUserId: 'u-3',
    createdAt: '2026-09-13T10:00:00Z',
    publishedAt: '2026-09-13T10:00:00Z',
    categoryId: 'c1000000-0000-4000-8000-000000000011',
    properties: {
      registeredName: 'ADA BABA',
      sire: 'DİLİRAN',
      dam: 'CESUR GÜZEL',
      horseBreed: 'Safkan Arap',
      horseAge: '3 Yaş',
      horseGender: 'Erkek',
      coatColor: 'Kır',
      inTraining: true,
      isRaceReady: true,
      isForRent: false,
    },
  };

  const rows = buildModerationAdvertSpecRows(mockDetail as any, null, 'Satılık Yarış Atı');
  const labels = rows.map((r) => r.label);

  assert(labels.includes('At Adı'), 'has At Adı');
  assert(labels.includes('Baba (Sire)'), 'has Baba');
  assert(labels.includes('Anne (Dam)'), 'has Anne');
  assert(labels.includes('At Irkı'), 'has At Irkı');
  assert(labels.includes('Yaş'), 'has Yaş');
  assert(labels.includes('Cinsiyet'), 'has Cinsiyet');
  assert(labels.includes('Donu'), 'has Donu');
  assert(labels.includes('İdmanda mı'), 'has İdmanda mı');
  assert(labels.includes('Koşar durumda mı'), 'has Koşar durumda mı');
  assert(labels.includes('Kiralık mı'), 'has Kiralık mı');

  const sireRow = rows.find((r) => r.label === 'Baba (Sire)');
  assert(sireRow?.isClickable && (sireRow.href?.includes('/api/v1/tjk/redirect') || sireRow.href?.includes('AtKosuBilgileri')), 'sire is clickable TJK link');

  console.log('✓ Race Horse category test passed');
}

// 4. Mare Test (Satılık Kısrak with Pregnancy)
{
  const mockDetail = {
    id: '125',
    title: 'ŞİRİN HANIM',
    status: 'PUBLISHED' as const,
    version: 1,
    ownerUserId: 'u-4',
    createdAt: '2026-09-10T10:00:00Z',
    publishedAt: '2026-09-10T10:00:00Z',
    categoryId: 'c1000000-0000-4000-8000-000000000012',
    properties: {
      registeredName: 'ŞİRİN HANIM',
      sire: 'KARA EFE',
      dam: 'GÜLİZAR',
      horseBreed: 'Safkan Arap',
      horseAge: '6 Yaş',
      coatColor: 'Al',
      isPregnant: true,
      coveringStallion: 'TURBO',
      pregnancyStage: '6 Aylık Gebe',
      lastCoveringDate: '15/03/2026',
    },
  };

  const rows = buildModerationAdvertSpecRows(mockDetail as any, null, 'Satılık Kısrak');
  const labels = rows.map((r) => r.label);

  assert(labels.includes('At Adı'), 'has At Adı');
  assert(labels.includes('Cinsiyet'), 'has Cinsiyet');
  const genderRow = rows.find((r) => r.label === 'Cinsiyet');
  assert(genderRow?.value === 'Dişi', 'Mare gender is Dişi');

  assert(labels.includes('Gebe mi'), 'has Gebe mi');
  const pregRow = rows.find((r) => r.label === 'Gebe mi');
  assert(pregRow?.value === 'Evet', 'Gebe mi is Evet');

  assert(labels.includes('Gebe Olduğu Aygır'), 'has Gebe Olduğu Aygır');
  const covRow = rows.find((r) => r.label === 'Gebe Olduğu Aygır');
  assert(covRow?.value === 'TURBO' && covRow.isClickable, 'Covering stallion is TURBO with TJK link');

  assert(labels.includes('Gebelik Durumu'), 'has Gebelik Durumu');
  assert(labels.includes('Son Aşım Tarihi'), 'has Son Aşım Tarihi');

  assert(!labels.includes('İdmanda mı'), 'Mare without race does NOT have idmanda');

  console.log('✓ Mare category test passed');
}

// 5. Stud Test (Aşım Hizmetleri - Arap Aygır)
{
  const mockDetail = {
    id: '200',
    title: 'TURBO',
    status: 'PUBLISHED' as const,
    version: 1,
    ownerUserId: 'u-5',
    createdAt: '2026-09-05T10:00:00Z',
    publishedAt: '2026-09-05T10:00:00Z',
    categoryId: 'c1000000-0000-4000-8000-000000000031',
    properties: {
      registeredName: 'TURBO',
      sire: 'HABERBATUR',
      dam: 'GİRİT',
      stallionBreed: 'Safkan Arap',
      stallionAge: '14 Yaş',
      coatColor: 'Al',
    },
  };

  const rows = buildModerationAdvertSpecRows(mockDetail as any, null, 'Arap Aygır');
  const labels = rows.map((r) => r.label);

  assert(labels.includes('Aygır Adı'), 'has Aygır Adı');
  assert(labels.includes('Baba (Sire)'), 'has Baba (Sire)');
  assert(labels.includes('Anne (Dam)'), 'has Anne (Dam)');
  assert(labels.includes('At Irkı'), 'has At Irkı');
  assert(labels.includes('Cinsiyet'), 'has Cinsiyet');
  const genderRow = rows.find((r) => r.label === 'Cinsiyet');
  assert(genderRow?.value === 'Erkek', 'Stud gender is Erkek');

  console.log('✓ Stud category test passed');
}

// 5b. Stud Category Real-World Multi-Alias Test (ABAKÜS example - no duplicate properties)
{
  const mockDetail = {
    id: '75',
    title: 'ABAKÜS',
    status: 'PUBLISHED' as const,
    version: 1,
    ownerUserId: 'u-75',
    createdAt: '2026-09-05T10:00:00Z',
    publishedAt: '2026-09-05T10:00:00Z',
    categoryId: 'c1000000-0000-4000-8000-000000000031',
    properties: {
      birthDate: '6.05.2012',
      horseGender: 'Dişi',
      registeredName: 'ABAKÜS',
      stallionAge: '10-15 arası',
      stallionBreed: 'Arap',
      tjkNumber: '55824',
      studAge: '10-15 arası',
      studBreed: 'Arap',
      studCoatColor: 'Al',
      studDam: 'AYŞE.18',
      studDamSire: 'HİLALÜZZAMAN.25',
      studDamsire: 'HİLALÜZZAMAN.25',
      studHorse: 'ABAKÜS',
      studHorseName: 'ABAKÜS',
      studSire: 'PİKEHAN',
    },
  };

  const rows = buildModerationAdvertSpecRows(mockDetail as any, null, 'Arap Aygır');
  const labels = rows.map((r) => r.label);

  assert(labels.includes('Aygır Adı'), 'has Aygır Adı');
  assert(labels.includes('Baba (Sire)'), 'has Baba (Sire)');
  assert(labels.includes('Anne (Dam)'), 'has Anne (Dam)');
  assert(labels.includes('Anne Babası (Damsire)'), 'has Anne Babası (Damsire)');
  assert(labels.includes('At Irkı'), 'has At Irkı');
  assert(labels.includes('Yaş'), 'has Yaş');
  assert(labels.includes('Cinsiyet'), 'has Cinsiyet');
  assert(labels.includes('Donu'), 'has Donu');

  // Verify that NO duplicated/raw English property rows appear
  assert(!labels.includes('Birth Date'), 'must NOT include duplicate Birth Date');
  assert(!labels.includes('Horse Gender'), 'must NOT include duplicate Horse Gender');
  assert(!labels.includes('Registered Name'), 'must NOT include duplicate Registered Name');
  assert(!labels.includes('Stallion Age'), 'must NOT include duplicate Stallion Age');
  assert(!labels.includes('Stallion Breed'), 'must NOT include duplicate Stallion Breed');
  assert(!labels.includes('Tjk Number'), 'must NOT include duplicate Tjk Number');
  assert(!labels.includes('Stud Age'), 'must NOT include duplicate Stud Age');
  assert(!labels.includes('Stud Breed'), 'must NOT include duplicate Stud Breed');
  assert(!labels.includes('Stud Coat Color'), 'must NOT include duplicate Stud Coat Color');
  assert(!labels.includes('Stud Dam'), 'must NOT include duplicate Stud Dam');
  assert(!labels.includes('Stud Dam Sire'), 'must NOT include duplicate Stud Dam Sire');
  assert(!labels.includes('Stud Damsire'), 'must NOT include duplicate Stud Damsire');
  assert(!labels.includes('Stud Horse'), 'must NOT include duplicate Stud Horse');
  assert(!labels.includes('Stud Horse Name'), 'must NOT include duplicate Stud Horse Name');
  assert(!labels.includes('Stud Sire'), 'must NOT include duplicate Stud Sire');

  console.log('✓ Stud category no-duplicates real-world test passed');
}

// 6. Equipment Test (Ekipman & Malzemeler)
{
  const mockDetail = {
    id: '300',
    title: 'Kieffer Deri Eyer',
    status: 'PUBLISHED' as const,
    version: 1,
    ownerUserId: 'u-6',
    createdAt: '2026-09-02T10:00:00Z',
    publishedAt: '2026-09-02T10:00:00Z',
    categoryId: 'c1000000-0000-4000-8000-000000000004',
    properties: {
      equipmentType: 'Eyer & Semer',
      condition: 'İkinci El (Çok İyi)',
      brandName: 'Kieffer',
    },
  };

  const rows = buildModerationAdvertSpecRows(mockDetail as any, null, 'Ekipman & Malzemeler');
  const labels = rows.map((r) => r.label);

  assert(labels.includes('Malzeme Türü'), 'has Malzeme Türü');
  assert(labels.includes('Kullanım Durumu'), 'has Kullanım Durumu');
  assert(labels.includes('Marka / Üretici'), 'has Marka / Üretici');
  assert(!labels.includes('At Adı'), 'Equipment must NOT have At Adı');
  assert(!labels.includes('Cinsiyet'), 'Equipment must NOT have Cinsiyet');

  console.log('✓ Equipment category test passed');
}

// 7. Facility Test (Ahır & Tesisler)
{
  const mockDetail = {
    id: '400',
    title: 'Silivri Çiftlik Tesisi',
    status: 'PUBLISHED' as const,
    version: 1,
    ownerUserId: 'u-7',
    createdAt: '2026-09-01T10:00:00Z',
    publishedAt: '2026-09-01T10:00:00Z',
    categoryId: 'c1000000-0000-4000-8000-000000000005',
    properties: {
      facilityType: 'Hara Kompleksi',
      boxCount: '25',
      totalAreaM2: '15000',
      waterElectricity: true,
    },
  };

  const rows = buildModerationAdvertSpecRows(mockDetail as any, null, 'Ahır & Tesisler');
  const labels = rows.map((r) => r.label);

  assert(labels.includes('Tesis Türü'), 'has Tesis Türü');
  assert(labels.includes('Boks / Ahır Kapasitesi'), 'has Boks Kapasitesi');
  assert(labels.includes('Toplam Alan (m²)'), 'has Toplam Alan');
  assert(labels.includes('Elektrik ve Su Altyapısı'), 'has Elektrik ve Su Altyapısı');
  console.log('✓ Facility category test passed');
}

// 7b. Farrier (Nalbantlar) Test
{
  const mockDetail = {
    id: '139',
    title: '32we',
    status: 'PUBLISHED' as const,
    version: 1,
    ownerUserId: 'u-7',
    categoryId: 'c1000000-0000-4000-8000-000000000023',
    properties: {
      SICAK_UYGULAMA: true,
      companyName: 'Usta Nalbant',
    },
  };

  const rows = buildModerationAdvertSpecRows(mockDetail as any, null, 'Nalbantlar');
  const labels = rows.map((r) => r.label);

  assert(labels.includes('Sıcak Uygulama'), 'has Sıcak Uygulama');
  assert(rows.find((r) => r.label === 'Sıcak Uygulama')?.value === 'Evet', 'Sıcak Uygulama is Evet');
  assert(labels.includes('Hizmet Türü'), 'has Hizmet Türü');
  console.log('✓ Farrier category test passed');
}

// 8. getAdvertMainCategory Tests (At, At Hizmetleri, Aşım)
{
  assert(getAdvertMainCategory('c1000000-0000-4000-8000-000000000011', 'Satılık Yarış Atı') === 'at', 'Race horse is at');
  assert(getAdvertMainCategory('c1000000-0000-4000-8000-000000000012', 'Satılık Kısrak') === 'at', 'Mare is at');
  assert(getAdvertMainCategory('c1000000-0000-4000-8000-000000000013', 'Satılık Aygır') === 'at', 'Stallion sale is at');
  assert(getAdvertMainCategory('c1000000-0000-4000-8000-000000000001', 'Satılık Atlar') === 'at', 'Root horses is at');

  assert(getAdvertMainCategory('c1000000-0000-4000-8000-000000000021', 'Pansiyon Haralar') === 'at-hizmetleri', 'Pansiyon is at-hizmetleri');
  assert(getAdvertMainCategory('c1000000-0000-4000-8000-000000000022', 'At Nakliyesi') === 'at-hizmetleri', 'Nakliye is at-hizmetleri');
  assert(getAdvertMainCategory('c1000000-0000-4000-8000-000000000023', 'Nalbantlar') === 'at-hizmetleri', 'Nalbant is at-hizmetleri');
  assert(getAdvertMainCategory('c1000000-0000-4000-8000-000000000002', 'At Hizmetleri') === 'at-hizmetleri', 'Root services is at-hizmetleri');

  assert(getAdvertMainCategory('c1000000-0000-4000-8000-000000000031', 'Arap Aygır') === 'asim', 'Arap aygir is asim');
  assert(getAdvertMainCategory('c1000000-0000-4000-8000-000000000032', 'İngiliz Aygır') === 'asim', 'Ingiliz aygir is asim');
  assert(getAdvertMainCategory('c1000000-0000-4000-8000-000000000003', 'Aşım Hizmetleri') === 'asim', 'Root breeding is asim');

  console.log('✓ getAdvertMainCategory tests passed');
}

console.log('\nAll advertCategoryHelper tests passed successfully!');
