import { v4 as uuid } from 'uuid';

export const DashboardMenu: IMenuProps[] = [
	{
		id: uuid(),
		title: 'Panelim',
		icon: 'home',
		link: '/',
		allowedRoles: ['admin']
	},
	{
		id: uuid(),
		title: 'SAYFALAR',
		grouptitle: true,
		allowedRoles: ['admin', 'CALL_CENTER']
	},
	{
		id: uuid(),
		title: 'İlanlar',
		icon: 'database',
		allowedRoles: ['admin'],
		children: [
			{ id: uuid(), link: '/listings', name: 'Tüm İlanlar', allowedRoles: ['admin'] },
		]
	},
	{
		id: uuid(),
		title: 'Kullanıcılar',
		icon: 'user',
		link: '/users',
		allowedRoles: ['admin']
	},
	{
		id: uuid(),
		title: 'Yorum Yönetimi',
		icon: 'message-square',
		link: '/comments',
		allowedRoles: ['admin', 'CALL_CENTER']
	},
	{
		id: uuid(),
		title: 'Haralar',
		icon: 'map-pin',
		link: '/stud-farms',
		allowedRoles: ['admin', 'CALL_CENTER']
	},
	{
		id: uuid(),
		title: 'Paketler',
		icon: 'package',
		link: '/packages',
		allowedRoles: ['admin']
	},
	{
		id: uuid(),
		title: 'Bannerlar',
		icon: 'image',
		link: '/banners',
		allowedRoles: ['admin']
	},
	{
		id: uuid(),
		title: 'Kampanyalar',
		icon: 'tag',
		link: '/campaigns',
		allowedRoles: ['admin']
	},
	{
		id: uuid(),
		title: 'Kuponlar',
		icon: 'percent',
		link: '/coupons',
		allowedRoles: ['admin']
	},
	{
		id: uuid(),
		title: 'Zamanlanmış Görevler',
		icon: 'refresh-cw',
		link: '/jobs',
		allowedRoles: ['admin']
	},
	{
		id: uuid(),
		title: 'Bildirim Şablonları',
		icon: 'mail',
		link: '/notifications',
		allowedRoles: ['admin']
	},
	{
		id: uuid(),
		title: 'TJK Senkron',
		icon: 'activity',
		link: '/tjk',
		allowedRoles: ['admin']
	},
	{
		id: uuid(),
		title: 'Kategoriler',
		icon: 'file-text',
		link: '/categories',
		allowedRoles: ['admin']
	},
	{
		id: uuid(),
		title: 'Haradan.com',
		icon: 'arrow-left',
		link: process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://haradan-fe-production.up.railway.app',
		allowedRoles: ['admin', 'CALL_CENTER']
	}
];

export default DashboardMenu;
