/* Lab 4 educational Wi-Fi model. All values are illustrative and intentionally qualitative. */
const WIFI={
 bands:{'2.4':{name:'2.4 GHz',range:190,wall:1.0,spectrum:2,compat:['2.4']},'5':{name:'5 GHz',range:130,wall:1.35,spectrum:4,compat:['5']},'6':{name:'6 GHz',range:95,wall:1.7,spectrum:5,compat:['6']}},
 generations:{
  'Wi-Fi 5':{bands:['2.4','5'],capacity:220,compat:100,cost:250,color:'#be8538'},
  'Wi-Fi 6':{bands:['2.4','5'],capacity:300,compat:95,cost:400,color:'#287d68'},
  'Wi-Fi 6E':{bands:['2.4','5','6'],capacity:360,compat:65,cost:550,color:'#4a83b6'},
  'Wi-Fi 7':{bands:['2.4','5','6'],capacity:430,compat:45,cost:750,color:'#8964aa'}},
 apTypes:{indoor:{name:'Indoor AP',cost:0,rangeFactor:1,capacityFactor:1},outdoor:{name:'Outdoor AP',cost:700,rangeFactor:1.45,capacityFactor:.85}},
 clients:{older:15,wifi5:55,wifi6:25,wifi7:5},
 networkUse:{minUsers:1,maxUsers:100,defaultUsers:25,estimatedUsersPerAp:60},
 costs:{p2p:1500,fiberBase:3000,fiberPerMeter:10,budget:8000},
 walls:{light:1,brick:1.5,concrete:2.1},
 scenario:{internet:500,rooms:[{id:'a1',name:'Classroom A',x:130,y:170,demand:45,users:45},{id:'a2',name:'Classroom B',x:130,y:285,demand:45,users:45},{id:'a3',name:'Library',x:285,y:225,demand:55,users:55},{id:'courtyard',name:'Courtyard',x:410,y:225,demand:25,users:25,outdoor:true},{id:'b1',name:'Building B · Lab',x:650,y:170,demand:55,users:45,building:'b'},{id:'b2',name:'Building B · Hall',x:650,y:285,demand:45,users:35,building:'b'}],
  walls:[{x:205,y1:110,y2:340,type:'brick'},{x:535,y1:110,y2:340,type:'concrete'}],
  buildings:{a:{x:55,y:105,w:320,h:250,name:'Building A · teaching block'},b:{x:570,y:105,w:235,h:250,name:'Building B · secondary building'}},
  totalScenarioUsers:250,maxUsers:250}
};
function wifiBandAllowed(generation,band){return band==='auto'||WIFI.generations[generation]?.bands.includes(band);} function wifiEffectiveBand(ap){if(ap.band!=='auto')return ap.band;const bands=WIFI.generations[ap.generation].bands;return bands.includes('5')?'5':bands[0];} function wifiQualityLabel(q){return q>=.8?'Strong':q>=.6?'Good':q>=.35?'Usable':q>0?'Weak':'No useful coverage';}
function wifiFiberCost(distance){const d=Math.max(0,Number(distance)||0);return WIFI.costs.fiberBase+d*WIFI.costs.fiberPerMeter;}
function wifiBuildingAt(x,y){return Object.entries(WIFI.scenario.buildings).find(([,b])=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h)?.[0]||null;}
function wifiPlacementValid(type,x,y){
 const building=wifiBuildingAt(x,y);
 if(type==='indoor')return !!building;
 return x>=20&&x<=840&&y>=20&&y<=400&&!building;
}
function wifiPlacementDefault(ap){
 const building=ap.buildingB?'b':'a',b=WIFI.scenario.buildings[building];
 return ap.type==='outdoor'?{x:410,y:225,buildingB:false,outdoor:true}:{x:b.x+b.w/2,y:b.y+b.h/2,buildingB:building==='b',outdoor:false};
}
function wifiNormalizeState(state){
 if(!state||!Array.isArray(state.aps))return state;
 state.aps.forEach(ap=>{
  if(!wifiPlacementValid(ap.type,Number(ap.x),Number(ap.y))){const d=wifiPlacementDefault(ap);ap.x=d.x;ap.y=d.y;ap.buildingB=d.buildingB;ap.outdoor=d.outdoor;}
  else {const building=wifiBuildingAt(Number(ap.x),Number(ap.y));ap.buildingB=ap.type==='indoor'&&building==='b';ap.outdoor=ap.type==='outdoor';}
 });
 return state;
}
function wifiCoverage(ap,room){
 const g=WIFI.generations[ap.generation],band=WIFI.bands[wifiEffectiveBand(ap)],type=WIFI.apTypes[ap.type];
 if(room.building==='b'&&!ap.buildingB)return 0;
 if(room.outdoor&&!ap.outdoor)return 0;
 if(!wifiBandAllowed(ap.generation,ap.band))return 0;
 const d=Math.hypot(ap.x-room.x,ap.y-room.y),wallPenalty=WIFI.scenario.walls.reduce((sum,w)=>{const crosses=(ap.x<w.x&&room.x>w.x)||(ap.x>w.x&&room.x<w.x);return sum+(crosses?WIFI.walls[w.type]*band.wall:0)},0);
 return Math.max(0,Math.min(1,(type.rangeFactor*band.range-d*band.wall)/(type.rangeFactor*band.range)-wallPenalty*.08));
}
function wifiEvaluate(state){
 wifiNormalizeState(state);
 state.networkUseUsers=Math.max(WIFI.networkUse.minUsers,Math.min(WIFI.networkUse.maxUsers,Number(state.networkUseUsers)||WIFI.networkUse.defaultUsers));
 if(!['open','wpa2','separate'].includes(state.security))state.security='wpa2';
 const rooms=WIFI.scenario.rooms;
 const hasBuildingUpstream=!!(state.p2p||state.fiber);
 const active=rooms.map(room=>{
  const candidates=state.aps.map(ap=>({ap,coverage:wifiCoverage(ap,room)})).filter(v=>v.coverage>0);
  const best=candidates.sort((a,b)=>b.coverage-a.coverage)[0]?.ap||null;
  const hasWifiCoverage=!!best;
  const hasInternetConnectivity=hasWifiCoverage&&(!(room.building==='b')||hasBuildingUpstream);
  return {...room,servingAP:best,hasWifiCoverage,hasInternetConnectivity,best,coverage:best?Math.max(0,candidates.find(v=>v.ap.id===best.id)?.coverage||0):0};
 });
 const loads=state.aps.map(ap=>{
  const served=active.filter(r=>r.servingAP?.id===ap.id);
  const load=served.reduce((n,r)=>n+r.users,0);
  const cap=WIFI.generations[ap.generation].capacity*WIFI.apTypes[ap.type].capacityFactor;
  const hasInternetUpstream=ap.buildingB?hasBuildingUpstream:true;
  return {...ap,served,load,capacity:cap,overloaded:load>cap,hasInternetUpstream};
 });
 // Unique room groups are the source of truth. Every room contributes its users once.
 const users=active.reduce((n,r)=>n+(r.hasInternetConnectivity?r.users:0),0);
 const coveredUsers=active.reduce((n,r)=>n+(r.hasWifiCoverage?r.users:0),0);
 const buildingBWifi=active.some(r=>r.building==='b'&&r.hasWifiCoverage);
 const buildingBOnline=hasBuildingUpstream&&active.some(r=>r.building==='b'&&r.hasInternetConnectivity);
 const networkUseCoverageGood=active.some(r=>r.hasWifiCoverage);
 const estimatedNetworkUseCapacity=Math.max(0,loads.filter(a=>a.served.length>0).length||loads.length)*WIFI.networkUse.estimatedUsersPerAp;
 const networkUseCapacityWarning=networkUseCoverageGood&&state.networkUseUsers>estimatedNetworkUseCapacity;
 const cost=state.aps.reduce((n,a)=>n+WIFI.generations[a.generation].cost+WIFI.apTypes[a.type].cost,0)+(state.p2p?WIFI.costs.p2p:0)+(state.fiber?wifiFiberCost(state.distance):0);
 const contention=loads.filter(a=>a.channel&&loads.some(b=>b.id!==a.id&&b.channel===a.channel&&Math.hypot(a.x-b.x,a.y-b.y)<190)).length;
 const bandCompat=state.aps.filter(a=>a.band==='6').length?Math.min(...state.aps.filter(a=>a.band==='6').map(a=>WIFI.generations[a.generation].compat)):100;
 const roomsTotal=rooms.reduce((n,r)=>n+r.users,0);
 return {rooms:active,aps:loads,connected:active.filter(r=>r.hasInternetConnectivity).length,users,coveredUsers,totalScenarioUsers:roomsTotal,buildingBWifi,buildingBOnline,buildingBPath:hasBuildingUpstream,cost,contention,overloaded:loads.filter(a=>a.overloaded).length,bandCompat,networkUseUsers:state.networkUseUsers,estimatedNetworkUseCapacity,networkUseCoverageGood,networkUseCapacityWarning,security:state.security,
  indoor:active.filter(r=>!r.outdoor&&r.hasWifiCoverage).length/rooms.filter(r=>!r.outdoor).length,
  outdoor:active.filter(r=>r.outdoor&&r.hasWifiCoverage).length,
  capacity:loads.length?Math.max(0,Math.min(...loads.map(a=>a.capacity/Math.max(1,a.load)))):0};
}
function wifiScore(state){
 const e=wifiEvaluate(state),g=v=>v>=.9?'Excellent':v>=.7?'Good':v>=.45?'Moderate':'Poor';
 return {dimensions:[['Indoor coverage',g(e.indoor)],['Capacity',g(e.capacity)],['Outdoor coverage',e.outdoor?'Good':'Poor'],['Interference / contention',e.contention?'High':'Low'],['Device compatibility',g(e.bandCompat/100)],['Building B connectivity',e.buildingBOnline?'Good':'Poor'],['Cost efficiency',e.cost<=WIFI.costs.budget?'Good':'Poor']].map(([name,value])=>({name,value})),evaluation:e};
}
function wifiWhy(state){const e=wifiEvaluate(state),lessons=[];if(e.networkUseCapacityWarning)lessons.push(['Coverage is not capacity','Wi-Fi coverage is good, but this AP may not have enough capacity for all users.']);if(e.indoor>=.9&&e.capacity<.7)lessons.push(['Coverage is not capacity','Most rooms have a signal, but one or more APs serve too many users. Coverage and capacity are different design questions.']);if(state.aps.length>3)lessons.push(['More is not always better','Additional APs can improve capacity, but nearby APs sharing a channel can create contention. Placement and channel planning matter.']);if(state.aps.some(a=>a.band==='6'))lessons.push(['Client devices matter','6 GHz adds spectrum, but only a portion of this fictional school’s devices can use it. Keeping 5 GHz available preserves compatibility.']);if(state.p2p)lessons.push(['Use the right tool','The directional P2P link connects networks between buildings. Indoor APs and a secondary switch serve Building B users.']);if(state.fiber)lessons.push(['Wi-Fi does not create Internet capacity','A fiber building link improves the uplink, but the school’s 500 Mbps Internet service still limits the whole campus.']);if(e.contention)lessons.push(['Channels are shared air','Nearby APs on one channel must share airtime. Reuse channels deliberately and avoid unnecessary overlap.']);if(!e.buildingBOnline)lessons.push(['Building B needs an upstream and local network','A P2P or fiber link alone does not provide client Wi-Fi. Building B also needs a switch and local AP.']);return lessons.length?lessons:[['A good campus architecture','Use indoor APs for users, outdoor APs for outdoor areas, and a directional P2P or fiber link between buildings.']];}

