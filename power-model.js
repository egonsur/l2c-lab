/* Lab 5 educational power model. Values are illustrative, not electrical design specifications. */
const POWER={
 systemEfficiency:.85,usableBatteryFraction:.9,stepHours:.25,
 autonomy:{minDays:0,maxDays:3,defaultDays:1},
 batteryHealth:{new:1,aged:.8,default:'new'},
 connectivity:{fiber:{name:'Fiber ONT/CPE',w:10,explain:'The fiber cable is passive; the active ONT/CPE at this site needs power.'},p2p:{name:'P2P radio',w:20,explain:'Only the radio at this site is counted.'},fwa:{name:'FWA CPE/router',w:25,explain:'FWA uses a powered radio/router at this site.'},leo:{name:'Satellite terminal',w:75,explain:'Satellite connectivity requires a powered terminal at the site.'}},equipment:{fwa:{name:'FWA / 4G/5G router',w:25},leo:{name:'LEO satellite terminal',w:75},apIndoor:{name:'Indoor Wi-Fi AP',w:15},apOutdoor:{name:'Outdoor Wi-Fi AP',w:25},p2p:{name:'P2P radio pair',w:20},switch:{name:'Small network switch',w:15},poe:{name:'PoE switch own consumption',w:30},router:{name:'Router / firewall',w:15}},
 devices:{phone:{name:'Smartphone charging',w:15},laptop:{name:'Laptop',w:45}},
 weather:{Sunny:{multiplier:1,peakSunHours:5},Mixed:{multiplier:.7,peakSunHours:3.5},Cloudy:{multiplier:.4,peakSunHours:2}},
 scenarios:{
  school:{name:'Rural School',subtitle:'No reliable grid · learning mainly happens during school hours',grid:'none',accessTech:'leo',question:'Can you keep the school connected throughout the day and prepare the battery for the next morning?',network:[['leo','LEO satellite terminal'],['router','Router / firewall'],['poe','PoE switch own consumption'],['apIndoor','3 × indoor Wi-Fi APs']],devices:{type:'laptop',count:30,hours:5,start:7},mode:'scheduled',solar:200,battery:5,weather:'Sunny',priority:'School hours',autonomyDays:1,batteryHealth:1},
  health:{name:'Health Facility',subtitle:'Unreliable grid · connectivity is required 24×7',grid:'unreliable',accessTech:'fwa',question:'Can you keep a critical service connected when the grid fails?',network:[['fwa','FWA / 4G/5G router'],['router','Router / firewall'],['switch','Small network switch'],['apIndoor','2 × indoor Wi-Fi APs']],devices:{type:'laptop',count:1,hours:24,start:0},mode:'24x7',solar:750,battery:5,weather:'Sunny',priority:'Critical 24×7',autonomyDays:1,batteryHealth:1},
  community:{name:'Remote Community Site',subtitle:'No grid · small continuous network load',grid:'none',accessTech:'leo',question:'Can this off-grid connectivity site operate sustainably day and night?',network:[['leo','LEO satellite terminal'],['router','Router / firewall'],['apOutdoor','Outdoor Wi-Fi AP'],['switch','Small network switch']],devices:{type:'phone',count:8,hours:8,start:10},mode:'24x7',solar:750,battery:5,weather:'Sunny',priority:'Most of the day',autonomyDays:1,batteryHealth:1}
 }};
function powerScenario(id){return POWER.scenarios[id];} function powerEnergy(w,h){return w*h/1000;} function continuousDailyEnergy(w){return powerEnergy(w,24);}
function solarAt(s,h,weather=s.weather){if(h<6||h>18)return 0;const daylight=Math.sin(Math.PI*(h-6)/12);return s.solar*daylight*POWER.weather[weather].multiplier;}
function gridAt(s,h){if(s.grid==='reliable')return true;if(s.grid==='none')return false;return !(h>=18||h<6);}

function powerBatteryHealthFraction(s){
 const value=Number(s?.batteryHealth);
 return value===POWER.batteryHealth.aged?POWER.batteryHealth.aged:POWER.batteryHealth.new;
}
function powerEffectiveBatteryCapacityWh(s){
 ensurePowerScenario(s);
 return Math.max(0,Number(s.battery||0)*1000*powerBatteryHealthFraction(s));
}
function powerRecommendedBatteryCapacityKwh(s){
 ensurePowerScenario(s);
 const days=Math.max(0,Math.min(POWER.autonomy.maxDays,Number(s.autonomyDays)||0));
 return dailyDemand(s)*days/Math.max(.01,POWER.systemEfficiency);
}

function simulatePower(s,opts={}){
 ensurePowerScenario(s);
 const weather=opts.weather||s.weather;
 const capacity=powerEffectiveBatteryCapacityWh(s);
 const startBattery=opts.startBattery===undefined?capacity:Math.max(0,Math.min(capacity,Number(opts.startBattery)*1000*powerBatteryHealthFraction(s)));
 const steps=[];
 let battery=Math.min(startBattery,capacity),onlineMinutes=0;
 for(let i=0;i<24/POWER.stepHours*1;i++){
  const h=i*POWER.stepHours,load=loadAt(s,h),demand=load.total,solar=solarAt(s,h,weather),grid=gridAt(s,h)?demand:0,source=solar+grid,efficiency=POWER.systemEfficiency;
  let batteryFlow=0,served=source>=demand;
  if(source<demand){
   const deficit=demand-source,draw=Math.min(battery,deficit/Math.max(.01,efficiency));
   battery-=draw;batteryFlow=-draw/POWER.stepHours;served=draw*efficiency>=deficit-1e-6;
  }else{
   const charge=Math.min(Math.max(0,capacity-battery),(source-demand)*efficiency);
   battery+=charge;batteryFlow=charge/POWER.stepHours;
  }
  if(served)onlineMinutes+=POWER.stepHours*60;
  steps.push({h,load,solar,grid,source,battery,batteryPct:capacity?Math.max(0,Math.min(1,battery/capacity)):0,batteryFlow,online:served});
 }
 // Include an endpoint snapshot so the 24:00 marker has a matching battery
 // state without adding another quarter-hour of demand to daily totals.
 if(steps.length){const last=steps[steps.length-1],endpointLoad=loadAt(s,24),endpointGrid=gridAt(s,24)?endpointLoad.total:0;steps.push({...last,h:24,load:endpointLoad,solar:0,grid:endpointGrid,source:endpointGrid,batteryFlow:0});}
 return {steps,availability:onlineMinutes/(24*60),onlineHours:onlineMinutes/60,finalBattery:steps[steps.length-1].batteryPct,minimumBattery:Math.min(...steps.map(x=>x.batteryPct)),dailyDemand:dailyDemand(s),networkDaily:networkLoad(s)*24/1000,deviceDaily:deviceLoad(s)*(s.mode==='24x7'?24:Number(s.userHours||0))/1000,solarDaily:steps.reduce((n,x)=>n+x.solar*POWER.stepHours,0)/1000,nominalBatteryCapacityWh:Number(s.battery||0)*1000,effectiveBatteryCapacityWh:capacity,batteryHealthFraction:powerBatteryHealthFraction(s)};
}

// The load model is intentionally small and explicit: each site device can be
// enabled independently, while user devices use two shared, easy-to-understand
// quantity controls (smartphones and laptops).
POWER.siteEquipment={
 fiber:{name:'Fiber ONT/CPE',w:10,group:'connectivity'},
 p2p:{name:'P2P radio (local end)',w:20,group:'connectivity'},
 fwa:{name:'FWA CPE/router',w:25,group:'connectivity'},
 leo:{name:'LEO satellite terminal',w:75,group:'connectivity'},
 router:{name:'Router / firewall',w:15,group:'network'},
 switch:{name:'Small network switch',w:15,group:'network'},
 poe:{name:'PoE switch (own consumption)',w:30,group:'network'},
 apIndoor:{name:'Indoor Wi-Fi AP',w:15,group:'network'},
 apOutdoor:{name:'Outdoor Wi-Fi AP',w:25,group:'network'}
};
// Keep the original public equipment namespace as an alias so every UI and
// calculation reads the same authoritative wattage table.
POWER.equipment=POWER.siteEquipment;
Object.keys(POWER.connectivity).forEach(key=>{POWER.connectivity[key].w=POWER.siteEquipment[key].w;});
POWER.deviceLoads={smartphone:{name:'Smartphone charging',w:15},laptop:{name:'Laptop',w:45}};
// Keep the legacy field as a compatibility alias, but expose only the two
// learner-facing device types in the active model.
POWER.devices={phone:{name:'Smartphone charging',w:15},laptop:{name:'Laptop',w:45}};

function equipmentCountFromLabel(label){
 const match=String(label||'').match(/^(\d+)\s*[×x]/);
 return match?Number(match[1]):1;
}
function ensurePowerScenario(s){
 if(!s.network)s.network=[];
 if(!s.equipmentSelections){
  s.equipmentSelections={};
  s.network.forEach(([key,label])=>{s.equipmentSelections[key]=equipmentCountFromLabel(label);});
  if(s.accessTech&&s.network.length===0)s.equipmentSelections[s.accessTech]=1;
 }
 ['apIndoor','apOutdoor'].forEach(key=>{if(Object.prototype.hasOwnProperty.call(s.equipmentSelections,key))s.equipmentSelections[key]=Math.max(0,Math.min(10,Math.round(Number(s.equipmentSelections[key])||0)));});
 // Preserve old scenario data while exposing the simplified two-device model.
 if(s.smartphones===undefined)s.smartphones=s.devices?.type==='phone'?(s.devices.count||0):0;
 if(s.laptops===undefined)s.laptops=(s.devices?.type==='laptop'||s.devices?.type==='basic')?(s.devices.count||0):0;
 if(s.userHours===undefined)s.userHours=s.devices?.hours??0;
 if(s.userStart===undefined)s.userStart=s.devices?.start??0;
 if(s.autonomyDays===undefined)s.autonomyDays=POWER.autonomy.defaultDays;
 s.autonomyDays=Math.max(POWER.autonomy.minDays,Math.min(POWER.autonomy.maxDays,Math.round(Number(s.autonomyDays)||0)));
 const health=Number(s.batteryHealth);
 s.batteryHealth=health===POWER.batteryHealth.aged?POWER.batteryHealth.aged:POWER.batteryHealth.new;
 return s;
}
Object.values(POWER.scenarios).forEach(ensurePowerScenario);
// Keep a small continuous user load in the health scenario while using the
// simplified learner-facing device vocabulary.
POWER.scenarios.health.laptops=1;
POWER.scenarios.custom={name:'Custom',subtitle:'Choose the load you want to explore',grid:'none',accessTech:null,question:'How much energy does this load need?',network:[],equipmentSelections:{},smartphones:0,laptops:0,userHours:0,userStart:0,mode:'24x7',solar:200,battery:5,weather:'Sunny',priority:'Your own scenario',autonomyDays:1,batteryHealth:1};
ensurePowerScenario(POWER.scenarios.custom);
POWER.defaults=JSON.parse(JSON.stringify(POWER.scenarios));

function powerEquipmentEntries(s){
 ensurePowerScenario(s);
 return Object.entries(s.equipmentSelections||{}).filter(([key,count])=>POWER.siteEquipment[key]&&Number(count)>0);
}
function selectedEquipmentLoad(s){
 return powerEquipmentEntries(s).reduce((sum,[key,count])=>sum+POWER.siteEquipment[key].w*Number(count),0);
}
function networkLoad(s){return selectedEquipmentLoad(s);}
function deviceLoad(s){
 ensurePowerScenario(s);
 return POWER.deviceLoads.smartphone.w*Number(s.smartphones||0)+POWER.deviceLoads.laptop.w*Number(s.laptops||0);
}
function isDeviceOn(s,h){
 ensurePowerScenario(s);
 if(!(s.smartphones||s.laptops)||!(s.userHours||0))return false;
 if(s.mode==='24x7')return true;
 const start=Number(s.userStart||0),end=start+Number(s.userHours||0);
 return h>=start&&h<end;
}
function loadAt(s,h){const network=networkLoad(s),devices=isDeviceOn(s,h)?deviceLoad(s):0;return {network,devices,total:network+devices};}
function dailyDemand(s){let total=0;for(let i=0;i<24/POWER.stepHours;i++)total+=loadAt(s,i*POWER.stepHours).total*POWER.stepHours;return total/1000;}
function setPowerTechnology(s,tech){
 ensurePowerScenario(s);
 ['fiber','p2p','fwa','leo'].forEach(key=>{if(s.equipmentSelections[key]!==undefined)s.equipmentSelections[key]=0;});
  s.accessTech=tech;
 s.equipmentSelections[tech]=1;
}
function setPowerEquipmentEnabled(s,key,enabled){
 ensurePowerScenario(s);
 if(!POWER.siteEquipment[key])return;
 if(enabled){
  const current=s.equipmentSelections[key];
  s.equipmentSelections[key]=current>0?current:1;
 }else s.equipmentSelections[key]=0;
}
function powerApKey(s){
 ensurePowerScenario(s);
 return ['apIndoor','apOutdoor'].find(key=>Object.prototype.hasOwnProperty.call(s.equipmentSelections,key))||'apIndoor';
}
function powerApCount(s){
 ensurePowerScenario(s);
 return Math.max(0,Math.min(10,Math.round(Number(s.equipmentSelections[powerApKey(s)]||0))));
}
function setPowerApCount(s,count){
 ensurePowerScenario(s);
 const key=powerApKey(s);
 s.equipmentSelections[key]=Math.max(0,Math.min(10,Math.round(Number(count)||0)));
 return s.equipmentSelections[key];
}

function powerAssessment(s,state){
 ensurePowerScenario(s);
 const sunny=simulatePower(s,{weather:'Sunny'}),cloudy=simulatePower(s,{weather:'Cloudy'}),normal=simulatePower(s,{weather:state.weather});
 const lessons=[];
 const autonomyTargetDays=Math.max(0,Number(s.autonomyDays)||0);
 const recommendedBatteryKwh=powerRecommendedBatteryCapacityKwh(s);
 const currentUsableKwh=powerEffectiveBatteryCapacityWh(s)/1000;
 if(!networkLoad(s)&&!deviceLoad(s))lessons.push(['No active load yet','Add equipment or user devices to start exploring. An empty load is a valid scenario.']);
 if(sunny.availability<1)lessons.push(['Battery or generation is too small','The sunny-day simulation still loses connectivity. Increase battery or solar, or reduce the scheduled load.']);
 else if(cloudy.availability<1)lessons.push(['Ideal weather is not enough','Your sunny day works, but cloudy production is lower. Resilience needs margin beyond ideal conditions.']);
 if(sunny.solarDaily<sunny.dailyDemand)lessons.push(['This is a generation problem','The array does not produce enough daily energy to replace what the site consumes. A larger battery alone cannot fix the energy deficit.']);
 else if(sunny.minimumBattery<=0&&sunny.dailyDemand>0)lessons.push(['This is a storage problem','The array makes enough daily energy, but the battery cannot bridge the night or outage.']);
 if(deviceLoad(s)&&sunny.deviceDaily>sunny.networkDaily)lessons.push(['Users can consume more than the network','Devices and charging are using more daily energy than the connectivity equipment.']);
 if(s.mode==='24x7'&&s.grid==='none'&&networkLoad(s))lessons.push(['Continuous services need continuous power','A 24×7 network needs stored energy overnight, even when few people are actively using it.']);
 if(s.grid==='unreliable')lessons.push(['Grid reliability changes the design','The battery carries the deterministic 18:00–06:00 outage. A critical service may justify extra storage or solar.']);
 if(autonomyTargetDays>0&&currentUsableKwh+1e-6<recommendedBatteryKwh)lessons.push(['Autonomy target needs more storage','Your '+autonomyTargetDays+'-day autonomy target calls for about '+recommendedBatteryKwh.toFixed(2)+' kWh of usable battery capacity. This design currently provides '+currentUsableKwh.toFixed(2)+' kWh.']);
 return {sunny,cloudy,normal,autonomyTargetDays,recommendedBatteryKwh,currentUsableKwh,autonomyMet:currentUsableKwh+1e-6>=recommendedBatteryKwh,lessons:lessons.length?lessons:[['A balanced power design','Your system has enough modeled generation and storage under this weather profile. Keep checking real equipment and site conditions.']]};
}
