// import node module libraries
import { Row, Col, Button } from "react-bootstrap";

type IProps = {
  heading: string;
  showCreateButton?: boolean;
  createButtonText?: string;
  onCreate?: () => void;
  onToggleFilter?: () => void;
};

const PageHeading = ({
  heading,
  showCreateButton = true,
  createButtonText,
  onCreate,
  onToggleFilter,
}: IProps) => {
  return (
    <Row>
      <Col lg={12} md={12} xs={12}>
        {/* Page header */}
        <div className="border-bottom pb-4 mb-4 ">
          <div className="d-flex justify-content-between align-items-center">
            <h3 className="mb-0 fw-bold">{heading}</h3>
            <div className="d-flex justify-content-end align-items-center">
              {showCreateButton && (
                <Button
                  className={"d-flex align-items-center me-2"}
                  variant="primary"
                  onClick={onCreate}
                >
                  <i className={`fe fe-plus`}></i>
                  <span className={"d-none d-lg-flex ms-2"}>
                    {createButtonText}
                  </span>
                </Button>
              )}
              <Button
                className={"d-flex align-items-center"}
                variant="warning"
                onClick={onToggleFilter}
              >
                <i className={`fe fe-filter`}></i>
                <span className={"d-none d-lg-flex ms-2"}>Filtrele</span>
              </Button>
            </div>
          </div>
        </div>
      </Col>
    </Row>
  );
};

export default PageHeading;
