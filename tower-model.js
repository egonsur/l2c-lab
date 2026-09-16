/* Metres internally; raw terrain, structures, curvature and radio geometry remain separate. */
const EFFECTIVE_EARTH_K=4/3,EARTH_RADIUS_M=6371000;
const TOWER_PRESETS=[
 {id:'flat',name:'Flat / Open',distance:5,frequency:5,a:20,b:10,terrain:'flat',curvature:true},
 {id:'hill',name:'Hill',distance:10,frequency:5,a:20,b:15,terrain:'hill',hillHeight:30,curvature:true},
 {id:'trees',name:'Trees',distance:10,frequency:5,a:24,b:20,terrain:'trees',vegetationHeight:16,curvature:true},
 {id:'building',name:'Building',distance:8,frequency:5,a:28,b:24,terrain:'building',buildingHeight:24,curvature:true}
];
const TOWER_ENVIRONMENTS=TOWER_PRESETS;
const VEGETATION={start:.42,end:.58,height:16};
const TOWER_BANDS=[2.4,5,6,11,18,23,38,80];
function vegetationHeight(t,type,height=VEGETATION.height){return type==='trees'&&t>=VEGETATION.start&&t<=VEGETATION.end?height:0;}
function terrainHeight(t,type,height=30){
 if(t===0||t===1||type==='building')return 0;
 const base=1.5*Math.pow(Math.sin(Math.PI*t),2);
 return type==='hill'?height*Math.pow(Math.sin(Math.PI*t),12):base;
}
function buildingProfiles(s){
 return s.terrain==='building'?[{start:.62,end:.72,height:s.buildingHeight??24,name:'Intervening building'}]:[];
}
function buildingHeight(t,s){return Math.max(0,...buildingProfiles(s).filter(b=>t>=b.start&&t<=b.end).map(b=>b.height));}
function earthCorrection(d1,d2){return d1*d2/(2*EFFECTIVE_EARTH_K*EARTH_RADIUS_M);}
function fresnelRadius(frequency,d1,d2){return Math.sqrt((.299792458/frequency)*d1*d2/(d1+d2));}
function evaluatePath(s){
 const d=s.distance*1000,groundA=terrainHeight(0,s.terrain,s.hillHeight??30),groundB=terrainHeight(1,s.terrain,s.hillHeight??30);
 const mountA=groundA+buildingHeight(0,s),mountB=groundB+buildingHeight(1,s);
 const antennaA=mountA+s.a,antennaB=mountB+s.b;
 const samples=Array.from({length:1001},(_,i)=>{
  const t=i/1000,x=t*d,ground=terrainHeight(t,s.terrain,s.hillHeight??30);
  const vegetation=vegetationHeight(t,s.terrain,s.vegetationHeight??VEGETATION.height),building=buildingHeight(t,s);
  const obstructionTop=ground+Math.max(vegetation,building);
  const bulge=s.curvature?earthCorrection(x,d-x):0;
  // Effective-Earth display frame: ground curves, phase-center line stays straight.
  const displayGround=ground+bulge,displayObstacle=obstructionTop+bulge;
  const los=antennaA+(antennaB-antennaA)*t;
  const fresnel=fresnelRadius(s.frequency,x,d-x);
  return {t,x,ground,vegetation,building,obstructionTop,bulge,displayGround,displayObstacle,
   los,radioPath:los,fresnel,upper:los+fresnel,lower:los-fresnel,
   clearance:los-displayObstacle,margin:los-displayObstacle-.6*fresnel};
 });
 const worst=samples.reduce((a,b)=>a.margin<b.margin?a:b),minLOS=Math.min(...samples.map(p=>p.clearance));
 const status=minLOS<=0?'blocked':worst.margin<0?'clearance':'good';
 const peak=samples.reduce((a,b)=>a.ground>=b.ground?a:b);
 return {samples,worst,minLOS,status,groundA,groundB,mountA,mountB,antennaA,antennaB,peak,
  midRadius:fresnelRadius(s.frequency,d/2,d/2),midBulge:s.curvature?earthCorrection(d/2,d/2):0};
}

