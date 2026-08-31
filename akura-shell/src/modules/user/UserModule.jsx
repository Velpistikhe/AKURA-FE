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
  return error.response?.data?.message || error.message || 'Unable to process the request.'
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-US', {
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
      await updateProfile(values)
      setProfileOpen(false)
      notify.success('Profile Updated', 'Your profile has been updated successfully.')
    } catch (error) {
      notify.error('Profile Update Failed', errorMessage(error))
    } finally {
      setProfileSaving(false)
    }
  }

  const savePassword = async () => {
    const values = await passwordForm.validateFields()
    setPasswordSaving(true)
    try {
      await changePassword(values)
      passwordForm.resetFields()
      setPasswordOpen(false)
      notify.success('Password Changed', 'Your password has been changed successfully.')
    } catch (error) {
      notify.error('Password Change Failed', errorMessage(error))
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <section className="user-module-page">
      <div className="user-module-heading">
        <div>
          <h1>My Profile</h1>
          <p>View your account information and manage your profile and password security.</p>
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
            {user?.isActive ? 'Active' : 'Inactive'}
          </Tag>
        </div>

        <div className="profile-details">
          <div className="profile-detail">
            <span>Username</span>
            <strong>{user?.username || '-'}</strong>
          </div>
          <div className="profile-detail">
            <span>First name</span>
            <strong>{user?.firstName || '-'}</strong>
          </div>
          <div className="profile-detail">
            <span>Last name</span>
            <strong>{user?.lastName || '-'}</strong>
          </div>
          <div className="profile-detail">
            <span>Role</span>
            <strong>{user?.role || '-'}</strong>
            <small>Managed through App Manager</small>
          </div>
          <div className="profile-detail">
            <span>Section</span>
            <strong>{user?.section || 'No section'}</strong>
            <small>Managed through App Manager</small>
          </div>
          <div className="profile-detail">
            <span>Last updated</span>
            <strong>{formatDate(user?.updatedAt)}</strong>
          </div>
        </div>

        <div className="profile-actions">
          <AppButton icon={<UserOutlined />} onClick={openProfile}>Edit Profile</AppButton>
          <AppButton variant="outline" icon={<LockOutlined />} onClick={() => setPasswordOpen(true)}>Change Password</AppButton>
        </div>
      </AppCard>

      <Modal
        title="Edit Profile"
        visible={profileOpen}
        busy={profileSaving}
        okText="Save"
        cancelText="Cancel"
        onOk={saveProfile}
        onCancel={() => setProfileOpen(false)}
        preRender
        unmountOnClose
      >
        <Form form={profileForm} layout="vertical" preserve={false}>
          <Form.Item
            name="firstName"
            label="First Name"
            rules={[{ required: true, whitespace: true, message: 'First name is required.' }]}
          >
            <Input placeholder="Enter first name" />
          </Form.Item>
          <Form.Item
            name="lastName"
            label="Last Name"
            rules={[{ required: true, whitespace: true, message: 'Last name is required.' }]}
          >
            <Input placeholder="Enter last name" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Change Password"
        visible={passwordOpen}
        busy={passwordSaving}
        okText="Change Password"
        cancelText="Cancel"
        onOk={savePassword}
        onCancel={() => { passwordForm.resetFields(); setPasswordOpen(false) }}
        preRender
        unmountOnClose
      >
        <Form form={passwordForm} layout="vertical" preserve={false}>
          <Form.Item name="oldPassword" label="Current Password" rules={[{ required: true, message: 'Current password is required.' }]}>
            <Input.Password placeholder="Enter current password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'New password is required.' },
              { min: 6, message: 'New password must contain at least 6 characters.' },
            ]}
          >
            <Input.Password placeholder="At least 6 characters" />
          </Form.Item>
          <Form.Item
            name="newPasswordConfirmation"
            label="Confirm New Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'New password confirmation is required.' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                  return Promise.reject(new Error('New password confirmation does not match.'))
                },
              }),
            ]}
          >
            <Input.Password placeholder="Re-enter new password" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  )
}

export default UserModule
