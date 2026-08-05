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
			{ id: uuid(), link: '/listings', name: 'İlan Dopingleri' },
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
		title: 'Ödemeler',
		icon: 'credit-card',
		link: '/payments'
	},
	{
		id: uuid(),
		title: 'Bannerlar',
		icon: 'image',
		link: '/banners'
	},
	{
		id: uuid(),
		title: 'Haralar',
		icon: 'layers',
		link: '/stables'
	},
	{
		id: uuid(),
		title: 'Yazılar',
		icon: 'file-text',
		link: '/articles'
	},
	{
		id: uuid(),
		title: 'Kategoriler',
		icon: 'file-text',
		link: '/categories'
	},
	{
		id: uuid(),
		title: 'Özellikler',
		icon: 'file-text',
		link: '/properties'
	},
	{
		id: uuid(),
		title: 'Mesajlar',
		icon: 'file-text',
		link: '/contacts'
	},
	{
		id: uuid(),
		title: 'Cache Temizle',
		icon: 'delete',
		link: '/clear-cache'
	},
	{
		id: uuid(),
		title: 'Tanımlamalar',
		icon: 'database',
		children: [
			{ id: uuid(), link: '/definitions/cities', name: 'İller' },
			{ id: uuid(), link: '/definitions/districts', name: 'İlçeler' },
		]
	},
	{
		id: uuid(),
		title: 'Haradan.com',
		icon: 'arrow-left',
		link: 'https://haradan.com'
	}
];

export default DashboardMenu;
