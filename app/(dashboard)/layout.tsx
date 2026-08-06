'use client';
import { useEffect, useState } from 'react';
import 'styles/theme.scss';
import '@nosferatu500/react-sortable-tree/style.css';
import NavbarVertical from '@/layouts/navbars/NavbarVertical';
import NavbarTop from '@/layouts/navbars/NavbarTop';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Loading from '@/components/Loading';

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const [showMenu, setShowMenu] = useState(true);
	const { status, hasAdminAccess } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (status === 'unauthenticated' || (status === 'authenticated' && !hasAdminAccess)) {
			router.replace('/login');
		}
	}, [hasAdminAccess, status, router]);

	if (status === 'loading') {
		return <Loading />;
	}

	if (status === 'unauthenticated' || !hasAdminAccess) {
		return null;
	}

	return (
		<div id="db-wrapper" className={`${showMenu ? '' : 'toggled'}`}>
			<div className="navbar-vertical navbar">
				<NavbarVertical
					showMenu={showMenu}
					onClick={(value: boolean) => setShowMenu(value)}
				/>
			</div>
			<div id="page-content">
				<div className="header">
					<NavbarTop
						showMenu={showMenu}
						onToggleSidebarMenu={(value: boolean) => setShowMenu(value)}
					/>
				</div>
				{children}
			</div>
		</div>
	);
}
