import React, { useCallback, useEffect, useMemo, useRef } from 'react'

interface VideoModalProps {
  isOpen: boolean
  title: string
  videoPath: string
  description?: string
  onClose: () => void
}

const normalizeUrl = (baseUrl: string, path: string) => {
  const sanitizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const sanitizedPath = path.startsWith('/') ? path.slice(1) : path

  if (!sanitizedBase) {
    return path.startsWith('/') ? path : `/${sanitizedPath}`
  }

  return sanitizedPath ? `${sanitizedBase}/${sanitizedPath}` : sanitizedBase
}

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, title, videoPath, description, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)

  const isExternal = useMemo(() => /^https?:\/\//i.test(videoPath), [videoPath])

  const resolvedVideoSrc = useMemo(() => {
    if (!videoPath) {
      return ''
    }

    if (isExternal) {
      return videoPath
    }

    const baseUrl = import.meta.env.VITE_EXERCISE_SERVICE_URL ?? ''
    return normalizeUrl(baseUrl, videoPath)
  }, [isExternal, videoPath])

  const requestClose = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }

    onClose()
  }, [onClose])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, requestClose])

  useEffect(() => {
    if (!isOpen) {
      previouslyFocusedElementRef.current?.focus()
      return undefined
    }

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement
    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 0)

    return () => {
      window.clearTimeout(timer)
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
      }
      previouslyFocusedElementRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" onClick={requestClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative mx-3 sm:mx-6 w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 leading-snug line-clamp-2">{title}</h2>
            {description && <p className="mt-1 text-sm text-gray-600 line-clamp-3">{description}</p>}
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={requestClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            aria-label="Cerrar video"
          >
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">
          {resolvedVideoSrc ? (
            isExternal ? (
              <div className="relative w-full overflow-hidden rounded-xl border border-gray-200">
                <div className="aspect-video">
                  <iframe
                    src={resolvedVideoSrc}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full rounded-xl"
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <video
                  ref={videoRef}
                  controls
                  className="max-h-[65vh] w-auto max-w-full rounded-xl border border-gray-200 object-contain"
                  src={resolvedVideoSrc}
                >
                  Tu navegador no soporta la reproducción de video.
                </video>
              </div>
            )
          ) : (
            <p className="text-sm text-gray-600">No hay video disponible para este ejercicio.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default VideoModal
