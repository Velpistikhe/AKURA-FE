import { useState } from 'react'
import { Button, Modal } from '../../components/global'
import CompanyHistory from './CompanyHistory'

export default function CompanyHistoryModal({ record, staff = false, onClose }) {
  const [closing, setClosing] = useState(false)
  const close = () => setClosing(true)
  if (!record) return null
  return <Modal title={`${staff ? 'Staff' : 'Company'} History: ${record.name}`} visible={!closing} width={1000}
    footer={<Button onClick={close}>Close</Button>} onCancel={close} afterClose={onClose} unmountOnClose>
    <CompanyHistory key={`${staff ? 'staff' : 'company'}-${record.id}`} entityId={record.id} staff={staff} revision={record.version} />
  </Modal>
}
