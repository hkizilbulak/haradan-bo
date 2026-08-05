import { Button, Spinner } from 'react-bootstrap';

const Loading = () => {


    return (
        <div className='d-flex justify-content-center align-items-between h-100'><Button variant="primary" >
            <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
            />
            <span>Yükleniyor...</span>
        </Button></div>

    );
}

export default Loading;