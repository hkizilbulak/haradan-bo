"use client";
import React, { Suspense, useState, useEffect } from 'react';
import { Container, Nav } from 'react-bootstrap';
import { useRouter, useSearchParams } from 'next/navigation';
import Loading from '@/components/Loading';
import CampaignsSection from './components/CampaignsSection';
import CouponsSection from './components/CouponsSection';

type TabType = 'campaigns' | 'coupons';

function CampaignsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<TabType>(
    tabParam === 'coupons' ? 'coupons' : 'campaigns'
  );

  useEffect(() => {
    if (tabParam === 'coupons' || tabParam === 'campaigns') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    if (tab === 'campaigns') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const newQuery = params.toString();
    const newPath = newQuery ? `/campaigns?${newQuery}` : '/campaigns';
    router.push(newPath);
  };

  return (
    <Container fluid className="p-3 lg:p-6">
      {/* Sekme Seçici (Tabs) */}
      <div className="mb-4">
        <Nav variant="pills" className="bg-light p-1 rounded border d-inline-flex">
          <Nav.Item>
            <Nav.Link
              active={activeTab === 'campaigns'}
              onClick={() => handleTabChange('campaigns')}
              className={`px-4 py-2 fw-semibold d-flex align-items-center gap-2 ${
                activeTab === 'campaigns' ? 'active shadow-sm' : 'text-muted'
              }`}
              style={{ cursor: 'pointer' }}
            >
              <i className="fe fe-tag"></i>
              <span>Kampanyalar</span>
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              active={activeTab === 'coupons'}
              onClick={() => handleTabChange('coupons')}
              className={`px-4 py-2 fw-semibold d-flex align-items-center gap-2 ${
                activeTab === 'coupons' ? 'active shadow-sm' : 'text-muted'
              }`}
              style={{ cursor: 'pointer' }}
            >
              <i className="fe fe-percent"></i>
              <span>Kuponlar</span>
            </Nav.Link>
          </Nav.Item>
        </Nav>
      </div>

      {/* Aktif Sekme İçeriği */}
      {activeTab === 'campaigns' ? <CampaignsSection /> : <CouponsSection />}
    </Container>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CampaignsPageContent />
    </Suspense>
  );
}
