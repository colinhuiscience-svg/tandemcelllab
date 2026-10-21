import { ArrowLeft, ArrowRight, Focus, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import type { SolarLayer } from "@/lib/solar-layers";

export function LayerExplorer({ layers, selected, onSelect }: { layers: SolarLayer[]; selected: string | null; onSelect: (id: string | null) => void }) {
  const index = layers.findIndex((layer) => layer.id === selected);
  const layer = layers[index];
  return (
    <aside className="layer-explorer" data-guide="layer-explorer" aria-label="Layer explorer">
      <div className="explorer-heading"><div><p className="section-label">LAYER EXPLORER</p><h2>{layers.length} layers <span>front → rear</span></h2></div>{layer && <Button variant="ghost" size="icon" aria-label="Show all layers" title="Show all layers" onClick={() => onSelect(null)}><X /></Button>}</div>
      {layer && <section className="focus-details" aria-label="Focused layer details">
        <p className="focus-number">LAYER {String(layer.number).padStart(2, "0")} / {layers.length}</p>
        <h3>{layer.name}</h3><p className="focus-role">{layer.role}</p>
        <p>{layer.detail}</p><dl><dt>Carrier / optical pathway</dt><dd>{layer.charge}</dd><dt>Physical scale</dt><dd>{layer.scale}</dd></dl>
        <div className="focus-navigation"><Button variant="outline" size="icon" aria-label="Previous layer" title="Previous layer" disabled={index <= 0} onClick={() => onSelect(layers[index - 1]?.id ?? null)}><ArrowLeft /></Button><Button variant="ghost" size="sm" onClick={() => onSelect(null)}>Full stack</Button><Button variant="outline" size="icon" aria-label="Next layer" title="Next layer" disabled={index >= layers.length - 1} onClick={() => onSelect(layers[index + 1]?.id ?? null)}><ArrowRight /></Button></div>
      </section>}
      <Accordion type="single" collapsible value={selected ?? ""} onValueChange={(value) => onSelect(value || null)} className="layer-accordion">
        {layers.map((item) => <AccordionItem key={item.id} value={item.id} className="layer-row">
          <AccordionTrigger className="layer-trigger"><span className={`layer-swatch material-${item.material}`} /><span className="layer-number">{String(item.number).padStart(2, "0")}</span><span className="layer-name">{item.name}</span></AccordionTrigger>
          <AccordionContent className="layer-description"><p>{item.introduction}</p><Button variant="ghost" size="sm" onClick={() => onSelect(item.id)}><Focus />Focus layer {item.number}</Button></AccordionContent>
        </AccordionItem>)}
      </Accordion>
    </aside>
  );
}
