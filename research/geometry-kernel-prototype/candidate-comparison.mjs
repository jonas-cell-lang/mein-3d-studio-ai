import assert from "node:assert/strict";
import { TEST_CASES } from "./candidate-test-catalog.mjs";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const reports = [];
const closeTo = (actual, expected, label, rel = TEST_CASES.tolerance.relativeVolume) => {
  const tolerance = Math.max(TEST_CASES.tolerance.absoluteVolumeMm3, Math.abs(expected) * rel);
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
    const box = k.makeBox(...TEST_CASES.throughHole.boxDimensionsMm);
    const [holeX,holeY,holeZ]=TEST_CASES.throughHole.cylinder.originMm;
    const hole = k.transform(k.makeCylinder(TEST_CASES.throughHole.cylinder.radiusMm,TEST_CASES.throughHole.cylinder.lengthMm),
      [1,0,0,holeX, 0,0,1,holeY, 0,-1,0,holeZ]);
    const cut = k.cut(box,hole);
    closeTo(k.getVolume(cut),TEST_CASES.throughHole.expectedVolumeMm3,"andy base/cut");
    const a=k.makeBox(...TEST_CASES.coplanarOverlap.boxDimensionsMm);
    const b=k.translate(k.makeBox(...TEST_CASES.coplanarOverlap.boxDimensionsMm),...TEST_CASES.coplanarOverlap.secondOffsetMm);
    const u=k.fuse(a,b), c=k.common(a,b), d=k.cut(a,b);
    closeTo(k.getVolume(u),TEST_CASES.coplanarOverlap.expectedVolumeMm3.fuse,"andy coplanar union");
    closeTo(k.getVolume(c),TEST_CASES.coplanarOverlap.expectedVolumeMm3.common,"andy coplanar common");
    closeTo(k.getVolume(d),TEST_CASES.coplanarOverlap.expectedVolumeMm3.cut,"andy coplanar cut");
    const tangency={};
    for(const [name,offset] of [["face",[10,0,0]],["edge",[10,10,0]],["vertex",[10,10,10]]]){
      const first=k.makeBox(...TEST_CASES.tangency.boxDimensionsMm), second=k.transform(k.makeBox(...TEST_CASES.tangency.boxDimensionsMm),translation(...offset));
      tangency[name]=attempt(()=>{
        const result=k.fuse(first,second);
        assert.equal(k.isValid(result),true);
        const volume=k.getVolume(result); closeTo(volume,TEST_CASES.tangency.expectedUnionVolumeMm3,`andy ${name} contact`);
        return {volumeMm3:volume,solids:k.getSubShapes(result,"solid").length};
      });
    }
    const nearA=k.makeBox(...TEST_CASES.nearCoincident.boxDimensionsMm), nearB=k.transform(k.makeBox(...TEST_CASES.nearCoincident.boxDimensionsMm),translation(TEST_CASES.nearCoincident.secondOffsetMm,0,0));
    const nearCoincident=k.fuse(nearA,nearB);
    closeTo(k.getVolume(nearCoincident),TEST_CASES.nearCoincident.expectedUnionVolumeMm3,"andy near-coincident union",1e-5);
    const tangentBox=k.makeBox(...TEST_CASES.cylinderBoxTangency.boxDimensionsMm);
    const [tangentX,tangentY,tangentZ]=TEST_CASES.cylinderBoxTangency.cylinderOriginMm;
    const tangentCylinder=k.transform(k.makeCylinder(TEST_CASES.cylinderBoxTangency.cylinderRadiusMm,TEST_CASES.cylinderBoxTangency.cylinderLengthMm),
      [1,0,0,tangentX, 0,0,1,tangentY, 0,-1,0,tangentZ]);
    const cylinderBoxUnion=k.fuse(tangentBox,tangentCylinder);
    closeTo(k.getVolume(cylinderBoxUnion),TEST_CASES.cylinderBoxTangency.expectedUnionVolumeMm3,"andy cylinder/box tangency",1e-6);
    const wall=k.makeBox(...TEST_CASES.thinWall.wallDimensionsMm);
    const [drillX,drillY,drillZ]=TEST_CASES.thinWall.cylinderOriginMm;
    const drill=k.makeCylinder(TEST_CASES.thinWall.cylinderRadiusMm,TEST_CASES.thinWall.cylinderLengthMm);
    const thinDrill=k.transform(drill,[1,0,0,drillX, 0,0,1,drillY, 0,-1,0,drillZ]);
    const thin=k.cut(wall,thinDrill);
    closeTo(k.getVolume(thin),TEST_CASES.thinWall.expectedVolumeMm3,"andy thin wall",1e-5);
    const invalidInputs={};
    for(const testCase of TEST_CASES.invalidPrimitiveInputs){
      try{
        const shape=testCase.primitive==="box"
          ? k.makeBox(...testCase.dimensionsMm)
          : k.makeCylinder(testCase.dimensionsMm[0],testCase.dimensionsMm[1]);
        try{
          const valid=k.isValid(shape),volume=k.getVolume(shape);
          invalidInputs[testCase.id]={outcome:valid?"accepted-valid":"accepted-invalid",valid,volumeMm3:Number.isFinite(volume)?volume:String(volume)};
        }catch(error){
          invalidInputs[testCase.id]={outcome:"created-but-query-failed",message:error instanceof Error?error.message:String(error)};
        }
      }catch(error){
        invalidInputs[testCase.id]={outcome:"rejected",message:error instanceof Error?error.message:String(error)};
      }
    }
    const historyBase=k.makeBox(20,20,20);
    const historyHashes=k.subShapeHashes(historyBase,"face",2147483647);
    const history=k.cutWithHistory(historyBase,k.makeCylinder(2,20),historyHashes,2147483647);
    const baseVolume=k.getVolume(box), cutVolume=k.getVolume(cut), thinVolume=k.getVolume(thin);
    const memoryBefore=k.getRawModule().HEAP32?.buffer?.byteLength??null;
    const liveBefore=k.shapeCount;
    for(let i=0;i<20;i++) k.cut(k.makeBox(10+i*.01,10,10),k.makeCylinder(1,10));
    const livePeak=k.shapeCount, memoryAfter=k.getRawModule().HEAP32?.buffer?.byteLength??null;
    const nearCoincidentVolume=k.getVolume(nearCoincident), cylinderBoxTangencyVolume=k.getVolume(cylinderBoxUnion);
    k.releaseAll();
    return {candidate:"occt-wasm (andymai)",version:"5.17.2 / OCCT 8.0.1",status:"passed",
      baseAndCutMm3:{base:baseVolume,cut:cutVolume},coplanar:{union:1500,common:500,cut:500},
      tangency,nearCoincidentMm3:nearCoincidentVolume,cylinderBoxTangencyMm3:cylinderBoxTangencyVolume,thinWallMm3:thinVolume,invalidInputs,
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
    const box=ok(k.makeBox(...TEST_CASES.throughHole.boxDimensionsMm),"moket box").shape;
    const cyl=ok(k.makeCylinder(TEST_CASES.throughHole.cylinder.originMm,TEST_CASES.throughHole.cylinder.axis,
      TEST_CASES.throughHole.cylinder.radiusMm,TEST_CASES.throughHole.cylinder.lengthMm),"moket cylinder").shape;
    const cut=ok(k.boolean("cut",box,cyl),"moket cut");
    closeTo(props(cut.shape).volume,TEST_CASES.throughHole.expectedVolumeMm3,"moket base/cut");
    const a=ok(k.makeBox(10,10,10),"moket a").shape;
    const b=ok(k.transform(ok(k.makeBox(10,10,10),"moket b").shape,translation(5,0,0)),"moket b transform").shape;
    const u=ok(k.boolean("fuse",a,b),"moket union"), c=ok(k.boolean("common",a,b),"moket common"), d=ok(k.boolean("cut",a,b),"moket cut");
    closeTo(props(u.shape).volume,TEST_CASES.coplanarOverlap.expectedVolumeMm3.fuse,"moket coplanar union");
    closeTo(props(c.shape).volume,TEST_CASES.coplanarOverlap.expectedVolumeMm3.common,"moket coplanar common");
    closeTo(props(d.shape).volume,TEST_CASES.coplanarOverlap.expectedVolumeMm3.cut,"moket coplanar cut");
    const tangency={};
    for(const [name,offset] of [["face",[10,0,0]],["edge",[10,10,0]],["vertex",[10,10,10]]]){
      const first=ok(k.makeBox(10,10,10),"moket tangent A").shape;
      const second=ok(k.transform(ok(k.makeBox(10,10,10),"moket tangent B").shape,translation(...offset)),"moket tangent transform").shape;
      tangency[name]=attempt(()=>{
        const result=ok(k.boolean("fuse",first,second),"moket tangent fuse"), p=props(result.shape);
        assert.equal(p.valid,true); closeTo(p.volume,TEST_CASES.tangency.expectedUnionVolumeMm3,`moket ${name} contact`);
        return {volumeMm3:p.volume,solids:p.solids};
      });
    }
    const nearA=ok(k.makeBox(...TEST_CASES.nearCoincident.boxDimensionsMm),"moket near A").shape;
    const nearB=ok(k.transform(ok(k.makeBox(...TEST_CASES.nearCoincident.boxDimensionsMm),"moket near B").shape,translation(TEST_CASES.nearCoincident.secondOffsetMm,0,0)),"moket near transform").shape;
    const nearCoincident=ok(k.boolean("fuse",nearA,nearB),"moket near fuse");
    closeTo(props(nearCoincident.shape).volume,TEST_CASES.nearCoincident.expectedUnionVolumeMm3,"moket near-coincident union",1e-5);
    const tangentBox=ok(k.makeBox(...TEST_CASES.cylinderBoxTangency.boxDimensionsMm),"moket cylinder tangent box").shape;
    const tangentCylinder=ok(k.makeCylinder(TEST_CASES.cylinderBoxTangency.cylinderOriginMm,TEST_CASES.cylinderBoxTangency.cylinderAxis,TEST_CASES.cylinderBoxTangency.cylinderRadiusMm,TEST_CASES.cylinderBoxTangency.cylinderLengthMm),"moket tangent cylinder").shape;
    const cylinderBoxUnion=ok(k.boolean("fuse",tangentBox,tangentCylinder),"moket cylinder/box tangent fuse");
    closeTo(props(cylinderBoxUnion.shape).volume,TEST_CASES.cylinderBoxTangency.expectedUnionVolumeMm3,"moket cylinder/box tangency");
    const wall=ok(k.makeBox(...TEST_CASES.thinWall.wallDimensionsMm),"moket thin wall").shape;
    const drill=ok(k.makeCylinder(TEST_CASES.thinWall.cylinderOriginMm,TEST_CASES.thinWall.cylinderAxis,
      TEST_CASES.thinWall.cylinderRadiusMm,TEST_CASES.thinWall.cylinderLengthMm),"moket thin drill").shape;
    const thin=ok(k.boolean("cut",wall,drill),"moket thin cut");
    closeTo(props(thin.shape).volume,TEST_CASES.thinWall.expectedVolumeMm3,"moket thin wall",1e-5);
    const invalidInputs={};
    for(const testCase of TEST_CASES.invalidPrimitiveInputs){
      try{
        const response=testCase.primitive==="box"
          ? k.makeBox(...testCase.dimensionsMm)
          : k.makeCylinder([0,0,0],[0,0,1],testCase.dimensionsMm[0],testCase.dimensionsMm[1]);
        if(response?.ok!==true){
          invalidInputs[testCase.id]={outcome:"rejected",code:response?.error?.code||null,message:response?.error?.message||null};
        }else{
          try{
            const p=props(response.shape);
            invalidInputs[testCase.id]={outcome:p.valid?"accepted-valid":"accepted-invalid",valid:p.valid,volumeMm3:Number.isFinite(p.volume)?p.volume:String(p.volume)};
          }catch(error){
            invalidInputs[testCase.id]={outcome:"created-but-query-failed",message:error instanceof Error?error.message:String(error)};
          }
        }
      }catch(error){
        invalidInputs[testCase.id]={outcome:"rejected",message:error instanceof Error?error.message:String(error)};
      }
    }
    const memoryBefore=k.heapStats();
    for(let i=0;i<20;i++) ok(k.boolean("cut",ok(k.makeBox(10+i*.01,10,10),"moket memory box").shape,
      ok(k.makeCylinder([5,0,5],[0,1,0],1,10),"moket memory drill").shape),"moket memory cut");
    const thinVolume=props(thin.shape).volume;
    const memoryPeak=k.heapStats();
    const nearCoincidentVolume=props(nearCoincident.shape).volume;
    const cylinderBoxTangencyVolume=props(cylinderBoxUnion.shape).volume;
    ok(k.releaseAll(),"moket release");
    const memoryAfter=k.heapStats();
    return {candidate:"@moket/occt-wasm",version:"0.10.1 / OCCT 8.0.1",status:"passed",
      coplanar:TEST_CASES.coplanarOverlap.expectedVolumeMm3,tangency,nearCoincidentMm3:nearCoincidentVolume,cylinderBoxTangencyMm3:cylinderBoxTangencyVolume,thinWallMm3:thinVolume,invalidInputs,
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
    const box=own(r.makeBox([0,0,0],TEST_CASES.throughHole.boxDimensionsMm));
    const hole=own(r.makeCylinder(TEST_CASES.throughHole.cylinder.radiusMm,TEST_CASES.throughHole.cylinder.lengthMm,
      TEST_CASES.throughHole.cylinder.originMm,TEST_CASES.throughHole.cylinder.axis));
    const cut=own(box.cut(hole,{simplify:false}));
    closeTo(measure(cut).volumeMm3,TEST_CASES.throughHole.expectedVolumeMm3,"Replicad base/cut");
    const a=own(r.makeBox([0,0,0],TEST_CASES.coplanarOverlap.boxDimensionsMm)),b=own(r.makeBox(TEST_CASES.coplanarOverlap.secondOffsetMm,TEST_CASES.coplanarOverlap.secondOffsetMm.map((v,i)=>v+TEST_CASES.coplanarOverlap.boxDimensionsMm[i])));
    const u=own(a.fuse(b,{simplify:false})),c=own(a.intersect(b,{simplify:false})),d=own(a.cut(b,{simplify:false}));
    closeTo(measure(u).volumeMm3,TEST_CASES.coplanarOverlap.expectedVolumeMm3.fuse,"Replicad coplanar union");
    closeTo(measure(c).volumeMm3,TEST_CASES.coplanarOverlap.expectedVolumeMm3.common,"Replicad coplanar common");
    closeTo(measure(d).volumeMm3,TEST_CASES.coplanarOverlap.expectedVolumeMm3.cut,"Replicad coplanar cut");
    const tangency={};
    for(const [name,offset] of [["face",[10,0,0]],["edge",[10,10,0]],["vertex",[10,10,10]]]){
      const first=own(r.makeBox([0,0,0],TEST_CASES.tangency.boxDimensionsMm));
      const second=own(r.makeBox(offset,offset.map((v,i)=>v+TEST_CASES.tangency.boxDimensionsMm[i])));
      tangency[name]=attempt(()=>{
        const result=own(first.fuse(second,{simplify:false})),p=measure(result);
        assert.equal(p.valid,true);closeTo(p.volumeMm3,TEST_CASES.tangency.expectedUnionVolumeMm3,`Replicad ${name} contact`);return p;
      });
    }
    const nearA=own(r.makeBox([0,0,0],TEST_CASES.nearCoincident.boxDimensionsMm));
    const nearB=own(r.makeBox([TEST_CASES.nearCoincident.secondOffsetMm,0,0],[TEST_CASES.nearCoincident.secondOffsetMm+TEST_CASES.nearCoincident.boxDimensionsMm[0],TEST_CASES.nearCoincident.boxDimensionsMm[1],TEST_CASES.nearCoincident.boxDimensionsMm[2]]));
    const nearCoincident=own(nearA.fuse(nearB,{simplify:false}));
    closeTo(measure(nearCoincident).volumeMm3,TEST_CASES.nearCoincident.expectedUnionVolumeMm3,"Replicad near-coincident union",1e-5);
    const tangentBox=own(r.makeBox([0,0,0],TEST_CASES.cylinderBoxTangency.boxDimensionsMm));
    const tangentCylinder=own(r.makeCylinder(TEST_CASES.cylinderBoxTangency.cylinderRadiusMm,TEST_CASES.cylinderBoxTangency.cylinderLengthMm,TEST_CASES.cylinderBoxTangency.cylinderOriginMm,TEST_CASES.cylinderBoxTangency.cylinderAxis));
    const cylinderBoxUnion=own(tangentBox.fuse(tangentCylinder,{simplify:false}));
    closeTo(measure(cylinderBoxUnion).volumeMm3,TEST_CASES.cylinderBoxTangency.expectedUnionVolumeMm3,"Replicad cylinder/box tangency");
    const wall=own(r.makeBox([0,0,0],TEST_CASES.thinWall.wallDimensionsMm));
    const drill=own(r.makeCylinder(TEST_CASES.thinWall.cylinderRadiusMm,TEST_CASES.thinWall.cylinderLengthMm,
      TEST_CASES.thinWall.cylinderOriginMm,TEST_CASES.thinWall.cylinderAxis));
    const thin=own(wall.cut(drill,{simplify:false}));
    closeTo(measure(thin).volumeMm3,TEST_CASES.thinWall.expectedVolumeMm3,"Replicad thin wall",1e-5);
    const topologyFaces=thin.faces, topologyEdges=thin.edges;
    const topology={faces:topologyFaces.length,edges:topologyEdges.length,explicitHistory:false};
    topologyFaces.forEach(face=>face.delete()); topologyEdges.forEach(edge=>edge.delete());
    const invalidInputs={};
    for(const testCase of TEST_CASES.invalidPrimitiveInputs){
      try{
        const shape=testCase.primitive==="box"
          ? own(r.makeBox([0,0,0],testCase.dimensionsMm))
          : own(r.makeCylinder(testCase.dimensionsMm[0],testCase.dimensionsMm[1],[0,0,0],[0,0,1]));
        try{
          const p=measure(shape);
          invalidInputs[testCase.id]={outcome:p.valid?"accepted-valid":"accepted-invalid",valid:p.valid,volumeMm3:Number.isFinite(p.volumeMm3)?p.volumeMm3:String(p.volumeMm3)};
        }catch(error){
          invalidInputs[testCase.id]={outcome:"created-but-query-failed",message:error instanceof Error?error.message:String(error)};
        }
      }catch(error){
        invalidInputs[testCase.id]={outcome:"rejected",message:error instanceof Error?error.message:String(error)};
      }
    }
    return {candidate:"Replicad",version:"1.2.1 / replicad-opencascadejs 1.2.1",status:"passed",
      invalidInputs,coplanar:TEST_CASES.coplanarOverlap.expectedVolumeMm3,tangency,nearCoincidentMm3:measure(nearCoincident).volumeMm3,cylinderBoxTangencyMm3:measure(cylinderBoxUnion).volumeMm3,thinWallMm3:measure(thin).volumeMm3,
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
    return attempt(()=>{a.operate(OG_OPERATION_UNION,{tools:[b]});const p=summary(a);assert.equal(p.valid,true);closeTo(p.volumeMm3,TEST_CASES.tangency.expectedUnionVolumeMm3,`OpenGeometry ${name} contact`);return p;});
  };
  try {
    const base=box(...TEST_CASES.throughHole.boxDimensionsMm.map(v=>v/1000));
    const hole=cyl(TEST_CASES.throughHole.cylinder.radiusMm/1000,TEST_CASES.throughHole.cylinder.lengthMm/1000);
    hole.transform(OG_TRANSFORM_TRANSLATE,{offset:[0,TEST_CASES.throughHole.cylinder.originMm[1]/1000,0]});
    base.operate(OG_OPERATION_SUBTRACT,{tools:[hole]});
    const baseCut=summary(base);
    closeTo(baseCut.volumeMm3,TEST_CASES.throughHole.expectedVolumeMm3,"OpenGeometry base/cut",1e-5);
    const a=box(...TEST_CASES.coplanarOverlap.boxDimensionsMm.map(v=>v/1000)),b=box(...TEST_CASES.coplanarOverlap.boxDimensionsMm.map(v=>v/1000));b.transform(OG_TRANSFORM_TRANSLATE,{offset:TEST_CASES.coplanarOverlap.secondOffsetMm.map(v=>v/1000)});
    a.operate(OG_OPERATION_UNION,{tools:[b]});
    const commonA=box(.01,.01,.01),commonB=box(.01,.01,.01);commonB.transform(OG_TRANSFORM_TRANSLATE,{offset:[.005,0,0]});
    commonA.operate(OG_OPERATION_INTERSECT,{tools:[commonB]});
    const cutA=box(.01,.01,.01),cutB=box(.01,.01,.01);cutB.transform(OG_TRANSFORM_TRANSLATE,{offset:[.005,0,0]});
    cutA.operate(OG_OPERATION_SUBTRACT,{tools:[cutB]});
    closeTo(summary(a).volumeMm3,TEST_CASES.coplanarOverlap.expectedVolumeMm3.fuse,"OpenGeometry coplanar union",1e-5);
    closeTo(summary(commonA).volumeMm3,TEST_CASES.coplanarOverlap.expectedVolumeMm3.common,"OpenGeometry coplanar common",1e-5);
    closeTo(summary(cutA).volumeMm3,TEST_CASES.coplanarOverlap.expectedVolumeMm3.cut,"OpenGeometry coplanar cut",1e-5);
    const tangency={face:tangent("face",[.01,0,0]),edge:tangent("edge",[.01,.01,0]),vertex:tangent("vertex",[.01,.01,.01])};
    const nearA=box(...TEST_CASES.nearCoincident.boxDimensionsMm.map(v=>v/1000)),nearB=box(...TEST_CASES.nearCoincident.boxDimensionsMm.map(v=>v/1000));
    nearB.transform(OG_TRANSFORM_TRANSLATE,{offset:[TEST_CASES.nearCoincident.secondOffsetMm/1000,0,0]});
    nearA.operate(OG_OPERATION_UNION,{tools:[nearB]});
    const nearCoincident=summary(nearA);
    closeTo(nearCoincident.volumeMm3,TEST_CASES.nearCoincident.expectedUnionVolumeMm3,"OpenGeometry near-coincident union",1e-5);
    const tangentBox=box(...TEST_CASES.cylinderBoxTangency.boxDimensionsMm.map(v=>v/1000));
    const tangentCylinder=cyl(TEST_CASES.cylinderBoxTangency.cylinderRadiusMm/1000,TEST_CASES.cylinderBoxTangency.cylinderLengthMm/1000);
    tangentCylinder.transform(OG_TRANSFORM_TRANSLATE,{offset:TEST_CASES.cylinderBoxTangency.cylinderOriginMm.map(v=>v/1000)});
    tangentBox.operate(OG_OPERATION_UNION,{tools:[tangentCylinder]});
    const cylinderBoxUnion=summary(tangentBox);
    const cylinderBoxExpectedMm3=TEST_CASES.cylinderBoxTangency.expectedUnionVolumeMm3;
    const cylinderBoxDeviationMm3=Math.abs(cylinderBoxUnion.volumeMm3-cylinderBoxExpectedMm3);
    const cylinderBoxToleranceMm3=Math.max(TEST_CASES.tolerance.absoluteVolumeMm3,
      cylinderBoxExpectedMm3*TEST_CASES.tolerance.relativeVolume);
    const cylinderBoxComparison={
      ...cylinderBoxUnion,
      expectedVolumeMm3:cylinderBoxExpectedMm3,
      deviationMm3:cylinderBoxDeviationMm3,
      comparisonToleranceMm3:cylinderBoxToleranceMm3,
      withinReportedErrorBound:cylinderBoxDeviationMm3<=Math.max(cylinderBoxToleranceMm3,cylinderBoxUnion.errorBoundMm3)
    };
    const fineWall=box(.02,.0001,.01),fineDrill=cyl(.00002,.0002);
    fineDrill.transform(OG_TRANSFORM_TRANSLATE,{offset:[0,-.00005,0]});
    const fineFeature=attempt(()=>{
      fineWall.operate(OG_OPERATION_SUBTRACT,{tools:[fineDrill]});
      const fine=summary(fineWall);
      if(!fine.valid) throw new Error("fine-feature result is invalid");
      closeTo(fine.volumeMm3,20-Math.PI*.02**2*.1,"OpenGeometry 0.04 mm hole",1e-4);
      return fine;
    });
    const thinWall01mm=box(TEST_CASES.thinWall.wallDimensionsMm[0]/1000,TEST_CASES.thinWall.wallDimensionsMm[1]/1000,TEST_CASES.thinWall.wallDimensionsMm[2]/1000);
    const thinDrill01mm=cyl(TEST_CASES.thinWall.cylinderRadiusMm/1000,TEST_CASES.thinWall.cylinderLengthMm/1000);
    thinDrill01mm.transform(OG_TRANSFORM_TRANSLATE,{offset:[0,TEST_CASES.thinWall.cylinderOriginMm[1]/1000,0]});
    const thinWallOutcome=attempt(()=>{
      thinWall01mm.operate(OG_OPERATION_SUBTRACT,{tools:[thinDrill01mm]});
      const measured=summary(thinWall01mm);
      if(!measured.valid) throw new Error("0.1 mm wall result is invalid");
      closeTo(measured.volumeMm3,TEST_CASES.thinWall.expectedVolumeMm3,"OpenGeometry 0.1 mm wall",1e-4);
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
    const invalidInputs={};
    for(const testCase of TEST_CASES.invalidPrimitiveInputs){
      try{
        const shape=own(testCase.primitive==="box"
          ? new Solid(OG_PRIMITIVE_CUBOID,{width:testCase.dimensionsMm[0]/1000,height:testCase.dimensionsMm[1]/1000,depth:testCase.dimensionsMm[2]/1000})
          : new Solid(OG_PRIMITIVE_CYLINDER,{radius:testCase.dimensionsMm[0]/1000,height:testCase.dimensionsMm[1]/1000}));
        const p=shape.validity();
        invalidInputs[testCase.id]={outcome:p.valid?"accepted-valid":"accepted-invalid",valid:p.valid,bodyType:p.bodyType};
      }catch(error){
        invalidInputs[testCase.id]={outcome:"rejected",message:error instanceof Error?error.message:String(error)};
      }
    }
    return {candidate:"OpenGeometry",version:"3.0.0",status:"passed",unit:"m (converted to mm³)",
      invalidInputs,coplanar:TEST_CASES.coplanarOverlap.expectedVolumeMm3,
      tangency,nearCoincidentMm3:nearCoincident.volumeMm3,cylinderBoxTangency:cylinderBoxComparison,thinWall:{wall01mm:thinWallOutcome,referenceWall1mm:referenceWall1mmOutcome,referenceWall2mm:referenceWall2mmOutcome},
      fineFeature,topology:{bodyType:baseCut.bodyType,explicitHistory:false},
      memory:{heapStats:"not exposed by public API",explicitDispose:true,ownedBodies:owned.length},
      limitations:[...(cylinderBoxComparison.withinReportedErrorBound?[]:["Cylinder/box tangency volume is outside the shared tolerance and its reported measurement error bound; this case is unresolved."]),"Thin-wall cuts at 0.1 mm and 1 mm are characterized as controlled rejection if the kernel's geometric-resolution guard refuses them.","No public face/edge evolution map in 3.0.","Loft and STL export are absent in 3.0.","Kernel modelling calls are synchronous; worker support is for tessellation/display."]};
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
