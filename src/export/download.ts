export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function safeFilename(name: string): string {
  return (
    name
      .replace(/[^\w\d -]+/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase() || 'chart'
  )
}
