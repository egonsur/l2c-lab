/* Open regression.html in a browser. Tests exercise both labs using synthetic answers. */
(async()=>{const report=document.querySelector('#test-report');try{
let assertions=0;
function assert(ok,message){if(!ok)throw Error(message);assertions++;}
const [easy,hill,long]=TOWER_PRESETS;
assert(evaluatePath(easy).status==='good','Easy rural preset');
assert(evaluatePath(hill).status==='blocked','Hill preset');
assert(evaluatePath(long).status==='good','Long-distance preset');
assert(evaluatePath({...long,curvature:false}).status==='good','Curvature comparison');
assert(evaluatePath({...long,a:40,b:40}).status==='good','Higher antennas restore clearance');
assert(evaluatePath({...hill,frequency:80}).status==='blocked','Frequency cannot remove direct obstruction');
assert(Math.abs(evaluatePath(easy).midRadius-8.6572579)<.001,'Fresnel formula reference');
assert(Math.abs(evaluatePath(long).midBulge-13.2436038)<.001,'Earth bulge reference');
for(const distance of [1,5,10,30,50])for(const frequency of TOWER_BANDS)for(const a of [5,20,50])for(const b of [5,20,50])for(const terrain of ['flat','hill','trees','buildings']){
 const s={...easy,distance,frequency,a,b,terrain},r=evaluatePath(s);
 assert(Number.isFinite(r.worst.margin)&&Number.isFinite(r.minLOS),'Finite geometry');
 assert(evaluatePath({...s,a:a+1}).worst.margin>=r.worst.margin-1e-9,'Height monotonicity');
 assert(evaluatePath({...s,curvature:false}).worst.margin>=r.worst.margin-1e-9,'Curvature monotonicity');
}

const hill10=evaluatePath({...hill,distance:10});
const hill20=evaluatePath({...hill,distance:20});
const hill50=evaluatePath({...hill,distance:50});
assert(hill10.peak.ground===30&&hill20.peak.ground===30&&hill50.peak.ground===30,'Hill peak remains exactly 30 m');
assert(hill10.peak.x===5000&&hill20.peak.x===10000&&hill50.peak.x===25000,'Hill peak stretches horizontally with distance');
hill10.samples.forEach((p,i)=>{
 assert(p.ground===hill50.samples[i].ground,'Every terrain elevation is distance-independent');
 assert(Math.abs(hill50.samples[i].x-p.x*5)<1e-8,'Every X coordinate scales with distance');
});
assert(Math.abs(hill50.midBulge/hill10.midBulge-25)<1e-10,'Curvature independently scales with distance squared');
assert(Math.abs(hill50.midRadius/hill10.midRadius-Math.sqrt(5))<1e-10,'Fresnel independently scales with square root of distance');
assert(hill10.antennaA===hill50.antennaA&&hill10.antennaB===hill50.antennaB,'Antenna elevations stay fixed');
assert(hill50.antennaA===hill50.groundA+hill.a&&hill50.antennaB===hill50.groundB+hill.b,'Antennas use endpoint ground plus height');
const terrainOnly=evaluatePath({...hill,distance:50,frequency:80,a:50,b:45,curvature:false});
assert(terrainOnly.samples.every((p,i)=>p.ground===hill10.samples[i].ground),'Terrain independent of curvature, frequency and antenna settings');
assert(hill50.samples.every(p=>Math.abs(p.clearance-(p.los-p.bulge-p.ground))<1e-10),'Corrected clearance uses separate terms');
assert(evaluatePath({...long,distance:35}).status==='clearance','Longer path shows limited clearance with k=4/3');


const treesState={...hill,terrain:'trees'};
const trees=evaluatePath(treesState),bare=evaluatePath({...treesState,terrain:'flat'});
assert(vegetationHeight(.419,'trees')===0&&vegetationHeight(.42,'trees')===16&&vegetationHeight(.58,'trees')===16&&vegetationHeight(.581,'trees')===0,'Vegetation physical boundaries');
assert(trees.samples.every((p,i)=>p.ground===bare.samples[i].ground),'Trees leave underlying terrain unchanged');
assert(trees.samples[500].obstructionTop-trees.samples[500].ground===16,'Tree top is 16 m above ground');
assert(Math.abs(bare.samples[500].clearance-trees.samples[500].clearance-16)<1e-10,'Trees reduce LOS clearance by physical height');
assert(Math.abs(bare.samples[500].margin-trees.samples[500].margin-16)<1e-10,'Trees reduce Fresnel margin by physical height');
assert(trees.samples[419].clearance===bare.samples[419].clearance&&trees.samples[581].clearance===bare.samples[581].clearance,'No obstruction outside tree-line footprint');
assert(treeLineSVG(treesState,t=>t,h=>-h,50)!==treeLineSVG(treesState,t=>t,h=>-h,8),'Canopy width changes artwork');
assert(JSON.stringify(evaluatePath(treesState))===JSON.stringify(trees),'Canopy artwork does not change calculation');
assert(evaluatePath({...treesState,distance:50,frequency:80}).samples.every((p,i)=>p.vegetation===trees.samples[i].vegetation),'Tree heights independent of distance and frequency');


const flat50=evaluatePath({...easy,distance:50}),flat50off=evaluatePath({...easy,distance:50,curvature:false});
assert(Math.abs(flat50.midBulge-36.7877884163)<1e-8,'50 km effective Earth correction reference');
for(let i=0;i<flat50.samples.length;i++){
 const p=flat50.samples[i],off=flat50off.samples[i];
 assert(p.los===flat50.antennaA+(flat50.antennaB-flat50.antennaA)*p.t&&p.radioPath===p.los,'LoS is always a straight phase-center interpolation');
 assert(p.los===off.los&&p.upper===off.upper&&p.lower===off.lower,'Curvature cannot displace LoS or Fresnel zone');
 assert(Math.abs((p.upper+p.lower)/2-p.los)<1e-10,'Fresnel centerline equals LoS at every sample');
 assert(p.upper>=p.los&&p.lower<=p.los,'Fresnel boundaries straddle LoS');
 assert(p.ground===off.ground&&Math.abs(p.displayGround-p.ground-p.bulge)<1e-10,'Curvature composes the display without mutating terrain');
}
assert(flat50.samples[0].fresnel===0&&flat50.samples[1000].fresnel===0,'Fresnel zone closes at both phase centers');
assert(flat50.samples[0].bulge===0&&flat50.samples[1000].bulge===0,'Earth correction zero at endpoints');
const urban=TOWER_PRESETS[3],urbanResult=evaluatePath(urban);
assert(urbanResult.antennaA===25&&urbanResult.antennaB===29,'Urban phase centers equal roof plus mast');
assert(urbanResult.status==='clearance'&&urbanResult.minLOS>0,'Urban default is Marginal, with clear geometric LoS');
assert(evaluatePath({...urban,building:35}).status==='blocked','Taller intervening building blocks direct LoS');
assert(evaluatePath({...urban,a:10,b:10}).status==='good','Taller rooftop masts restore Fresnel clearance');
const urbanFar=evaluatePath({...urban,distance:50});
assert(urbanFar.samples.every((p,i)=>p.ground===urbanResult.samples[i].ground&&p.building===urbanResult.samples[i].building),'Urban terrain and physical building heights independent of link distance');

const browser=await (async()=>{
 const wait=()=>new Promise(r=>setTimeout(r,80));
 const errors=[];const ok=(v,m)=>{if(!v)errors.push(m)};
 const route=async h=>{location.hash=h;await wait()};
 await route('home');ok(document.querySelector('a[href="#tower"]'),'Lab 2 card');
 await route('tower');ok(main.textContent.includes('Build a link'),'Introduction');
 document.querySelector('a[href="#tower-play"]').click();await wait();
 ok(document.querySelector('#tower-profile svg'),'SVG renders');
 ok(document.querySelector('#tower-result').textContent.includes('Good link geometry'),'Easy preset');
 document.querySelector('[data-preset="1"]').click();
 ok(document.querySelector('#tower-result').textContent.includes('Blocked'),'Hill preset');
 const terrainBefore=document.querySelector('[data-layer="terrain"]').getAttribute('points');
 const ticksBefore=[...document.querySelectorAll('[data-elevation]')].map(el=>el.outerHTML).join('');
 const radioBefore=document.querySelector('[data-layer="radio"]').outerHTML;
 const earthBefore=document.querySelector('[data-layer="effective-terrain"]').getAttribute('points');
 const fresnelBefore=document.querySelector('[data-layer="fresnel"]').getAttribute('points');
 const hillDistance=document.querySelector('#tower-distance');
 hillDistance.value=50;hillDistance.dispatchEvent(new Event('input',{bubbles:true}));
 ok(document.querySelector('[data-layer="terrain"]').getAttribute('points')===terrainBefore,'Rendered hill elevations and Y scaling stay fixed');
 ok([...document.querySelectorAll('[data-elevation]')].map(el=>el.outerHTML).join('')===ticksBefore,'Elevation ticks stay fixed');
 ok(document.querySelector('#terrain-peak').textContent.includes('30.0 m')&&document.querySelector('#terrain-peak').textContent.includes('25.0 km'),'Peak label separates elevation from horizontal position');
 ok(!!document.querySelector('[data-distance="25"]'),'Midpoint X-axis label updates to 25 km');
 ok(document.querySelector('[data-layer="radio"]').outerHTML===radioBefore,'Straight LoS unchanged when distance changes');
 ok(document.querySelector('[data-layer="effective-terrain"]').getAttribute('points')!==earthBefore,'Curvature changes ground display independently');
 ok(document.querySelector('[data-layer="fresnel"]').getAttribute('points')!==fresnelBefore,'Fresnel overlay changes independently');
 document.querySelector('[data-preset="2"]').click();
 ok(document.querySelector('#tower-result').textContent.includes('Good link geometry'),'Long preset with 4/3 Earth radius');
 const earth=document.querySelector('#tower-curvature');earth.checked=false;earth.dispatchEvent(new Event('input',{bubbles:true}));
 ok(document.querySelector('#tower-result').textContent.includes('Good link geometry'),'Curvature toggle');
 document.querySelector('#tower-reset').click();
 ok(document.querySelector('#tower-curvature').checked,'Reset restores curvature');
 const distance=document.querySelector('#tower-distance');distance.value=50;distance.dispatchEvent(new Event('input',{bubbles:true}));
 ok(document.querySelector('#value-distance').textContent==='50 km','Live distance output');
 ok(document.activeElement!==main,'Sliders do not move focus to main');
 const frequency=document.querySelector('#tower-frequency');frequency.value=80;frequency.dispatchEvent(new Event('input',{bubbles:true}));
 ok(towerState.frequency===80,'Frequency control');
 for(const key of ['a','b']){const e=document.querySelector('#tower-'+key);e.value=50;e.dispatchEvent(new Event('input',{bubbles:true}));ok(towerState[key]===50,'Height '+key);}
 const terrain=document.querySelector('#tower-terrain');terrain.value='trees';terrain.dispatchEvent(new Event('input',{bubbles:true}));ok(towerState.terrain==='trees','Terrain control');
 const icons=[...document.querySelectorAll('[data-tree-height]')];
 ok(icons.length===9,'Recognizable tree line rendered');
 ok(icons.every(el=>Math.abs(Number(el.dataset.treeBase)-Number(el.dataset.treeTop)-16*PROFILE_SCALE.pixelsPerMetre)<1e-9),'Illustrated height matches physical height');
 ok(document.querySelectorAll('[data-layer="vegetation"] rect').length===0,'Vegetation uses tree paths, not rectangles');
 const vegetationGround=document.querySelector('[data-layer="terrain"]').getAttribute('points');
 const resultBefore=evaluatePath(towerState);
 document.querySelector('[data-layer="vegetation"]').setAttribute('transform','scale(1.1,1)');
 ok(evaluatePath(towerState).worst.margin===resultBefore.worst.margin,'Decorative changes leave clearance unchanged');
 terrain.value='flat';terrain.dispatchEvent(new Event('input',{bubbles:true}));
 ok(document.querySelector('[data-layer="terrain"]').getAttribute('points')===vegetationGround,'Tree line never creates a terrain block');
 ok(!document.querySelector('[data-layer="vegetation"]'),'Trees removed when terrain changes');

 ok(EFFECTIVE_EARTH_K===4/3,'Fixed effective Earth model');
 document.querySelector('[data-preset="3"]').click();ok(towerState.distance===2&&towerState.terrain==='urban','Urban preset');
 ok(main.textContent.includes('Marginal'),'Urban starts with clear LoS and Fresnel intrusion');
 ok(document.querySelectorAll('[data-building-height]').length===3,'Two rooftops and intervening building drawn');
 ok(document.querySelector('#tower-a').previousElementSibling.textContent.includes('above rooftop'),'Mast control clearly references rooftop');
 const urbanSet=(key,value)=>{const e=document.querySelector('#tower-'+key);e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));};
 urbanSet('building',35);ok(main.textContent.includes('⊘ Blocked'),'Intervening roof blocks LoS');
 urbanSet('building',26);urbanSet('a',10);urbanSet('b',10);ok(main.textContent.includes('✓ Good link geometry'),'Raising rooftop masts clears link');
 urbanSet('roofA',30);ok(evaluatePath(towerState).antennaA===40,'Roof plus mast determines phase center');
 document.querySelector('#tower-reset').click();ok(towerState.roofA===20&&towerState.a===5&&towerState.building===26,'Urban reset restores roof, mast and obstruction');
 const straight=document.querySelector('[data-layer="radio"]').outerHTML;
 const zoneBefore=document.querySelector('[data-layer="fresnel"]').getAttribute('points');
 const curve=document.querySelector('#tower-curvature');curve.checked=false;curve.dispatchEvent(new Event('input',{bubbles:true}));
 ok(document.querySelector('[data-layer="radio"]').outerHTML===straight,'Curvature toggle never moves LoS');
 ok(document.querySelector('[data-layer="fresnel"]').getAttribute('points')===zoneBefore,'Curvature toggle never moves Fresnel envelope');
 document.querySelector('#tower-terrain').value='flat';document.querySelector('#tower-terrain').dispatchEvent(new Event('input',{bubbles:true}));
 ok(!document.querySelector('#tower-roofA')&&!document.querySelector('[data-building-height]'),'Leaving urban removes rooftop controls and buildings');
 document.querySelector('#tower-terrain').value='urban';document.querySelector('#tower-terrain').dispatchEvent(new Event('input',{bubbles:true}));
 ok(!!document.querySelector('#tower-roofA'),'Urban controls restored when selected manually');
 await route('builder');
 for(let i=0;i<6;i++){for(const f of STEPS[i].fields){const input=document.querySelector('input[name="'+f.key+'"]');input.click();}ok(!document.querySelector('#next').disabled,'Lab 1 step '+i);document.querySelector('#next').click();await wait();}
 ok(location.hash==='#results'&&main.textContent.includes('Possible network architecture'),'Lab 1 results');
 await route('cost');ok(main.textContent.includes('Start challenge'),'Lab 3 introduction is available');
 await route('tower-play');document.querySelector('[data-preset="2"]').click();
 return {passed:errors.length===0,errors,title:document.title,svg:!!document.querySelector('#tower-profile svg'),horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
})();
if(!browser.passed)throw Error(browser.errors.join('; '));
report.textContent='PASS: '+assertions+' model assertions and desktop navigation/control regression checks.';
document.body.dataset.tests='passed';
}catch(error){report.textContent='FAIL: '+error.message;document.body.dataset.tests='failed';throw error;}})();





