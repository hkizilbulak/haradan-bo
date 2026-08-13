import { v4 as uuid } from 'uuid';

export const DashboardMenu: IMenuProps[] = [
	{
		id: uuid(),
		title: 'Panelim',
		icon: 'home',
		link: '/'
	},
	{
		id: uuid(),
		title: 'SAYFALAR',
		grouptitle: true
	},
	{
		id: uuid(),
		title: 'İlanlar',
		icon: 'database',
		children: [
			{ id: uuid(), link: '/listings', name: 'Tüm İlanlar' },
		]
	},
	{
		id: uuid(),
		title: 'Kullanıcılar',
		icon: 'user',
		link: '/users'
	},
	{
		id: uuid(),
		title: 'Paketler',
		icon: 'package',
		link: '/packages'
	},
	{
		id: uuid(),
		title: 'Bannerlar',
		icon: 'image',
		link: '/banners'
	},
	{
		id: uuid(),
		title: 'Kampanyalar',
		icon: 'tag',
		link: '/campaigns'
	},
	{
		id: uuid(),
		title: 'Kuponlar',
		icon: 'percent',
		link: '/coupons'
	},
	{
		id: uuid(),
		title: 'Zamanlanmış Görevler',
		icon: 'refresh-cw',
		link: '/jobs'
	},
	{
		id: uuid(),
		title: 'Bildirim Şablonları',
		icon: 'mail',
		link: '/notifications'
	},
	{
		id: uuid(),
		title: 'TJK Senkron',
		icon: 'activity',
		link: '/tjk'
	},
	{
		id: uuid(),
		title: 'Kategoriler',
		icon: 'file-text',
		link: '/categories'
	},
	{
		id: uuid(),
		title: 'Haradan.com',
		icon: 'arrow-left',
		link: 'https://haradan.com'
	}
];

export default DashboardMenu;
