"use client"
import { Button, Col, Container, Form, Offcanvas, Row } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import Loading from '@/components/Loading';
import PrepareTable from '@/components/PrepareTable';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTimeForText } from '@/helpers/DateUtils';
import { getJobTypeText } from '@/helpers/EnumUtils';
import { getErrorMessage } from '@/helpers/HelperUtils';
import useApi from '@/hooks/useApi';
import useModal from '@/hooks/useModal';
import { jobService, JobRequest, JobResponse } from '@/services/job.service';
import { PageHeading } from '@/widgets';
import { toast } from 'react-toastify';

const headItems = ['Anahtar', 'Ad', 'Tip', 'Cron', 'Durum', 'Son Çalışma', ''];

function JobModal({ selectedJob, onClose, onSave }: { selectedJob?: JobResponse; onClose: () => void; onSave: (value: JobRequest) => void; }) {
  const values: JobRequest = selectedJob ? {
    identifier: selectedJob.id,
    expectedVersion: selectedJob.version,
    cronExpression: selectedJob.cronExpression,
    isActive: selectedJob.isActive,
    timeoutSeconds: selectedJob.timeoutSeconds,
  } : {
    expectedVersion: 1,
    cronExpression: '* * * * *',
    isActive: true,
    timeoutSeconds: 60,
  };

  const schema = Yup.object().shape({
    cronExpression: Yup.string().required('Cron zorunludur'),
    timeoutSeconds: Yup.number().required('Timeout zorunludur'),
  });

  return (
    <Offcanvas show={true} onHide={onClose} scroll placement="end">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Job Düzenle</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Formik initialValues={values} validationSchema={schema} onSubmit={onSave}>
          {({ handleSubmit, handleChange, values, isValid, isSubmitting }) => (
            <Form noValidate onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Cron</Form.Label>
                <Form.Control name="cronExpression" value={values.cronExpression} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Timeout (sn)</Form.Label>
                <Form.Control type="number" name="timeoutSeconds" value={values.timeoutSeconds} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Check type="checkbox" name="isActive" label="Aktif" checked={values.isActive} onChange={handleChange} />
              </Form.Group>
              <Button disabled={!isValid || isSubmitting} variant="primary" as="input" type="submit" value="Kaydet" />
            </Form>
          )}
        </Formik>
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default function JobsPage() {
  const [{ data, isLoading, refetch }] = useApi<JobResponse>({
    service: jobService,
    params: { filter: '', pageRequest: { page: 0, size: 100, sort: [{ direction: 'ASC', property: 'key' }] } },
  });
  const { isModalOpen, openModal, closeModal, modalContent } = useModal();

  const openJobModal = (job?: JobResponse) => {
    openModal(<JobModal selectedJob={job} onClose={closeModal} onSave={handleSave} />);
  };

  const handleSave = async (values: JobRequest) => {
    try {
      if (!values.identifier) {
        return;
      }
      await jobService.update(values.identifier, values);
      closeModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleRun = async (job: JobResponse) => {
    try {
      await jobService.run(job.id);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const content = data?.content?.map((job) => (
    <tr key={job.id}>
      <td>{job.key}</td>
      <td>{job.name}</td>
      <td>{getJobTypeText(job.jobType)}</td>
      <td>{job.cronExpression}</td>
      <td><StatusBadge status={job.isActive ? 'ACTIVE' : 'INACTIVE'} /></td>
      <td>{job.lastRunAt ? formatDateTimeForText(job.lastRunAt) : '-'}</td>
      <td>
        <a className="font-medium text-cyan-600 me-3 cp" onClick={() => openJobModal(job)}>
          <i className="fe fe-edit"></i>
        </a>
        <Button size="sm" variant="primary" onClick={() => handleRun(job)}>Çalıştır</Button>
      </td>
    </tr>
  ));

  return (
    <Container fluid className="p-3 lg:p-6">
      <Row>
        <Col lg={12}>
          <PageHeading heading="Joblar" showCreateButton={false} />
        </Col>
      </Row>
      {isModalOpen && modalContent}
      {isLoading && <Loading />}
      {!isLoading && <PrepareTable headItems={headItems} content={content} page={data?.page} onHandlePageChange={() => undefined} />}
    </Container>
  );
}
