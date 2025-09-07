'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/app/context/AuthContext';

import {
  Table,
  Typography,
  Space,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Popconfirm,
  message,
  ConfigProvider,
  theme as antdTheme,
} from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';

// Аймаг/сум JSON
import AIMAG_SOUM from '@/public/mn_aimag_soum_min.json';

const { Title } = Typography;

type Role = 'student' | 'teacher' | 'moderator' | 'admin';
type Gender = 'male' | 'female' | 'other' | '';

interface UserData {
  id: string;
  uid: string;
  email: string;
  name?: string;
  lastName?: string;
  phone?: string;
  school?: string;
  grade?: string;
  role: Role;
  teacherId?: string;
  gender?: Gender;
  birthYear?: number | '';
  province?: string;
  district?: string;
  readableId?: string;
  createdAt?: string;
}

type NameKey = Extract<keyof UserData, string>;
type DataIndex = keyof UserData;

interface AimagEntry { aimag: string; soums: string[]; }
const AIMAG_LIST: AimagEntry[] = AIMAG_SOUM as AimagEntry[];

// Төрөлжүүлсэн хөрвүүлэлтүүд
function toISODateString(input: unknown): string | undefined {
  if (input == null) return undefined;
  let d: Date | undefined;
  if (input instanceof Date) d = input;
  else if (typeof input === 'object' && input !== null && 'toDate' in input) {
    const maybe = input as { toDate: () => Date };
    const tmp = maybe.toDate();
    if (tmp instanceof Date && !Number.isNaN(tmp.getTime())) d = tmp;
  } else if (typeof input === 'string') {
    const tmp = new Date(input);
    if (!Number.isNaN(tmp.getTime())) d = tmp;
  } else if (typeof input === 'number') {
    const tmp = new Date(input);
    if (!Number.isNaN(tmp.getTime())) d = tmp;
  }
  return d
    ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10)
    : undefined;
}
const asString = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const asNumberOrEmpty = (v: unknown): number | '' => (typeof v === 'number' && Number.isFinite(v) ? v : '');
const asRole = (v: unknown): Role =>
  v === 'teacher' || v === 'moderator' || v === 'admin' || v === 'student' ? v : 'student';
const asGender = (v: unknown): Gender =>
  v === 'male' || v === 'female' || v === 'other' || v === '' ? v : '';

type EditableColumn = ColumnType<UserData> & {
  editable?: boolean;
  dataIndex?: DataIndex;
};

export default function AdminUsersPage(): JSX.Element {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [rows, setRows] = useState<UserData[]>([]);
  const [fetching, setFetching] = useState<boolean>(true);
  const [deletingUid, setDeletingUid] = useState<string>('');
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  const [form] = Form.useForm<UserData>();
  const [editingKey, setEditingKey] = useState<string>('');
  const isEditing = (record: UserData): boolean => record.id === editingKey;

  // Tailwind dark class өөрчлөгдөхийг ажиглаад AntD theme солих
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(html.classList.contains('dark'));
    });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Аймаг/сум options
  const aimagOptions = useMemo(
    () => AIMAG_LIST.map((a) => ({ label: a.aimag, value: a.aimag })),
    []
  );
  const watchedProvince = Form.useWatch('province', form) as string | undefined;
  const soumOptions = useMemo(() => {
    const target = AIMAG_LIST.find((e) => e.aimag === watchedProvince);
    return (target?.soums ?? []).map((s) => ({ label: s, value: s }));
  }, [watchedProvince]);

  // Auth guard
  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== 'admin') router.push('/unauthorized');
    }
  }, [authLoading, user, router]);

  // Subscribe users
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap: QuerySnapshot<DocumentData>) => {
        const list: UserData[] = snap.docs.map((d) => {
          const data: Record<string, unknown> = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            uid: d.id,
            email: asString(data.email),
            name: asString(data.name),
            lastName: asString(data.lastName),
            phone: asString(data.phone),
            school: asString(data.school),
            grade: asString(data.grade),
            role: asRole(data.role),
            teacherId: asString(data.teacherId),
            gender: asGender(data.gender),
            birthYear: asNumberOrEmpty(data.birthYear),
            province: asString(data.province),
            district: asString(data.district),
            readableId: asString(data.readableId),
            createdAt: toISODateString(data.createdAt),
          };
        });
        setRows(list);
        setFetching(false);
      },
      (err: unknown) => {
        console.error('onSnapshot(users) error:', err);
        setFetching(false);
      }
    );
    return () => unsub();
  }, [user]);

  // Save
  const handleSave = async (updated: UserData): Promise<void> => {
    try {
      if (user?.uid === updated.uid && updated.role !== 'admin') {
        message.warning('Өөрийгөө админаас өөрчилж болохгүй.');
        return;
      }
      const prev = rows.find((r) => r.id === updated.id);
      const ref = doc(db, 'users', updated.uid);

      if (prev?.role === 'admin' && updated.role !== 'admin') {
        message.warning('Admin хэрэглэгчийг доош буулгахгүй.');
        return;
      }

      await updateDoc(ref, {
        name: updated.name ?? '',
        lastName: updated.lastName ?? '',
        phone: updated.phone ?? '',
        school: updated.school ?? '',
        grade: updated.grade ?? '',
        role: updated.role ?? 'student',
        teacherId: updated.teacherId ?? '',
        gender: updated.gender ?? '',
        birthYear: updated.birthYear === '' ? null : Number(updated.birthYear),
        province: updated.province ?? '',
        district: updated.district ?? '',
        readableId: updated.readableId ?? '',
      });

      // Custom claim шинэчлэх — cookie шаардлагатай
      if (prev && prev.role !== updated.role) {
        const resp = await fetch('/api/admin/set-user-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include', // ⬅️ __session cookie заавал
          body: JSON.stringify({ uid: updated.uid, role: updated.role }),
        });
        if (!resp.ok) {
          let msg = 'Custom claim update failed';
          try {
            const errJson = (await resp.json()) as { error?: string };
            if (typeof errJson.error === 'string') msg = errJson.error;
          } catch {}
          throw new Error(msg);
        }

        // Өөрийнхөө role‑ийг өөрчилсөн бол түр refresh, бас re-login сануулна
        if (user?.uid === updated.uid) {
          await getAuth().currentUser?.getIdToken(true);
          message.info('Role шинэчлэгдлээ. Дахин нэвтэрч байж бүрэн үйлчилнэ.');
        }
      }

      message.success('Хадгаллаа');
    } catch (e: unknown) {
      console.error('handleSave error:', e);
      message.error('Хадгалах үед алдаа гарлаа');
    }
  };

  // Delete (сервер тал Auth + Firestore хоёуланг устгана)
  const handleDelete = async (id: string | number): Promise<void> => {
    try {
      const uid = String(id);
      if (user?.uid === uid) {
        message.warning('Өөрийгөө устгахгүй.');
        return;
      }

      setDeletingUid(uid);
      const resp = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ⬅️ __session cookie
        body: JSON.stringify({ uid }),
      });
      if (!resp.ok) {
        let msg = 'Auth deletion failed';
        try {
          const errJson = (await resp.json()) as { error?: string };
          if (typeof errJson.error === 'string') msg = errJson.error;
        } catch {}
        throw new Error(msg);
      }
      message.success('Устгалаа');
    } catch (e: unknown) {
      console.error('handleDelete error:', e);
      message.error((e as Error).message || 'Устгах үед алдаа гарлаа');
    } finally {
      setDeletingUid('');
    }
  };

  // Edit actions
  const edit = (record: UserData): void => {
    form.setFieldsValue({ ...record });
    setEditingKey(record.id);
  };
  const cancel = (): void => setEditingKey('');
  const saveRow = async (key: string): Promise<void> => {
    try {
      const row = (await form.validateFields()) as Partial<UserData>;
      const original = rows.find((r) => r.id === key);
      if (!original) return;
      const merged: UserData = { ...original, ...row, uid: original.uid, id: original.id };
      await handleSave(merged);
      setEditingKey('');
    } catch {
      // validation error
    }
  };

  // Export
  const exportJSON = (): void => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportCSV = (): void => {
    const header: ReadonlyArray<string> = [
      'uid','email','name','lastName','phone','school','grade','role',
      'teacherId','gender','birthYear','province','district','readableId','createdAt',
    ];
    const lines: string[] = [header.join(',')];
    rows.forEach((r) => {
      const vals: string[] = [
        r.uid, r.email, r.name ?? '', r.lastName ?? '', r.phone ?? '', r.school ?? '',
        r.grade ?? '', r.role, r.teacherId ?? '', r.gender ?? '',
        (r.birthYear ?? '').toString(), r.province ?? '', r.district ?? '',
        r.readableId ?? '', r.createdAt ?? '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
      lines.push(vals.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Columns
  const columns: EditableColumn[] = [
    { title: 'UID', dataIndex: 'uid', key: 'uid', width: 230, ellipsis: true },
    { title: 'Имэйл', dataIndex: 'email', key: 'email', width: 220, ellipsis: true, editable: true },
    { title: 'Нэр', dataIndex: 'name', key: 'name', width: 140, editable: true },
    { title: 'Овог', dataIndex: 'lastName', key: 'lastName', width: 140, editable: true },
    { title: 'Утас', dataIndex: 'phone', key: 'phone', width: 150, editable: true },
    { title: 'Сургууль', dataIndex: 'school', key: 'school', width: 180, editable: true },
    { title: 'Анги', dataIndex: 'grade', key: 'grade', width: 120, editable: true },

    {
      title: 'Эрх',
      dataIndex: 'role',
      key: 'role',
      width: 140,
      editable: true,
      render: (_: unknown, record: UserData): React.ReactNode =>
        isEditing(record) ? (
          <Form.Item<NameKey> name={'role'} style={{ margin: 0 }} rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'student', label: 'Student' },
                { value: 'teacher', label: 'Teacher' },
                { value: 'moderator', label: 'Moderator' },
              ]}
            />
          </Form.Item>
        ) : (
          record.role
        ),
    },

    { title: 'Багшийн ID', dataIndex: 'teacherId', key: 'teacherId', width: 160, editable: true },

    {
      title: 'Хүйс',
      dataIndex: 'gender',
      key: 'gender',
      width: 120,
      editable: true,
      render: (_: unknown, record: UserData): React.ReactNode =>
        isEditing(record) ? (
          <Form.Item<NameKey> name={'gender'} style={{ margin: 0 }}>
            <Select
              options={[
                { value: '', label: '—' },
                { value: 'male', label: 'Эр' },
                { value: 'female', label: 'Эм' },
                { value: 'other', label: 'Бусад' },
              ]}
            />
          </Form.Item>
        ) : (
          record.gender || '—'
        ),
    },

    {
      title: 'Төрсөн он',
      dataIndex: 'birthYear',
      key: 'birthYear',
      width: 130,
      editable: true,
      render: (_: unknown, record: UserData): React.ReactNode =>
        isEditing(record) ? (
          <Form.Item<NameKey> name={'birthYear'} style={{ margin: 0 }}>
            <InputNumber min={1900} max={2100} style={{ width: '100%' }} />
          </Form.Item>
        ) : (
          record.birthYear ?? ''
        ),
    },

    // Аймаг / Сум
    {
      title: 'Аймаг',
      dataIndex: 'province',
      key: 'province',
      width: 160,
      editable: true,
      render: (_: unknown, record: UserData): React.ReactNode =>
        isEditing(record) ? (
          <Form.Item<NameKey> name={'province'} style={{ margin: 0 }}>
            <Select
              showSearch
              options={aimagOptions}
              placeholder="Аймаг/дүүрэг"
              onChange={() => {
                const curr = form.getFieldsValue() as Partial<UserData>;
                form.setFieldsValue({ ...curr, district: '' });
              }}
              filterOption={(input, option) =>
                (option?.label as string).toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        ) : (
          record.province ?? ''
        ),
    },
    {
      title: 'Сум',
      dataIndex: 'district',
      key: 'district',
      width: 170,
      editable: true,
      render: (_: unknown, record: UserData): React.ReactNode =>
        isEditing(record) ? (
          <Form.Item<NameKey> name={'district'} style={{ margin: 0 }}>
            <Select
              showSearch
              options={soumOptions}
              placeholder="Сум/хороо"
              disabled={!watchedProvince}
              filterOption={(input, option) =>
                (option?.label as string).toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        ) : (
          record.district ?? ''
        ),
    },

    { title: 'Readable ID', dataIndex: 'readableId', key: 'readableId', width: 140, editable: true },
    { title: 'Бүртгэсэн огноо', dataIndex: 'createdAt', key: 'createdAt', width: 140 },

    {
      title: 'Үйлдэл',
      key: 'action',
      fixed: 'right',
      width: 200,
      render: (_: unknown, record: UserData): React.ReactNode => {
        const editable = isEditing(record);
        const loading = deletingUid === record.uid;
        return editable ? (
          <Space>
            {/* Хадгалах — primary (ногоон), white bg дээр ч харагдана */}
            <Button type="primary" size="small" onClick={() => saveRow(record.id)}>
              Хадгалах
            </Button>
            <Button size="small" onClick={cancel}>
              Болих
            </Button>
          </Space>
        ) : (
          <Space>
            <Button size="small" onClick={() => edit(record)}>
              Засах
            </Button>
            <Popconfirm
              title="Устгах уу?"
              okText="Тийм"
              cancelText="Үгүй"
              onConfirm={() => handleDelete(record.uid)}
            >
              <Button danger size="small" loading={loading} disabled={loading}>
                Устгах
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const mergedColumns: ColumnsType<UserData> = columns.map((col) => {
    if (!col.editable || !col.dataIndex) return col;
    if (col.render) return col;
    return {
      ...col,
      render: (value: unknown, record: UserData): React.ReactNode =>
        isEditing(record) ? (
          <Form.Item<NameKey> name={col.dataIndex as NameKey} style={{ margin: 0 }}>
            <Input />
          </Form.Item>
        ) : (
          String(value ?? '')
        ),
    };
  });

  if (authLoading || fetching) return <div className="p-6">Уншиж байна...</div>;
  if (!user || user.role !== 'admin') return <div className="p-6 text-red-500">Зөвшөөрөлгүй.</div>;

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          // Ногоон гол өнгө — бүх primary товч, link, focus
          colorPrimary: '#10b981',       // emerald-500
          colorInfo: '#10b981',
          colorLink: '#10b981',
          colorPrimaryHover: '#059669',  // emerald-600
          colorPrimaryActive: '#047857', // emerald-700

          // Хүснэгт/карт фонтууд — light/dark‑д тохируулав
          colorBgBase: isDark ? '#0b1220' : '#ffffff',
          colorBgContainer: isDark ? '#0f172a' : '#ffffff',
          colorBorder: isDark ? '#1f2937' : '#e5e7eb',
          colorText: isDark ? '#e5e7eb' : '#111827',
          colorTextSecondary: isDark ? '#cbd5e1' : '#374151',
        },
        components: {
          Table: {
            headerBg: isDark ? '#111827' : '#f9fafb',
            headerColor: isDark ? '#e5e7eb' : '#111827',
            rowHoverBg: isDark ? '#0b1220' : '#f5f7fa',
          },
          Button: {
            defaultBorderColor: isDark ? '#334155' : '#d1d5db',
            defaultColor: isDark ? '#e5e7eb' : '#111827',
            defaultBg: isDark ? '#0f172a' : '#ffffff',
            primaryColor: '#ffffff', // primary товч дээр цагаан текст
          },
          Input: {
            colorBgContainer: isDark ? '#0b1220' : '#ffffff',
            colorBorder: isDark ? '#334155' : '#d1d5db',
            colorText: isDark ? '#e5e7eb' : '#111827',
          },
          Select: {
            colorBgContainer: isDark ? '#0b1220' : '#ffffff',
            colorBorder: isDark ? '#334155' : '#d1d5db',
            colorText: isDark ? '#e5e7eb' : '#111827',
            optionSelectedBg: isDark ? '#111827' : '#ecfdf5',
          },
          Popconfirm: {
            colorBgElevated: isDark ? '#0f172a' : '#ffffff',
          },
        },
      }}
    >
      <main className="p-6 max-w-[1400px] mx-auto">
        <Space style={{ width: '100%', marginBottom: 12, justifyContent: 'space-between' }}>
          <Title level={4} style={{ margin: 0 }}>
            Хэрэглэгчийн удирдлага
          </Title>
          <Space>
            <Button onClick={exportCSV}>Export CSV</Button>
            <Button onClick={exportJSON}>Export JSON</Button>
          </Space>
        </Space>

        <Form<UserData> form={form} component={false}>
          <Table<UserData>
            rowKey="id"
            dataSource={rows}
            columns={mergedColumns}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 1500 }}
            bordered
            size="middle"
          />
        </Form>
      </main>
    </ConfigProvider>
  );
}