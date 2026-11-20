
/* SILMO Image Studio Phase 1 – isolierter 2D-Arbeitsbereich */
(() => {
  const tolerances = window.SILMOTolerances;
  if (!tolerances) throw new Error('SILMO Image Studio benötigt die Toleranz-API.');
  const $ = id => document.getElementById(id);
  const workspace = $('imageStudioWorkspace');
  const canvas = $('imageStudioCanvas');
  if (!workspace || !canvas) return;
  const ctx = canvas.getContext('2d');
  const state = { dataUrl:'', fileName:'', widthMM:100, rotation:0, contours:[] };
  let image = null;
  let zoom = 1;
  let panX = 0, panY = 0;
  let drawMode = false;
  let drawing = false;
  let currentContour = [];
  let panStart = null;
  let renderFrame = 0;

  function status(message) { $('imageStudioStatus').textContent = message; }
  function rotatedSize() {
    if (!image) return { width:0, height:0 };
    return state.rotation % 180 ? { width:image.naturalHeight, height:image.naturalWidth } : { width:image.naturalWidth, height:image.naturalHeight };
  }
  function physicalHeight() {
    const size = rotatedSize();
    return size.width ? state.widthMM * size.height / size.width : 0;
  }
  function fitScale(width, height) {
    const size = rotatedSize();
    return size.width && size.height ? Math.min(width / size.width, height / size.height) * 0.86 : 1;
  }
  function imageScale(width, height) { return fitScale(width, height) * zoom; }
  function applyImageTransform(context, width, height, scale) {
    context.translate(width / 2 + panX, height / 2 + panY);
    context.scale(scale, scale);
    context.rotate(state.rotation * Math.PI / 180);
    context.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
  }
  function render() {
    if (workspace.hidden) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const pixelWidth = Math.round(rect.width * dpr), pixelHeight = Math.round(rect.height * dpr);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; }
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,rect.width,rect.height);
    if (!image) { $('imageStudioEmpty').hidden = false; return; }
    $('imageStudioEmpty').hidden = true;
    const scale = imageScale(rect.width, rect.height);
    ctx.save();
    applyImageTransform(ctx,rect.width,rect.height,scale);
    ctx.drawImage(image,0,0);
    const drawContour = points => {
      if (!points || !points.length) return;
      ctx.beginPath(); ctx.moveTo(points[0][0],points[0][1]);
      for (let i=1;i<points.length;i++) ctx.lineTo(points[i][0],points[i][1]);
      if (points.length >= 3) ctx.closePath();
      ctx.lineWidth = 2 / scale;
      ctx.strokeStyle = '#53d8e8';
      ctx.fillStyle = '#53d8e822';
      if (points.length >= 3) ctx.fill();
      ctx.stroke();
      for (const point of points) {
        ctx.beginPath(); ctx.arc(point[0],point[1],3.5/scale,0,Math.PI*2);
        ctx.fillStyle = '#ffe58a'; ctx.fill();
      }
    };
    state.contours.forEach(drawContour);
    drawContour(currentContour);
    ctx.restore();
  }
  function scheduleRender() {
    if (renderFrame) return;
    renderFrame = requestAnimationFrame(() => { renderFrame = 0; render(); });
  }
  function updateDimensions() {
    const h = physicalHeight();
    $('imageStudioHeightMM').textContent = h ? h.toFixed(1) + ' mm' : '–';
  }
  function imagePoint(clientX,clientY) {
    if (!image) return null;
    const rect = canvas.getBoundingClientRect();
    const scale = imageScale(rect.width,rect.height);
    const lx = (clientX - rect.left - rect.width/2 - panX) / scale;
    const ly = (clientY - rect.top - rect.height/2 - panY) / scale;
    const angle = -state.rotation * Math.PI / 180;
    const c = Math.cos(angle), sn = Math.sin(angle);
    const x = c*lx - sn*ly + image.naturalWidth/2;
    const y = sn*lx + c*ly + image.naturalHeight/2;
    return [Math.max(0,Math.min(image.naturalWidth,x)),Math.max(0,Math.min(image.naturalHeight,y))];
  }
  function polygonArea(points) {
    let area=0;
    for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];}
    return Math.abs(area)/2;
  }
  function pointInPolygon(point, polygon) {
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const a=polygon[i],b=polygon[j];
      if(((a[1]>point[1])!==(b[1]>point[1])) &&
        point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1]||tolerances.IMAGE_POLYGON_RAY_DENOMINATOR_FALLBACK_PX)+a[0]) inside=!inside;
    }
    return inside;
  }

  function segmentDistance(a,b,c,d) {
    const orient=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
    const on=(p,q,r)=>Math.min(p[0],q[0])-tolerances.IMAGE_SEGMENT_BOUNDS_EPSILON_PX<=r[0]&&r[0]<=Math.max(p[0],q[0]) + tolerances.IMAGE_SEGMENT_BOUNDS_EPSILON_PX&&Math.min(p[1],q[1])-tolerances.IMAGE_SEGMENT_BOUNDS_EPSILON_PX<=r[1]&&r[1]<=Math.max(p[1],q[1]) + tolerances.IMAGE_SEGMENT_BOUNDS_EPSILON_PX;
    const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
    if((o1*o2<0&&o3*o4<0)||(Math.abs(o1)<tolerances.IMAGE_SEGMENT_ORIENTATION_EPSILON_PX2&&on(a,b,c))||(Math.abs(o2)<tolerances.IMAGE_SEGMENT_ORIENTATION_EPSILON_PX2&&on(a,b,d))||(Math.abs(o3)<tolerances.IMAGE_SEGMENT_ORIENTATION_EPSILON_PX2&&on(c,d,a))||(Math.abs(o4)<tolerances.IMAGE_SEGMENT_ORIENTATION_EPSILON_PX2&&on(c,d,b)))return 0;
    const pointDistance=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
    const pointSegment=(p,x,y)=>{const dx=y[0]-x[0],dy=y[1]-x[1],t=Math.max(0,Math.min(1,((p[0]-x[0])*dx+(p[1]-x[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-x[0]-t*dx,p[1]-x[1]-t*dy);};
    return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b),pointDistance(a,c),pointDistance(a,d),pointDistance(b,c),pointDistance(b,d));
  }
  function polygonIsSimple(poly) {
    if(!Array.isArray(poly)||poly.length<3||polygonArea(poly)<0.01)return false;
    const n=poly.length;
    for(let i=0;i<n;i++){
      const a=poly[i],b=poly[(i+1)%n];
      if(Math.hypot(a[0]-b[0],a[1]-b[1])<tolerances.IMAGE_POLYGON_MIN_EDGE_PX)return false;
      for(let j=i+1;j<n;j++){
        if(j===i||j===(i+1)%n||i===(j+1)%n)continue;
        if(segmentDistance(a,b,poly[j],poly[(j+1)%n])<tolerances.IMAGE_POLYGON_MIN_NONADJACENT_GAP_PX)return false;
      }
    }
    return true;
  }
  function minimumPolygonGap(a,b) {
    let gap=Infinity;
    for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
      gap=Math.min(gap,segmentDistance(a[i],a[(i+1)%a.length],b[j],b[(j+1)%b.length]));
      if(gap===0)return 0;
    }
    return gap;
  }
  function validatePrintableContours(outer,candidates,minWallMM=tolerances.IMAGE_MIN_WALL_THICKNESS_MM) {
    const accepted=[],rejected=[];
    if(!polygonIsSimple(outer))return {ok:false,holes:[],rejected:candidates.length,reason:'Die Aussenkontur ist nicht eindeutig geschlossen oder schneidet sich selbst.'};
    for(const hole of candidates){
      if(!polygonIsSimple(hole)){rejected.push('ungültige Kontur');continue;}
      const samples=hole.flatMap((p,i)=>{const q=hole[(i+1)%hole.length];return [p,[(p[0]+q[0])/2,(p[1]+q[1])/2]];});
      if(!samples.every(p=>pointInPolygon(p,outer))){rejected.push('ausserhalb der Aussenkontur');continue;}
      if(minimumPolygonGap(outer,hole)<minWallMM-tolerances.IMAGE_MIN_WALL_COMPARISON_EPSILON_MM){rejected.push('Wand zur Aussenkante zu dünn');continue;}
      if(accepted.some(other=>minimumPolygonGap(other,hole)<minWallMM-tolerances.IMAGE_MIN_WALL_COMPARISON_EPSILON_MM||pointInPolygon(hole[0],other)||pointInPolygon(other[0],hole))){rejected.push('Innenlöcher überlappen oder liegen zu nahe');continue;}
      accepted.push(hole);
    }
    return {ok:true,holes:accepted,rejected:rejected.length,reasons:rejected,minWallMM};
  }

  function autoTraceContours(sourceImage,sensitivity=55) {
    const maxSide=480,scale=Math.min(1,maxSide/Math.max(sourceImage.naturalWidth,sourceImage.naturalHeight));
    const w=Math.max(1,Math.round(sourceImage.naturalWidth*scale)),h=Math.max(1,Math.round(sourceImage.naturalHeight*scale));
    const sample=document.createElement('canvas');sample.width=w;sample.height=h;
    const sampleCtx=sample.getContext('2d',{willReadFrequently:true});sampleCtx.drawImage(sourceImage,0,0,w,h);
    const pixels=sampleCtx.getImageData(0,0,w,h).data;
    let transparentBorderSamples=0,transparentBorderPixels=0;
    for(let x=0;x<w;x++)for(const y of [0,h-1]){
      transparentBorderSamples++;
      if(pixels[(y*w+x)*4+3]<=24)transparentBorderPixels++;
    }
    for(let y=1;y<h-1;y++)for(const x of [0,w-1]){
      transparentBorderSamples++;
      if(pixels[(y*w+x)*4+3]<=24)transparentBorderPixels++;
    }
    const transparent=transparentBorderSamples>0&&transparentBorderPixels/transparentBorderSamples>=0.12;
    const labels=new Int32Array(w*h),components=[],queue=new Int32Array(w*h),similarity=42;
    for(let i=0;i<w*h;i++)if(pixels[i*4+3]<=24)labels[i]=-1;
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const startIndex=y*w+x;
      if(labels[startIndex]!==0)continue;
      const id=components.length+1,component={id,pixels:[],touchesBorder:false,touchesBackground:false,minX:x,minY:y,maxX:x,maxY:y};
      let head=0,tail=0;queue[tail++]=startIndex;labels[startIndex]=id;
      while(head<tail){
        const index=queue[head++],px=index%w,py=Math.floor(index/w),pi=index*4;
        component.pixels.push(index);
        component.minX=Math.min(component.minX,px);component.maxX=Math.max(component.maxX,px);
        component.minY=Math.min(component.minY,py);component.maxY=Math.max(component.maxY,py);
        if(px<=1||py<=1||px>=w-2||py>=h-2)component.touchesBorder=true;
        const neighbors=[index-1,index+1,index-w,index+w];
        for(const ni of neighbors){
          if(ni<0||ni>=w*h||labels[ni]!==0)continue;
          const ni4=ni*4,dr=pixels[pi]-pixels[ni4],dg=pixels[pi+1]-pixels[ni4+1],db=pixels[pi+2]-pixels[ni4+2];
          if(dr*dr+dg*dg+db*db<=similarity*similarity){labels[ni]=id;queue[tail++]=ni;}
        }
      }
      components.push(component);
    }
    const minComponentPixels=Math.max(4,Math.floor(w*h*tolerances.IMAGE_MIN_COMPONENT_AREA_FRACTION));
    const backgroundIds=new Set(components.filter(c=>c.touchesBorder).map(c=>c.id));
    for(const component of components){
      if(component.touchesBorder)continue;
      if(transparent){component.touchesBackground=false;continue;}
      for(const index of component.pixels){
        const x=index%w,y=Math.floor(index/w);
        if([index-1,index+1,index-w,index+w].some(ni=>ni>=0&&ni<w*h&&backgroundIds.has(labels[ni]))){component.touchesBackground=true;break;}
      }
    }

    const traceMask=(mask,minX,minY,maxX,maxY)=>{
      const edges=[],outgoing=new Map();
      const addEdge=(ax,ay,bx,by)=>{
        const index=edges.length,key=ax+','+ay;
        edges.push({ax,ay,bx,by,used:false});
        if(!outgoing.has(key))outgoing.set(key,[]);
        outgoing.get(key).push(index);
      };
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
        if(!mask[y*w+x])continue;
        if(!mask[(y-1)*w+x])addEdge(x,y,x+1,y);
        if(!mask[y*w+x+1])addEdge(x+1,y,x+1,y+1);
        if(!mask[(y+1)*w+x])addEdge(x+1,y+1,x,y+1);
        if(!mask[y*w+x-1])addEdge(x,y+1,x,y);
      }
      const direction=e=>e.bx>e.ax?0:e.by>e.ay?1:e.bx<e.ax?2:3;
      const turnPriority=[1,0,3,2],result=[];
      for(let seed=0;seed<edges.length;seed++){
        if(edges[seed].used)continue;
        const first=edges[seed],points=[[first.ax,first.ay]];
        let current=seed,guard=0;
        while(current!==undefined&&!edges[current].used&&guard++<=edges.length){
          const edge=edges[current];edge.used=true;points.push([edge.bx,edge.by]);
          if(edge.bx===first.ax&&edge.by===first.ay)break;
          const candidates=(outgoing.get(edge.bx+','+edge.by)||[]).filter(i=>!edges[i].used);
          if(!candidates.length){current=undefined;break;}
          const incoming=direction(edge);
          candidates.sort((ia,ib)=>{
            const ta=(direction(edges[ia])-incoming+4)%4,tb=(direction(edges[ib])-incoming+4)%4;
            return turnPriority.indexOf(ta)-turnPriority.indexOf(tb);
          });
          current=candidates[0];
        }
        if(points.length<5||points[0][0]!==points[points.length-1][0]||points[0][1]!==points[points.length-1][1])continue;
        points.pop();
        const compact=points.filter((p,i)=>{
          const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length];
          return (p[0]-prev[0])*(next[1]-p[1])!==(p[1]-prev[1])*(next[0]-p[0]);
        });
        if(compact.length<3)continue;
        const area=polygonArea(compact);if(area<6)continue;
        const anchor=compact[0],farthest=compact.reduce((best,p,i)=>{
          const d=Math.hypot(p[0]-anchor[0],p[1]-anchor[1]);return d>best.d?{i,d}:best;
        },{i:0,d:0}).i;
        const open=compact.slice(farthest).concat(compact.slice(0,farthest+1));
        const simplify=(pts,epsilon)=>{
          if(pts.length<=2)return pts;
          let max=epsilon,index=-1;
          const a=pts[0],b=pts[pts.length-1],dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy||1;
          for(let i=1;i<pts.length-1;i++){
            const p=pts[i],u=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den;
            const d=Math.hypot(p[0]-(a[0]+u*dx),p[1]-(a[1]+u*dy));
            if(d>max){max=d;index=i;}
          }
          if(index<0)return [a,b];
          const left=simplify(pts.slice(0,index+1),epsilon),right=simplify(pts.slice(index),epsilon);
          return left.slice(0,-1).concat(right);
        };
        let reduced=simplify(open,1.1).slice(0,-1);
        if(reduced.length>240){const step=Math.ceil(reduced.length/240);reduced=reduced.filter((p,i)=>i%step===0);}
        if(reduced.length>=3)result.push({area,points:reduced.map(([x,y])=>[x/scale,y/scale])});
      }
      return result;
    };

    // v83: Randmodell + zusammenhaengende Hintergrundsuche.
    // Mehrere Randfarben erlauben auch leichte Schatten und Farbverlaeufe;
    // nur vom Bildrand erreichbare Hintergrundbereiche werden entfernt.
    const borderSamples=[];
    const sampleStep=Math.max(1,Math.floor(Math.max(w,h)/180));
    for(let x=0;x<w;x+=sampleStep){
      for(const y of [0,h-1]){
        const i=(y*w+x)*4;if(pixels[i+3]>24)borderSamples.push([pixels[i],pixels[i+1],pixels[i+2]]);
      }
    }
    for(let y=0;y<h;y+=sampleStep){
      for(const x of [0,w-1]){
        const i=(y*w+x)*4;if(pixels[i+3]>24)borderSamples.push([pixels[i],pixels[i+1],pixels[i+2]]);
      }
    }
    const medianChannel=channel=>{
      const values=borderSamples.map(c=>c[channel]).sort((a,b)=>a-b);
      return values.length?values[Math.floor(values.length/2)]:255;
    };
    const backgroundColor=[medianChannel(0),medianChannel(1),medianChannel(2)];
    const borderSpread=borderSamples.length?borderSamples.map(c=>Math.hypot(c[0]-backgroundColor[0],c[1]-backgroundColor[1],c[2]-backgroundColor[2])).sort((a,b)=>a-b)[Math.floor(borderSamples.length*0.75)]:0;
    const backgroundThreshold=Math.max(28,Math.min(76,borderSpread*2.6+20));
    const palette=[];
    if(borderSamples.length){
      const paletteStep=Math.max(1,Math.floor(borderSamples.length/48));
      for(let i=0;i<borderSamples.length;i+=paletteStep){
        const color=borderSamples[i];
        if(Math.hypot(color[0]-backgroundColor[0],color[1]-backgroundColor[1],color[2]-backgroundColor[2])<=backgroundThreshold*1.8)palette.push(color);
      }
    }
    if(!palette.length)palette.push(backgroundColor);
    const backgroundCandidate=new Uint8Array(w*h);
    const foregroundMask=new Uint8Array(w*h);
    const luminance=new Float32Array(w*h);
    const luminanceValues=[];
    const colorDistance=new Float32Array(w*h),distanceHistogram=new Uint32Array(442);
    for(let i=0;i<w*h;i++){
      const p=i*4,alpha=pixels[p+3];
      const lum=0.2126*pixels[p]+0.7152*pixels[p+1]+0.0722*pixels[p+2];
      luminance[i]=lum;
      if(alpha<=24)continue;
      if(transparent){foregroundMask[i]=1;luminanceValues.push(lum);continue;}
      let nearest=Infinity;
      for(const color of palette){
        const distance=Math.hypot(pixels[p]-color[0],pixels[p+1]-color[1],pixels[p+2]-color[2]);
        if(distance<nearest)nearest=distance;
      }
      colorDistance[i]=nearest;
      distanceHistogram[Math.min(441,Math.round(nearest))]++;
    }
    // Adaptive color-distance threshold: low-contrast objects (for example a
    // pale ghost on a light grey background) need a lower threshold than the
    // old fixed 28 RGB floor. Otsu separates the dominant border-like pixels
    // from the foreground, while the existing border estimate remains a cap
    // so noisy photographs cannot make the threshold grow without control.
    let distanceTotal=0;for(let i=0;i<442;i++)distanceTotal+=i*distanceHistogram[i];
    let distanceWeight=0,distanceSum=0,distanceVariance=-1,otsuDistance=backgroundThreshold;
    for(let i=0;i<442;i++){
      distanceWeight+=distanceHistogram[i];distanceSum+=i*distanceHistogram[i];
      const foregroundWeight=w*h-distanceWeight;
      if(!distanceWeight||!foregroundWeight)continue;
      const meanBackground=distanceSum/distanceWeight;
      const meanForeground=(distanceTotal-distanceSum)/foregroundWeight;
      const variance=distanceWeight*foregroundWeight*(meanBackground-meanForeground)*(meanBackground-meanForeground);
      if(variance>distanceVariance){distanceVariance=variance;otsuDistance=i;}
    }
    const normalizedSensitivity=Math.max(0,Math.min(100,Number(sensitivity)||0));
    // 55 % entspricht dem bisherigen v86-Standard. Höhere Werte senken
    // die Hintergrundschwelle, damit blasse Motivkanten erhalten bleiben.
    const sensitivityFactor=0.55-normalizedSensitivity*0.0036363636;
    const adaptiveBackgroundThreshold=Math.max(4,Math.min(24,backgroundThreshold,Math.floor(otsuDistance*sensitivityFactor)));
    for(let i=0;i<w*h;i++){
      if(pixels[i*4+3]<=24)continue;
      if(transparent)continue;
      if(colorDistance[i]<=adaptiveBackgroundThreshold)backgroundCandidate[i]=1;
    }
    if(!transparent){
      // Flood-fill nur vom Rand aus: helle Augen/helle Flecken innerhalb einer
      // dunklen Form bleiben dadurch Teil des Motivs statt Hintergrund zu werden.
      const backgroundSeen=new Uint8Array(w*h),backgroundQueue=new Int32Array(w*h);
      let head=0,tail=0;
      const seedBackground=index=>{
        if(index>=0&&index<w*h&&backgroundCandidate[index]&&!backgroundSeen[index]){
          backgroundSeen[index]=1;backgroundQueue[tail++]=index;
        }
      };
      for(let x=0;x<w;x++){seedBackground(x);seedBackground((h-1)*w+x);}
      for(let y=0;y<h;y++){seedBackground(y*w);seedBackground(y*w+w-1);}
      while(head<tail){
        const index=backgroundQueue[head++];
        seedBackground(index-1);seedBackground(index+1);seedBackground(index-w);seedBackground(index+w);
      }
      for(let i=0;i<w*h;i++)if(pixels[i*4+3]>24&&!backgroundSeen[i]){
        foregroundMask[i]=1;
        luminanceValues.push(luminance[i]);
      }
    }
    if(!luminanceValues.length)throw new Error('Kein Motiv vor dem Bildhintergrund gefunden. Bitte ein Bild mit klar erkennbarem Motiv verwenden.');
    luminanceValues.sort((a,b)=>a-b);
    const medianLuminance=luminanceValues[Math.floor(luminanceValues.length/2)];
    // Robuste Detail-Schwelle: deutlich niedriger als die alte fixe 48er-
    // Schwelle, aber an den Helligkeitskontrast des Motivs angepasst.
    const histogram=new Uint32Array(256);
    for(const value of luminanceValues)histogram[Math.max(0,Math.min(255,Math.round(value)))]++;
    let totalSum=0;for(let i=0;i<256;i++)totalSum+=i*histogram[i];
    let backgroundWeight=0,backgroundSum=0,bestVariance=-1,otsuThreshold=medianLuminance;
    for(let i=0;i<256;i++){
      backgroundWeight+=histogram[i];backgroundSum+=i*histogram[i];
      const foregroundWeight=luminanceValues.length-backgroundWeight;
      if(!backgroundWeight||!foregroundWeight)continue;
      const meanBackground=backgroundSum/backgroundWeight;
      const meanForeground=(totalSum-backgroundSum)/foregroundWeight;
      const variance=backgroundWeight*foregroundWeight*(meanBackground-meanForeground)*(meanBackground-meanForeground);
      if(variance>bestVariance){bestVariance=variance;otsuThreshold=i;}
    }
    const detailThreshold=Math.max(26,Math.abs(otsuThreshold-medianLuminance)*0.35);
    const detailMask=new Uint8Array(w*h);
    for(let i=0;i<w*h;i++)if(foregroundMask[i]&&Math.abs(luminance[i]-medianLuminance)>=detailThreshold)detailMask[i]=1;

    const extractMaskContours=(mask,minArea,maxContours)=>{
      const seen=new Uint8Array(w*h),found=[];
      const work=new Int32Array(w*h);
      for(let seed=0;seed<w*h;seed++){
        if(!mask[seed]||seen[seed])continue;
        let head=0,tail=0,minX=w,minY=h,maxX=0,maxY=0;
        work[tail++]=seed;seen[seed]=1;
        while(head<tail){
          const index=work[head++],x=index%w,y=Math.floor(index/w);
          minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
          const neighbors=[index-1,index+1,index-w,index+w];
          for(const ni of neighbors){
            if(ni<0||ni>=w*h||seen[ni]||!mask[ni])continue;
            if(Math.abs((ni%w)-x)+Math.abs(Math.floor(ni/w)-y)!==1)continue;
            seen[ni]=1;work[tail++]=ni;
          }
        }
        if(tail<minArea)continue;
        const componentMask=new Uint8Array(w*h);
        for(let i=0;i<tail;i++)componentMask[work[i]]=1;
        found.push(...traceMask(componentMask,minX,minY,maxX,maxY));
      }
      found.sort((a,b)=>b.area-a.area);
      return found.slice(0,maxContours);
    };

    const outerContours=extractMaskContours(foregroundMask,minComponentPixels,8);
    const detailContours=extractMaskContours(detailMask,minComponentPixels,40);
    const loops=detailContours.concat(outerContours).sort((a,b)=>a.area-b.area);
    if(!outerContours.length)throw new Error('Die Aussenkontur des Motivs konnte nicht erkannt werden. Bitte Hintergrund und Motiv möglichst klar abgrenzen.');
    if(!loops.length)throw new Error('Aus dem Bild konnte keine geschlossene Kontur erstellt werden.');
    loops.sort((a,b)=>a.area-b.area);
    return loops.slice(-48).map(loop=>loop.points);
  }
  function autoTraceContour(sourceImage) {
    const contours=autoTraceContours(sourceImage);
    return contours[contours.length-1];
  }

  function setImage(dataUrl,fileName) {
    return new Promise((resolve,reject) => {
      const next = new Image();
      next.onload = () => {
        if (!next.naturalWidth || !next.naturalHeight || next.naturalWidth*next.naturalHeight > 40000000) { reject(new Error('Das Bild ist ungültig oder grösser als 40 Megapixel.')); return; }
        image = next; state.dataUrl = dataUrl; state.fileName = fileName || 'Bildvorlage';
        state.contours = []; state.rotation = 0; zoom = 1; panX = 0; panY = 0;
        $('imageStudioWidthMM').value = String(state.widthMM);
        updateDimensions(); scheduleRender();
        resolve();
      };
      next.onerror = () => reject(new Error('Die Bilddatei konnte nicht geöffnet werden.'));
      next.src = dataUrl;
    });
  }
  function readDataUrl(file) {
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Die Bilddatei konnte nicht gelesen werden.'));
      reader.readAsDataURL(file);
    });
  }
  function openWorkspace() { workspace.hidden = false; updateDimensions(); scheduleRender(); }
  function closeWorkspace() { workspace.hidden = true; }
  $('imageStudioLaunch').addEventListener('click',openWorkspace);
  $('imageStudioBack').addEventListener('click',closeWorkspace);
  $('imageStudioFileInput').addEventListener('change',async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      if (!['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('Bitte eine PNG-, JPG- oder WebP-Datei auswählen.');
      if (file.size > 8*1024*1024) throw new Error('Die Bilddatei darf maximal 8 MB gross sein.');
      const dataUrl = await readDataUrl(file);
      await setImage(dataUrl,file.name);
      status('Bild geladen: '+file.name+' ('+image.naturalWidth+' × '+image.naturalHeight+' px).');
    } catch(error) { status(error.message || 'Bild konnte nicht geladen werden.'); }
    event.target.value = '';
  });
  $('imageStudioWidthMM').addEventListener('change',() => {
    const value = Number($('imageStudioWidthMM').value);
    if (!Number.isFinite(value) || value < 5 || value > 2000) { $('imageStudioWidthMM').value=String(state.widthMM); status('Die Bildbreite muss zwischen 5 und 2000 mm liegen.'); return; }
    state.widthMM=value; updateDimensions(); status('Bildgrösse aktualisiert.'); scheduleRender();
  });
  $('imageStudioRotate').addEventListener('click',() => {
    if (!image) { status('Lade zuerst ein Bild.'); return; }
    state.rotation=(state.rotation+90)%360; updateDimensions(); scheduleRender(); status('Bildansicht um 90° gedreht.');
  });
  $('imageStudioFit').addEventListener('click',() => { zoom=1;panX=0;panY=0;scheduleRender();status('Ansicht eingepasst.'); });
  const sensitivityInput=$('imageStudioSensitivity'),sensitivityValue=$('imageStudioSensitivityValue');
  sensitivityInput.addEventListener('input',()=>{sensitivityValue.textContent=sensitivityInput.value+' %';});
  $('imageStudioAutoTrace').addEventListener('click',() => {
    if(!image){status('Lade zuerst ein Bild.');return;}
    try{
      const contours=autoTraceContours(image,Number(sensitivityInput.value));
      state.contours=contours;
      drawMode=false;$('imageStudioDrawToggle').setAttribute('aria-pressed','false');
      $('imageStudioDrawToggle').textContent='✎ Kontur zeichnen: AUS';canvas.classList.remove('isw-drawing');
      scheduleRender();status(contours.length+' Konturen erkannt. Die grösste Aussenkontur liegt zuletzt; Details bitte prüfen und bei Bedarf manuell korrigieren.');
    }catch(error){status(error.message||'Kontur konnte nicht vorgeschlagen werden.');}
  });
  window.__silmoImageStudioAutoTraceTest = dataUrl => new Promise((resolve,reject)=>{
    const probe=new Image();probe.onload=()=>{try{resolve(autoTraceContour(probe));}catch(e){reject(e);}};probe.onerror=()=>reject(new Error('Testbild konnte nicht geladen werden.'));probe.src=dataUrl;
  });
  window.__silmoImageStudioValidateForPrintTest = (outer,holes,minWallMM=tolerances.IMAGE_MIN_WALL_THICKNESS_MM) => validatePrintableContours(outer,holes,minWallMM);
  window.__silmoImageStudioAutoTraceAllTest = (dataUrl,sensitivity=55) => new Promise((resolve,reject)=>{
    const probe=new Image();probe.onload=()=>{try{resolve(autoTraceContours(probe,sensitivity));}catch(e){reject(e);}};probe.onerror=()=>reject(new Error('Testbild konnte nicht geladen werden.'));probe.src=dataUrl;
  });
  $('imageStudioDrawToggle').addEventListener('click',() => {
    drawMode=!drawMode; $('imageStudioDrawToggle').setAttribute('aria-pressed',String(drawMode));
    $('imageStudioDrawToggle').textContent=drawMode?'✎ Kontur zeichnen: EIN':'✎ Kontur zeichnen: AUS';
    canvas.classList.toggle('isw-drawing',drawMode);
    status(drawMode?'Zeichenmodus aktiv: Ziehe eine geschlossene Aussenkontur.':'Zeichenmodus aus: Ziehen verschiebt die Ansicht.');
  });
  $('imageStudioUndo').addEventListener('click',() => { if(currentContour.length){currentContour=[];drawing=false;}else state.contours.pop();scheduleRender();status('Letzte Kontur entfernt.'); });
  $('imageStudioClear').addEventListener('click',() => { state.contours=[];currentContour=[];drawing=false;scheduleRender();status('Alle Konturen gelöscht.'); });
  canvas.addEventListener('pointerdown',event => {
    if (!image) return;
    canvas.setPointerCapture(event.pointerId);
    if (drawMode) { drawing=true;currentContour=[imagePoint(event.clientX,event.clientY)]; }
    else { panStart={x:event.clientX,y:event.clientY,panX,panY};canvas.style.cursor='grabbing'; }
    event.preventDefault();scheduleRender();
  });
  canvas.addEventListener('pointermove',event => {
    if (drawing && drawMode) {
      const point=imagePoint(event.clientX,event.clientY),last=currentContour[currentContour.length-1];
      if(point&&(!last||Math.hypot(point[0]-last[0],point[1]-last[1])>Math.max(1,2/imageScale(canvas.clientWidth,canvas.clientHeight)))) currentContour.push(point);
      scheduleRender();
    } else if(panStart) {
      panX=panStart.panX+event.clientX-panStart.x;panY=panStart.panY+event.clientY-panStart.y;scheduleRender();
    }
  });
  const endPointer = () => {
    if(drawing&&drawMode){
      drawing=false;
      if(currentContour.length>=3&&polygonArea(currentContour)>0.5){state.contours.push(currentContour.slice(0,5000));status('Kontur gespeichert ('+currentContour.length+' Punkte).');}
      else status('Die Kontur braucht mindestens drei Punkte und eine Fläche.');
      currentContour=[];
    }
    panStart=null;canvas.style.cursor=drawMode?'crosshair':'grab';scheduleRender();
  };
  canvas.addEventListener('pointerup',endPointer);
  canvas.addEventListener('pointercancel',endPointer);
  canvas.addEventListener('wheel',event => {
    if(!image)return;event.preventDefault();
    zoom=Math.max(0.25,Math.min(8,zoom*(event.deltaY<0?1.12:1/1.12)));scheduleRender();
  },{passive:false});
  $('imageStudioCreate3D').addEventListener('click',() => {
    if(!image){status('Lade zuerst ein Bild.');return;}
    if(!state.contours.length){status('Erkenne zuerst die Konturen des Bildes.');return;}
    const widthMM=Number($('imageStudioWidthMM').value),heightMM=physicalHeight(),extrusionMM=Number($('imageStudioExtrusionMM').value);
    if(!Number.isFinite(widthMM)||widthMM<5||widthMM>2000||!Number.isFinite(extrusionMM)||extrusionMM<0.1||extrusionMM>2000){status('Bitte gültige Masse eingeben.');return;}
    const rotated=rotatedSize(),rotation=((state.rotation%360)+360)%360;
    const mapContour=contour=>contour.map(([x,y])=>{
      let u=x,v=y;
      if(rotation===90){u=image.naturalHeight-y;v=x;}
      else if(rotation===180){u=image.naturalWidth-x;v=image.naturalHeight-y;}
      else if(rotation===270){u=y;v=image.naturalWidth-x;}
      return [u/rotated.width*widthMM-widthMM/2,heightMM/2-v/rotated.height*heightMM];
    }).filter(point=>point.every(Number.isFinite));
    const mapped=state.contours.map(mapContour).filter(points=>points.length>=3&&polygonArea(points)>=tolerances.IMAGE_MIN_PRINT_CONTOUR_AREA_MM2);
    if(!mapped.length){status('Es wurde keine gültige geschlossene Kontur gefunden.');return;}
    let outerIndex=0;
    for(let i=1;i<mapped.length;i++)if(polygonArea(mapped[i])>polygonArea(mapped[outerIndex]))outerIndex=i;
    const points=mapped[outerIndex],candidates=[];
    for(let i=0;i<mapped.length;i++){
      if(i===outerIndex)continue;
      const candidate=mapped[i],area=polygonArea(candidate);
      if(area<tolerances.IMAGE_MIN_PRINT_CONTOUR_AREA_MM2||area>=polygonArea(points)*0.8)continue;
      candidates.push(candidate);
    }
    // Druckbarkeit: keine selbstschneidenden Konturen und mindestens 0,8 mm
    // Material zwischen Aussparungen sowie zwischen Loch und Aussenkante.
    const printCheck=validatePrintableContours(points,candidates,tolerances.IMAGE_MIN_WALL_THICKNESS_MM);
    if(!printCheck.ok){status(printCheck.reason+' Bitte Kontur manuell korrigieren.');return;}
    const holes=printCheck.holes;
    const result=window.__silmoImageStudioCreateFromPoints?.(points,extrusionMM,holes);
    if(result?.ok){
      const warning=printCheck.rejected?' '+printCheck.rejected+' zu kleine/zu nahe Innenkonturen wurden zum Schutz der Druckbarkeit ausgelassen.':'';
      status('3D-Körper erstellt: '+result.label+' – '+holes.length+' druckbare Aussparungen übernommen.'+warning);
      closeWorkspace();
    } else status(result?.message||'Die Kontur konnte nicht an den CAD-Arbeitsbereich übergeben werden.');
  });
  window.addEventListener('resize',scheduleRender);
  window.addEventListener('keydown',event => { if(!workspace.hidden&&event.key==='Escape'){event.preventDefault();closeWorkspace();} },true);

  window.__silmoImageStudioExport = () => state.dataUrl ? {
    version:1,fileName:state.fileName,dataUrl:state.dataUrl,widthMM:state.widthMM,rotation:state.rotation,
    contours:state.contours.map(contour=>contour.map(point=>[point[0],point[1]]))
  } : null;
  window.__silmoImageStudioImport = async saved => {
    if(!saved){image=null;state.dataUrl='';state.fileName='';state.contours=[];state.rotation=0;zoom=1;panX=0;panY=0;updateDimensions();scheduleRender();return true;}
    if(saved.version!==1||typeof saved.dataUrl!=='string'||saved.dataUrl.length>12000000||
       !/^data:image\/(png|jpeg|webp);base64,/i.test(saved.dataUrl)||
       !Number.isFinite(saved.widthMM)||saved.widthMM<5||saved.widthMM>2000||
       ![0,90,180,270].includes(saved.rotation)||!Array.isArray(saved.contours)||saved.contours.length>48) {
      throw new Error('Ungültige Image-Studio-Daten in der Projektdatei.');
    }
    await setImage(saved.dataUrl,typeof saved.fileName==='string'?saved.fileName.slice(0,180):'Bildvorlage');
    state.widthMM=saved.widthMM;state.rotation=saved.rotation;$('imageStudioWidthMM').value=String(state.widthMM);
    state.contours=saved.contours.filter(contour=>Array.isArray(contour)&&contour.length>=3&&contour.length<=5000&&contour.every(point=>Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)&&point[0]>=0&&point[1]>=0&&point[0]<=image.naturalWidth&&point[1]<=image.naturalHeight)).map(contour=>contour.map(point=>[point[0],point[1]]));
    $('imageStudioWidthMM').value=String(state.widthMM);updateDimensions();scheduleRender();return true;
  };
  window.__silmoImageStudioSnapshot = () => ({loaded:!!image,fileName:state.fileName,widthMM:state.widthMM,rotation:state.rotation,contourCount:state.contours.length,pointCount:state.contours.reduce((sum,item)=>sum+item.length,0)});
})();
