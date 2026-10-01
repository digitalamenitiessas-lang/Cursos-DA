'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as tus from 'tus-js-client';
import { UploadCloud, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function UploadControl({
  kind,
  courseId,
  lessonId,
  initialStatus,
}: {
  kind: 'cover' | 'resource' | 'video';
  courseId?: string;
  lessonId?: string;
  initialStatus?: string;
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
  const uploadRef = useRef<tus.Upload | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      void uploadRef.current?.abort();
    },
    [],
  );
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
  async function upload() {
    if (!file) return;
    if (
      kind === 'video' &&
      initialStatus &&
      !window.confirm(
        '¿Reemplazar el video de esta clase? Mientras se procesa, la clase puede quedar temporalmente no disponible.',
      )
    )
      return;
    setBusy(true);
    setMessage('');
    setFailed(false);
    setProgress(0);
    try {
      const response = await fetch('/api/admin/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          courseId,
          lessonId,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          title: title || file.name,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo autorizar la carga.');
      if (kind === 'video') {
        await new Promise<void>((resolve, reject) => {
          const upload = new tus.Upload(file, {
            uploadUrl: data.uploadURL,
            chunkSize: 50 * 1024 * 1024,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            metadata: { name: file.name, filetype: file.type },
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
          .uploadToSignedUrl(data.path, data.token, file, {
            contentType: file.type || 'application/octet-stream',
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
            title: title || file.name,
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
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/10 p-4">
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
      <label className="field">
        <span className="sr-only">Seleccionar {label.toLowerCase()}</span>
        <input
          ref={inputRef}
          type="file"
          accept={
            kind === 'cover'
              ? 'image/jpeg,image/png,image/webp'
              : kind === 'video'
                ? 'video/*'
                : '.pdf,.zip,.txt,.csv,.docx,.xlsx,.pptx,.png,.jpg,.webp'
          }
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full min-w-0 text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-slate-200"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="button-secondary text-xs"
          onClick={() => void upload()}
          disabled={busy || !file}
        >
          <UploadCloud size={15} />
          {busy ? 'Subiendo…' : 'Subir archivo'}
        </button>
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
            ? 'JPG, PNG o WebP. Recomendado: 1600 × 1000 px.'
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
