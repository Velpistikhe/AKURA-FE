import { useState } from 'react'
import {
  Form,
  Input,
  LockOutlined,
  Modal,
  Tag,
  UserOutlined,
} from '../../components/global'
import { AppAvatar, AppButton, AppCard } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useNotification } from '../../context/NotificationContext'
import './UserModule.css'

function errorMessage(error) {
  return error.response?.data?.message || error.message || 'Permintaan gagal diproses.'
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
}

function UserModule() {
  const { user, updateProfile, changePassword } = useAuth()
  const notify = useNotification()
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [profileOpen, setProfileOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || '-'

  const openProfile = () => {
    profileForm.setFieldsValue({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
    })
    setProfileOpen(true)
  }

  const saveProfile = async () => {
    const values = await profileForm.validateFields()
    setProfileSaving(true)
    try {
      const response = await updateProfile(values)
      setProfileOpen(false)
      notify.success('Profil Berhasil Diperbarui', response.message || 'Profil berhasil diperbarui.')
    } catch (error) {
      notify.error('Pembaruan Profil Gagal', errorMessage(error))
    } finally {
      setProfileSaving(false)
    }
  }

  const savePassword = async () => {
    const values = await passwordForm.validateFields()
    setPasswordSaving(true)
    try {
      const response = await changePassword(values)
      passwordForm.resetFields()
      setPasswordOpen(false)
      notify.success('Password Berhasil Diubah', response.message || 'Password berhasil diubah.')
    } catch (error) {
      notify.error('Perubahan Password Gagal', errorMessage(error))
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <section className="user-module-page">
      <div className="user-module-heading">
        <div>
          <h1>Profil Saya</h1>
          <p>Lihat informasi akun dan kelola profil serta keamanan password Anda.</p>
        </div>
      </div>

      <AppCard className="profile-card">
        <div className="profile-hero">
          <AppAvatar name={displayName} size={72} colorScheme="primary" />
          <div className="profile-identity">
            <h2>{displayName}</h2>
            <span>@{user?.username}</span>
          </div>
          <Tag color={user?.isActive ? 'success' : 'default'}>
            {user?.isActive ? 'Aktif' : 'Nonaktif'}
          </Tag>
        </div>

        <div className="profile-details">
          <div className="profile-detail">
            <span>Username</span>
            <strong>{user?.username || '-'}</strong>
          </div>
          <div className="profile-detail">
            <span>Nama depan</span>
            <strong>{user?.firstName || '-'}</strong>
          </div>
          <div className="profile-detail">
            <span>Nama belakang</span>
            <strong>{user?.lastName || '-'}</strong>
          </div>
          <div className="profile-detail">
            <span>Role</span>
            <strong>{user?.role || '-'}</strong>
            <small>Dikelola melalui App Manager</small>
          </div>
          <div className="profile-detail">
            <span>Section</span>
            <strong>{user?.section || 'Tanpa section'}</strong>
            <small>Dikelola melalui App Manager</small>
          </div>
          <div className="profile-detail">
            <span>Terakhir diperbarui</span>
            <strong>{formatDate(user?.updatedAt)}</strong>
          </div>
        </div>

        <div className="profile-actions">
          <AppButton icon={<UserOutlined />} onClick={openProfile}>Ubah profil</AppButton>
          <AppButton variant="outline" icon={<LockOutlined />} onClick={() => setPasswordOpen(true)}>Ubah password</AppButton>
        </div>
      </AppCard>

      <Modal
        title="Ubah profil"
        visible={profileOpen}
        busy={profileSaving}
        okText="Simpan"
        cancelText="Batal"
        onOk={saveProfile}
        onCancel={() => setProfileOpen(false)}
        preRender
        unmountOnClose
      >
        <Form form={profileForm} layout="vertical" preserve={false}>
          <Form.Item
            name="firstName"
            label="Nama depan"
            rules={[{ required: true, whitespace: true, message: 'Nama depan wajib diisi.' }]}
          >
            <Input placeholder="Masukkan nama depan" />
          </Form.Item>
          <Form.Item
            name="lastName"
            label="Nama belakang"
            rules={[{ required: true, whitespace: true, message: 'Nama belakang wajib diisi.' }]}
          >
            <Input placeholder="Masukkan nama belakang" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Ubah password"
        visible={passwordOpen}
        busy={passwordSaving}
        okText="Ubah password"
        cancelText="Batal"
        onOk={savePassword}
        onCancel={() => { passwordForm.resetFields(); setPasswordOpen(false) }}
        preRender
        unmountOnClose
      >
        <Form form={passwordForm} layout="vertical" preserve={false}>
          <Form.Item name="oldPassword" label="Password saat ini" rules={[{ required: true, message: 'Password saat ini wajib diisi.' }]}>
            <Input.Password placeholder="Masukkan password saat ini" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Password baru"
            rules={[
              { required: true, message: 'Password baru wajib diisi.' },
              { min: 6, message: 'Password baru minimal 6 karakter.' },
            ]}
          >
            <Input.Password placeholder="Minimal 6 karakter" />
          </Form.Item>
          <Form.Item
            name="newPasswordConfirmation"
            label="Konfirmasi password baru"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Konfirmasi password baru wajib diisi.' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                  return Promise.reject(new Error('Konfirmasi password baru tidak sama.'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="Ulangi password baru" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}

export default UserModule
