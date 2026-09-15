/* Metres internally; raw terrain, structures, curvature and radio geometry remain separate. */
const EFFECTIVE_EARTH_K=4/3,EARTH_RADIUS_M=6371000;
const TOWER_PRESETS=[
 {name:'Easy rural link',distance:5,frequency:5,a:20,b:10,terrain:'flat',curvature:true},
 {name:'Hill in the middle',distance:10,frequency:5,a:20,b:15,terrain:'hill',curvature:true},
 {name:'Long-distance link',distance:30,frequency:11,a:30,b:20,terrain:'flat',curvature:true},
 {name:'Urban Rooftop Link',distance:2,frequency:5,a:5,b:5,terrain:'urban',curvature:true,roofA:20,roofB:24,building:26}
];
const URBAN_DEFAULTS={roofA:20,roofB:24,building:26};
const VEGETATION={start:.42,end:.58,height:16};
const TOWER_BANDS=[2.4,5,6,11,18,23,38,80];
function vegetationHeight(t,type){return type==='trees'&&t>=VEGETATION.start&&t<=VEGETATION.end?VEGETATION.height:0;}
function terrainHeight(t,type){
 if(t===0||t===1||type==='urban')return 0;
 const base=1.5*Math.pow(Math.sin(Math.PI*t),2);
 return type==='hill'?30*Math.pow(Math.sin(Math.PI*t),12):base;
}
function buildingProfiles(s){
 if(s.terrain==='urban')return [
  {start:0,end:.07,height:s.roofA??URBAN_DEFAULTS.roofA,name:'Network rooftop'},
  {start:.46,end:.54,height:s.building??URBAN_DEFAULTS.building,name:'Intervening building'},
  {start:.93,end:1,height:s.roofB??URBAN_DEFAULTS.roofB,name:'Community rooftop'}
 ];
 return s.terrain==='buildings'?[{start:.64,end:.72,height:24,name:'Building'}]:[];
}
function buildingHeight(t,s){return Math.max(0,...buildingProfiles(s).filter(b=>t>=b.start&&t<=b.end).map(b=>b.height));}
function earthCorrection(d1,d2){return d1*d2/(2*EFFECTIVE_EARTH_K*EARTH_RADIUS_M);}
function fresnelRadius(frequency,d1,d2){return Math.sqrt((.299792458/frequency)*d1*d2/(d1+d2));}
function evaluatePath(s){
 const d=s.distance*1000,groundA=terrainHeight(0,s.terrain),groundB=terrainHeight(1,s.terrain);
 const mountA=groundA+buildingHeight(0,s),mountB=groundB+buildingHeight(1,s);
 const antennaA=mountA+s.a,antennaB=mountB+s.b;
 const samples=Array.from({length:1001},(_,i)=>{
  const t=i/1000,x=t*d,ground=terrainHeight(t,s.terrain);
  const vegetation=vegetationHeight(t,s.terrain),building=buildingHeight(t,s);
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

