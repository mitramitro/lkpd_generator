import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
    </Base>
  )
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m18 15-6-6-6 6" />
    </Base>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m6 9 6 6 6-6" />
    </Base>
  )
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </Base>
  )
}

export function FileTextIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </Base>
  )
}

export function PencilIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </Base>
  )
}

export function HeadingIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 4v16M18 4v16M6 12h12" />
    </Base>
  )
}

export function ParagraphIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h6a4 4 0 0 1 0 8H6" />
      <path d="M18 4v16" />
    </Base>
  )
}

export function QuestionIcon(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4 2c-.8.6-1.5 1.2-1.5 2.5M12 17h.01" />
    </Base>
  )
}

export function ListIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Base>
  )
}

export function LinesIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 6h16M4 10h16M4 14h10M4 18h10" />
    </Base>
  )
}

export function ImageIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.5-3.5L7 22" />
    </Base>
  )
}

export function PageBreakIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5 4h14v4H5zM5 16h14v4H5zM12 8v3M12 13v3" />
      <path d="M9 11h6M9 13h6" />
    </Base>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m20 6-11 11-5-5" />
    </Base>
  )
}

export function BookIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </Base>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </Base>
  )
}

export function ArchiveIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" />
    </Base>
  )
}
