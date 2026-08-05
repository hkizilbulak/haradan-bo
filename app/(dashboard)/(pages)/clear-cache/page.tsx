"use client"
import { PageHeading } from '@/widgets';
import { Col, Row, Container } from 'react-bootstrap';
import CacheEvict, { ICacheEvictForm } from '@/widgets/cache/CacheEvict';
import useMounted from '@/hooks/useMounted';
import { cacheService } from '@/services';

export default function Caches() {
    const hasMounted = useMounted();

    const handleCacheEvict = async (values: ICacheEvictForm) => {
        await cacheService._delete(values.cacheName, values.cacheKeyName)
    }

    return (

        <Container fluid className="p-3 lg:p-6">
            <Row>
                <Col lg={12} md={12} sm={12}>
                    <PageHeading heading='Cache Temizle' showCreateButton={false} />
                </Col>
            </Row>

            {hasMounted &&
                <CacheEvict onHandleEvict={handleCacheEvict} />}

        </Container>

    );

}
