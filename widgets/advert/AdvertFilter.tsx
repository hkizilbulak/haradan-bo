import React, { useEffect } from 'react';
import { Dropdown, Button } from 'react-bootstrap';
import { ModerationAdvertStatus } from '@/models';
import { useFormik } from 'formik';
import { appendOperator } from '@/helpers/HelperUtils';

export type IAdvertFilterForm = {
    status?: ModerationAdvertStatus;
};

const initialValues: IAdvertFilterForm = {};

type IProps = {
    onFilter: (values: string) => void;
    tab: 'published' | 'unpublished';
};

interface StatusOption {
    value: ModerationAdvertStatus | '';
    label: string;
    icon: string;
    dotColor: string;
}

const STATUS_OPTIONS: StatusOption[] = [
    {
        value: '',
        label: 'Tüm Durumlar',
        icon: 'fe fe-layers',
        dotColor: '#64748b',
    },
    {
        value: 'PENDING_REVIEW',
        label: 'İnceleme Bekliyor',
        icon: 'fe fe-clock',
        dotColor: '#f59e0b',
    },
    {
        value: 'SUSPENDED',
        label: 'Yayından Kaldırıldı',
        icon: 'fe fe-pause-circle',
        dotColor: '#6c757d',
    },
    {
        value: 'REJECTED',
        label: 'Reddedildi',
        icon: 'fe fe-x-circle',
        dotColor: '#ef4444',
    },
];

export default function AdvertFilter({ onFilter, tab }: IProps) {
    const formik = useFormik({
        initialValues,
        onSubmit: (values) => {
            let filter = '';

            if (tab === 'published') {
                filter = appendOperator(filter, `status==PUBLISHED`);
            } else {
                if (values.status && (values.status as string) !== '') {
                    filter = appendOperator(filter, `status==${values.status}`);
                } else {
                    filter = appendOperator(filter, `status==UNPUBLISHED`);
                }
            }
            onFilter(filter);
        },
    });

    useEffect(() => {
        formik.setFieldValue('status', '');
        let filter = '';
        if (tab === 'published') {
            filter = appendOperator(filter, `status==PUBLISHED`);
        } else {
            filter = appendOperator(filter, `status==UNPUBLISHED`);
        }
        onFilter(filter);
    }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

    const currentStatus = formik.values.status || '';
    const currentOption = STATUS_OPTIONS.find((opt) => opt.value === currentStatus) || STATUS_OPTIONS[0];

    const handleSelectStatus = (status: ModerationAdvertStatus | '') => {
        formik.setFieldValue('status', status);
        let filter = '';
        if (tab === 'published') {
            filter = appendOperator(filter, `status==PUBLISHED`);
        } else {
            if (status !== '') {
                filter = appendOperator(filter, `status==${status}`);
            } else {
                filter = appendOperator(filter, `status==UNPUBLISHED`);
            }
        }
        onFilter(filter);
    };

    if (tab === 'published') {
        return (
            <div className="d-inline-flex align-items-center gap-2">
                <span className="badge bg-light-success text-success px-3 py-2 border rounded-pill d-inline-flex align-items-center gap-2 shadow-xs">
                    <i className="fe fe-check-circle" />
                    <span>Yayındaki İlanlar</span>
                </span>
            </div>
        );
    }

    return (
        <div className="d-flex align-items-center gap-2 flex-wrap" style={{ maxWidth: '360px' }}>
            <Dropdown align="start" className="flex-grow-1">
                <Dropdown.Toggle
                    as="div"
                    bsPrefix="filter-toggle"
                    role="button"
                    className="bg-white border rounded-3 px-3 py-2 shadow-sm d-flex align-items-center gap-2 cursor-pointer user-select-none w-100"
                    style={{ minWidth: '220px', borderColor: '#e2e8f0', transition: 'all 0.15s ease-in-out' }}
                >
                    <span
                        className="rounded-circle d-inline-block flex-shrink-0"
                        style={{ width: '9px', height: '9px', backgroundColor: currentOption.dotColor }}
                    />
                    <i className={`${currentOption.icon} text-muted me-1`} />
                    <span className="fw-semibold text-dark flex-grow-1 text-start" style={{ fontSize: '13.5px' }}>
                        {currentOption.label}
                    </span>
                    <i className="fe fe-chevron-down text-muted ms-auto small" />
                </Dropdown.Toggle>

                <Dropdown.Menu
                    className="shadow-lg border-0 rounded-3 py-2 mt-1"
                    style={{ minWidth: '230px', zIndex: 1050 }}
                >
                    <div className="px-3 py-1 text-uppercase text-muted fw-bold" style={{ fontSize: '11px', letterSpacing: '0.6px' }}>
                        Duruma Göre Filtrele
                    </div>
                    <div className="dropdown-divider my-1 opacity-50" />
                    {STATUS_OPTIONS.map((opt) => {
                        const isSelected = currentStatus === opt.value;
                        return (
                            <Dropdown.Item
                                key={opt.value}
                                onClick={() => handleSelectStatus(opt.value)}
                                className={`d-flex align-items-center justify-content-between px-3 py-2 mx-1 rounded-2 transition-all ${
                                    isSelected ? 'bg-primary text-white fw-semibold' : 'text-dark'
                                }`}
                                style={{ width: 'calc(100% - 8px)' }}
                            >
                                <div className="d-flex align-items-center gap-2">
                                    <span
                                        className="rounded-circle d-inline-block flex-shrink-0"
                                        style={{
                                            width: '8px',
                                            height: '8px',
                                            backgroundColor: isSelected ? '#ffffff' : opt.dotColor,
                                        }}
                                    />
                                    <div className="d-flex align-items-center gap-1">
                                        <i className={`${opt.icon} me-1 ${isSelected ? 'text-white' : 'text-muted'}`} />
                                        <span style={{ fontSize: '13.5px' }}>{opt.label}</span>
                                    </div>
                                </div>
                                {isSelected && <i className="fe fe-check text-white ms-2 small" />}
                            </Dropdown.Item>
                        );
                    })}
                </Dropdown.Menu>
            </Dropdown>

            {currentStatus !== '' && (
                <Button
                    variant="light"
                    size="sm"
                    className="border text-muted rounded-3 px-2 py-2 d-inline-flex align-items-center gap-1 shadow-sm"
                    onClick={() => handleSelectStatus('')}
                    title="Filtreyi Temizle"
                >
                    <i className="fe fe-x text-danger" />
                    <span className="small d-none d-sm-inline">Temizle</span>
                </Button>
            )}
        </div>
    );
}
