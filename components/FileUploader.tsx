// components/FileUploader.tsx
'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Button, Upload, Image as AntdImage, Spin, Typography } from 'antd';
import type { RcFile } from 'antd/es/upload';
import { CloseCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface FileUploaderProps {
  label: string;
  fileUrl?: string;
  onUploadSuccess: (url: string, file: File) => void;
  onClear: () => void;
  accept: string;
}

export default function FileUploader({
  label,
  fileUrl,
  onUploadSuccess,
  onClear,
  accept,
}: FileUploaderProps): JSX.Element {
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const fileType = useMemo<'image' | 'audio' | 'video'>(() => {
    if (accept.includes('image')) return 'image';
    if (accept.includes('audio')) return 'audio';
    if (accept.includes('video')) return 'video';
    return 'image';
  }, [accept]);

  // Анхдагч upload-ыг зогсоож, өөрийнхөө логикоор file-ыг боловсруулна
  const handleBeforeUpload = useCallback(
    async (file: RcFile): Promise<boolean> => {
      setIsUploading(true);

      try {
        // ⬇️ Энд жинхэнэ upload API-гаа дууд (FormData гэх мэт)
        // Жишээнд 1 сек хоцролт тавьж байна
        // const form = new FormData();
        // form.append('file', file);
        // const res = await fetch('/api/upload', { method: 'POST', body: form });
        // const { url } = await res.json();

        await new Promise((r) => setTimeout(r, 1000));
        const objectUrl = URL.createObjectURL(file);

        // Амжилттай бол:
        onUploadSuccess(objectUrl, file);
      } finally {
        setIsUploading(false);
      }

      // false буцаавал AntD Upload өөрөө upload хийхгүй (манайх хянана)
      return false;
    },
    [onUploadSuccess]
  );

  const renderPreview = (): React.ReactNode => {
    if (!fileUrl) return null;

    if (fileType === 'image') {
      return (
        <AntdImage
          src={fileUrl}
          alt="Preview"
          width={150}
          height={150}
          style={{ objectFit: 'cover', borderRadius: 8 }}
          preview={false}
        />
      );
    }
    if (fileType === 'audio') {
      return <audio controls src={fileUrl} style={{ width: '100%' }} />;
    }
    if (fileType === 'video') {
      return (
        <video
          controls
          src={fileUrl}
          width={150}
          height={150}
          style={{ borderRadius: 8 }}
        />
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <Text strong>{label}</Text>

      {fileUrl ? (
        <div style={{ position: 'relative', width: 'fit-content' }}>
          {renderPreview()}
          <Button
            type="text"
            aria-label="Clear file"
            icon={<CloseCircleOutlined style={{ color: '#ef4444' }} />}
            onClick={onClear}
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              height: 24,
              width: 24,
              borderRadius: '9999px',
              background: 'var(--ant-color-bg-container, #fff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            }}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Upload
            accept={accept}
            multiple={false}
            showUploadList={false}
            beforeUpload={handleBeforeUpload}
            disabled={isUploading}
          >
            <Button type="primary" disabled={isUploading}>
              {isUploading ? 'Файл илгээж байна…' : 'Файл сонгох'}
            </Button>
          </Upload>

          {isUploading && <Spin size="small" />}
        </div>
      )}
    </div>
  );
}