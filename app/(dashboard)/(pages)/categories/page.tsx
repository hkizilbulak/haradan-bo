"use client";
import { categoryService } from "@/services";
import { PageHeading } from "@/widgets";
import { useState, useRef, ReactNode, useEffect, useCallback } from "react";
import { Col, Form, Row, Container, Button, Pagination } from "react-bootstrap";
import SortableTree, {
  addNodeUnderParent,
  removeNodeAtPath,
  changeNodeAtPath,
  toggleExpandedForAll,
  FullTree,
  TreeIndex,
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
  expanded?: boolean;
  children?: TreeItem[] | GetTreeItemChildrenFn;
  [x: string]: any;
};

const seed: TreeItem[] = [];

const initialParameters = {
  filter: "status==ACTIVE",
  pageRequest: {
    page: 0,
    size: 50,
    sort: [{ direction: "ASC", property: "name" }],
  },
} as SearchParams<CategoryResponse>;

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
  const [{ data, refetch }] = useApi<CategoryResponse>({
    service: categoryService,
    params: initialParameters,
  });
  const [searchString, setSearchString] = useState("");
  const [searchFocusIndex, setSearchFocusIndex] = useState<number>(0);
  const [searchFoundCount, setSearchFoundCount] = useState<number>(0);
  const [treeData, setTreeData] = useState<TreeItem[]>(seed);

  const categoryNameInputRef = useRef<HTMLInputElement>(null);
  const slugInputRef = useRef<HTMLInputElement>(null);
  const sortOrderInputRef = useRef<HTMLInputElement>(null);

  function getCategoryName() {
    return (categoryNameInputRef.current as any).value;
  }

  function getSlug() {
    return (slugInputRef.current as any).value;
  }

  function getSortOrder() {
    return (sortOrderInputRef.current as any).value;
  }

  function initializeInputs() {
    (categoryNameInputRef.current as any).value = "";
    (slugInputRef.current as any).value = "";
    (sortOrderInputRef.current as any).value = "";
  }

  function buildRequest(node?: any): CategoryRequest {
    const name = getCategoryName();
    const slug = getSlug() || slugify(name);
    const sortOrderText = getSortOrder();
    const sortOrder = sortOrderText !== "" ? Number(sortOrderText) : undefined;

    return {
      identifier: node?.identifier,
      expectedVersion: node?.version,
      name,
      slug,
      sortOrder,
      parentId: node?.parentId,
      status: EntityStatusEnum.ACTIVE,
    };
  }

  async function createNode() {
    const name = getCategoryName();
    if (name === "") {
      (categoryNameInputRef.current as any).focus();
      return;
    }

    try {
      await categoryService.save(buildRequest());
      refetch();
      initializeInputs();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function updateNode(rowInfo: GenerateNodePropsParams) {
    const { node } = rowInfo;
    const name = getCategoryName();
    if (name === "") {
      (categoryNameInputRef.current as any).focus();
      return;
    }

    try {
      await categoryService.update(buildRequest(node));
      refetch();
      initializeInputs();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function addNodeChild(rowInfo: GenerateNodePropsParams) {
    const { node } = rowInfo;
    const name = getCategoryName();
    if (name === "") {
      (categoryNameInputRef.current as any).focus();
      return;
    }

    try {
      await categoryService.save({
        ...buildRequest(node),
        identifier: undefined,
        parentId: node?.identifier,
      });
      refetch();
      initializeInputs();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function removeNode(rowInfo: GenerateNodePropsParams) {
    const { node } = rowInfo;
    try {
      await categoryService._delete(node.identifier, node.version);
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

  const getNodeKey = ({ treeIndex }: { treeIndex: number }) => treeIndex;

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
            <Form.Group as={Col} md={12} className={"mb-3"}>
              <Form.Control
                ref={categoryNameInputRef}
                name="categoryName"
                placeholder={"Kategori Adı"}
              />
            </Form.Group>
            <Form.Group as={Col} md={12} className={"mb-3"}>
              <Form.Control
                ref={slugInputRef}
                name="slug"
                placeholder={"Slug"}
              />
            </Form.Group>
            <Form.Group as={Col} md={12} className={"mb-3"}>
              <Form.Control
                name="sortOrder"
                type="number"
                ref={sortOrderInputRef}
                placeholder={"Sıra No"}
              />
            </Form.Group>
            <Form.Group as={Col} md={12} className={`mb-3`}>
              <Button
                variant="primary"
                as="input"
                type="button"
                className={`me-1`}
                value={"Kategori Ekle"}
                onClick={createNode}
              />
            </Form.Group>
          </Col>
          <Col lg={8} md={12} sm={12}>
            <Form
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <div className="d-flex justify-content-start align-items-center">
                <Form.Group className={"mb-3 me-1"}>
                  <Form.Control
                    name="searchString"
                    value={searchString}
                    onChange={(event) => setSearchString(event.target.value)}
                    placeholder={"Ara"}
                  />
                </Form.Group>
                <Pagination className={"mb-3 me-1"}>
                  <Pagination.First
                    disabled={!searchFoundCount}
                    onClick={selectPrevMatch}
                  />
                  <Pagination.Last
                    disabled={!searchFoundCount}
                    onClick={selectNextMatch}
                  />
                </Pagination>
                <span>
                  &nbsp;
                  {searchFoundCount > 0 ? searchFocusIndex + 1 : 0}
                  &nbsp;/&nbsp;
                  {searchFoundCount || 0}
                </span>
              </div>
              <a role="button" className={`me-2`} onClick={() => expand(true)}>
                <i className={`fe fe-chevron-down me-1`} />
                Tümünü Aç
              </a>
              <a role="button" className={`me-2`} onClick={() => expand(false)}>
                <i className={`fe fe-chevron-up me-1`} />
                Tümünü Kapa
              </a>
            </Form>
            <div style={{ height: "50vh" }}>
              {treeData && treeData.length > 0 && (
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
                  generateNodeProps={(rowInfo) => ({
                    buttons: [
                      <div key={`${rowInfo.node.identifier ?? rowInfo.treeIndex}-actions`}>
                        <i
                          className={`fe fe-plus-square me-2`}
                          onClick={() => addNodeChild(rowInfo)}
                        ></i>
                        <i
                          className={`fe fe-edit me-2`}
                          onClick={() => updateNode(rowInfo)}
                        ></i>
                        <i
                          className={`fe fe-x-square me-2`}
                          onClick={() => removeNode(rowInfo)}
                        ></i>
                      </div>,
                    ],
                    title: `${rowInfo.node.name} (${rowInfo.node.slug})`,
                    subtitle: `Sıra: ${rowInfo.node.sortOrder ?? 0}`,
                    style: {
                      height: "50px",
                    },
                  })}
                />
              )}
            </div>
          </Col>
        </Row>
    </Container>
  );
}
