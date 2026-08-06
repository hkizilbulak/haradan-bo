"use client";
import { categoryService } from "@/services";
import { PageHeading } from "@/widgets";
import { useState, useRef, ReactNode, useEffect, useCallback } from "react";
import { Col, Form, Row, Container, Button, Pagination, Badge } from "react-bootstrap";
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
  const [categoryName, setCategoryName] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState("");

  const searchParams = {
    filter: showDeleted ? "" : "status==ACTIVE",
    pageRequest: {
      page: 0,
      size: 100,
      sort: [{ direction: "ASC", property: "name" }],
    },
  } as SearchParams<CategoryResponse>;

  const [{ data, refetch }] = useApi<CategoryResponse>({
    service: categoryService,
    params: searchParams,
  });

  const [searchString, setSearchString] = useState("");
  const [searchFocusIndex, setSearchFocusIndex] = useState<number>(0);
  const [searchFoundCount, setSearchFoundCount] = useState<number>(0);
  const [treeData, setTreeData] = useState<TreeItem[]>([]);

  const handleNameChange = (val: string) => {
    setCategoryName(val);
    if (!slug || slug === slugify(categoryName)) {
      setSlug(slugify(val));
    }
  };

  function initializeInputs() {
    setCategoryName("");
    setSlug("");
    setSortOrder("");
  }

  function buildRequest(node?: any, overrideSlug?: string): CategoryRequest {
    const finalSlug = overrideSlug || slug || slugify(categoryName);
    const orderNum = sortOrder !== "" ? Number(sortOrder) : undefined;

    return {
      identifier: node?.identifier,
      expectedVersion: node?.version,
      name: categoryName,
      slug: finalSlug,
      sortOrder: orderNum,
      parentId: node?.parentId,
      status: EntityStatusEnum.ACTIVE,
    };
  }

  async function createNode() {
    if (!categoryName.trim()) {
      toast.warning("Lütfen kategori adı girin.");
      return;
    }

    let finalSlug = slug.trim() || slugify(categoryName);
    try {
      await categoryService.save(buildRequest(undefined, finalSlug));
      toast.success("Kategori eklendi.");
      initializeInputs();
      refetch();
    } catch (error: any) {
      const errMsg = getErrorMessage(error);
      if (errMsg.includes("zaten mevcut") || errMsg.includes("Conflict") || error?.response?.status === 409) {
        // Retry automatically with a unique timestamp suffix
        const uniqueSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
        try {
          await categoryService.save(buildRequest(undefined, uniqueSlug));
          toast.success(`Kategori benzersiz slug (${uniqueSlug}) ile eklendi.`);
          initializeInputs();
          refetch();
          return;
        } catch (retryError) {
          toast.error(getErrorMessage(retryError));
        }
      } else {
        toast.error(errMsg);
      }
    }
  }

  async function updateNode(rowInfo: GenerateNodePropsParams) {
    const { node } = rowInfo;
    if (!categoryName.trim()) {
      toast.warning("Lütfen güncellenecek kategori adı girin.");
      return;
    }

    try {
      await categoryService.update(buildRequest(node));
      toast.success("Kategori güncellendi.");
      initializeInputs();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function addNodeChild(rowInfo: GenerateNodePropsParams) {
    const { node } = rowInfo;
    if (!categoryName.trim()) {
      toast.warning("Lütfen alt kategori adı girin.");
      return;
    }

    let finalSlug = slug.trim() || slugify(categoryName);
    try {
      await categoryService.save({
        ...buildRequest(node, finalSlug),
        identifier: undefined,
        parentId: node?.identifier,
      });
      toast.success("Alt kategori eklendi.");
      initializeInputs();
      refetch();
    } catch (error: any) {
      const errMsg = getErrorMessage(error);
      if (errMsg.includes("zaten mevcut") || error?.response?.status === 409) {
        const uniqueSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
        try {
          await categoryService.save({
            ...buildRequest(node, uniqueSlug),
            identifier: undefined,
            parentId: node?.identifier,
          });
          toast.success(`Alt kategori benzersiz slug (${uniqueSlug}) ile eklendi.`);
          initializeInputs();
          refetch();
          return;
        } catch (retryErr) {
          toast.error(getErrorMessage(retryErr));
        }
      } else {
        toast.error(errMsg);
      }
    }
  }

  async function removeNode(rowInfo: GenerateNodePropsParams) {
    const { node } = rowInfo;
    try {
      await categoryService._delete(node.identifier, node.version);
      toast.info("Kategori silindi (pasife alındı).");
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function restoreNode(rowInfo: GenerateNodePropsParams) {
    const { node } = rowInfo;
    try {
      await categoryService.activate(node.identifier, node.version);
      toast.success("Kategori tekrar aktif edildi.");
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function moveNode(rowInfo: OnMoveNodeParams) {
    const { node, nextParentNode } = rowInfo;
    try {
      await categoryService.reparent(node.identifier, node.version, nextParentNode?.identifier);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
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

  const prepareNodes = useCallback((category: CategoryResponse) => {
    const childrenData: any = category.children?.map((childCategory) => {
      return prepareNodes(childCategory);
    });

    return {
      identifier: category.identifier,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder,
      version: category.version,
      status: category.status,
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

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <PageHeading heading="Kategoriler" showCreateButton={false} />
        </Col>
      </Row>
      <Row>
        <Col lg={4} md={12} sm={12}>
          <Form.Group className="mb-3">
            <Form.Label>Kategori Adı</Form.Label>
            <Form.Control
              value={categoryName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Örn: İngiliz Atları"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>
              Slug <small className="text-muted">(Opsiyonel — Otomatik Oluşturulur)</small>
            </Form.Label>
            <Form.Control
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Boş bırakabilirsiniz (örn: ingiliz-atlari)"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Sıra No</Form.Label>
            <Form.Control
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="1"
            />
          </Form.Group>
          <div className="d-flex gap-2 mb-3">
            <Button variant="primary" onClick={createNode}>
              Kategori Ekle
            </Button>
            <Button variant="outline-secondary" onClick={initializeInputs}>
              Temizle
            </Button>
          </div>
          <hr className="my-3" />
          <Form.Check
            type="switch"
            id="show-deleted-switch"
            label="Silinmiş (Pasif) Kategorileri Göster"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
          />
        </Col>
        <Col lg={8} md={12} sm={12}>
          <Form onSubmit={(e) => e.preventDefault()}>
            <div className="d-flex justify-content-start align-items-center mb-3">
              <Form.Group className="me-2">
                <Form.Control
                  name="searchString"
                  value={searchString}
                  onChange={(event) => setSearchString(event.target.value)}
                  placeholder="Ağaçta Ara..."
                />
              </Form.Group>
              <Pagination className="mb-0 me-2">
                <Pagination.First
                  disabled={!searchFoundCount}
                  onClick={selectPrevMatch}
                />
                <Pagination.Last
                  disabled={!searchFoundCount}
                  onClick={selectNextMatch}
                />
              </Pagination>
              <span className="small text-muted me-3">
                {searchFoundCount > 0 ? searchFocusIndex + 1 : 0} / {searchFoundCount || 0}
              </span>
              <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => expand(true)}>
                <i className="fe fe-chevron-down me-1" /> Tümünü Aç
              </Button>
              <Button size="sm" variant="outline-secondary" onClick={() => expand(false)}>
                <i className="fe fe-chevron-up me-1" /> Tümünü Kapa
              </Button>
            </div>
          </Form>
          <div style={{ height: "60vh" }}>
            {treeData && treeData.length > 0 ? (
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
                canDrag={({ node }) => !node.dragDisabled}
                generateNodeProps={(rowInfo) => {
                  const isDeleted = rowInfo.node.status === EntityStatusEnum.DELETED;
                  return {
                    buttons: [
                      <div key={`${rowInfo.node.identifier ?? rowInfo.treeIndex}-actions`}>
                        {!isDeleted ? (
                          <>
                            <i
                              className="fe fe-plus-square me-2 cp text-success"
                              title="Alt Kategori Ekle"
                              onClick={() => addNodeChild(rowInfo)}
                            ></i>
                            <i
                              className="fe fe-edit me-2 cp text-primary"
                              title="Düzenle"
                              onClick={() => updateNode(rowInfo)}
                            ></i>
                            <i
                              className="fe fe-x-square me-2 cp text-danger"
                              title="Sil (Pasife Al)"
                              onClick={() => removeNode(rowInfo)}
                            ></i>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="success"
                            className="py-0 px-2"
                            title="Tekrar Aktif Et"
                            onClick={() => restoreNode(rowInfo)}
                          >
                            Geri Yükle
                          </Button>
                        )}
                      </div>,
                    ],
                    title: (
                      <span>
                        {rowInfo.node.name} <small className="text-muted">({rowInfo.node.slug})</small>
                        {isDeleted && <Badge bg="danger" className="ms-2">Pasif / Silinmiş</Badge>}
                      </span>
                    ),
                    subtitle: `Sıra: ${rowInfo.node.sortOrder ?? 0}`,
                    style: {
                      height: "50px",
                      opacity: isDeleted ? 0.6 : 1,
                    },
                  };
                }}
              />
            ) : (
              <div className="p-5 text-center text-muted border rounded">
                <i className="fe fe-folder fs-1 mb-2 d-block"></i>
                Gösterilecek kategori bulunamadı.
              </div>
            )}
          </div>
        </Col>
      </Row>
    </Container>
  );
}
