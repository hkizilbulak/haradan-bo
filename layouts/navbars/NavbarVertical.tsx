'use client'
import { Fragment, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'
import { useMediaQuery } from 'react-responsive';
import {
	ListGroup,
	Card,
	Image,
	Badge,
} from 'react-bootstrap';
import Accordion from 'react-bootstrap/Accordion';
import AccordionContext from 'react-bootstrap/AccordionContext';
import { useAccordionButton } from 'react-bootstrap/AccordionButton';

import SimpleBar from 'simplebar-react';
import 'simplebar/dist/simplebar.min.css';

import { DashboardMenu } from '@/routes/DashboardRoutes';

type IProps = {
	showMenu: boolean;
	onClick: (value: boolean) => void
}

type IToggleProps = {
	children?: any;
	eventKey?: number;
	icon?: string;
}

const NavbarVertical = (props: IProps) => {
	const location = usePathname()
	const CustomToggle = ({ children, eventKey, icon }: IToggleProps) => {
		const { activeEventKey } = useContext(AccordionContext);
		const decoratedOnClick = useAccordionButton(eventKey?.toString() as any, () =>
			console.log('totally custom!')
		);
		const isCurrentEventKey = activeEventKey === eventKey;
		return (
			<li className="nav-item">
				<Link
					href="#"
					className="nav-link "
					onClick={decoratedOnClick}
					data-bs-toggle="collapse"
					data-bs-target="#navDashboard"
					aria-expanded={isCurrentEventKey ? true : false}
					aria-controls="navDashboard">
					{icon ? <i className={`nav-icon fe fe-${icon} me-2`}></i> : ''}{' '}
					{children}
				</Link>
			</li>
		);
	};
	const CustomToggleLevel2 = ({ children, eventKey, icon }: IToggleProps) => {
		const { activeEventKey } = useContext(AccordionContext);
		const decoratedOnClick = useAccordionButton(eventKey?.toString() as any, () =>
			console.log('totally custom!')
		);
		const isCurrentEventKey = activeEventKey === eventKey;
		return (
			<Link
				href="#"
				className="nav-link "
				onClick={decoratedOnClick}
				data-bs-toggle="collapse"
				data-bs-target="#navDashboard"
				aria-expanded={isCurrentEventKey ? true : false}
				aria-controls="navDashboard">
				{children}
			</Link>
		);
	};

	const generateLink = (item: IMenuProps) => {
		return (
			<a
				href={item.link}
				className={`nav-link ${location === item.link ? 'active' : ''
					}`}
				onClick={(e) =>
					isMobile ? props.onClick(!props.showMenu) : props.showMenu
				}>
				{item.name || item.title}
				{item.badge ? (
					<Badge
						className="ms-1"
						bg={item.badgecolor ? item.badgecolor : 'primary'}
					>
						{item.badge}
					</Badge>
				) : (
					''
				)}
			</a>
		);
	};

	const isMobile = useMediaQuery({ maxWidth: 767 });

	return (
		<Fragment>
			<SimpleBar style={{ maxHeight: '100vh' }}>
				<div className="nav-scroller">
					<Link href="/" className="navbar-brand text-white fw-bold">
						Haradan.com	BO
					</Link>
				</div>
				<Accordion defaultActiveKey="0" as="ul" className="navbar-nav flex-column">
					{DashboardMenu.map(function (menu, index) {
						if (menu.grouptitle) {
							return (
								<Card bsPrefix="nav-item" key={index}>
									<div className="navbar-heading">{menu.title}</div>
								</Card>
							);
						} else {
							if (menu.children) {
								return (
									<Fragment key={index}>
										<CustomToggle eventKey={index} icon={menu.icon}>
											{menu.title}
											{menu.badge ? (
												<Badge className="ms-1" bg={menu.badgecolor ? menu.badgecolor : 'primary'}>
													{menu.badge}
												</Badge>
											) : ('')}
										</CustomToggle>
										<Accordion.Collapse eventKey={index.toString()} as="li" bsPrefix="nav-item">
											<ListGroup as="ul" bsPrefix="" className="nav flex-column">
												{menu.children.map(function (menuLevel1Item, menuLevel1Index) {
													if (menuLevel1Item.children) {
														return (
															<ListGroup.Item as="li" bsPrefix="nav-item" key={menuLevel1Index}>
																<Accordion defaultActiveKey="0" className="navbar-nav flex-column">
																	<CustomToggleLevel2 eventKey={menuLevel1Index}>
																		{menuLevel1Item.title}
																		{menuLevel1Item.badge ? (
																			<Badge className="ms-1" bg={
																				menuLevel1Item.badgecolor ? menuLevel1Item.badgecolor : 'primary'
																			}>
																				{menuLevel1Item.badge}
																			</Badge>
																		) : ('')}
																	</CustomToggleLevel2>
																	<Accordion.Collapse eventKey={menuLevel1Index.toString()} bsPrefix="nav-item">
																		<ListGroup as="ul" bsPrefix="" className="nav flex-column">
																			{menuLevel1Item.children.map(function (menuLevel2Item, menuLevel2Index) {
																				if (menuLevel2Item.children) {
																					return (
																						<ListGroup.Item as="li" bsPrefix="nav-item" key={menuLevel2Index}>
																							<Accordion defaultActiveKey="0" className="navbar-nav flex-column">
																								<CustomToggleLevel2 eventKey={menuLevel2Index}>
																									{menuLevel2Item.title}
																									{menuLevel2Item.badge ? (
																										<Badge className="ms-1" bg={
																											menuLevel2Item.badgecolor ? menuLevel2Item.badgecolor : 'primary'
																										}>
																											{menuLevel2Item.badge}
																										</Badge>
																									) : ('')}
																								</CustomToggleLevel2>
																								<Accordion.Collapse eventKey={menuLevel2Index.toString()} bsPrefix="nav-item">
																									<ListGroup as="ul" bsPrefix="" className="nav flex-column">
																										{menuLevel2Item.children.map(function (menuLevel3Item, menuLevel3Index) {
																											return (
																												<ListGroup.Item key={menuLevel3Index} as="li" bsPrefix="nav-item">
																													{generateLink(menuLevel3Item)}
																												</ListGroup.Item>
																											);
																										})}
																									</ListGroup>
																								</Accordion.Collapse>
																							</Accordion>
																						</ListGroup.Item>
																					);
																				} else {
																					return (
																						<ListGroup.Item key={menuLevel2Index} as="li" bsPrefix="nav-item">
																							{generateLink(menuLevel2Item)}
																						</ListGroup.Item>
																					);
																				}

																			})}
																		</ListGroup>
																	</Accordion.Collapse>
																</Accordion>
															</ListGroup.Item>
														);
													} else {
														return (
															<ListGroup.Item as="li" bsPrefix="nav-item" key={menuLevel1Index}>
																{generateLink(menuLevel1Item)}
															</ListGroup.Item>
														);
													}
												})}
											</ListGroup>
										</Accordion.Collapse>
									</Fragment>
								);
							} else {
								return (
									<Card bsPrefix="nav-item" key={index}>
										<a href={menu.link} className={`nav-link ${location === menu.link ? 'active' : ''} ${menu.title === 'Haradan.com' ? 'bg-primary text-white' : ''}`}>
											{typeof menu.icon === 'string' ? (
												<i className={`nav-icon fe fe-${menu.icon} me-2`}></i>
											) : (menu.icon)}
											{menu.title}
											{menu.badge ? (
												<Badge className="ms-1" bg={menu.badgecolor ? menu.badgecolor : 'primary'}>
													{menu.badge}
												</Badge>
											) : ('')}
										</a>
									</Card>
								);
							}
						}
					})}
				</Accordion>

			</SimpleBar>
		</Fragment>
	);
};

export default NavbarVertical;
