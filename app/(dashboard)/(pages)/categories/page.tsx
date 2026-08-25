"use client";
import { categoryService } from "@/services";
import { PageHeading } from "@/widgets";
import { useState, ReactNode, useEffect, useCallback } from "react";
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

  // Delete Confirmation Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<any>(null);
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

  const handleNameChange = (val: string) => {
    setCategoryName(val);
    setSlug(slugify(val));
  };

  const openCreateModal = () => {
    setModalMode("create");
    setSelectedNode(null);
    setCategoryName("");
    setSlug("");
    setFormModalOpen(true);
  };

  const openAddChildModal = (rowInfo: GenerateNodePropsParams) => {
    setModalMode("addChild");
    setSelectedNode(rowInfo.node);
    setCategoryName("");
    setSlug("");
    setFormModalOpen(true);
  };

  const openEditModal = (rowInfo: GenerateNodePropsParams) => {
    const node = rowInfo.node;
    setModalMode("edit");
    setSelectedNode(node);
    setCategoryName(node.name || "");
    setSlug(node.slug || "");
    setFormModalOpen(true);
  };

  const openDeleteModal = (rowInfo: GenerateNodePropsParams) => {
    setNodeToDelete(rowInfo.node);
    setDeleteModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.warning("Lütfen kategori adı girin.");
      return;
    }

    setSubmitting(true);
    let finalSlug = slug.trim() || slugify(categoryName);

    try {
      if (modalMode === "create") {
        await categoryService.save({
          name: categoryName,
          slug: finalSlug,
          status: EntityStatusEnum.ACTIVE,
        });
        toast.success("Kategori başarıyla eklendi");
      } else if (modalMode === "addChild") {
        await categoryService.save({
          name: categoryName,
          slug: finalSlug,
          parentId: selectedNode?.identifier,
          status: EntityStatusEnum.ACTIVE,
        });
        toast.success("Alt kategori başarıyla eklendi");
      } else if (modalMode === "edit") {
        await categoryService.update({
          identifier: selectedNode?.identifier,
          expectedVersion: selectedNode?.version ?? 0,
          name: categoryName,
          slug: finalSlug,
          status: EntityStatusEnum.ACTIVE,
        });
        toast.success("Kategori güncellendi");
      }

      setFormModalOpen(false);
      refetch();
    } catch (error: any) {
      const errMsg = getErrorMessage(error);
      if (errMsg.includes("zaten mevcut") || error?.response?.status === 409) {
        const uniqueSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
        try {
          if (modalMode === "create") {
            await categoryService.save({
              name: categoryName,
              slug: uniqueSlug,
              status: EntityStatusEnum.ACTIVE,
            });
          } else if (modalMode === "addChild") {
            await categoryService.save({
              name: categoryName,
              slug: uniqueSlug,
              parentId: selectedNode?.identifier,
              status: EntityStatusEnum.ACTIVE,
            });
          }
          toast.success('Kategori başarıyla eklendi. Bağlantı adresi otomatik oluşturuldu.');
          setFormModalOpen(false);
          refetch();
          return;
        } catch (retryErr) {
          toast.error(getErrorMessage(retryErr));
        }
      } else {
        toast.error(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  function collectAllNodesToDelete(node: any): { identifier: string; version: number }[] {
    if (!node || !node.identifier) return [];
    const list: { identifier: string; version: number }[] = [
      { identifier: node.identifier, version: node.version ?? 1 },
    ];
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        list.push(...collectAllNodesToDelete(child));
      }
    }
    return list;
  }

  const handleConfirmDelete = async () => {
    if (!nodeToDelete?.identifier) return;
    setSubmitting(true);
    try {
      const nodesToDelete = collectAllNodesToDelete(nodeToDelete);
      for (const item of nodesToDelete) {
        await categoryService.hardDelete(item.identifier);
      }
      toast.success(
        nodesToDelete.length > 1
          ? `Kategori ve bağlı ${nodesToDelete.length - 1} alt kategori veritabanından kalıcı olarak silindi.`
          : "Kategori veritabanından kalıcı olarak silindi."
      );
      setDeleteModalOpen(false);
      setNodeToDelete(null);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

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

  async function hardDeleteNode(rowInfo: GenerateNodePropsParams) {
    const { node } = rowInfo;
    if (!node || !node.identifier) return;
    if (
      !window.confirm(
        `"${node.name}" kategorisini ve altındaki tüm özellikleri VERİTABANINDAN KALICI OLARAK silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`
      )
    ) {
      return;
    }
    setSubmitting(true);
    try {
      await categoryService.hardDelete(node.identifier);
      toast.success(`"${node.name}" kategorisi veritabanından kalıcı olarak silindi.`);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
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
                          <div className="d-flex align-items-center gap-1">
                            <Button
                              size="sm"
                              variant="success"
                              className="py-0 px-2 fw-semibold"
                              title="Tekrar Aktif Et"
                              onClick={() => restoreNode(rowInfo)}
                            >
                              <i className="fe fe-refresh-cw me-1"></i> Geri Yükle
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              className="py-0 px-2 fw-semibold"
                              title="Veritabanından Kalıcı Olarak Sil"
                              onClick={() => hardDeleteNode(rowInfo)}
                            >
                              <i className="fe fe-trash-2 me-1"></i> Kalıcı Sil
                            </Button>
                          </div>
                        )}
                      </div>,
                    ],
                    title: (
                      <span>
                        <strong className="text-dark">{rowInfo.node.name}</strong>
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
            {modalMode === "create" && "Yeni Ana Kategori"}
            {modalMode === "addChild" && `Alt Kategori Ekle (${selectedNode?.name})`}
            {modalMode === "edit" && `Kategoriyi Düzenle (${selectedNode?.name})`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-3">
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Kategori Adı</Form.Label>
            <Form.Control
              value={categoryName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Örn: İngiliz Atları"
              autoFocus
            />
          </Form.Group>

          <Form.Text muted className="d-block mb-3">
            Kategori bağlantısı addan otomatik oluşturulur.
          </Form.Text>

          {(modalMode === "create" || modalMode === "addChild") && (
            <Form.Text muted className="d-block mb-3">
              Yeni kategori ilgili kardeş listesinin sonuna eklenir. Sıra ağaç sürükle-bırak ile düzenlenir.
            </Form.Text>
          )}
          {modalMode === "edit" && (
            <Form.Text muted className="d-block mb-3">
              Sıra ağaçta sürükle-bırak ile düzenlenir.
            </Form.Text>
          )}
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

      {/* POPUP / ANIMATED MODAL: Delete Confirmation */}
      <Modal show={deleteModalOpen} onHide={() => setDeleteModalOpen(false)} centered animation>
        <Modal.Body className="text-center p-4">
          <div className="icon-shape icon-xl bg-light-danger text-danger rounded-circle mx-auto mb-3 p-3" style={{ width: '64px', height: '64px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
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
                    Bu kategorinin altında <strong>{nodeToDelete.children.length} adet alt kategori</strong> bulunmaktadır. Bu ana kategoriyi silerseniz bağlı olan tüm alt kategoriler de veritabanından kalıcı olarak silinecektir.
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="d-flex gap-2 justify-content-center mt-3">
            <Button variant="light" className="w-50" onClick={() => setDeleteModalOpen(false)}>
              Vazgeç
            </Button>
            <Button variant="danger" className="w-50 fw-semibold" disabled={submitting} onClick={handleConfirmDelete}>
              {submitting ? "Siliniyor..." : "Evet, Tümünü Sil"}
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {propertiesNode?.identifier && (
        <CategoryPropertiesModal
          categoryId={propertiesNode.identifier}
          categoryName={String(propertiesNode.name ?? '')}
          onClose={() => setPropertiesNode(null)}
        />
      )}
    </Container>
  );
}
