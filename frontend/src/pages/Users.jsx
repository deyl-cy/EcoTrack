import CrudPage from '../components/CrudPage';
import { Badge } from '../components/ui';

const opt = (v) => ({ value: v, label: v });

// Only one Admin exists, so Admin is never a choice. When editing the Admin's own
// account the field shows "Admin" but is locked.
const roleOptions = (form) => (form.role === 'Admin' ? [opt('Admin')] : [opt('Supervisor'), opt('Collector')]);

export default function Users() {
  return (
    <CrudPage
      title="User"
      heading="Personnel"
      description="User accounts and roles. There is one Admin, and that role is fixed."
      endpoint="/users"
      addLabel="Add user"
      canDelete={(row) => row.role !== 'Admin'}
      blank={{ username: '', full_name: '', password: '', contact_number: '', role: 'Collector' }}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'username', label: 'Username' },
        { key: 'full_name', label: 'Full name' },
        { key: 'contact_number', label: 'Contact' },
        { key: 'role', label: 'Role', render: (r) => <Badge value={r.role} /> },
      ]}
      fields={[
        { name: 'username', label: 'Username', required: true },
        { name: 'full_name', label: 'Full name', required: true },
        { name: 'password', label: 'Password', type: 'password', required: true, createOnlyRequired: true, help: 'At least 8 characters. Leave blank when editing to keep the current one.' },
        { name: 'contact_number', label: 'Contact number' },
        { name: 'role', label: 'Role', type: 'select', options: roleOptions, required: true, disabledWhen: (form) => form.role === 'Admin', help: (form) => (form.role === 'Admin' ? 'The Admin role is fixed and cannot be changed.' : undefined) },
      ]}
    />
  );
}