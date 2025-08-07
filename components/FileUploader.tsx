'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { XCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface FileUploaderProps {
  label: string;
  fileUrl?: string;
  onUploadSuccess: (url: string, file: File) => void; // fileType-ийг file болгож өөрчилсөн
  onClear: () => void;
  accept: string;
}

export default function FileUploader({ label, fileUrl, onUploadSuccess, onClear, accept }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const fileType = useMemo(() => {
    if (accept.includes('image')) return 'image';
    if (accept.includes('audio')) return 'audio';
    if (accept.includes('video')) return 'video';
    return 'image'; // Анхдагч утга
  }, [accept]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // Жинхэнэ хуулах API-г энд дуудна уу
    await new Promise(resolve => setTimeout(resolve, 1000));

    const dummyUrl = URL.createObjectURL(file);
    onUploadSuccess(dummyUrl, file); // fileType-ийг file болгож өөрчилсөн

    setIsUploading(false);
    e.target.value = '';
  }, [onUploadSuccess]);

  const renderPreview = () => {
    if (!fileUrl) return null;

    if (fileType === 'image') {
      return <Image src={fileUrl} alt="Preview" width={150} height={150} className="rounded-md object-cover" />;
    }
    if (fileType === 'audio') {
      return <audio controls src={fileUrl} className="w-full" />;
    }
    if (fileType === 'video') {
      return <video controls src={fileUrl} width={150} height={150} className="rounded-md" />;
    }
    return null;
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {fileUrl ? (
        <div className="relative w-fit">
          {renderPreview()}
          <Button
            variant="ghost"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background"
            onClick={onClear}
          >
            <XCircle className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center space-x-2">
          <Input type="file" onChange={handleFileChange} accept={accept} disabled={isUploading} />
          {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      )}
    </div>
  );
}