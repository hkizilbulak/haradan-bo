"use client";
import { categoryService } from "@/services";
import { PageHeading } from "@/widgets";
import { useState, ReactNode, useEffect, useCallback, useMemo } from "react";
import { Alert, Col, Form, Row, Container, Button, Pagination, Badge, Modal, Card, Spinner } from "react-bootstrap";
import SortableTree, {
  toggleExpandedForAll,
  GetTreeItemChildrenFn,
} from "@nosferatu500/react-sortable-tree";
import { CategoryRequest, CategoryResponse } from "@/models";
import useApi from "@/hooks/useApi";
import { SearchParams } from "@/models/common";
import { EntityStatusEnum } from "@/models/enums";
import { getErrorMessage } from "@/helpers/HelperUtils";
import { toast } from "react-toastify";
import CategoryPropertiesModal from "@/widgets/category/CategoryPropertiesModal";

type GenerateNodePropsParams = {
  node: any;
  parentNode?: any;
  path: number[];
  treeIndex: number;
  lowerSiblingCounts: number[];
  isSearchMatch: boolean;
  isSearchFocus: boolean;
};

type OnMoveNodeParams = {
  treeData: any[];
  node: any;
  nextParentNode: any;
  prevPath: number[];
  prevTreeIndex: number;
  nextPath: number[];
  nextTreeIndex: number;
};

type TreeItem = {
  identifier?: string;
  name?: ReactNode;
  slug?: ReactNode;
  sortOrder?: ReactNode;
  version?: number;
  status?: string;
  expanded?: boolean;
  children?: TreeItem[] | GetTreeItemChildrenFn;
  [x: string]: any;
};

type FlatCategoryOption = {
  identifier: string;
  name: string;
  level: number;
  slug?: string;
};

function flattenCategoryTree(
  nodes: TreeItem[],
  level = 0,
  excludeIds: Set<string> = new Set()
): FlatCategoryOption[] {
  const result: FlatCategoryOption[] = [];
  for (const node of nodes) {
    if (!node.identifier) continue;
    if (excludeIds.has(node.identifier)) continue;
    if (
      node.slug === "ortak-alanlar" ||
      node.identifier === "c1000000-0000-4000-8000-000000000000"
    ) {
      continue;
    }

    result.push({
      identifier: node.identifier,
      name: String(node.name ?? "Kategori"),
      level,
      slug: String(node.slug ?? ""),
    });

    if (node.children && Array.isArray(node.children)) {
      result.push(
        ...flattenCategoryTree(node.children as TreeItem[], level + 1, excludeIds)
      );
    }
  }
  return result;
}

function collectAllNodesToDelete(node: any): { identifier: string; name: string; version: number }[] {
  if (!node || !node.identifier) return [];
  const list: { identifier: string; name: string; version: number }[] = [
    {
      identifier: node.identifier,
      name: String(node.name ?? 'Kategori'),
      version: node.version ?? 1,
    },
  ];
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      list.push(...collectAllNodesToDelete(child));
    }
  }
  return list;
}

function collectAllNodesToRestore(node: any): { identifier: string; version: number }[] {
  if (!node || !node.identifier) return [];
  const list: { identifier: string; version: number }[] = [
    { identifier: node.identifier, version: node.version ?? 1 },
  ];
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      list.push(...collectAllNodesToRestore(child));
    }
  }
  return list;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function Categories() {
  const [showDeleted, setShowDeleted] = useState(false);

  // Modal States
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "addChild" | "edit">("create");
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Form Fields
  const [categoryName, setCategoryName] = useState("");
  const [slug, setSlug] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [description, setDescription] = useState("");

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<any>(null);
  const [checkingAdverts, setCheckingAdverts] = useState(false);
  const [advertConflicts, setAdvertConflicts] = useState<{ identifier: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [propertiesNode, setPropertiesNode] = useState<any>(null);

  const searchParams = {
    filter: showDeleted ? "" : "status==ACTIVE",
    pageRequest: {
      page: 0,
      size: 100,
      sort: [{ direction: "ASC", property: "name" }],
    },
  } as SearchParams<CategoryResponse>;

  const [{ data, isLoading, isError, refetch }] = useApi<CategoryResponse>({
    service: categoryService,
    params: searchParams,
  });

  const [searchString, setSearchString] = useState("");
  const [searchFocusIndex, setSearchFocusIndex] = useState<number>(0);
  const [searchFoundCount, setSearchFoundCount] = useState<number>(0);
  const [treeData, setTreeData] = useState<TreeItem[]>([]);

  useEffect(() => {
    // Sayfa açıldığında ortak alanların backend'de tam ve eksiksiz olduğunu doğrula
    void categoryService.ensureGlobalCategory();
  }, []);

  const handleNameChange = (val: string) => {
    setCategoryName(val);
    setSlug(slugify(val));
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedNode(null);
    setSelectedParentId("");
    setCategoryName("");
    setSlug("");
    setDescription("");
    setFormModalOpen(true);
  };

  const openAddChildModal = (rowInfo: GenerateNodePropsParams) => {
    setModalMode("addChild");
    setSelectedNode(rowInfo.node);
    setSelectedParentId(String(rowInfo.node.identifier || ""));
    setCategoryName("");
    setSlug("");
    setDescription("");
    setFormModalOpen(true);
  };

  const openEditModal = (rowInfo: GenerateNodePropsParams) => {
    const node = rowInfo.node;
    setModalMode("edit");
    setSelectedNode(node);
    setSelectedParentId(node.parentId ? String(node.parentId) : "");
    setCategoryName(node.name || "");
    setSlug(node.slug || "");
    setDescription(node.description || "");
    setFormModalOpen(true);
  };

  const openDeleteModal = (rowInfo: GenerateNodePropsParams) => {
    setNodeToDelete(rowInfo.node);
    setAdvertConflicts([]);
    setDeleteModalOpen(true);
  };

  const availableParentOptions = useMemo(() => {
    if (!treeData || treeData.length === 0) return [];
    const excludeIds = new Set<string>();
    if (modalMode === "edit" && selectedNode?.identifier) {
      const descendants = collectAllNodesToDelete(selectedNode);
      descendants.forEach((d) => excludeIds.add(d.identifier));
    }
    return flattenCategoryTree(treeData, 0, excludeIds);
  }, [treeData, modalMode, selectedNode]);

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.warning("Lütfen kategori adı girin.");
      return;
    }

    setSubmitting(true);
    const finalSlug = slug.trim() || slugify(categoryName);
    const parentId = selectedParentId.trim() || undefined;

    try {
      if (modalMode === "create" || modalMode === "addChild") {
        await categoryService.save({
          name: categoryName.trim(),
          slug: finalSlug,
          parentId: parentId,
          description: description.trim() || undefined,
          status: EntityStatusEnum.ACTIVE,
        });
        toast.success(
          parentId
            ? "Alt kategori başarıyla eklendi."
            : "Yeni Ana (Root) Kategori başarıyla eklendi."
        );
      } else if (modalMode === "edit") {
        const currentParentId = selectedNode?.parentId ? String(selectedNode.parentId) : undefined;
        let currentVersion = selectedNode?.version ?? 1;

        // 1. Üst kategori değiştirildiyse reparent işlemi yap
        if (parentId !== currentParentId) {
          const newVer = await categoryService.reparent(
            selectedNode.identifier,
            currentVersion,
            parentId
          );
          if (typeof newVer === "number") {
            currentVersion = newVer;
          }
        }

        // 2. Kategori detaylarını güncelle
        await categoryService.update({
          identifier: selectedNode?.identifier,
          expectedVersion: currentVersion,
          name: categoryName.trim(),
          slug: finalSlug,
          description: description.trim() || undefined,
          status: EntityStatusEnum.ACTIVE,
        });
        toast.success("Kategori başarıyla güncellendi.");
      }

      setFormModalOpen(false);
      refetch();
    } catch (error: any) {
      const errMsg = getErrorMessage(error);
      if (errMsg.includes("zaten mevcut") || error?.response?.status === 409) {
        const uniqueSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
        try {
          if (modalMode === "create" || modalMode === "addChild") {
            await categoryService.save({
              name: categoryName.trim(),
              slug: uniqueSlug,
              parentId: parentId,
              description: description.trim() || undefined,
              status: EntityStatusEnum.ACTIVE,
            });
            toast.success('Kategori başarıyla eklendi. Bağlantı adresi otomatik oluşturuldu.');
            setFormModalOpen(false);
            refetch();
            return;
          }
        } catch (retryErr) {
          toast.error(getErrorMessage(retryErr));
        }
      }
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!nodeToDelete?.identifier) return;
    setSubmitting(true);
    setCheckingAdverts(true);
    setAdvertConflicts([]);
    try {
      const nodesToDelete = collectAllNodesToDelete(nodeToDelete);

      // 1. Kategori ve tüm alt kategorilerinde aktif (PUBLISHED) ilan kontrolü
      const conflicts = await categoryService.findActiveAdvertConflicts(nodesToDelete);

      if (conflicts.length > 0) {
        setAdvertConflicts(conflicts);
        setCheckingAdverts(false);
        setSubmitting(false);
        return; // Silme işlemi iptal edilir, uyarı ekranı gösterilir
      }

      setCheckingAdverts(false);

      // 2. Aktif ilan yoksa silme işlemine devam et
      for (const item of nodesToDelete) {
        await categoryService._delete(item.identifier, item.version);
      }
      toast.info(
        nodesToDelete.length > 1
          ? `Kategori ve bağlı ${nodesToDelete.length - 1} alt kategori başarıyla silindi (pasife alındı).`
          : "Kategori silindi (pasife alındı)."
      );
      setDeleteModalOpen(false);
      setNodeToDelete(null);
      setAdvertConflicts([]);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
      setCheckingAdverts(false);
    }
  };

  async function restoreNode(rowInfo: GenerateNodePropsParams) {
    const { node } = rowInfo;
    try {
      const nodesToRestore = collectAllNodesToRestore(node);
      for (const item of nodesToRestore) {
        await categoryService.activate(item.identifier, item.version);
      }
      toast.success(
        nodesToRestore.length > 1
          ? `Kategori ve bağlı ${nodesToRestore.length - 1} alt kategori tekrar aktif edildi.`
          : "Kategori tekrar aktif edildi."
      );
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function collectSiblingNodes(tree: TreeItem[], parentId?: string | null): TreeItem[] {
    if (!parentId) {
      return tree;
    }
    const visit = (nodes: TreeItem[]): TreeItem[] | null => {
      for (const item of nodes) {
        if (item.identifier === parentId) {
          return Array.isArray(item.children) ? (item.children as TreeItem[]) : [];
        }
        if (Array.isArray(item.children)) {
          const found = visit(item.children as TreeItem[]);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };
    return visit(tree) ?? [];
  }

  async function moveNode(rowInfo: OnMoveNodeParams) {
    if (moving) {
      return;
    }

    const { node, nextParentNode, treeData: movedTree } = rowInfo;
    const nextParentId = nextParentNode?.identifier as string | undefined;
    const previousParentId = (node.parentId as string | undefined) || undefined;
    const parentChanged = (previousParentId || undefined) !== (nextParentId || undefined);

    setMoving(true);
    try {
      let movedVersion = Math.max(1, node.version ?? 1);

      if (parentChanged) {
        const reparentVersion = await categoryService.reparent(
          node.identifier,
          movedVersion,
          nextParentId,
        );
        if (typeof reparentVersion === 'number') {
          movedVersion = reparentVersion;
        }
      }

      const siblings = collectSiblingNodes(
        Array.isArray(movedTree) && movedTree.length > 0 ? movedTree : treeData,
        nextParentId,
      );

      const items = siblings
        .filter((sibling) => Boolean(sibling.identifier))
        .map((sibling, index) => ({
          id: String(sibling.identifier),
          expectedVersion:
            sibling.identifier === node.identifier
              ? movedVersion
              : Math.max(1, sibling.version ?? 1),
          sortOrder: index,
        }));

      if (items.length > 0) {
        await categoryService.reorderCategories(items);
      }

      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
      refetch();
    } finally {
      setMoving(false);
    }
  }

  function expand(expanded: boolean) {
    setTreeData(
      toggleExpandedForAll({
        treeData,
        expanded,
      })
    );
  }

  const selectPrevMatch = () => {
    setSearchFocusIndex(
      searchFocusIndex !== null
        ? (searchFoundCount + searchFocusIndex - 1) % searchFoundCount
        : searchFoundCount - 1
    );
  };

  const selectNextMatch = () => {
    setSearchFocusIndex(
      searchFocusIndex !== null ? (searchFocusIndex + 1) % searchFoundCount : 0
    );
  };

  const prepareNodes = useCallback((category: CategoryResponse, parentId?: string) => {
    const childrenData: any = category.children?.map((childCategory) => {
      return prepareNodes(childCategory, category.identifier);
    });

    return {
      identifier: category.identifier,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder,
      version: category.version,
      status: category.status,
      parentId: parentId ?? category.parentId,
      children: childrenData,
      expanded: true,
    } as TreeItem;
  }, []);

  useEffect(() => {
    const categoryTreeData = data?.content?.map((category) => {
      return prepareNodes(category);
    });
    setTreeData(categoryTreeData || []);
  }, [data, prepareNodes]);

  const totalCount = data?.page?.totalElements || treeData.length;

  return (
    <Container fluid className="px-6 py-4">
      {/* Top Header Card — Styled exactly like kartezya-hr-fe-main */}
      <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '16px', backgroundColor: '#ffffff' }}>
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="d-flex align-items-center gap-2">
              <div className="d-flex align-items-center justify-content-center rounded-3" style={{ width: '36px', height: '36px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                <i className="fe fe-folder fs-4"></i>
              </div>
              <div>
                <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '16px', letterSpacing: '-0.2px' }}>
                  Kategoriler
                </h5>
                <small className="text-muted">Kategorileri ekleyebilir, sürükleyerek alt kategori yapabilir veya düzenleyebilirsiniz.</small>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Badge bg="indigo" style={{ backgroundColor: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', fontSize: '12px', fontWeight: 600, padding: '8px 14px', borderRadius: '50rem' }}>
                <i className="fe fe-layers me-1"></i> Toplam {totalCount} Kategori
              </Badge>
              <Button variant="primary" className="fw-semibold d-flex align-items-center gap-2" onClick={openCreateModal}>
                <i className="fe fe-plus"></i>
                Yeni Kategori Ekle
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Global / Ortak İlan Alanları Card */}
      <Card
        className="border-0 shadow-sm mb-4"
        style={{
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)',
          borderLeft: '5px solid #6366f1',
        }}
      >
        <Card.Body className="p-3 p-md-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center justify-content-center rounded-3 shadow-sm flex-shrink-0"
                style={{
                  width: '44px',
                  height: '44px',
                  backgroundColor: '#6366f1',
                  color: '#ffffff',
                }}
              >
                <i className="fe fe-globe fs-4"></i>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <h6 className="mb-0 fw-bold text-dark" style={{ fontSize: '15px' }}>
                    Ortak İlan Alanları (Tüm İlanlarda Geçerli)
                  </h6>
                  <Badge bg="primary" style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px' }}>
                    Genel Alanlar
                  </Badge>
                </div>
                <small className="text-muted">
                  Açık Adres ve tüm ilan kategorilerinde ortak kullanılan alanları buradan yönetebilir, zorunluluğunu değiştirebilir veya kaldırabilirsiniz.
                </small>
              </div>
            </div>
            <Button
              variant="outline-primary"
              className="fw-semibold d-flex align-items-center gap-2 flex-shrink-0"
              style={{ borderRadius: '10px' }}
              onClick={async () => {
                const realId = await categoryService.ensureGlobalCategory();
                setPropertiesNode({
                  identifier: realId || 'c1000000-0000-4000-8000-000000000000',
                  name: 'Ortak Alanlar (Tüm İlanlar)',
                });
              }}
            >
              <i className="fe fe-sliders"></i>
              Ortak Alanları Yönet (Açık Adres vb.)
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Main Tree Card */}
      <Card className="border-0 shadow-sm" style={{ borderRadius: '16px' }}>
        <Card.Body className="p-4">
          <Row className="mb-3 align-items-center">
            <Col lg={4} md={6} sm={12}>
              <Form.Group className="mb-2 mb-lg-0">
                <Form.Control
                  name="searchString"
                  value={searchString}
                  onChange={(event) => setSearchString(event.target.value)}
                  placeholder="Kategori ağacında ara..."
                />
              </Form.Group>
            </Col>
            <Col lg={8} md={6} sm={12} className="d-flex justify-content-lg-end align-items-center gap-2 flex-wrap">
              {(treeData?.length ?? 0) > 0 && (
                <>
                  <Pagination className="mb-0 me-2">
                    <Pagination.First disabled={!searchFoundCount} onClick={selectPrevMatch} />
                    <Pagination.Last disabled={!searchFoundCount} onClick={selectNextMatch} />
                  </Pagination>
                  {searchFoundCount > 0 && (
                    <span className="small text-muted me-3">
                      {searchFocusIndex + 1} / {searchFoundCount}
                    </span>
                  )}
                  <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => expand(true)}>
                    <i className="fe fe-chevron-down me-1" /> Tümünü Aç
                  </Button>
                  <Button size="sm" variant="outline-secondary" className="me-3" onClick={() => expand(false)}>
                    <i className="fe fe-chevron-up me-1" /> Tümünü Kapa
                  </Button>
                </>
              )}
              <Form.Check
                type="switch"
                id="show-deleted-switch-main"
                label="Silinmiş Kategorileri Göster"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="mb-0"
              />
            </Col>
          </Row>

          <hr className="my-3" style={{ borderColor: '#f1f5f9' }} />

          {!isLoading && isError && (
            <Alert variant="danger" className="d-flex justify-content-between align-items-center">
              <span>Kategoriler yüklenemedi. Güncel kayıtlar alınmadan düzenleme yapılamaz.</span>
              <Button size="sm" variant="outline-danger" onClick={() => refetch()}>Tekrar Dene</Button>
            </Alert>
          )}

          <div style={{ height: "62vh" }}>
            {isLoading && (
              <div className="p-5 text-center">
                <Spinner animation="border" role="status" variant="primary" />
              </div>
            )}
            {!isLoading && !isError && treeData && treeData.length > 0 ? (
              <SortableTree
                treeData={treeData}
                onChange={(nextTreeData) => setTreeData(nextTreeData)}
                onMoveNode={(movedData) => moveNode(movedData)}
                searchQuery={searchString}
                searchFocusOffset={searchFocusIndex}
                searchFinishCallback={(matches) => {
                  setSearchFoundCount(matches.length);
                  setSearchFocusIndex(
                    matches.length > 0 ? searchFocusIndex % matches.length : 0
                  );
                }}
                searchMethod={({ node, searchQuery }) => {
                  if (!searchQuery) return false;
                  const q = searchQuery.toLowerCase().trim();
                  const nameStr = node.name ? String(node.name).toLowerCase() : "";
                  const slugStr = node.slug ? String(node.slug).toLowerCase() : "";
                  return nameStr.includes(q) || slugStr.includes(q);
                }}
                canDrag={({ node }) => !moving && !node.dragDisabled}
                generateNodeProps={(rowInfo) => {
                  const isDeleted = rowInfo.node.status === EntityStatusEnum.DELETED;
                  return {
                    buttons: [
                      <div key={`${rowInfo.node.identifier ?? rowInfo.treeIndex}-actions`} className="d-flex align-items-center gap-1">
                        {!isDeleted ? (
                          <>
                            <Button
                              size="sm"
                              variant="light"
                              className="p-1 px-2 text-success border-0 bg-light-success rounded-2"
                              title="Alt Kategori Ekle (+)"
                              onClick={() => openAddChildModal(rowInfo)}
                            >
                              <i className="fe fe-plus-square"></i>
                            </Button>
                            <Button
                              size="sm"
                              variant="light"
                              className="p-1 px-2 text-info border-0 bg-light rounded-2"
                              title="Özellikler"
                              onClick={() => setPropertiesNode(rowInfo.node)}
                            >
                              <i className="fe fe-list"></i>
                            </Button>
                            <Button
                              size="sm"
                              variant="light"
                              className="p-1 px-2 text-primary border-0 bg-light-primary rounded-2"
                              title="Düzenle"
                              onClick={() => openEditModal(rowInfo)}
                            >
                              <i className="fe fe-edit"></i>
                            </Button>
                            <Button
                              size="sm"
                              variant="light"
                              className="p-1 px-2 text-danger border-0 bg-light-danger rounded-2"
                              title="Sil (Pasife Al)"
                              onClick={() => openDeleteModal(rowInfo)}
                            >
                              <i className="fe fe-trash-2"></i>
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="success"
                            className="py-0 px-2 fw-semibold"
                            title="Tekrar Aktif Et"
                            onClick={() => restoreNode(rowInfo)}
                          >
                            <i className="fe fe-refresh-cw me-1"></i> Geri Yükle
                          </Button>
                        )}
                      </div>,
                    ],
                    title: (
                      <span className="d-flex align-items-center gap-2">
                        <strong className="text-dark">{rowInfo.node.name}</strong>
                        {rowInfo.node.slug === 'ortak-alanlar' || rowInfo.node.identifier === 'c1000000-0000-4000-8000-000000000000' ? (
                          <Badge bg="primary" style={{ fontSize: '10px', padding: '3px 6px' }}>
                            <i className="fe fe-globe me-1"></i> Tüm İlanlarda Ortak
                          </Badge>
                        ) : null}
                        {isDeleted && <Badge bg="danger" className="ms-2">Silinmiş / Pasif</Badge>}
                      </span>
                    ),
                    subtitle: isDeleted ? 'Pasif kategori' : undefined,
                    style: {
                      height: "52px",
                      opacity: isDeleted ? 0.55 : 1,
                    },
                  };
                }}
              />
            ) : !isLoading && !isError && (
              <div className="p-5 text-center text-muted border rounded-3 bg-light">
                <i className="fe fe-folder fs-1 mb-2 d-block text-secondary"></i>
                Henüz kategori bulunmuyor. İlk kategoriyi ekleyin.
              </div>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* POPUP / ANIMATED MODAL: Category Form (Create / Add Child / Edit) */}
      <Modal show={formModalOpen} onHide={() => setFormModalOpen(false)} centered animation>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold">
            {modalMode === "create" && (selectedParentId ? "Yeni Kategori Ekle" : "Yeni Ana Kategori Ekle")}
            {modalMode === "addChild" && `Alt Kategori Ekle (${selectedNode?.name})`}
            {modalMode === "edit" && `Kategoriyi Düzenle (${selectedNode?.name})`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-3">
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">
              Kategori Adı <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              value={categoryName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Örn: Satılık Atlar veya Yarış Atı"
              autoFocus
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Üst Kategori (Parent)</Form.Label>
            <Form.Select
              value={selectedParentId}
              onChange={(e) => setSelectedParentId(e.target.value)}
            >
              <option value="">-- Yok (Ana / Root Kategori) --</option>
              {availableParentOptions.map((opt) => (
                <option key={opt.identifier} value={opt.identifier}>
                  {opt.level > 0 ? `${'\u00A0\u00A0'.repeat(opt.level)}↳ ` : ''}
                  {opt.name}
                </option>
              ))}
            </Form.Select>
            <Form.Text muted className="small">
              {selectedParentId === ""
                ? "Bu kategori en üst seviyede bağımsız bir Ana (Root) Kategori olarak oluşturulur."
                : "Seçilen üst kategorinin altına alt kategori olarak eklenir/taşınır."}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold text-muted small">Kategori Bağlantısı (Slug)</Form.Label>
            <Form.Control
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="Otomatik oluşturulur..."
              size="sm"
            />
            <Form.Text muted className="small">
              Boş bırakılırsa kategori adından otomatik üretilir.
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label className="fw-semibold text-muted small">Açıklama (İsteğe Bağlı)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kategori hakkında kısa açıklama..."
              size="sm"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="outline-secondary" onClick={() => setFormModalOpen(false)}>
            Vazgeç
          </Button>
          <Button variant="primary" className="fw-semibold" disabled={submitting} onClick={handleSaveCategory}>
            {submitting ? "Kaydediliyor..." : modalMode === "edit" ? "Güncelle" : "Kaydet ve Ekle"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* POPUP / ANIMATED MODAL: Delete Confirmation & Advert Conflict Warning */}
      <Modal
        show={deleteModalOpen}
        onHide={() => {
          if (!submitting) {
            setDeleteModalOpen(false);
            setAdvertConflicts([]);
          }
        }}
        centered
        animation
      >
        <Modal.Body className="text-center p-4">
          {advertConflicts.length > 0 ? (
            <div>
              <div
                className="icon-shape icon-xl bg-light-danger text-danger rounded-circle mx-auto mb-3 p-3"
                style={{ width: '64px', height: '64px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <i className="fe fe-slash fs-1"></i>
              </div>
              <h4 className="fw-bold mb-2 text-danger">Silme İşlemi Engellendi</h4>
              <p className="text-muted small mb-3">
                Bu kategori veya bağlı alt kategorilerinde <strong>yayında olan aktif ilanlar</strong> bulunmaktadır. İlanı bulunan kategoriler silinemez (pasife alınamaz).
              </p>

              <div className="alert alert-danger text-start border-danger p-3 mb-3 rounded-3" style={{ backgroundColor: '#fff5f5' }}>
                <div className="d-flex gap-2">
                  <i className="fe fe-alert-circle text-danger fs-4 flex-shrink-0 mt-1"></i>
                  <div>
                    <strong className="text-danger d-block mb-1">Aktif İlan Bulunan Kategoriler:</strong>
                    <ul className="mb-0 ps-3 small text-dark">
                      {advertConflicts.map((c) => (
                        <li key={c.identifier} className="fw-semibold">
                          {c.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <p className="small text-muted mb-4">
                Kategoriyi silebilmek için önce bu kategorilerdeki ilanları yayından kaldırın, pasife alın veya başka bir kategoriye taşıyın.
              </p>

              <Button
                variant="primary"
                className="w-100 fw-semibold"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setAdvertConflicts([]);
                  setNodeToDelete(null);
                }}
              >
                Anladım, Kapat
              </Button>
            </div>
          ) : (
            <div>
              <div
                className="icon-shape icon-xl bg-light-danger text-danger rounded-circle mx-auto mb-3 p-3"
                style={{ width: '64px', height: '64px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <i className="fe fe-alert-triangle fs-1"></i>
              </div>
              <h4 className="fw-bold mb-2">Kategoriyi Sil?</h4>
              <p className="text-muted small mb-3">
                <strong>&quot;{nodeToDelete?.name}&quot;</strong> kategorisini silmek (pasife almak) istediğinizden emin misiniz?
              </p>

              {/* Sub-categories warning if node has children */}
              {nodeToDelete?.children && nodeToDelete.children.length > 0 && (
                <div className="alert alert-warning text-start border-warning p-3 mb-4 rounded-3" style={{ backgroundColor: '#fffbe6' }}>
                  <div className="d-flex gap-2">
                    <i className="fe fe-alert-circle text-warning fs-4 flex-shrink-0 mt-1"></i>
                    <div>
                      <strong className="text-warning-emphasis d-block mb-1">Dikkat: Alt kategoriler de silinecek</strong>
                      <span className="small text-dark-emphasis">
                        Bu kategorinin altında <strong>{nodeToDelete.children.length} adet alt kategori</strong> bulunmaktadır. Bu ana kategoriyi silerseniz bağlı olan tüm alt kategoriler de otomatik olarak silinecektir (pasife alınacaktır).
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="d-flex gap-2 justify-content-center mt-3">
                <Button
                  variant="light"
                  className="w-50"
                  disabled={submitting}
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setAdvertConflicts([]);
                  }}
                >
                  Vazgeç
                </Button>
                <Button
                  variant="danger"
                  className="w-50 fw-semibold"
                  disabled={submitting}
                  onClick={handleConfirmDelete}
                >
                  {checkingAdverts ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      İlanlar Kontrol Ediliyor...
                    </>
                  ) : submitting ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Siliniyor...
                    </>
                  ) : (
                    "Evet, Tümünü Sil"
                  )}
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {propertiesNode?.identifier && (
        <CategoryPropertiesModal
          categoryId={propertiesNode.identifier}
          categoryName={String(propertiesNode.name ?? '')}
          parentId={propertiesNode.parentId ? String(propertiesNode.parentId) : undefined}
          onClose={() => setPropertiesNode(null)}
        />
      )}
    </Container>
  );
}
