/* Lab 5 educational power model. Values are illustrative, not electrical design specifications. */
const POWER={
 systemEfficiency:.85,usableBatteryFraction:.9,stepHours:.25,
 connectivity:{fiber:{name:'Fiber ONT/CPE',w:10,explain:'The fiber cable is passive; the active ONT/CPE at this site needs power.'},p2p:{name:'P2P radio',w:20,explain:'Only the radio at this site is counted.'},fwa:{name:'FWA CPE/router',w:25,explain:'FWA uses a powered radio/router at this site.'},leo:{name:'Satellite terminal',w:75,explain:'Satellite connectivity requires a powered terminal at the site.'}},equipment:{fwa:{name:'FWA / 4G/5G router',w:25},leo:{name:'LEO satellite terminal',w:75},apIndoor:{name:'Indoor Wi-Fi AP',w:15},apOutdoor:{name:'Outdoor Wi-Fi AP',w:25},p2p:{name:'P2P radio pair',w:20},switch:{name:'Small network switch',w:15},poe:{name:'PoE switch own consumption',w:30},router:{name:'Router / firewall',w:15}},
 devices:{basic:{name:'Basic laptop / Chromebook',w:25},laptop:{name:'Laptop',w:45},tablet:{name:'Tablet',w:10},phone:{name:'Smartphone charging',w:10},desktop:{name:'Desktop + monitor',w:100},projector:{name:'Projector / display',w:150}},
 weather:{Sunny:{multiplier:1,peakSunHours:5},Mixed:{multiplier:.7,peakSunHours:3.5},Cloudy:{multiplier:.4,peakSunHours:2}},
 scenarios:{
  school:{name:'Rural School',subtitle:'No reliable grid · learning mainly happens during school hours',grid:'none',accessTech:'leo',question:'Can you keep the school connected throughout the day and prepare the battery for the next morning?',network:[['leo','LEO satellite terminal'],['router','Router / firewall'],['poe','PoE switch own consumption'],['apIndoor','3 × indoor Wi-Fi APs']],devices:{type:'basic',count:30,hours:5,start:7},mode:'scheduled',solar:1000,battery:5,weather:'Sunny',priority:'School hours'},
  health:{name:'Health Facility',subtitle:'Unreliable grid · connectivity is required 24×7',grid:'unreliable',accessTech:'fwa',question:'Can you keep a critical service connected when the grid fails?',network:[['fwa','FWA / 4G/5G router'],['router','Router / firewall'],['switch','Small network switch'],['apIndoor','2 × indoor Wi-Fi APs']],devices:{type:'desktop',count:1,hours:24,start:0},mode:'24x7',solar:750,battery:5,weather:'Sunny',priority:'Critical 24×7'},
  community:{name:'Remote Community Site',subtitle:'No grid · small continuous network load',grid:'none',accessTech:'leo',question:'Can this off-grid connectivity site operate sustainably day and night?',network:[['leo','LEO satellite terminal'],['router','Router / firewall'],['apOutdoor','Outdoor Wi-Fi AP'],['switch','Small network switch']],devices:{type:'phone',count:8,hours:8,start:10},mode:'24x7',solar:750,battery:5,weather:'Sunny',priority:'Most of the day'}
 }};
function powerScenario(id){return POWER.scenarios[id];} function powerEnergy(w,h){return w*h/1000;} function continuousDailyEnergy(w){return powerEnergy(w,24);}
function networkLoad(s){const base=s.network.reduce((n,[key,label])=>n+(POWER.equipment[key]?.w||0)*(label.startsWith('3 ×')?3:label.startsWith('2 ×')?2:1),0);const old=POWER.equipment[s.network[0][0]]?.w||0;return base-old+(POWER.connectivity[s.accessTech||s.network[0][0]]?.w||old);}
function deviceLoad(s){return (POWER.devices[s.devices.type]?.w||0)*s.devices.count;}
function isDeviceOn(s,h){if(s.mode==='24x7')return true;const start=s.devices.start,end=start+s.devices.hours;return h>=start&&h<end;}
function equipmentOn(s,h){return s.mode==='24x7'||s.grid!=='none'||h>=0;}
function loadAt(s,h){const network=networkLoad(s),devices=isDeviceOn(s,h)?deviceLoad(s):0;return {network,devices,total:network+devices};}
function dailyDemand(s){let total=0;for(let i=0;i<24/POWER.stepHours;i++)total+=loadAt(s,i*POWER.stepHours).total*POWER.stepHours;return total/1000;}
function solarAt(s,h,weather=s.weather){if(h<6||h>18)return 0;const daylight=Math.sin(Math.PI*(h-6)/12);return s.solar*daylight*POWER.weather[weather].multiplier;}
function gridAt(s,h){if(s.grid==='reliable')return true;if(s.grid==='none')return false;return !(h>=18||h<6);}
function simulatePower(s,opts={}){
 const weather=opts.weather||s.weather,startBattery=(opts.startBattery??s.battery)*1000*POWER.usableBatteryFraction,steps=[];
 let battery=Math.min(startBattery,s.battery*1000*POWER.usableBatteryFraction),onlineMinutes=0;
 for(let i=0;i<96;i++){const h=i*POWER.stepHours,load=loadAt(s,h),demand=load.total,solar=solarAt(s,h,weather),grid=gridAt(s,h)?demand:0,source=solar+grid,efficiency=POWER.systemEfficiency;
  let batteryFlow=0,served=source>=demand;if(source<demand){const deficit=demand-source,draw=Math.min(battery,deficit/efficiency);battery-=draw;batteryFlow=-draw/POWER.stepHours;served=draw*efficiency>=deficit-1e-6;}else{const charge=Math.min(s.battery*1000*POWER.usableBatteryFraction-battery,(source-demand)*efficiency);battery+=charge;batteryFlow=charge/POWER.stepHours;}
  if(served)onlineMinutes+=15;steps.push({h,load,solar,grid,source,battery,batteryPct:battery/(s.battery*1000*POWER.usableBatteryFraction),batteryFlow,online:served});
 }
 return {steps,availability:onlineMinutes/(24*60),onlineHours:onlineMinutes/60,finalBattery:steps[95].batteryPct,minimumBattery:Math.min(...steps.map(x=>x.batteryPct)),dailyDemand:dailyDemand(s),networkDaily:networkLoad(s)*24/1000,deviceDaily:deviceLoad(s)*s.devices.hours/1000,solarDaily:steps.reduce((n,x)=>n+x.solar*POWER.stepHours,0)/1000};
}
function powerAssessment(s,state){
 const sunny=simulatePower(s,{weather:'Sunny'}),cloudy=simulatePower(s,{weather:'Cloudy'}),normal=simulatePower(s,{weather:state.weather});
 const lessons=[];
 if(sunny.availability<1)lessons.push(['Battery or generation is too small','The sunny-day simulation still loses connectivity. Increase battery or solar, or reduce the scheduled load.']);
 else if(cloudy.availability<1)lessons.push(['Ideal weather is not enough','Your sunny day works, but cloudy production is lower. Resilience needs margin beyond ideal conditions.']);
 if(sunny.solarDaily<sunny.dailyDemand)lessons.push(['This is a generation problem','The array does not produce enough daily energy to replace what the site consumes. A larger battery alone cannot fix the energy deficit.']);
 else if(sunny.minimumBattery<=0)lessons.push(['This is a storage problem','The array makes enough daily energy, but the battery cannot bridge the night or outage.']);
 if(s.devices.count&&sunny.deviceDaily>sunny.networkDaily)lessons.push(['Users can consume more than the network','Devices and charging are using more daily energy than the connectivity equipment.']);
 if(s.mode==='24x7'&&s.grid==='none')lessons.push(['Continuous services need continuous power','A 24×7 network needs stored energy overnight, even when few people are actively using it.']);
 if(s.grid==='unreliable')lessons.push(['Grid reliability changes the design','The battery carries the deterministic 18:00–06:00 outage. A critical service may justify extra storage or solar.']);
 return {sunny,cloudy,normal,lessons:lessons.length?lessons:[['A balanced power design','Your system has enough modeled generation and storage under this weather profile. Keep checking real equipment and site conditions.']]};
}

