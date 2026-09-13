import React, { useEffect, useState } from 'react';
import { Dropdown, Button } from 'react-bootstrap';
import { ModerationAdvertStatus } from '@/models';
import { useFormik } from 'formik';
import { appendOperator } from '@/helpers/HelperUtils';

export type AdvertCategoryGroup = '' | 'at' | 'at-hizmetleri' | 'asim';

export type IAdvertFilterForm = {
    status?: ModerationAdvertStatus;
};

const initialValues: IAdvertFilterForm = {};

type IProps = {
    onFilter: (values: string) => void;
    tab: 'published' | 'unpublished';
};

// Exact Ionicons SVGs matching mobile design
const TrophyIcon = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
        <line x1="176" y1="464" x2="336" y2="464" />
        <line x1="256" y1="384" x2="256" y2="464" />
        <path d="M128,96H384V224a128,128,0,0,1-256,0Z" />
        <path d="M128,144H80a48,48,0,0,0-48,48v16a64,64,0,0,0,64,64h32" />
        <path d="M384,144h48a48,48,0,0,1,48,48v16a64,64,0,0,1-64,64H384" />
    </svg>
);

const BriefcaseIcon = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="32"
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
        <rect x="32" y="128" width="448" height="320" rx="48" ry="48" />
        <path d="M144,128V96a64,64,0,0,1,64-64h96a64,64,0,0,1,64,64v32" />
        <line x1="480" y1="240" x2="32" y2="240" />
        <path d="M320,240v24a8,8,0,0,1-8,8H200a8,8,0,0,1-8-8V240" />
    </svg>
);

const FlameIcon = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
        <path d="M112,320c0-93,124-165,96-272,66,0,192,96,192,272a144,144,0,0,1-288,0Z" />
        <path d="M320,368c0,57.71-32,80-64,80s-64-22.29-64-80,40-86,64-128C280,282,320,310.29,320,368Z" />
    </svg>
);

const LayersIcon = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
        <polygon points="256 32 32 144 256 256 480 144 256 32" />
        <polyline points="432 240 480 264 256 376 32 264 80 240" />
        <polyline points="432 352 480 376 256 488 32 376 80 352" />
    </svg>
);

const ClockIcon = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
        <circle cx="256" cy="256" r="192" />
        <polyline points="256 128 256 272 352 272" />
    </svg>
);

const PauseCircleIcon = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
        <circle cx="256" cy="256" r="192" />
        <line x1="208" y1="176" x2="208" y2="336" />
        <line x1="304" y1="176" x2="304" y2="336" />
    </svg>
);

const CloseCircleIcon = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="32"
        className={className}
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
        <circle cx="256" cy="256" r="192" />
        <line x1="320" y1="192" x2="192" y2="320" />
        <line x1="192" y1="192" x2="320" y2="320" />
    </svg>
);

interface StatusOption {
    value: ModerationAdvertStatus | '';
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    bgColor: string;
}

const STATUS_OPTIONS: StatusOption[] = [
    {
        value: '',
        label: 'Tüm Durumlar',
        icon: LayersIcon,
        color: '#64748b',
        bgColor: '#f1f5f9',
    },
    {
        value: 'PENDING_REVIEW',
        label: 'İnceleme Bekliyor',
        icon: ClockIcon,
        color: '#d97706',
        bgColor: '#fef3c7',
    },
    {
        value: 'SUSPENDED',
        label: 'Yayından Kaldırıldı',
        icon: PauseCircleIcon,
        color: '#64748b',
        bgColor: '#f1f5f9',
    },
    {
        value: 'REJECTED',
        label: 'Reddedildi',
        icon: CloseCircleIcon,
        color: '#ef4444',
        bgColor: '#fee2e2',
    },
];

interface CategoryOption {
    value: AdvertCategoryGroup;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    color: string;
    bgColor: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
    {
        value: '',
        label: 'Tüm Kategoriler',
        icon: LayersIcon,
        color: '#64748b',
        bgColor: '#f1f5f9',
    },
    {
        value: 'at',
        label: 'Satılık Atlar',
        icon: TrophyIcon,
        color: '#3b82f6',
        bgColor: '#eff6ff',
    },
    {
        value: 'at-hizmetleri',
        label: 'At Hizmetleri',
        icon: BriefcaseIcon,
        color: '#8b5cf6',
        bgColor: '#f5f3ff',
    },
    {
        value: 'asim',
        label: 'Aşım Hizmetleri',
        icon: FlameIcon,
        color: '#ec4899',
        bgColor: '#fdf2f8',
    },
];

export default function AdvertFilter({ onFilter, tab }: IProps) {
    const [selectedCategory, setSelectedCategory] = useState<AdvertCategoryGroup>('');

    const buildFilterString = (statusVal: ModerationAdvertStatus | '', categoryVal: AdvertCategoryGroup) => {
        let filter = '';
        if (tab === 'published') {
            filter = appendOperator(filter, 'status==PUBLISHED');
        } else {
            if (statusVal && (statusVal as string) !== '') {
                filter = appendOperator(filter, `status==${statusVal}`);
            } else {
                filter = appendOperator(filter, 'status==UNPUBLISHED');
            }
        }
        if (categoryVal !== '') {
            filter = appendOperator(filter, `mainCategory==${categoryVal}`);
        }
        return filter;
    };

    const formik = useFormik({
        initialValues,
        onSubmit: (values) => {
            const filter = buildFilterString(values.status || '', selectedCategory);
            onFilter(filter);
        },
    });

    useEffect(() => {
        formik.setFieldValue('status', '');
        setSelectedCategory('');
        let filter = '';
        if (tab === 'published') {
            filter = appendOperator(filter, 'status==PUBLISHED');
        } else {
            filter = appendOperator(filter, 'status==UNPUBLISHED');
        }
        onFilter(filter);
    }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

    const currentStatus = formik.values.status || '';
    const currentStatusOption = STATUS_OPTIONS.find((opt) => opt.value === currentStatus) || STATUS_OPTIONS[0];
    const CurrentStatusIcon = currentStatusOption.icon;

    const currentCategoryOption = CATEGORY_OPTIONS.find((opt) => opt.value === selectedCategory) || CATEGORY_OPTIONS[0];
    const CurrentCategoryIcon = currentCategoryOption.icon;

    const handleSelectStatus = (status: ModerationAdvertStatus | '') => {
        formik.setFieldValue('status', status);
        const filter = buildFilterString(status, selectedCategory);
        onFilter(filter);
    };

    const handleSelectCategory = (category: AdvertCategoryGroup) => {
        setSelectedCategory(category);
        const filter = buildFilterString(formik.values.status || '', category);
        onFilter(filter);
    };

    const handleClearAll = () => {
        formik.setFieldValue('status', '');
        setSelectedCategory('');
        const filter = buildFilterString('', '');
        onFilter(filter);
    };

    // Status Dropdown Component
    const renderStatusDropdown = () => (
        <Dropdown align="start" style={{ minWidth: '220px' }}>
            <Dropdown.Toggle
                as="div"
                bsPrefix="filter-toggle"
                role="button"
                className="bg-white border rounded-3 px-3 py-2 shadow-sm d-flex align-items-center gap-2 cursor-pointer user-select-none w-100"
                style={{ minWidth: '220px', borderColor: '#e2e8f0', transition: 'all 0.15s ease-in-out' }}
            >
                <div
                    className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                        width: '26px',
                        height: '26px',
                        backgroundColor: currentStatusOption.bgColor,
                        color: currentStatusOption.color,
                    }}
                >
                    <CurrentStatusIcon size={15} />
                </div>
                <span className="fw-semibold text-dark flex-grow-1 text-start" style={{ fontSize: '13.5px' }}>
                    {currentStatusOption.label}
                </span>
                <i className="fe fe-chevron-down text-muted ms-auto small" />
            </Dropdown.Toggle>

            <Dropdown.Menu
                className="shadow-lg border-0 rounded-3 py-2 mt-1"
                style={{ minWidth: '240px', zIndex: 1050 }}
            >
                <div className="px-3 py-1 text-uppercase text-muted fw-bold" style={{ fontSize: '11px', letterSpacing: '0.6px' }}>
                    Duruma Göre Filtrele
                </div>
                <div className="dropdown-divider my-1 opacity-50" />
                {STATUS_OPTIONS.map((opt) => {
                    const isSelected = currentStatus === opt.value;
                    const IconComp = opt.icon;
                    return (
                        <Dropdown.Item
                            key={opt.value}
                            onClick={() => handleSelectStatus(opt.value)}
                            className={`d-flex align-items-center justify-content-between px-3 py-2 mx-1 my-1 rounded-2 transition-all ${
                                isSelected ? 'bg-primary text-white fw-semibold' : 'text-dark'
                            }`}
                            style={{ width: 'calc(100% - 8px)' }}
                        >
                            <div className="d-flex align-items-center gap-2">
                                <div
                                    className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                                    style={{
                                        width: '30px',
                                        height: '30px',
                                        backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : opt.bgColor,
                                        color: isSelected ? '#ffffff' : opt.color,
                                    }}
                                >
                                    <IconComp size={16} />
                                </div>
                                <span style={{ fontSize: '13.5px' }}>{opt.label}</span>
                            </div>
                            {isSelected && <i className="fe fe-check text-white ms-2 small" />}
                        </Dropdown.Item>
                    );
                })}
            </Dropdown.Menu>
        </Dropdown>
    );

    // Category Dropdown Component
    const renderCategoryDropdown = () => (
        <Dropdown align="start" style={{ minWidth: '220px' }}>
            <Dropdown.Toggle
                as="div"
                bsPrefix="filter-toggle"
                role="button"
                className="bg-white border rounded-3 px-3 py-2 shadow-sm d-flex align-items-center gap-2 cursor-pointer user-select-none w-100"
                style={{ minWidth: '220px', borderColor: '#e2e8f0', transition: 'all 0.15s ease-in-out' }}
            >
                <div
                    className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{
                        width: '26px',
                        height: '26px',
                        backgroundColor: currentCategoryOption.bgColor,
                        color: currentCategoryOption.color,
                    }}
                >
                    <CurrentCategoryIcon size={15} />
                </div>
                <span className="fw-semibold text-dark flex-grow-1 text-start" style={{ fontSize: '13.5px' }}>
                    {currentCategoryOption.label}
                </span>
                <i className="fe fe-chevron-down text-muted ms-auto small" />
            </Dropdown.Toggle>

            <Dropdown.Menu
                className="shadow-lg border-0 rounded-3 py-2 mt-1"
                style={{ minWidth: '240px', zIndex: 1050 }}
            >
                <div className="px-3 py-1 text-uppercase text-muted fw-bold" style={{ fontSize: '11px', letterSpacing: '0.6px' }}>
                    Kategoriye Göre Filtrele
                </div>
                <div className="dropdown-divider my-1 opacity-50" />
                {CATEGORY_OPTIONS.map((opt) => {
                    const isSelected = selectedCategory === opt.value;
                    const IconComp = opt.icon;
                    return (
                        <Dropdown.Item
                            key={opt.value}
                            onClick={() => handleSelectCategory(opt.value)}
                            className={`d-flex align-items-center justify-content-between px-3 py-2 mx-1 my-1 rounded-2 transition-all ${
                                isSelected ? 'bg-primary text-white fw-semibold' : 'text-dark'
                            }`}
                            style={{ width: 'calc(100% - 8px)' }}
                        >
                            <div className="d-flex align-items-center gap-2">
                                <div
                                    className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                                    style={{
                                        width: '30px',
                                        height: '30px',
                                        backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : opt.bgColor,
                                        color: isSelected ? '#ffffff' : opt.color,
                                    }}
                                >
                                    <IconComp size={16} />
                                </div>
                                <span style={{ fontSize: '13.5px' }}>{opt.label}</span>
                            </div>
                            {isSelected && <i className="fe fe-check text-white ms-2 small" />}
                        </Dropdown.Item>
                    );
                })}
            </Dropdown.Menu>
        </Dropdown>
    );

    // Published tab: Replace "Yayındaki İlanlar" badge with Category Dropdown
    if (tab === 'published') {
        return (
            <div className="d-flex align-items-center gap-2 flex-wrap" style={{ maxWidth: '380px' }}>
                {renderCategoryDropdown()}

                {selectedCategory !== '' && (
                    <Button
                        variant="light"
                        size="sm"
                        className="border text-muted rounded-3 px-2 py-2 d-inline-flex align-items-center gap-1 shadow-sm"
                        onClick={() => handleSelectCategory('')}
                        title="Filtreyi Temizle"
                    >
                        <i className="fe fe-x text-danger" />
                        <span className="small d-none d-sm-inline">Temizle</span>
                    </Button>
                )}
            </div>
        );
    }

    // Unpublished tab: Status Dropdown + Category Dropdown
    return (
        <div className="d-flex align-items-center gap-2 flex-wrap">
            {renderStatusDropdown()}
            {renderCategoryDropdown()}

            {(currentStatus !== '' || selectedCategory !== '') && (
                <Button
                    variant="light"
                    size="sm"
                    className="border text-muted rounded-3 px-2 py-2 d-inline-flex align-items-center gap-1 shadow-sm"
                    onClick={handleClearAll}
                    title="Filtreyi Temizle"
                >
                    <i className="fe fe-x text-danger" />
                    <span className="small d-none d-sm-inline">Temizle</span>
                </Button>
            )}
        </div>
    );
}
