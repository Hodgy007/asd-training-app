// Custom Quill video blot that handles both third-party embeds (YouTube,
// Vimeo) and uploaded HTML5 video files (MP4 / WebM). The default Quill
// `video` format only emits an <iframe>, which can't play direct media URLs.
//
// Call registerVideoFormat(Quill) once after the react-quill-new module has
// loaded.

/* eslint-disable @typescript-eslint/no-explicit-any */

let registered = false

function toEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return url
}

function isEmbeddable(url: string): boolean {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url)
}

export function registerVideoFormat(Quill: any) {
  if (registered) return
  if (!Quill || typeof Quill.import !== 'function') return

  const BlockEmbed: any = Quill.import('blots/block/embed')

  class VideoBlot extends BlockEmbed {
    static blotName = 'video'
    static tagName = 'div'
    static className = 'ql-video-wrapper'

    static create(value: string): HTMLElement {
      const node: HTMLElement = super.create(value)
      node.setAttribute('contenteditable', 'false')
      node.style.margin = '8px 0'
      const url = typeof value === 'string' ? value : ''
      if (isEmbeddable(url)) {
        const iframe = document.createElement('iframe')
        iframe.setAttribute('src', toEmbedUrl(url))
        iframe.setAttribute('frameborder', '0')
        iframe.setAttribute('allowfullscreen', 'true')
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture')
        iframe.style.width = '100%'
        iframe.style.aspectRatio = '16 / 9'
        iframe.style.border = '0'
        iframe.style.borderRadius = '8px'
        node.appendChild(iframe)
      } else {
        const video = document.createElement('video')
        video.setAttribute('controls', 'true')
        video.setAttribute('preload', 'metadata')
        video.setAttribute('src', url)
        video.style.maxWidth = '100%'
        video.style.borderRadius = '8px'
        node.appendChild(video)
      }
      return node
    }

    static value(node: HTMLElement): string {
      const embed = node.querySelector('iframe, video') as HTMLIFrameElement | HTMLVideoElement | null
      return embed?.getAttribute('src') || ''
    }
  }

  Quill.register('formats/video', VideoBlot, true)
  registered = true
}
