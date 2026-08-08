import { useEffect, useState } from 'react'
import { imageIdFromReference, isImageReference } from '../lib/imageStorage'
import { getRepository } from '../services/repositoryProvider'

export interface ResolvedImageSource {
  src: string | undefined
  loading: boolean
}

// Meresolve sumber gambar untuk <img>: data URL/langsung dipakai apa adanya;
// referensi "idb:<id>" dimuat dari IndexedDB menjadi object URL.
// Object URL selalu dibersihkan (URL.revokeObjectURL) saat berubah/unmount
// supaya tidak terjadi memory leak.
export function useImageSource(source: string | undefined): ResolvedImageSource {
  const [src, setSrc] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!source || !isImageReference(source)) {
      setSrc(source)
      setLoading(false)
      return
    }

    const imageId = imageIdFromReference(source)
    if (!imageId) {
      setSrc(undefined)
      setLoading(false)
      return
    }
    let objectUrl: string | null = null
    let active = true

    setSrc(undefined)
    setLoading(true)

    void getRepository()
      .then(async (repo) => {
        const record = await repo.getImage(imageId)
        if (!active) return
        if (!record) {
          setLoading(false)
          setSrc(undefined)
          return
        }
        objectUrl = URL.createObjectURL(record.blob)
        if (active) {
          setSrc(objectUrl)
          setLoading(false)
        } else {
          URL.revokeObjectURL(objectUrl)
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false)
          setSrc(undefined)
        }
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [source])

  return { src, loading }
}
