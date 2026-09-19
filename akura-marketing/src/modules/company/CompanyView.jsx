import { useState } from 'react'
import { Button, EditOutlined, Modal } from '../../components/global'
import CompanyStaffModal from './CompanyStaffModal'
import CompanyStaffHistorySection from './CompanyStaffHistorySection'
import CompanyContractSection from './CompanyContractSection'

export default function CompanyView({ company, currentUser, onClose, onEdit, onChanged, editing }) {
  const [closing, setClosing] = useState(false)
  const [staffHistoryVisible, setStaffHistoryVisible] = useState(false)
  const [staffHistoryLoaded, setStaffHistoryLoaded] = useState(false)
  const [staffHistoryRevision, setStaffHistoryRevision] = useState(0)
  const handleStaffChanged = async () => {
    setStaffHistoryRevision((revision) => revision + 1)
    await onChanged?.()
  }
  const toggleStaffHistory = () => {
    if (!staffHistoryVisible) setStaffHistoryLoaded(true)
    setStaffHistoryVisible((visible) => !visible)
  }
  return <Modal title={`Company Details: ${company.name}`} visible={!closing} width={1100} footer={null}
    onCancel={() => setClosing(true)} afterClose={onClose}
    closable={!editing} mask={{ closable: !editing }} keyboard={!editing}>
    <section className="company-view-section">
      <div className="company-view-heading"><h3>Company Profile</h3>
        {company.revoked !== true && <Button icon={<EditOutlined />} busy={editing} onClick={() => onEdit(company)}>Edit Company</Button>}
      </div>
      <dl className="company-detail-grid">
        {Object.entries({ Name: company.name, Type: company.type, Address: company.address, NPWP: company.npwp,
          'Sister Company': company.isSisterCompany ? 'Yes' : 'No', 'Current Contract': company.contract?.status || 'No active contract' }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '-'}</dd></div>)}
      </dl>
    </section>
    <CompanyContractSection company={company} currentUser={currentUser} onChanged={onChanged} />
    <section className="company-view-section">
      <h3>Company Staff</h3>
      <CompanyStaffModal key={company.id} company={company} visible embedded onChanged={handleStaffChanged} />
    </section>
    <CompanyContractSection company={company} currentUser={currentUser} onChanged={onChanged} historyOnly />
    <section className="company-view-section">
      <div className="company-staff-history-heading">
        <h3>Staff History</h3>
        <Button variant="link" onClick={toggleStaffHistory}>
          {staffHistoryVisible ? 'Hide History' : 'Show History'}
        </Button>
      </div>
      <div className={`company-staff-history-content${staffHistoryVisible ? ' is-visible' : ''}`} aria-hidden={!staffHistoryVisible}>
        <div className="company-staff-history-content-inner">
          {staffHistoryLoaded && <CompanyStaffHistorySection company={company} visible={staffHistoryVisible} revision={staffHistoryRevision} />}
        </div>
      </div>
    </section>
  </Modal>
}
