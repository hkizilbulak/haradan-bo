"use client";
import { categoryService } from "@/services";
import { PageHeading } from "@/widgets";
import { useState, useRef, ReactNode, useMemo } from "react";
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
  title?: ReactNode | undefined;
  subtitle?: ReactNode | undefined;
  expanded?: boolean | undefined;
  children?: TreeItem[] | GetTreeItemChildrenFn | undefined;
  [x: string]: any;
};

const seed: TreeItem[] = [];

const initialParameters = {
  filter: "status==ACTIVE",
  pageRequest: {
    page: 0,
    size: 10,
    sort: [{ direction: "ASC", property: "name" }],
  },
} as SearchParams<CategoryResponse>;

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
  const priceInputRef = useRef<HTMLInputElement>(null);

  function getCategoryName() {
    return (categoryNameInputRef.current as any).value;
  }

  function getPrice() {
    return (priceInputRef.current as any).value;
  }

  function initializeInputs() {
    (categoryNameInputRef.current as any).value = "";
    (priceInputRef.current as any).value = "";
  }

  function createNode() {
    console.log("createNode rowInfo:");

    const name = getCategoryName();
    const price = getPrice();

    if (name === "") {
      (categoryNameInputRef.current as any).focus();
      return;
    }

    let newTree: FullTree & TreeIndex = addNodeUnderParent({
      treeData: treeData,
      parentKey: null,
      expandParent: true,
      getNodeKey,
      newNode: {
        title: name,
        subtitle: price,
      },
    });

    newTree.treeData && setTreeData(newTree.treeData);
    const category: CategoryRequest = {
      name,
      price,
      status: EntityStatusEnum.ACTIVE,
    };
    handleSave(category);
    initializeInputs();
  }

  function updateNode(rowInfo: GenerateNodePropsParams) {
    console.log("updateNode rowInfo:", rowInfo);
    const { node, path, parentNode } = rowInfo;
    const { children, identifier } = node;

    const name = getCategoryName();
    const price = getPrice();
    const parentId = (parentNode && parentNode.identifier) || undefined;

    if (name === "") {
      (categoryNameInputRef.current as any).focus();
      return;
    }

    let newTree: TreeItem[] = changeNodeAtPath({
      treeData,
      path,
      getNodeKey,
      newNode: {
        children,
        title: name,
        subtitle: price,
        identifier,
      },
    });

    setTreeData(newTree);
    const category: CategoryRequest = {
      identifier,
      name,
      price,
      parentId,
      status: EntityStatusEnum.ACTIVE,
    };
    handleSave(category);
    initializeInputs();
  }

  function addNodeChild(rowInfo: GenerateNodePropsParams) {
    let { path, node } = rowInfo;

    const name = getCategoryName();
    const price = getPrice();
    const parentId = node?.identifier || undefined;

    if (name === "") {
      (categoryNameInputRef.current as any).focus();
      return;
    }

    let newTree: FullTree & TreeIndex = addNodeUnderParent({
      treeData: treeData,
      parentKey: path[path.length - 1],
      expandParent: true,
      getNodeKey,
      newNode: {
        title: name,
        subtitle: price,
      },
    });

    newTree.treeData && setTreeData(newTree.treeData);
    const category: CategoryRequest = {
      name,
      price,
      parentId,
      status: EntityStatusEnum.ACTIVE,
    };
    handleSave(category);
    initializeInputs();
  }

  function removeNode(rowInfo: GenerateNodePropsParams) {
    console.log("removeNode rowInfo:", rowInfo);

    const { path, node, parentNode } = rowInfo;
    setTreeData(
      removeNodeAtPath({
        treeData,
        path,
        getNodeKey,
      })
    );

    const { identifier, title: name, subtitle: price } = node;
    const parentId = (parentNode && parentNode.identifier) || undefined;
    const category: CategoryRequest = {
      identifier,
      name,
      price,
      parentId,
      status: EntityStatusEnum.DELETED,
    };
    handleSave(category);
  }

  function moveNode(rowInfo: OnMoveNodeParams) {
    console.log("rowInfo:", rowInfo);
    const { node, nextParentNode } = rowInfo;
    const { identifier, title: name, subtitle: price } = node;
    const parentId = (nextParentNode && nextParentNode.identifier) || undefined;
    const category: CategoryRequest = {
      identifier,
      name,
      price,
      parentId,
      status: EntityStatusEnum.ACTIVE,
    };
    handleSave(category);
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

  function prepareNodes(category: CategoryResponse) {
    const childrenData: any = category.children?.map((childCategory) => {
      return prepareNodes(childCategory);
    });

    return {
      identifier: category.identifier,
      title: category.name,
      subtitle: category.price && category.price.toString(),
      children: childrenData,
      expanded: true,
    } as TreeItem;
  }

  const handleSave = async (category: CategoryRequest) => {
    if (category.identifier !== undefined && category.identifier !== "") {
      await categoryService.update(category);
    } else {
      await categoryService.save(category);
    }
    refetch();
  };

  useMemo(() => {
    const categoryTreeData = data?.content?.map((category) => {
      return prepareNodes(category);
    });
    setTreeData(categoryTreeData || []);
  }, [data]);

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <PageHeading heading="Kategoriler" showCreateButton={false} />
        </Col>
      </Row>
      <div>
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
                name="price"
                type="number"
                ref={priceInputRef}
                placeholder={"İlan Ücreti"}
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
                  onChange={(treeData) => setTreeData(treeData)}
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
                      <div>
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
                    style: {
                      height: "50px",
                    },
                  })}
                />
              )}
            </div>
          </Col>
        </Row>
      </div>
    </Container>
  );
}
