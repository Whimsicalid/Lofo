import { useRef, useState } from 'react'

// 图片上传组件，支持预览和更换
export default function ImageUpload({ onChange, value }) {
  const fileInputRef = useRef(null)
  const [preview, setPreview] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)
    onChange?.(file)
  }

  const handleRemove = () => {
    setPreview(null)
    onChange?.(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const displayImage = preview || (value ? value : null)

  return (
    <div>
      <label className="block text-sm font-semibold text-ink mb-2">物品图片</label>
      <div
        onClick={() => fileInputRef.current?.click()}
        className="relative w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-line hover:border-coral/50 bg-cream-deep/50 cursor-pointer overflow-hidden flex items-center justify-center group"
      >
        {displayImage ? (
          <>
            <img src={displayImage} alt="预览" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
              className="absolute top-3 right-3 w-8 h-8 bg-ink/70 text-white rounded-full flex items-center justify-center hover:bg-ink backdrop-blur-sm shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <div className="text-center text-ink-faint px-4">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white border border-line flex items-center justify-center shadow-soft group-hover:border-coral/40 transition-colors">
              <svg className="w-6 h-6 text-coral/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink-muted">点击上传图片</p>
            <p className="text-xs mt-1">支持 JPG、PNG、GIF、WebP，不超过 10MB</p>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  )
}
