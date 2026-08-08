import type { GalleryImage, ImageGalleryBlock } from '../../models/lkpd'
import type { LKPDTemplate } from '../../models/template'
import { galleryFlowWidthPercent, galleryGapMm, type GalleryRow } from '../../lib/gallery'
import { useImageSource } from '../../hooks/useImageSource'

interface GalleryImageCellProps {
  image: GalleryImage
  template: LKPDTemplate
}

interface GalleryRowViewProps {
  gallery: ImageGalleryBlock
  row: GalleryRow
  columns: number
  template: LKPDTemplate
  continuation?: boolean
}

// Cell galeri memakai hook useImageSource per gambar supaya referensi Blob
// IndexedDB bisa ditampilkan dan object URL-nya dibersihkan dengan benar.
function GalleryImageCell({ image, template }: GalleryImageCellProps) {
  const { colors } = template
  const imageStyle = template.components.image
  const { src, loading } = useImageSource(image.src)

  return (
    <figure key={image.id} style={{ margin: 0, textAlign: 'center' }}>
      {src ? (
        <img
          src={src}
          alt={image.alt}
          decoding="async"
          style={{
            maxWidth: '100%',
            maxHeight: '90mm',
            borderRadius: `${imageStyle.radius}px`,
            border: imageStyle.borderColor ? `0.5pt solid ${imageStyle.borderColor}` : 'none',
            objectFit: 'contain',
          }}
        />
      ) : (
        <div
          style={{
            minHeight: '30mm',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `0.5pt dashed ${colors.border}`,
            borderRadius: `${imageStyle.radius}px`,
            color: colors.muted,
            fontSize: '8pt',
          }}
        >
          {loading ? 'Memuat gambar…' : 'Gambar tidak dapat dimuat.'}
        </div>
      )}
      {image.caption && (
        <figcaption
          style={{ marginTop: '1mm', fontSize: '8pt', color: colors.muted, fontStyle: 'italic' }}
        >
          {image.caption}
        </figcaption>
      )}
    </figure>
  )
}

// Satu baris utuh dari gallery (row-atomic). Grid menggunakan CSS Grid,
// kolom sama di setiap baris sehingga tampilan menyatu seperti satu grid besar.
export function GalleryRowView({ gallery, row, columns, template, continuation = false }: GalleryRowViewProps) {
  const { colors } = template
  const widthPercent = galleryFlowWidthPercent(gallery.width)

  return (
    <div style={{ marginBottom: '3mm' }}>
      {continuation && (
        <p style={{ margin: '0 0 1.5mm', fontSize: '8pt', color: colors.muted, fontStyle: 'italic' }}>Lanjutan gambar…</p>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: `${galleryGapMm(gallery.gap)}mm`,
          width: `${widthPercent}%`,
          marginLeft: widthPercent < 100 ? 'auto' : 0,
          marginRight: widthPercent < 100 ? 'auto' : 0,
        }}
      >
        {row.images.map((image) => (
          <GalleryImageCell key={image.id} image={image} template={template} />
        ))}
      </div>
    </div>
  )
}
