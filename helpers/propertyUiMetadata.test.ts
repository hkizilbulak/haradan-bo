/**
 * Node-runnable property ui metadata helper checks.
 * Run: node --experimental-strip-types helpers/propertyUiMetadata.test.ts
 */
import {
  buildUiMetadata,
  isHighlightProperty,
  readUiMetadata,
  uiMetadataFromForm,
} from './propertyUiMetadata.ts';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

assert(isHighlightProperty({ displayGroup: 'highlight' }), 'highlight detected');
assert(!isHighlightProperty({ displayGroup: 'default' }), 'default not highlight');
assert(!isHighlightProperty({}), 'empty not highlight');

assert(
  JSON.stringify(
    buildUiMetadata({
      displayGroup: 'highlight',
      sectionTitle: 'ÖNE ÇIKAN BİLGİLER',
      sectionSubtitle: 'GÜVENCE VE İNCELEME',
      icon: 'eye',
    }),
  ) === JSON.stringify({
    displayGroup: 'highlight',
    sectionTitle: 'ÖNE ÇIKAN BİLGİLER',
    sectionSubtitle: 'GÜVENCE VE İNCELEME',
    icon: 'eye',
    inputWidget: 'checkbox',
  }),
  'highlight metadata built',
);

assert(
  JSON.stringify(
    uiMetadataFromForm({
      dataType: 'STRING',
      displayGroup: 'highlight',
      sectionTitle: '',
      sectionSubtitle: '',
      icon: '',
    }),
  ) === '{}',
  'non-boolean returns empty metadata',
);

assert(
  readUiMetadata({ displayGroup: 'highlight', icon: 'file-text' }).icon === 'file-text',
  'reads icon from metadata',
);

console.log('propertyUiMetadata.test.ts: ok');
