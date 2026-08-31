export type PropertyDisplayGroup = 'default' | 'highlight';

export type PropertyInputWidget = 'toggle' | 'checkbox';

export type PropertyUiMetadata = {
  displayGroup?: PropertyDisplayGroup;
  sectionTitle?: string;
  sectionSubtitle?: string;
  icon?: string;
  inputWidget?: PropertyInputWidget;
};

export const HIGHLIGHT_SECTION_DEFAULTS = {
  sectionTitle: 'ÖNE ÇIKAN BİLGİLER',
  sectionSubtitle: 'GÜVENCE VE İNCELEME',
} as const;

export const HIGHLIGHT_ICON_OPTIONS = [
  { value: 'activity', label: 'Sağlık / Tıbbi' },
  { value: 'file-text', label: 'Belge / Şecere' },
  { value: 'eye', label: 'İnceleme / Gözlem' },
  { value: 'shield', label: 'Güvence' },
  { value: 'check-circle', label: 'Onay / Doğrulama' },
  { value: 'award', label: 'Sertifika / Ödül' },
  { value: 'map-pin', label: 'Konum / Yerinde' },
  { value: 'calendar', label: 'Randevu / Takvim' },
] as const;

export function isHighlightProperty(uiMetadata?: Record<string, unknown> | null): boolean {
  return readUiMetadata(uiMetadata).displayGroup === 'highlight';
}

export function readUiMetadata(uiMetadata?: Record<string, unknown> | null): PropertyUiMetadata {
  if (!uiMetadata || typeof uiMetadata !== 'object') {
    return {};
  }
  const displayGroup = uiMetadata.displayGroup;
  const inputWidget = uiMetadata.inputWidget;
  return {
    displayGroup: displayGroup === 'highlight' ? 'highlight' : 'default',
    sectionTitle: typeof uiMetadata.sectionTitle === 'string' ? uiMetadata.sectionTitle : undefined,
    sectionSubtitle: typeof uiMetadata.sectionSubtitle === 'string' ? uiMetadata.sectionSubtitle : undefined,
    icon: typeof uiMetadata.icon === 'string' ? uiMetadata.icon : undefined,
    inputWidget: inputWidget === 'checkbox' || inputWidget === 'toggle' ? inputWidget : undefined,
  };
}

export function buildUiMetadata(input: {
  displayGroup: PropertyDisplayGroup;
  sectionTitle: string;
  sectionSubtitle: string;
  icon: string;
}): PropertyUiMetadata {
  if (input.displayGroup !== 'highlight') {
    return { displayGroup: 'default', inputWidget: 'toggle' };
  }
  return {
    displayGroup: 'highlight',
    sectionTitle: input.sectionTitle.trim() || HIGHLIGHT_SECTION_DEFAULTS.sectionTitle,
    sectionSubtitle: input.sectionSubtitle.trim() || HIGHLIGHT_SECTION_DEFAULTS.sectionSubtitle,
    icon: input.icon.trim() || 'check-circle',
    inputWidget: 'checkbox',
  };
}

export function uiMetadataFromForm(input: {
  dataType: string;
  displayGroup: PropertyDisplayGroup;
  sectionTitle: string;
  sectionSubtitle: string;
  icon: string;
}): Record<string, unknown> {
  if (input.dataType !== 'BOOLEAN') {
    return {};
  }
  return buildUiMetadata(input) as Record<string, unknown>;
}
