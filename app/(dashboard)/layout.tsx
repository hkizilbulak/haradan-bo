'use client';
import { useEffect, useState } from 'react';
import 'styles/theme.scss';
import '@nosferatu500/react-sortable-tree/style.css';
import NavbarVertical from '@/layouts/navbars/NavbarVertical';
import NavbarTop from '@/layouts/navbars/NavbarTop';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Loading from '@/components/Loading';

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const [showMenu, setShowMenu] = useState(true);
	const { status, hasAdminAccess, session } = useAuth();
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (status === 'unauthenticated' || (status === 'authenticated' && !hasAdminAccess)) {
			router.replace('/login');
		} else if (status === 'authenticated' && session?.user?.role === 'CALL_CENTER') {
			const allowedPaths = ['/stud-farms', '/comments'];
			const isAllowed = allowedPaths.some(p => pathname.startsWith(p));
			if (!isAllowed) {
				router.replace('/stud-farms');
			}
		}
	}, [hasAdminAccess, status, router, session, pathname]);

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
