export async function uploadFileToR2(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
  
    const res = await fetch('http://localhost:8787/upload', {
      method: 'POST',
      body: formData,
    })
  
    if (!res.ok) throw new Error('Upload failed')
  
    const data = (await res.json()) as { url: string }
    return data.url
  }