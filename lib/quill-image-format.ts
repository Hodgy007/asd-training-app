// Teaches Quill to preserve width/height/style/alt on <img> across delta
// roundtrips. Without this, setting img.style.width directly on the DOM is
// lost the moment Quill re-serialises its delta (e.g. after the user types).
//
// Call registerResizableImage(Quill) once after the react-quill-new module
// has loaded.

type QuillStatic = {
  import: (path: string) => unknown
  register: (format: unknown, overwrite?: boolean) => void
}

type BlotNode = { domNode: HTMLElement; format(name: string, value: unknown): void }

const IMAGE_ATTRIBUTES = ['alt', 'height', 'width', 'style'] as const

let registered = false

export function registerResizableImage(Quill: QuillStatic) {
  if (registered) return
  const BaseImageFormat = Quill.import('formats/image') as new (...args: unknown[]) => BlotNode

  class ResizableImage extends BaseImageFormat {
    static formats(domNode: HTMLElement): Record<string, string> {
      return IMAGE_ATTRIBUTES.reduce<Record<string, string>>((formats, attribute) => {
        if (domNode.hasAttribute(attribute)) {
          formats[attribute] = domNode.getAttribute(attribute) ?? ''
        }
        return formats
      }, {})
    }

    format(name: string, value: unknown): void {
      if ((IMAGE_ATTRIBUTES as readonly string[]).includes(name)) {
        if (value) {
          this.domNode.setAttribute(name, String(value))
        } else {
          this.domNode.removeAttribute(name)
        }
      } else {
        super.format(name, value)
      }
    }
  }

  Quill.register(ResizableImage, true)
  registered = true
}
