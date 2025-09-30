export async function bestLinkFor(model){
  const manifest = await fetch('/link_manifest.json').then(r=>r.json());
  const item = manifest.find(x => x.model === model);
  if(!item) return null;
  const sorted = [...item.destinations].sort((a,b)=>a.priority-b.priority);
  return sorted[0].url;
}
