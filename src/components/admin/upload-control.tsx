'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as tus from 'tus-js-client';
import { UploadCloud, RefreshCw, FileCheck2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { coverContentType, coverFileError } from '@/lib/media/cover';

export function UploadControl({
  kind,
  courseId,
  lessonId,
  initialStatus,
  preview = false,
}: {
  kind: 'cover' | 'resource' | 'video';
  courseId?: string;
  lessonId?: string;
  initialStatus?: string;
  preview?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(initialStatus || '');
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [dragging, setDragging] = useState(false);
  const uploadRef = useRef<tus.Upload | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      void uploadRef.current?.abort();
    },
    [],
  );
  function selectFile(candidate: File | null) {
    if (busy) return;
    setFailed(false);
    setMessage('');
    if (candidate && kind === 'cover') {
      const error = coverFileError(candidate);
      if (error) {
        setFailed(true);
        setMessage(error);
        setFile(null);
        return;
      }
    }
    if (
      candidate &&
      kind !== 'video' &&
      candidate.size > (kind === 'cover' ? 5 : 50) * 1024 * 1024
    ) {
      setFailed(true);
      setMessage(`El archivo supera el límite de ${kind === 'cover' ? 5 : 50} MB.`);
      setFile(null);
      return;
    }
    setFile(candidate);
    if (candidate && kind === 'cover') void upload(candidate);
  }
  async function checkStatus() {
    if (!lessonId) return;
    setChecking(true);
    try {
      const response = await fetch(`/api/admin/videos/${lessonId}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo consultar el estado.');
      setStatus(data.status);
      if (data.status === 'ready') {
        setMessage('Video listo para reproducir.');
        router.refresh();
      }
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : 'No se pudo consultar el estado.');
    } finally {
      setChecking(false);
    }
  }
  useEffect(() => {
    if (
      kind !== 'video' ||
      !['uploading', 'processing', 'queued', 'pending'].includes(status) ||
      busy
    )
      return;
    const timer = setInterval(() => {
      void checkStatus();
    }, 12000);
    return () => clearInterval(timer); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [status, busy, kind, lessonId]);
  async function upload(selectedFile = file) {
    if (!selectedFile || busy) return;
    if (preview) {
      setMessage('Vista de diseño: ingresá como administrador para subir archivos.');
      setFailed(false);
      return;
    }
    if (
      kind === 'video' &&
      initialStatus &&
      !window.confirm(
        '¿Reemplazar el video de esta clase? Mientras se procesa, la clase puede quedar temporalmente no disponible.',
      )
    )
      return;
    setBusy(true);
    setMessage(kind === 'cover' ? 'Guardando la portada…' : '');
    setFailed(false);
    setProgress(0);
    const contentType =
      kind === 'cover' ? coverContentType(selectedFile.name, selectedFile.type) : selectedFile.type;
    const materialTitle =
      kind === 'resource' ? (title || selectedFile.name).slice(0, 180) : undefined;
    try {
      const response = await fetch('/api/admin/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          courseId,
          lessonId,
          fileName: selectedFile.name,
          contentType,
          fileSize: selectedFile.size,
          title: materialTitle,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo autorizar la carga.');
      if (kind === 'video') {
        await new Promise<void>((resolve, reject) => {
          const upload = new tus.Upload(selectedFile, {
            uploadUrl: data.uploadURL,
            chunkSize: 50 * 1024 * 1024,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            metadata: { name: selectedFile.name, filetype: contentType },
            onError: reject,
            onProgress: (uploaded, total) => setProgress(Math.round((uploaded / total) * 100)),
            onSuccess: () => resolve(),
          });
          uploadRef.current = upload;
          upload.start();
        });
        uploadRef.current = null;
        setStatus('processing');
        setMessage(
          'Carga completa. El video se está procesando; el estado se actualiza automáticamente.',
        );
      } else {
        const supabase = createClient();
        const result = await supabase.storage
          .from(data.bucket)
          .uploadToSignedUrl(data.path, data.token, selectedFile, {
            contentType: contentType || 'application/octet-stream',
          });
        if (result.error) throw new Error('No se pudo transferir el archivo. Volvé a intentarlo.');
        const completion = await fetch('/api/admin/uploads/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind,
            courseId,
            lessonId,
            path: data.path,
            title: materialTitle,
          }),
        });
        if (!completion.ok) {
          const problem = await completion.json();
          throw new Error(
            problem.error ||
              'El archivo se transfirió pero no pudo guardarse en el curso. Reintentá la carga.',
          );
        }
        setProgress(100);
        setMessage(kind === 'cover' ? 'Portada actualizada.' : 'Material subido y protegido.');
        router.refresh();
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : 'No se pudo cargar el archivo.');
    } finally {
      setBusy(false);
    }
  }
  const label =
    kind === 'cover'
      ? 'Portada del curso'
      : kind === 'video'
        ? 'Video de la clase'
        : 'Material complementario';
  const statusLabels: Record<string, string> = {
    ready: 'Listo',
    processing: 'Procesando',
    uploading: 'Cargando',
    queued: 'En cola',
    pending: 'Pendiente',
    error: 'Error de procesamiento',
  };
  return (
    <div className="studio-upload space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {kind === 'video' && status && (
          <span className="badge">{statusLabels[status] || status}</span>
        )}
      </div>
      {kind === 'resource' && (
        <label className="field">
          <span className="field-label">Nombre del material</span>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={180}
            placeholder="Guía de trabajo (opcional)"
            disabled={busy}
          />
        </label>
      )}
      <label
        className={`studio-dropzone ${dragging ? 'is-dragging' : ''}`}
        aria-disabled={busy}
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!busy) selectFile(event.dataTransfer.files[0] || null);
        }}
      >
        {file ? (
          <FileCheck2 size={25} strokeWidth={1.5} />
        ) : (
          <UploadCloud size={25} strokeWidth={1.5} />
        )}
        <span>
          <strong>{file ? file.name : 'Arrastrá un archivo o elegilo desde tu equipo'}</strong>
          <small>
            {file
              ? `${(file.size / 1024 / 1024).toFixed(1)} MB · ${kind === 'cover' ? (busy ? 'guardando portada' : 'pendiente de guardar') : 'listo para subir'}`
              : kind === 'cover'
                ? 'JPG, PNG, WebP o AVIF · hasta 5 MB · se guarda al elegirla'
                : kind === 'video'
                  ? 'Video · carga directa y privada'
                  : 'PDF, documentos y otros archivos · hasta 50 MB'}
          </small>
        </span>
        <input
          ref={inputRef}
          type="file"
          aria-label={`Seleccionar ${label.toLowerCase()}`}
          accept={
            kind === 'cover'
              ? 'image/jpeg,image/png,image/webp,image/avif'
              : kind === 'video'
                ? 'video/*'
                : '.pdf,.zip,.txt,.csv,.docx,.xlsx,.pptx,.png,.jpg,.webp'
          }
          disabled={busy}
          onChange={(event) => selectFile(event.target.files?.[0] || null)}
          className="sr-only"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {(kind !== 'cover' || busy || (failed && file)) && (
          <button
            type="button"
            className="button-secondary text-xs"
            onClick={() => void upload()}
            disabled={busy || !file}
          >
            <UploadCloud size={15} />
            {busy
              ? kind === 'cover'
                ? 'Guardando portada…'
                : 'Subiendo…'
              : kind === 'cover'
                ? 'Reintentar guardar portada'
                : 'Subir archivo'}
          </button>
        )}
        {kind === 'video' && status && (
          <button
            type="button"
            className="button-secondary text-xs"
            onClick={() => void checkStatus()}
            disabled={busy || checking}
          >
            <RefreshCw size={14} />
            {checking ? 'Consultando…' : 'Actualizar estado'}
          </button>
        )}
      </div>
      {busy && (
        <div>
          <progress
            className="h-2 w-full accent-violet-500"
            max={100}
            value={kind === 'video' ? progress : undefined}
            aria-label="Progreso de carga"
          />
          {kind === 'video' && <p className="mt-1 text-xs text-slate-400">{progress}%</p>}
        </div>
      )}
      <p className="text-xs leading-relaxed text-slate-500">
        {kind === 'video'
          ? 'Carga directa a Cloudflare Stream. Mantené esta página abierta hasta que termine.'
          : kind === 'cover'
            ? 'La portada se guarda al elegirla. Esperá el mensaje “Portada actualizada” antes de salir. Recomendado: 1600 × 1000 px.'
            : 'Los alumnos con acceso reciben un enlace temporal para descargar.'}
      </p>
      {message && (
        <p
          role={failed ? 'alert' : 'status'}
          className={`text-xs leading-relaxed ${failed ? 'text-rose-300' : 'text-cyan-200'}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
