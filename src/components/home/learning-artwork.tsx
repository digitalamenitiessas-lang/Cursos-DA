import { ArrowUpRight, CornerDownRight, Workflow } from 'lucide-react';

export function LearningArtwork() {
  return (
    <div className="learning-artwork workbench" aria-hidden="true">
      <div className="workbench-grid" />
      <div className="workbench-monogram" />
      <div className="workbench-heading">
        <span>DA / EN LA PRÁCTICA</span>
        <ArrowUpRight size={19} />
      </div>
      <div className="workbench-title">
        Una tarea.
        <br />
        Una herramienta.
        <br />
        <span>Algo resuelto.</span>
      </div>
      <div className="workbench-connection">
        <span />
        <CornerDownRight size={24} />
      </div>
      <div className="workbench-sheet">
        <div className="workbench-sheet-top">
          <Workflow size={19} />
          <span>DEL APRENDIZAJE AL TRABAJO</span>
        </div>
        <div>
          <span>Entendé</span>
          <i />
          <span>Probá</span>
          <i />
          <span>Aplicá</span>
        </div>
        <p>
          Una web, un proceso,
          <br />
          un material que puedas usar.
        </p>
      </div>
      <span className="workbench-footnote">FORMACIÓN + HERRAMIENTAS + CRITERIO</span>
    </div>
  );
}
