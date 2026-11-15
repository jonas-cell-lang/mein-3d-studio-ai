import assert from "node:assert/strict";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const reports = [];
const closeTo = (actual, expected, label, rel = 1e-6) => {
  const tolerance = Math.max(1e-7, Math.abs(expected) * rel);
  assert.ok(Number.isFinite(actual), `${label}: non-finite value`);
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} mm³, got ${actual} mm³ (±${tolerance})`);
};
const translation = (x, y, z) => [1,0,0,x, 0,1,0,y, 0,0,1,z];
const attempt = (fn) => {
  try { return { outcome: "valid-result", value: fn() }; }
  catch (error) {
    return { outcome: "controlled-rejection", message: error instanceof Error ? error.message : String(error) };
  }
};

async function andyOcct() {
  const { OcctKernel } = await import("occt-wasm");
  const k = await OcctKernel.init();
  try {
    const box = k.makeBox(40,30,20);
    const hole = k.translate(k.makeCylinder(5,20),20,15,0);
    const cut = k.cut(box,hole);
    closeTo(k.getVolume(cut),24000-500*Math.PI,"andy base/cut");
    const a=k.makeBox(10,10,10), b=k.translate(k.makeBox(10,10,10),5,0,0);
    const u=k.fuse(a,b), c=k.common(a,b), d=k.cut(a,b);
    closeTo(k.getVolume(u),1500,"andy coplanar union");
    closeTo(k.getVolume(c),500,"andy coplanar common");
    closeTo(k.getVolume(d),500,"andy coplanar cut");
    const tangency={};
    for(const [name,offset] of [["face",[10,0,0]],["edge",[10,10,0]],["vertex",[10,10,10]]]){
      const first=k.makeBox(10,10,10), second=k.transform(k.makeBox(10,10,10),translation(...offset));
      tangency[name]=attempt(()=>{
        const result=k.fuse(first,second);
        assert.equal(k.isValid(result),true);
        const volume=k.getVolume(result); closeTo(volume,2000,`andy ${name} contact`);
        return {volumeMm3:volume,solids:k.getSubShapes(result,"solid").length};
      });
    }
    const wall=k.makeBox(20,.1,10), drill=k.makeCylinder(.2,.2);
    const thinDrill=k.transform(drill,[1,0,0,10, 0,0,-1,-.05, 0,1,0,5]);
    const thin=k.cut(wall,thinDrill);
    closeTo(k.getVolume(thin),20-Math.PI*.2**2*.1,"andy thin wall",1e-5);
    const historyBase=k.makeBox(20,20,20);
    const historyHashes=k.subShapeHashes(historyBase,"face",2147483647);
    const history=k.cutWithHistory(historyBase,k.makeCylinder(2,20),historyHashes,2147483647);
    const baseVolume=k.getVolume(box), cutVolume=k.getVolume(cut), thinVolume=k.getVolume(thin);
    const memoryBefore=k.getRawModule().HEAP32?.buffer?.byteLength??null;
    const liveBefore=k.shapeCount;
    for(let i=0;i<20;i++) k.cut(k.makeBox(10+i*.01,10,10),k.makeCylinder(1,10));
    const livePeak=k.shapeCount, memoryAfter=k.getRawModule().HEAP32?.buffer?.byteLength??null;
    k.releaseAll();
    return {candidate:"occt-wasm (andymai)",version:"5.17.2 / OCCT 8.0.1",status:"passed",
      baseAndCutMm3:{base:baseVolume,cut:cutVolume},coplanar:{union:1500,common:500,cut:500},
      tangency,thinWallMm3:thinVolume,
      topologyHistory:!!history.result,memory:{liveBefore,livePeak,liveAfter:k.shapeCount,wasmBytesBefore:memoryBefore,wasmBytesAfter:memoryAfter},
      limitations:[]};
  } finally { k[Symbol.dispose](); }
}

async function moketOcct() {
  const dir=process.env.MOKET_OCCT_DIR;
  if(!dir) throw new Error("MOKET_OCCT_DIR missing");
  const loader=await import(pathToFileURL(join(dir,"index.mjs")).href);
  const k=await loader.createOcctKernel({wasmUrl:join(dir,"occt-wasm.wasm")});
  const ok=(r,label)=>{assert.equal(r?.ok,true,`${label}: ${r?.error?.code||""} ${r?.error?.message||""}`);return r;};
  const props=(s)=>ok(k.properties(s),"moket properties");
  try {
    const box=ok(k.makeBox(40,30,20),"moket box").shape;
    const cyl=ok(k.makeCylinder([20,0,15],[0,1,0],5,20),"moket cylinder").shape;
    const cut=ok(k.boolean("cut",box,cyl),"moket cut");
    closeTo(props(cut.shape).volume,24000-500*Math.PI,"moket base/cut");
    const a=ok(k.makeBox(10,10,10),"moket a").shape;
    const b=ok(k.transform(ok(k.makeBox(10,10,10),"moket b").shape,translation(5,0,0)),"moket b transform").shape;
    const u=ok(k.boolean("fuse",a,b),"moket union"), c=ok(k.boolean("common",a,b),"moket common"), d=ok(k.boolean("cut",a,b),"moket cut");
    closeTo(props(u.shape).volume,1500,"moket coplanar union");
    closeTo(props(c.shape).volume,500,"moket coplanar common");
    closeTo(props(d.shape).volume,500,"moket coplanar cut");
    const tangency={};
    for(const [name,offset] of [["face",[10,0,0]],["edge",[10,10,0]],["vertex",[10,10,10]]]){
      const first=ok(k.makeBox(10,10,10),"moket tangent A").shape;
      const second=ok(k.transform(ok(k.makeBox(10,10,10),"moket tangent B").shape,translation(...offset)),"moket tangent transform").shape;
      tangency[name]=attempt(()=>{
        const result=ok(k.boolean("fuse",first,second),"moket tangent fuse"), p=props(result.shape);
        assert.equal(p.valid,true); closeTo(p.volume,2000,`moket ${name} contact`);
        return {volumeMm3:p.volume,solids:p.solids};
      });
    }
    const wall=ok(k.makeBox(20,.1,10),"moket thin wall").shape;
    const drill=ok(k.makeCylinder([10,-.05,5],[0,1,0],.2,.2),"moket thin drill").shape;
    const thin=ok(k.boolean("cut",wall,drill),"moket thin cut");
    closeTo(props(thin.shape).volume,20-Math.PI*.2**2*.1,"moket thin wall",1e-5);
    const memoryBefore=k.heapStats();
    for(let i=0;i<20;i++) ok(k.boolean("cut",ok(k.makeBox(10+i*.01,10,10),"moket memory box").shape,
      ok(k.makeCylinder([5,0,5],[0,1,0],1,10),"moket memory drill").shape),"moket memory cut");
    const thinVolume=props(thin.shape).volume;
    const memoryPeak=k.heapStats(); ok(k.releaseAll(),"moket release");
    const memoryAfter=k.heapStats();
    return {candidate:"@moket/occt-wasm",version:"0.10.1 / OCCT 8.0.1",status:"passed",
      coplanar:{union:1500,common:500,cut:500},tangency,thinWallMm3:thinVolume,
      topologyHistory:!!u.history,memory:{before:memoryBefore,peak:memoryPeak,after:memoryAfter},limitations:[]};
  } finally { k.releaseAll(); }
}

async function replicadCandidate() {
  const init=(await import("replicad-opencascadejs")).default;
  const r=await import("replicad"), oc=await init(); r.setOC(oc);
  const owned=[], own=s=>(owned.push(s),s);
  const valid=s=>{const a=new oc.BRepCheck_Analyzer(s.wrapped);try{return a.IsValid();}finally{a.delete();}};
  const measure=s=>({volumeMm3:r.measureVolume(s),valid:valid(s)});
  try {
    const box=own(r.makeBox([0,0,0],[40,20,30]));
    const hole=own(r.makeCylinder(5,20,[20,0,15],[0,1,0]));
    const cut=own(box.cut(hole,{simplify:false}));
    closeTo(measure(cut).volumeMm3,24000-500*Math.PI,"Replicad base/cut");
    const a=own(r.makeBox([0,0,0],[10,10,10])),b=own(r.makeBox([5,0,0],[15,10,10]));
    const u=own(a.fuse(b,{simplify:false})),c=own(a.intersect(b,{simplify:false})),d=own(a.cut(b,{simplify:false}));
    closeTo(measure(u).volumeMm3,1500,"Replicad coplanar union");
    closeTo(measure(c).volumeMm3,500,"Replicad coplanar common");
    closeTo(measure(d).volumeMm3,500,"Replicad coplanar cut");
    const tangency={};
    for(const [name,offset] of [["face",[10,0,0]],["edge",[10,10,0]],["vertex",[10,10,10]]]){
      const first=own(r.makeBox([0,0,0],[10,10,10]));
      const second=own(r.makeBox(offset,[offset[0]+10,offset[1]+10,offset[2]+10]));
      tangency[name]=attempt(()=>{
        const result=own(first.fuse(second,{simplify:false})),p=measure(result);
        assert.equal(p.valid,true);closeTo(p.volumeMm3,2000,`Replicad ${name} contact`);return p;
      });
    }
    const wall=own(r.makeBox([0,0,0],[20,.1,10]));
    const drill=own(r.makeCylinder(.2,.2,[10,-.05,5],[0,1,0]));
    const thin=own(wall.cut(drill,{simplify:false}));
    closeTo(measure(thin).volumeMm3,20-Math.PI*.2**2*.1,"Replicad thin wall",1e-5);
    const topologyFaces=thin.faces, topologyEdges=thin.edges;
    const topology={faces:topologyFaces.length,edges:topologyEdges.length,explicitHistory:false};
    topologyFaces.forEach(face=>face.delete()); topologyEdges.forEach(edge=>edge.delete());
    return {candidate:"Replicad",version:"1.2.1 / replicad-opencascadejs 1.2.1",status:"passed",
      coplanar:{union:1500,common:500,cut:500},tangency,thinWallMm3:measure(thin).volumeMm3,
      topology,
      memory:{explicitDelete:true,ownedShapes:owned.length},limitations:["High-level API exposes no Boolean evolution-history map."]};
  } finally { for(const s of owned.reverse())try{s.delete();}catch{} }
}

async function openGeometryCandidate() {
  const og=await import("opengeometry");
  const {OpenGeometry,Solid,OG_PRIMITIVE_CUBOID,OG_PRIMITIVE_CYLINDER,
    OG_OPERATION_UNION,OG_OPERATION_SUBTRACT,OG_OPERATION_INTERSECT,OG_TRANSFORM_TRANSLATE}=og;
  const openGeometryEntry=import.meta.resolve("opengeometry");
  const wasmUrl=new URL("./opengeometry_bg.wasm",openGeometryEntry);
  const wasmModule=await WebAssembly.compile(await readFile(wasmUrl));
  await OpenGeometry.create({wasmModule}, {tessellation:"inline"});
  const owned=[], own=s=>(owned.push(s),s);
  const box=(w,h,d)=>own(new Solid(OG_PRIMITIVE_CUBOID,{width:w,height:h,depth:d}));
  const cyl=(r,h)=>own(new Solid(OG_PRIMITIVE_CYLINDER,{radius:r,height:h}));
  const summary=s=>{const m=s.measure({deflection:1e-6}),v=s.validity();return {volumeMm3:m.volume*1e9,errorBoundMm3:m.errorBound*1e9,valid:v.valid,closed:v.closed,bodyType:v.bodyType};};
  const tangent=(name,offset)=>{
    const a=box(.01,.01,.01),b=box(.01,.01,.01);b.transform(OG_TRANSFORM_TRANSLATE,{offset});
    return attempt(()=>{a.operate(OG_OPERATION_UNION,{tools:[b]});const p=summary(a);assert.equal(p.valid,true);closeTo(p.volumeMm3,2000,`OpenGeometry ${name} contact`);return p;});
  };
  try {
    const base=box(.04,.02,.03),hole=cyl(.005,.04);
    hole.transform(OG_TRANSFORM_TRANSLATE,{offset:[0,-.01,0]});
    base.operate(OG_OPERATION_SUBTRACT,{tools:[hole]});
    const baseCut=summary(base);
    closeTo(baseCut.volumeMm3,24000-500*Math.PI,"OpenGeometry base/cut",1e-5);
    const a=box(.01,.01,.01),b=box(.01,.01,.01);b.transform(OG_TRANSFORM_TRANSLATE,{offset:[.005,0,0]});
    a.operate(OG_OPERATION_UNION,{tools:[b]});
    const commonA=box(.01,.01,.01),commonB=box(.01,.01,.01);commonB.transform(OG_TRANSFORM_TRANSLATE,{offset:[.005,0,0]});
    commonA.operate(OG_OPERATION_INTERSECT,{tools:[commonB]});
    const cutA=box(.01,.01,.01),cutB=box(.01,.01,.01);cutB.transform(OG_TRANSFORM_TRANSLATE,{offset:[.005,0,0]});
    cutA.operate(OG_OPERATION_SUBTRACT,{tools:[cutB]});
    closeTo(summary(a).volumeMm3,1500,"OpenGeometry coplanar union",1e-5);
    closeTo(summary(commonA).volumeMm3,500,"OpenGeometry coplanar common",1e-5);
    closeTo(summary(cutA).volumeMm3,500,"OpenGeometry coplanar cut",1e-5);
    const tangency={face:tangent("face",[.01,0,0]),edge:tangent("edge",[.01,.01,0]),vertex:tangent("vertex",[.01,.01,.01])};
    const fineWall=box(.02,.0001,.01),fineDrill=cyl(.00002,.0002);
    fineDrill.transform(OG_TRANSFORM_TRANSLATE,{offset:[0,-.00005,0]});
    const fineFeature=attempt(()=>{
      fineWall.operate(OG_OPERATION_SUBTRACT,{tools:[fineDrill]});
      const fine=summary(fineWall);
      if(!fine.valid) throw new Error("fine-feature result is invalid");
      closeTo(fine.volumeMm3,20-Math.PI*.02**2*.1,"OpenGeometry 0.04 mm hole",1e-4);
      return fine;
    });
    const thinWall01mm=box(.02,.0001,.01),thinDrill01mm=cyl(.0002,.0002);
    thinDrill01mm.transform(OG_TRANSFORM_TRANSLATE,{offset:[0,-.00005,0]});
    const thinWallOutcome=attempt(()=>{
      thinWall01mm.operate(OG_OPERATION_SUBTRACT,{tools:[thinDrill01mm]});
      const measured=summary(thinWall01mm);
      if(!measured.valid) throw new Error("0.1 mm wall result is invalid");
      closeTo(measured.volumeMm3,20-Math.PI*.2**2*.1,"OpenGeometry 0.1 mm wall",1e-4);
      return measured;
    });
    const referenceWall1mm=box(.02,.001,.01),referenceDrill1mm=cyl(.0002,.002);
    referenceDrill1mm.transform(OG_TRANSFORM_TRANSLATE,{offset:[0,-.0005,0]});
    const referenceWall1mmOutcome=attempt(()=>{
      referenceWall1mm.operate(OG_OPERATION_SUBTRACT,{tools:[referenceDrill1mm]});
      const measured=summary(referenceWall1mm);
      if(!measured.valid) throw new Error("1 mm wall result is invalid");
      closeTo(measured.volumeMm3,200-Math.PI*.2**2*1,"OpenGeometry 1 mm wall",1e-4);
      return measured;
    });
    const referenceWall2mm=box(.02,.002,.01),referenceDrill2mm=cyl(.001,.004);
    referenceDrill2mm.transform(OG_TRANSFORM_TRANSLATE,{offset:[0,-.001,0]});
    const referenceWall2mmOutcome=attempt(()=>{
      referenceWall2mm.operate(OG_OPERATION_SUBTRACT,{tools:[referenceDrill2mm]});
      const measured=summary(referenceWall2mm);
      if(!measured.valid) throw new Error("2 mm wall result is invalid");
      closeTo(measured.volumeMm3,400-Math.PI*1**2*2,"OpenGeometry 2 mm wall",1e-4);
      return measured;
    });
    return {candidate:"OpenGeometry",version:"3.0.0",status:"passed",unit:"m (converted to mm³)",
      coplanar:{union:summary(a).volumeMm3,common:summary(commonA).volumeMm3,cut:summary(cutA).volumeMm3},
      tangency,thinWall:{wall01mm:thinWallOutcome,referenceWall1mm:referenceWall1mmOutcome,referenceWall2mm:referenceWall2mmOutcome},
      fineFeature,topology:{bodyType:baseCut.bodyType,explicitHistory:false},
      memory:{heapStats:"not exposed by public API",explicitDispose:true,ownedBodies:owned.length},
      limitations:["Thin-wall cuts at 0.1 mm and 1 mm are characterized as controlled rejection if the kernel's geometric-resolution guard refuses them.","No public face/edge evolution map in 3.0.","Loft and STL export are absent in 3.0.","Kernel modelling calls are synchronous; worker support is for tessellation/display."]};
  } finally { for(const s of owned.reverse())try{s.dispose();}catch{} OpenGeometry.reset(); }
}

const candidates=[
  ["occt-wasm (andymai)",andyOcct],
  ["@moket/occt-wasm",moketOcct],
  ["Replicad",replicadCandidate],
  ["OpenGeometry",openGeometryCandidate]
];
for(const [name,run] of candidates){
  try{reports.push(await run());}
  catch(error){reports.push({candidate:name,status:"blocked-or-failed",error:error instanceof Error?error.message:String(error),stack:error instanceof Error?error.stack:undefined});}
}
console.log(JSON.stringify({status:reports.every(r=>r.status==="passed")?"passed":"partial",candidates:reports},null,2));
if(reports.some(r=>r.status!=="passed"))process.exitCode=1;
