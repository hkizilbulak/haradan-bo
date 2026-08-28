'use client';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  categoryService,
  CategoryProperty,
  CreateCategoryPropertyRequest,
  PropertyDataType,
} from '@/services/category.service';
import { getErrorMessage } from '@/helpers/HelperUtils';
import { getPropertyDataTypeText } from '@/helpers/EnumUtils';

const DATA_TYPES: PropertyDataType[] = [
  'STRING',
  'TEXT',
  'INTEGER',
  'DECIMAL',
  'BOOLEAN',
  'SINGLE_SELECT',
  'YEAR',
];

type Props = {
  categoryId: string;
  categoryName: string;
  parentId?: string | null;
  onClose: () => void;
};

type OptionRow = {
  value: string;
  label: string;
};

type FormState = {
  title: string;
  helpText: string;
  dataType: PropertyDataType;
  isRequired: boolean;
  isPublicVisible: boolean;
  isFormVisible: boolean;
  isFilterable: boolean;
  options: OptionRow[];
};

const emptyForm: FormState = {
  title: '',
  helpText: '',
  dataType: 'STRING',
  isRequired: false,
  isPublicVisible: true,
  isFormVisible: true,
  isFilterable: false,
  options: [],
};

/** Uppercase slug-like option value from label (Turkish normalize, similar to BE property codes). */
function optionValueFromLabel(label: string): string {
  let s = label.trim();
  if (!s) {
    return 'OPTION';
  }
  s = s
    .replace(/İ/g, 'I')
    .replace(/I\u0307/g, 'I')
    .replace(/ı/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'C');
  s = s.toUpperCase();
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').replace(/_+/g, '_');
  if (!s) {
    return 'OPTION';
  }
  if (s.length > 64) {
    s = s.slice(0, 64).replace(/_+$/, '');
  }
  if (/^[0-9]/.test(s)) {
    s = `O_${s}`.slice(0, 64);
  }
  return s;
}

function assignUniqueOptionValues(options: OptionRow[]): OptionRow[] {
  const used = new Set<string>();
  return options.map((opt) => {
    const base = opt.value.trim() || optionValueFromLabel(opt.label) || 'OPTION';
    let value = base;
    let n = 2;
    while (used.has(value)) {
      value = `${base}_${n}`;
      n += 1;
    }
    used.add(value);
    return { value, label: opt.label.trim() };
  });
}

function optionsFromProperty(property: CategoryProperty): OptionRow[] {
  if (!property.options?.length) {
    return [];
  }
  return property.options.map((raw) => {
    const label = String(raw.label ?? raw.value ?? '');
    const value = String(raw.value ?? optionValueFromLabel(label));
    return { value, label };
  });
}

export default function CategoryPropertiesModal({ categoryId, categoryName, parentId, onClose }: Props) {
  const [items, setItems] = useState<CategoryProperty[]>([]);
  const [parentItems, setParentItems] = useState<CategoryProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryProperty | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await categoryService.listProperties(categoryId, categoryName);
      setItems([...list].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)));

      if (parentId && parentId !== categoryId && parentId !== 'c1000000-0000-4000-8000-000000000000') {
        try {
          const parentList = await categoryService.listProperties(parentId);
          // Üst kategoriden miras alınanlarda yalnızca AKTİF olanlar alt kategoriye aktarılır
          const activeParentList = parentList.filter((p) => p.isActive);
          setParentItems([...activeParentList].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)));
        } catch {
          setParentItems([]);
        }
      } else {
        setParentItems([]);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
      setItems([]);
      setParentItems([]);
    } finally {
      setLoading(false);
    }
  }, [categoryId, categoryName, parentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setFormOpen(true);
  };

  const openEdit = (property: CategoryProperty) => {
    setEditing(property);
    setForm({
      title: property.title,
      helpText: property.helpText ?? '',
      dataType: property.dataType,
      isRequired: property.isRequired,
      isPublicVisible: property.isPublicVisible,
      isFormVisible: property.isFormVisible,
      isFilterable: property.isFilterable,
      options: optionsFromProperty(property),
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (submitting) {
      return;
    }
    if (!form.title.trim()) {
      toast.error('Alan adı zorunludur');
      return;
    }

    const needsOptions = form.dataType === 'SINGLE_SELECT';
    let structuredOptions: Array<{ value: string; label: string }> | undefined;
    if (needsOptions) {
      const filled = form.options.filter((o) => o.label.trim());
      if (filled.length === 0) {
        toast.error('Tek seçim alanları için en az bir seçenek ekleyin');
        return;
      }
      structuredOptions = assignUniqueOptionValues(filled);
    }

    setSubmitting(true);
    try {
      if (editing) {
        await categoryService.updateProperty(categoryId, editing.id, {
          expectedVersion: editing.version,
          title: form.title.trim(),
          helpText: form.helpText.trim() || null,
          isRequired: form.isRequired,
          isPublicVisible: form.isPublicVisible,
          isFormVisible: form.isFormVisible,
          isFilterable: form.isFilterable,
          options: needsOptions ? structuredOptions : undefined,
        });
        toast.success('Özellik güncellendi');
      } else {
        const payload: CreateCategoryPropertyRequest = {
          title: form.title.trim(),
          helpText: form.helpText.trim() || null,
          dataType: form.dataType,
          isRequired: form.isRequired,
          isPublicVisible: form.isPublicVisible,
          isFormVisible: form.isFormVisible,
          isFilterable: form.isFilterable,
          options: needsOptions ? structuredOptions : undefined,
        };
        await categoryService.createProperty(categoryId, payload);
        toast.success('Özellik eklendi');
      }
      setFormOpen(false);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (property: CategoryProperty) => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    try {
      const updated = await categoryService.setPropertyActive(
        categoryId,
        property.id,
        property.version,
        !property.isActive,
      );
      toast.success(property.isActive ? 'Özellik pasife alındı' : 'Özellik aktifleştirildi');
      setItems((prev) =>
        prev.map((p) => (p.id === property.id ? { ...p, ...updated } : p))
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (property: CategoryProperty) => {
    if (submitting) {
      return;
    }
    if (!window.confirm(`"${property.title}" özelliğini silmek istediğinize emin misiniz?`)) {
      return;
    }
    setSubmitting(true);
    try {
      await categoryService.deleteProperty(categoryId, property.id, property.version);
      console.log('DEBUG property.id:', property.id, typeof property.id);
      console.log('DEBUG items before:', items.map(p => p.id));
      setItems((prev) => {
        const filtered = prev.filter((p) => p.id !== property.id);
        console.log('DEBUG prev.length:', prev.length, 'filtered.length:', filtered.length);
        return filtered;
      });
      toast.success('Özellik silindi');
    } catch (error) {
      toast.error(getErrorMessage(error));
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const moveProperty = async (displayedIndex: number, direction: -1 | 1) => {
    const targetDisplayed = displayedIndex + direction;
    if (targetDisplayed < 0 || targetDisplayed >= items.length || submitting) {
      return;
    }

    const currentItem = items[displayedIndex];
    const targetItem = items[targetDisplayed];
    if (!currentItem || !targetItem) return;

    const fromIndex = items.findIndex((p) => p.id === currentItem.id);
    const toIndex = items.findIndex((p) => p.id === targetItem.id);
    if (fromIndex === -1 || toIndex === -1) return;

    const previous = items;
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const withOrder = next.map((item, sortOrder) => ({ ...item, sortOrder }));
    setItems(withOrder);
    setSubmitting(true);
    try {
      await categoryService.reorderProperties(
        categoryId,
        withOrder.map((item, sortOrder) => ({
          id: item.id,
          expectedVersion: item.version,
          sortOrder,
        })),
      );
      toast.success('Sıra güncellendi');
      await load();
    } catch (error) {
      setItems(previous);
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const updateOptionLabel = (index: number, label: string) => {
    setForm((prev) => {
      const options = [...prev.options];
      options[index] = { ...options[index], label };
      return { ...prev, options };
    });
  };

  const removeOption = (index: number) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const addOption = () => {
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, { value: '', label: '' }],
    }));
  };

  return (
    <>
      <Modal show onHide={onClose} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Kategori Özellikleri — {categoryName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <div>
              <h6 className="mb-0 fw-bold">Bu Kategoriye Özel Alanlar</h6>
              <span className="text-muted small">Bu alt kategoriye doğrudan tanımlanan ve öncelikli olan alanlar</span>
            </div>
            <Button size="sm" variant="primary" onClick={openCreate} disabled={submitting}>
              + Yeni Özellik Ekle
            </Button>
          </div>

          {loading && (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="text-center text-muted py-3 border rounded bg-light mb-4">
              Bu kategori için henüz doğrudan bir özellik tanımlanmamış.
              {parentItems.length > 0
                ? ' Üst kategoriden miras alınan aşağıdaki özellikler geçerlidir.'
                : ' İlk özelliği ekleyebilirsiniz.'}
            </div>
          )}

          {!loading && items.length > 0 && (
            <Table responsive hover size="sm" className="align-middle mb-4">
              <thead>
                <tr>
                  <th>Alan Adı</th>
                  <th>Alan Türü</th>
                  <th>Zorunlu</th>
                  <th>Durum</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, originalIndex) => (
                  <tr key={item.id} style={{ opacity: item.isActive ? 1 : 0.65 }}>
                    <td className="fw-semibold">{item.title}</td>
                    <td>{getPropertyDataTypeText(item.dataType)}</td>
                    <td>
                      {item.isRequired ? (
                        <Badge bg="danger" className="text-white">Zorunlu</Badge>
                      ) : (
                        <span className="text-muted small">İsteğe Bağlı</span>
                      )}
                    </td>
                    <td>
                      <Badge bg={item.isActive ? 'success' : 'secondary'}>
                        {item.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </td>
                    <td className="text-end text-nowrap">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        className="me-1"
                        disabled={submitting || originalIndex === 0}
                        onClick={() => void moveProperty(originalIndex, -1)}
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        className="me-1"
                        disabled={submitting || originalIndex === items.length - 1}
                        onClick={() => void moveProperty(originalIndex, 1)}
                      >
                        ↓
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="me-1"
                        disabled={submitting}
                        onClick={() => openEdit(item)}
                      >
                        Düzenle
                      </Button>
                      <Button
                        size="sm"
                        variant={item.isActive ? 'outline-warning' : 'outline-success'}
                        className="me-1"
                        disabled={submitting}
                        onClick={() => void handleToggleActive(item)}
                      >
                        {item.isActive ? 'Pasif' : 'Aktif'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        disabled={submitting}
                        onClick={() => void handleDelete(item)}
                      >
                        Sil
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {!loading && parentItems.length > 0 && (
            <div className="mt-4 pt-3 border-top">
              <div className="d-flex align-items-center gap-2 mb-2">
                <h6 className="mb-0 fw-bold text-dark">Üst Kategoriden Miras Alınan Alanlar</h6>
                <Badge bg="info" className="text-dark">
                  Miras Alındı ({parentItems.length})
                </Badge>
              </div>
              <p className="text-muted small mb-3">
                Bu özellikler üst kategoriden otomatik olarak bu alt kategoriye ve frontend filtrelerine aktarılır.
              </p>
              <Table responsive size="sm" className="align-middle mb-0 table-striped">
                <thead>
                  <tr className="text-muted small">
                    <th>Alan Adı</th>
                    <th>Alan Türü</th>
                    <th>Zorunlu</th>
                    <th>Kaynak</th>
                  </tr>
                </thead>
                <tbody>
                  {parentItems.map((pItem) => {
                    const isOverridden = items.some(
                      (it) => it.code === pItem.code || it.title.toLowerCase() === pItem.title.toLowerCase()
                    );
                    return (
                      <tr key={pItem.id} style={{ opacity: isOverridden ? 0.5 : 1 }}>
                        <td className="fw-semibold">
                          {pItem.title}
                          {isOverridden && (
                            <Badge bg="warning" text="dark" className="ms-2">
                              Bu kategoride özelleştirildi
                            </Badge>
                          )}
                        </td>
                        <td>{getPropertyDataTypeText(pItem.dataType)}</td>
                        <td>
                          {pItem.isRequired ? (
                            <Badge bg="danger">Zorunlu</Badge>
                          ) : (
                            <span className="text-muted small">İsteğe Bağlı</span>
                          )}
                        </td>
                        <td>
                          <Badge bg="secondary" className="bg-opacity-50 text-dark">
                            Üst Kategori
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>Kapat</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={formOpen} onHide={() => setFormOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Özellik Düzenle' : 'Yeni Özellik'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label>Alan Adı</Form.Label>
                <Form.Control
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Örn: Renk"
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Alan Türü</Form.Label>
                <Form.Select
                  value={form.dataType}
                  disabled={!!editing}
                  onChange={(e) => {
                    const dataType = e.target.value as PropertyDataType;
                    setForm((prev) => ({
                      ...prev,
                      dataType,
                      options: dataType === 'SINGLE_SELECT' && prev.options.length === 0
                        ? [{ value: '', label: '' }]
                        : prev.options,
                    }));
                  }}
                >
                  {DATA_TYPES.map((type) => (
                    <option key={type} value={type}>{getPropertyDataTypeText(type)}</option>
                  ))}
                </Form.Select>
                <Form.Text muted>
                  İlan verirken kullanıcının bu bilgiyi nasıl gireceğini belirler.
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Yardım Metni <span className="text-muted fw-normal">(opsiyonel)</span></Form.Label>
                <Form.Control
                  value={form.helpText}
                  onChange={(e) => setForm((prev) => ({ ...prev, helpText: e.target.value }))}
                />
                <Form.Text muted>
                  İlan oluştururken alanın altında gösterilir.
                </Form.Text>
              </Form.Group>
            </Col>

            {form.dataType === 'SINGLE_SELECT' && (
              <Col md={12}>
                <Form.Label className="d-block">Seçenekler</Form.Label>
                {form.options.map((opt, index) => (
                  <div key={index} className="d-flex gap-2 mb-2">
                    <Form.Control
                      value={opt.label}
                      onChange={(e) => updateOptionLabel(index, e.target.value)}
                      placeholder="Seçenek etiketi"
                    />
                    <Button
                      type="button"
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeOption(index)}
                      disabled={form.options.length <= 1}
                    >
                      Sil
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline-primary" size="sm" onClick={addOption}>
                  + Seçenek Ekle
                </Button>
              </Col>
            )}

            <Col md={12} className="d-flex flex-column gap-2">
              <Form.Check
                type="checkbox"
                id="prop-required"
                label="Zorunlu"
                checked={form.isRequired}
                onChange={(e) => setForm((prev) => ({ ...prev, isRequired: e.target.checked }))}
              />
              <Form.Text muted className="ms-4 mt-n2">
                İlan oluşturulurken bu alanın doldurulmasını zorunlu yapar.
              </Form.Text>
              <Form.Check
                type="checkbox"
                id="prop-form-visible"
                label="İlan oluşturma formunda göster"
                checked={form.isFormVisible}
                onChange={(e) => setForm((prev) => ({ ...prev, isFormVisible: e.target.checked }))}
              />
              <Form.Check
                type="checkbox"
                id="prop-public-visible"
                label="İlan detayında göster"
                checked={form.isPublicVisible}
                onChange={(e) => setForm((prev) => ({ ...prev, isPublicVisible: e.target.checked }))}
              />
              <Form.Check
                type="checkbox"
                id="prop-filterable"
                label="Filtrelerde kullanılabilir"
                checked={form.isFilterable}
                onChange={(e) => setForm((prev) => ({ ...prev, isFilterable: e.target.checked }))}
              />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setFormOpen(false)}>Vazgeç</Button>
          <Button variant="primary" disabled={submitting} onClick={() => void handleSave()}>
            {submitting ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
