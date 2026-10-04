import { BookOpen, Check, FileText, Play, Plus } from 'lucide-react';

export function StudioArtwork() {
  return (
    <div className="studio-artwork" aria-hidden="true">
      <div className="studio-preview-window">
        <div className="studio-preview-window-bar">
          <BookOpen size={14} />
          <span>Tu próximo curso</span>
          <span className="studio-preview-badge">Borrador</span>
        </div>
        <div className="studio-preview-window-body">
          <span className="eyebrow">DEL CONOCIMIENTO A LA PRÁCTICA</span>
          <h2>
            Una idea.
            <br />
            Muchas posibilidades.
          </h2>
          <div className="studio-preview-lesson">
            <Play size={15} />
            <span>Tu primera clase</span>
            <Check size={14} />
          </div>
          <div className="studio-preview-lesson">
            <FileText size={15} />
            <span>Material para ir más allá</span>
            <Check size={14} />
          </div>
          <span className="studio-preview-add">
            <Plus size={14} /> Un nuevo módulo
          </span>
        </div>
      </div>
      <div className="studio-preview-note">
        <Check size={17} />
        <span>
          Todo empieza con lo que sabés.<small>Vos creás. Nosotros te acompañamos.</small>
        </span>
      </div>
    </div>
  );
}
