import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { Fragment } from 'react';
import { useMediaQuery } from 'react-responsive';
import {
    Image,
    Dropdown,
    ListGroup,
} from 'react-bootstrap';
import useMounted from '@/hooks/useMounted';

const QuickMenu = () => {

    const { session, signOut } = useAuth()

    const hasMounted = useMounted();

    const isDesktop = useMediaQuery({
        query: '(min-width: 1224px)'
    })

    const menuItems = (
        <>
            <Dropdown.Item as="div" className="px-2 pb-0 pt-2" bsPrefix=' '>
                <div className="lh-1 text-center">
                    <h5 className="mb-1">{`${session?.user.firstName ?? ''} ${session?.user.lastName ?? ''}`.trim()}</h5>
                </div>
                <div className=" dropdown-divider mt-3 mb-2"></div>
            </Dropdown.Item>
            <Dropdown.Item as={Link} href="/pages/profile">
                <i className="fe fe-user me-2"></i>Profilim
            </Dropdown.Item>
            <Dropdown.Item onClick={() => void signOut()}>
                <i className="fe fe-power me-2"></i>Çıkış Yap
            </Dropdown.Item>
        </>
    );

    const QuickMenuDesktop = () => {
        return (
            <ListGroup as="ul" bsPrefix='navbar-nav' className="navbar-right-wrap ms-auto d-flex nav-top-wrap">
                <Dropdown as="li" className="ms-2">
                    <Dropdown.Toggle
                        as="a"
                        bsPrefix=' '
                        className="rounded-circle"
                        id="dropdownUser">
                        <div className="avatar avatar-md avatar-indicators">
                            <Image alt="avatar" src='/images/avatar/avatar.png' className="rounded-circle" />
                        </div>
                    </Dropdown.Toggle>
                    <Dropdown.Menu
                        className="dropdown-menu dropdown-menu-end "
                        align="end"
                        aria-labelledby="dropdownUser"
                        show
                    >
                        {menuItems}
                    </Dropdown.Menu>
                </Dropdown>
            </ListGroup>
        )
    }

    const QuickMenuMobile = () => {
        return (
            <ListGroup as="ul" bsPrefix='navbar-nav' className="navbar-right-wrap ms-auto d-flex nav-top-wrap">
                <Dropdown as="li" className="ms-2">
                    <Dropdown.Toggle
                        as="a"
                        bsPrefix=' '
                        className="rounded-circle"
                        id="dropdownUser">
                        <div className="avatar avatar-md avatar-indicators">
                            <Image alt="avatar" src='/images/avatar/avatar.png' className="rounded-circle" />
                        </div>
                    </Dropdown.Toggle>
                    <Dropdown.Menu
                        className="dropdown-menu dropdown-menu-end "
                        align="end"
                        aria-labelledby="dropdownUser"
                    >
                        {menuItems}
                    </Dropdown.Menu>
                </Dropdown>
            </ListGroup>
        )
    }

    return (
        <Fragment>
            {hasMounted && isDesktop ? <QuickMenuDesktop /> : <QuickMenuMobile />}
        </Fragment>
    )
}

export default QuickMenu;
