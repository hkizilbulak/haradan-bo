"use client"
import { useState } from "react";
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateForText } from '@/helpers/DateUtils';
import { getArticleTypeEnumText } from '@/helpers/EnumUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { ArticleRequest, ArticleResponse } from '@/models';
import { articleService } from '@/services';
import { PageHeading } from '@/widgets';
import ArticleFilter from '@/widgets/article/ArticleFilter';
import ArticleModal from '@/widgets/article/ArticleModal';
import { Col, Row, Container } from 'react-bootstrap';

const headItems = [
  'Başlık',
  'Oluşturulma Tarihi',
  'Tipi',
  'Durum',
  ''
]

export default function Articles() {


  const [{ data, isLoading, handleFilter, handlePageChange, refetch }] = useApi<ArticleResponse>({ service: articleService });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();
  const [openFilter, setOpenFilter] = useState(false);

  const openArticleModal = (article?: ArticleResponse) => {
    openModal(<ArticleModal selectedArticle={article} onClose={closeModal} onHandleSave={handleSave} />)
  }

  const handleSave = async (values: ArticleRequest) => {
    if (values.identifier !== undefined && values.identifier !== '') {
      await articleService.update(values);
    } else {
      await articleService.save(values);
    }
    closeModal()
    refetch()
  }

  const content = data?.content?.map((article) => (
    <tr key={article.identifier}>
      <td>{article.title}</td>
      <td>{formatDateForText(article.createDate)}</td>
      <td>{getArticleTypeEnumText(article.type)}</td>
      <td><StatusBadge status={article.status} /></td>
      <td>
        <a
          className="font-medium text-cyan-600 me-5 cp"
          onClick={() => openArticleModal(article)}>
          <i className={`fe fe-edit`}></i>
        </a></td>
    </tr>));

  return (

    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12} md={12} sm={12}>
          <PageHeading
            heading='Yazılar'
            createButtonText='Yazı Ekle'
            onCreate={() => openArticleModal(undefined)}
            onToggleFilter={() => setOpenFilter(!openFilter)} />
        </Col>
      </Row>

      {openFilter && <ArticleFilter onFilter={(values: string) => handleFilter(values)} />}

      {isModalOpen && modalContent}

      {isLoading && <Loading />}

      {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={(page) => handlePageChange(page)} />}

    </Container>

  );

}
