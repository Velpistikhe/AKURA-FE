import { useState } from 'react'
import { Button, EditOutlined, Modal } from '../../components/global'
import CompanyStaffModal from './CompanyStaffModal'
import CompanyHistory from './CompanyHistory'

export default function CompanyView({ company, onClose, onEdit, onChanged, editing }) {
  const [closing, setClosing] = useState(false)
  const [staffHistoryVisible, setStaffHistoryVisible] = useState(false)
  return <Modal title={`Company Details: ${company.name}`} visible={!closing} width={1100} footer={null}
    onCancel={() => setClosing(true)} afterClose={onClose}
    closable={!editing} mask={{ closable: !editing }} keyboard={!editing}>
    <div className="company-view-heading"><h3>Company Profile</h3>
      <Button icon={<EditOutlined />} busy={editing} onClick={() => onEdit(company)}>Edit Company</Button>
    </div>
    <dl className="company-detail-grid">
      {Object.entries({ Name: company.name, Type: company.type, Address: company.address, NPWP: company.npwp,
        'Sister Company': company.isSisterCompany ? 'Yes' : 'No', 'Current Contract': company.contract?.status || 'No active contract' }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '-'}</dd></div>)}
    </dl>
    <h3>Company Staff</h3>
    <CompanyStaffModal key={company.id} company={company} visible embedded onChanged={onChanged} />
    <div className="company-staff-history-heading">
      <h3>Staff History</h3>
      <Button variant="link" onClick={() => setStaffHistoryVisible((visible) => !visible)}>
        {staffHistoryVisible ? 'Hide History' : 'Show History'}
      </Button>
    </div>
    {staffHistoryVisible && <CompanyHistory entityId={company.id} staff staffHistoryForCompany revision={company.version} />}
  </Modal>
}
