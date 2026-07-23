import { useRef } from 'react'
import type { MouseEvent } from 'react'

// A plain onClick={closeModal} on the backdrop closes the modal whenever a
// mousedown/mouseup pair resolves to it — including when the user starts a
// text-selection drag inside the modal panel and drifts past its edge
// before releasing (browsers promote that click's target to the nearest
// common ancestor, i.e. the backdrop). Only close when BOTH the press and
// the release landed directly on the backdrop itself.
export function useBackdropClose(onClose: () => void) {
  const pressedBackdrop = useRef(false)

  const onMouseDown = (e: MouseEvent<HTMLElement>) => {
    pressedBackdrop.current = e.target === e.currentTarget
  }
  const onMouseUp = (e: MouseEvent<HTMLElement>) => {
    if (pressedBackdrop.current && e.target === e.currentTarget) onClose()
    pressedBackdrop.current = false
  }

  return { onMouseDown, onMouseUp }
}
