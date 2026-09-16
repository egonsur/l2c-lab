let towerState={...TOWER_PRESETS[0]},towerPreset=0;
const TOWER_STATUS={good:['Good link geometry','The straight LoS and the inner 60% of the first Fresnel-zone radius clear the effective-Earth terrain and obstacles. This is a geometry check, not proof of a working radio link.'],clearance:['Marginal — clear LoS, limited Fresnel clearance','The straight LoS clears the effective-Earth terrain and obstacles, but the 60% Fresnel clearance target is not met. Seeing the other site is not enough.'],blocked:['Blocked','The effective-Earth terrain or an obstacle meets or crosses the straight LoS. Try raising antennas, shortening the link, or choosing another route.']};
function towerSlider(key,label,min,max,unit){return `<div class="tower-control"><label for="tower-${key}">${label}<output id="value-${key}" for="tower-${key}">${towerState[key]} ${unit}</output></label><input id="tower-${key}" data-tower="${key}" type="range" min="${min}" max="${max}" step="1" value="${towerState[key]}" aria-valuetext="${towerState[key]} ${unit}"><div class="range-ends"><span>${min} ${unit}</span><span>${max} ${unit}</span></div></div>`;}
// Shared fixed chart frame: independent of distance, frequency and scenario.
const PROFILE_SCALE={min:-40,max:150,bottom:340,pixelsPerMetre:1.5};
// Physical height determines Y extents. Decorative canopy width never enters evaluatePath.
function treeLineSVG(s,X,Y,canopyWidth=16){
 const positions=Array.from({length:9},(_,i)=>VEGETATION.start+(VEGETATION.end-VEGETATION.start)*i/8);
 return '<g data-layer="vegetation"><title>Tree line: '+(s.vegetationHeight??VEGETATION.height)+' m above ground, from 42% to 58% of the path. Canopy widths are illustrative.</title>'+positions.map(t=>{
  const ground=terrainHeight(t,s.terrain,s.hillHeight??30)+(s.curvature?earthCorrection(t*s.distance*1000,(1-t)*s.distance*1000):0),baseY=Y(ground),topY=Y(ground+(s.vegetationHeight??VEGETATION.height)),h=baseY-topY,x=X(t),w=canopyWidth/2;
  return `<g data-tree-height="${s.vegetationHeight??VEGETATION.height}" data-tree-base="${baseY}" data-tree-top="${topY}" transform="translate(${x} ${topY})"><path d="M0 ${h} L0 ${h*.46} M0 ${h*.72} L${-w*.4} ${h*.51} M0 ${h*.66} L${w*.4} ${h*.43}" fill="none" stroke="#79583d" stroke-width="2"/><path d="M0 0 C${w*.6} 0 ${w*.75} ${h*.12} ${w*.65} ${h*.24} C${w*1.2} ${h*.24} ${w*1.2} ${h*.56} ${w*.65} ${h*.63} C${w*.4} ${h*.78} ${-w*.4} ${h*.78} ${-w*.65} ${h*.63} C${-w*1.2} ${h*.56} ${-w*1.2} ${h*.24} ${-w*.65} ${h*.24} C${-w*.75} ${h*.12} ${-w*.6} 0 0 0 Z" fill="#5b8955" stroke="#365e3d" stroke-width="1"/></g>`;
 }).join('')+`<text x="${X(.5)}" y="${Y(terrainHeight(.5,s.terrain,s.hillHeight??30)+(s.curvature?earthCorrection(s.distance*500,s.distance*500):0)+(s.vegetationHeight??VEGETATION.height))-12}" text-anchor="middle" class="site-label">Tree line · ${s.vegetationHeight??VEGETATION.height} m tall</text></g>`;
}
function buildingsSVG(s,r,X,Y){
 return '<g data-layer="buildings">'+buildingProfiles(s).map((b,i)=>{
  const points=r.samples.filter(p=>p.t>=b.start&&p.t<=b.end);
  const outline=points.map(p=>X(p.t)+','+Y(p.displayGround+b.height)).concat([...points].reverse().map(p=>X(p.t)+','+Y(p.displayGround))).join(' ');
  const mid=points[Math.floor(points.length/2)],width=X(b.end)-X(b.start);
  const windows=Array.from({length:Math.max(1,Math.floor(b.height/7))},(_,row)=>[.25,.5,.75].map(frac=>{
   const t=b.start+(b.end-b.start)*frac,p=r.samples[Math.round(t*1000)];
   return `<rect x="${X(t)-2}" y="${Y(p.displayGround+4+row*7)}" width="4" height="3" fill="#eef5f5"/>`;
  }).join('')).join('');
  return `<g data-building-height="${b.height}"><title>${b.name}: ${b.height} m above ground</title><polygon points="${outline}" fill="${i===1?'#a4afb9':'#bdc9d0'}" stroke="#677b88" stroke-width="1.5"/>${windows}<text x="${X(mid.t)}" y="${Y(mid.displayGround)+14}" text-anchor="middle" class="axis-label">${b.height} m</text></g>`;
 }).join('')+'</g>';
}
function profileSVG(s,r){
 const X=t=>70+860*t,Y=h=>PROFILE_SCALE.bottom-(h-PROFILE_SCALE.min)*PROFILE_SCALE.pixelsPerMetre;
 const line=(points,fn)=>points.map(p=>X(p.t).toFixed(2)+','+Y(fn(p)).toFixed(2)).join(' ');
 const zone=f=>line(r.samples,p=>p.los+f*p.fresnel)+' '+line([...r.samples].reverse(),p=>p.los-f*p.fresnel);
 const correction=line(r.samples,p=>p.displayGround)+' '+line([...r.samples].reverse(),p=>p.ground);
 const bad=r.samples.filter((p,i)=>i%10===0&&p.margin<0);
 return `<svg viewBox="0 0 1000 410" role="img" aria-labelledby="path-title path-desc"><title id="path-title">Wireless path: ${TOWER_STATUS[r.status][0]}</title><desc id="path-desc">Terrain peak ${r.peak.ground.toFixed(1)} metres; Earth correction at that point ${r.peak.bulge.toFixed(1)} metres. Straight LoS joins phase centers ${r.antennaA} and ${r.antennaB} metres above the endpoint datum. Link ${s.distance} kilometres at ${s.frequency} GHz. Minimum LoS clearance ${r.minLOS.toFixed(1)} metres; minimum 60 percent Fresnel margin ${r.worst.margin.toFixed(1)} metres. Fixed vertical range minus 40 to 150 metres.</desc><rect width="1000" height="350" rx="10" fill="#f2f7f7"/>${[-25,0,25,50,75,100,125,150].map(h=>`<line x1="70" x2="930" y1="${Y(h)}" y2="${Y(h)}" stroke="#dce7e4"/><text data-elevation="${h}" x="55" y="${Y(h)+4}" text-anchor="end" class="axis-label">${h} m</text>`).join('')}<polygon data-layer="terrain-fill" points="70,340 ${line(r.samples,p=>p.displayGround)} 930,340" fill="#bdcdb3"/>${s.curvature?`<polygon data-layer="curvature" points="${correction}" fill="#cba66a" fill-opacity=".38"/>`:''}<polyline data-layer="terrain" points="${line(r.samples,p=>p.ground)}" fill="none" stroke="#8d713d" stroke-dasharray="4 4" stroke-width="1.5"/><polyline data-layer="effective-terrain" points="${line(r.samples,p=>p.displayGround)}" fill="none" stroke="#627f59" stroke-width="2"/>${buildingsSVG(s,r,X,Y)}${s.terrain==='trees'?treeLineSVG(s,X,Y):''}<polygon data-layer="fresnel" points="${zone(1)}" fill="#72b5d5" fill-opacity=".24" stroke="#5e97b1" stroke-width="1"/><polygon data-layer="fresnel60" points="${zone(.6)}" fill="#72b5d5" fill-opacity=".2" stroke="#447c9c" stroke-dasharray="5 4"/>${bad.map(p=>`<line x1="${X(p.t)}" x2="${X(p.t)}" y1="${Y(p.displayObstacle)}" y2="${Y(p.los-.6*p.fresnel)}" stroke="#be704b" stroke-width="3" opacity=".65"/>`).join('')}<line data-layer="radio" x1="70" x2="930" y1="${Y(r.antennaA)}" y2="${Y(r.antennaB)}" stroke="#185d4e" stroke-width="2.5"/>${[[70,r.mountA,s.a,'A'],[930,r.mountB,s.b,'B']].map(([x,g,h,l])=>`<path d="M${x-7} ${Y(g)} L${x} ${Y(g+h)} L${x+7} ${Y(g)} M${x-5} ${Y(g+h*.3)} L${x+4} ${Y(g+h*.6)}" fill="none" stroke="#294e45" stroke-width="2.5"/><circle data-phase-center="${l}" cx="${x}" cy="${Y(g+h)}" r="5" fill="#185d4e" stroke="white" stroke-width="2"/><text x="${x}" y="${Y(g+h)-14}" text-anchor="${l==='A'?'start':'end'}" class="site-label">${l} · ${h} m above ground</text>`).join('')}${r.status!=='good'?`<circle cx="${X(r.worst.t)}" cy="${Y(r.worst.displayObstacle)}" r="6" fill="#b05639" stroke="white" stroke-width="2"/>`:''}${s.terrain==='hill'?`<text data-layer="peak-label" x="${X(r.peak.t)}" y="${Y(r.peak.displayGround)-12}" text-anchor="middle" class="site-label">Hill: ${r.peak.ground.toFixed(1)} m + Earth: ${r.peak.bulge.toFixed(1)} m</text>`:''}<text x="70" y="370" class="site-label">Site A: Network Site</text><text x="930" y="370" text-anchor="end" class="site-label">Site B: Community Site</text>${[0,.25,.5,.75,1].map(t=>`<text data-distance="${s.distance*t}" x="${X(t)}" y="397" text-anchor="middle" class="axis-label">${+(s.distance*t).toFixed(2)} km</text>`).join('')}</svg>`;
}

let towerLastStatus = null;
let towerSuccessNotice = '';
towerPreset = 1;
towerState = { ...TOWER_PRESETS[towerPreset] };

function towerReason(s, r) {
  if (r.status === 'blocked') {
    if (s.terrain === 'hill') return 'The hill intersects the direct line of sight.';
    if (s.terrain === 'trees') return 'The vegetation reaches into the direct line of sight.';
    if (s.terrain === 'building') return 'The intervening building blocks the direct line of sight.';
    return 'The terrain or effective-Earth profile intersects the direct line of sight.';
  }
  if (r.status === 'clearance') return 'The direct path is clear, but the obstruction still intrudes into the Fresnel zone.';
  return 'The direct path is clear and sufficient Fresnel-zone clearance is available.';
}

function towerEnvironmentLabel(s) {
  return s.terrain === 'flat' ? 'Flat / Open' : s.terrain === 'hill' ? 'Hill' : s.terrain === 'trees' ? 'Trees' : 'Building';
}

function towerLab() {
  const s = towerState;
  const r = evaluatePath(s);
  return `<section class="tower-workspace"><a class="back-link" href="#labs">← All labs</a><div class="eyebrow">LAB 02 · CAN YOU SEE THE TOWER?</div><h1>Can You See the Tower?</h1><div class="current-task lab-action-panel"><b>CHALLENGE</b><span>This wireless link is blocked. Can you fix it?</span><p>Adjust the link parameters and watch what happens. Try to establish a good radio path.</p></div><div class="tower-environment"><div class="eyebrow">ENVIRONMENT · What is between the sites?</div><div class="preset-grid" role="group" aria-label="Choose the environment">${TOWER_PRESETS.map((p, i) => `<button type="button" class="preset ${towerPreset === i ? 'active' : ''}" data-preset="${i}" aria-pressed="${towerPreset === i}"><small>0${i + 1}</small><b>${p.name}</b><span>${p.terrain === 'flat' ? 'Open path' : p.terrain === 'hill' ? 'Terrain hill' : p.terrain === 'trees' ? 'Vegetation' : 'Intervening obstacle'}</span></button>`).join('')}</div></div><div class="tower-layout"><div class="tower-visual"><div class="profile-heading"><div><div class="eyebrow">RADIO PATH · ${towerEnvironmentLabel(s)}</div><h2>Change something and watch the path respond.</h2></div><span id="profile-distance"></span></div><div id="tower-profile"></div><div class="profile-legend"><span><i class="legend-radio"></i>Straight LoS</span><span><i class="legend-los"></i>Terrain without curvature</span><span><i class="legend-curvature"></i>Earth-curvature correction</span><span><i class="legend-zone"></i>First Fresnel zone</span><span><i class="legend-inner"></i>60% radius target</span><span><i class="legend-ground"></i>Terrain on effective Earth</span></div><p class="note">Synthetic profile · Fixed vertical scale: −40 to 150 m, exaggerated. Distance changes the horizontal scale; obstacle heights remain physically meaningful. LoS stays straight between antenna centers.</p><div id="tower-result" class="lab-feedback" aria-live="polite" aria-atomic="true"></div></div><aside class="tower-controls lab-action-panel" aria-label="Adjust the wireless link"><h2>ADJUST THE LINK</h2><p>These controls change the model. The result below tells you what happened.</p>${towerSlider('distance', 'Distance', 1, 50, 'km')}${towerSlider('a', 'Antenna A height', 5, 50, 'm')}${towerSlider('b', 'Antenna B height', 5, 50, 'm')}${s.terrain === 'hill' ? towerSlider('hillHeight', 'Hill height', 20, 45, 'm') : ''}${s.terrain === 'trees' ? towerSlider('vegetationHeight', 'Tree height', 8, 30, 'm') : ''}${s.terrain === 'building' ? towerSlider('buildingHeight', 'Building height', 10, 45, 'm') : ''}<div class="tower-control"><label for="tower-frequency">Frequency</label><select id="tower-frequency" data-tower="frequency">${TOWER_BANDS.map(f => `<option value="${f}" ${f === s.frequency ? 'selected' : ''}>${f} GHz</option>`).join('')}</select><small>Frequency changes Fresnel-zone size; it does not remove a physical line-of-sight obstruction.</small></div><label class="earth-toggle"><input id="tower-curvature" data-tower="curvature" type="checkbox" ${s.curvature ? 'checked' : ''}> Include Earth curvature</label><p class="note">Earth curvature uses an effective radius of 4/3 × Earth’s radius.</p><button type="button" id="tower-reset" class="secondary">Reset challenge ↺</button></aside></div><section class="panel"><h2>FEEDBACK · Did you fix the link?</h2><div id="tower-lessons"></div><div class="trade-grid">${explain('los')}${explain('terrain')}<details class="explanation"><summary>Why does frequency change the shape?</summary><p>Lower frequencies have a larger first Fresnel zone for the same distance. Higher frequencies need a narrower clearance envelope, but frequency cannot make a blocked direct path clear.</p></details><details class="explanation"><summary>See the model and its limits</summary><p>The Lab uses a straight line of sight, a first Fresnel-zone estimate and an effective Earth radius of 4/3. Heights and obstruction geometry are simplified for learning, not professional RF planning.</p></details></div><p class="disclaimer">Educational visualization, not professional RF planning. A real deployment needs a site survey, terrain and clutter data, link-budget and availability analysis, and checks of equipment, spectrum and power.</p></section><div class="tower-end"><a href="#tower" class="back-link">← Lab introduction</a><a class="button" href="#builder">Explore connectivity options ↗</a></div></section>`;
}

function updateTower() {
  const s = towerState;
  const r = evaluatePath(s);
  const profile = document.querySelector('#tower-profile');
  if (profile) profile.innerHTML = profileSVG(s, r);
  const modified = Object.keys(s).some(key => s[key] !== TOWER_PRESETS[towerPreset][key]);
  const pd = document.querySelector('#profile-distance');
  if (pd) pd.textContent = (modified ? 'Modified · ' : '') + s.distance + ' km · ' + s.frequency + ' GHz';
  if (towerLastStatus && towerLastStatus !== 'good' && r.status === 'good') {
    towerSuccessNotice = 'Link established — you now have clear line of sight and sufficient Fresnel-zone clearance. Try another environment and see whether the same solution still works.';
  }
  const result = document.querySelector('#tower-result');
  if (result) result.innerHTML = `<div class="path-status status-${r.status}"><h3>${r.status === 'good' ? '✓' : r.status === 'blocked' ? '⊘' : '△'} ${r.status === 'good' ? 'Good link geometry' : r.status === 'blocked' ? 'Blocked' : 'Marginal — clear LoS, limited Fresnel clearance'}</h3><p>${towerReason(s, r)}</p>${towerSuccessNotice ? `<p class="lab-feedback-positive"><b>${towerSuccessNotice}</b></p>` : ''}<div class="path-metrics"><div><b>${r.minLOS.toFixed(1)} m</b><small>Minimum LoS clearance</small></div><div><b>${r.worst.margin.toFixed(1)} m</b><small>Minimum 60% zone margin</small></div><div><b>${r.midRadius.toFixed(1)} m</b><small>Midpoint Fresnel radius</small></div><div><b>${r.midBulge.toFixed(1)} m</b><small>Midpoint curvature correction</small></div></div></div>`;
  const lessons = document.querySelector('#tower-lessons');
  if (lessons) lessons.innerHTML = `<div class="tower-takeaways"><article><h3>${r.status === 'good' ? 'You fixed the link. Keep experimenting.' : 'Try a change and observe the result.'}</h3><p>${r.status === 'blocked' ? 'Raise one or both antennas, or try a different environment. Frequency cannot remove a direct-path obstruction.' : r.status === 'clearance' ? 'The antennas can see each other, but more Fresnel clearance is needed. Raise an antenna or explore frequency as a what-if.' : 'The direct path and the 60% Fresnel target are both clear under these assumptions.'}</p></article><article><h3>Distance is a scenario variable</h3><p>A longer path changes Fresnel radius and Earth curvature. Sites are usually fixed in the real world, so antenna height, route and equipment are the practical design variables.</p></article><article><h3>Environment changes the obstruction</h3><p>${towerEnvironmentLabel(s)} uses a fixed physical profile. The obstacle height stays meaningful while distance changes the horizontal scale.</p></article></div>`;
  towerLastStatus = r.status;
}

function bindTower() {
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
    towerPreset = Number(button.dataset.preset);
    towerState = { ...TOWER_PRESETS[towerPreset] };
    towerLastStatus = null;
    towerSuccessNotice = '';
    main.innerHTML = towerLab();
    bindTower();
    document.querySelector(`[data-preset="${towerPreset}"]`)?.focus({ preventScroll: true });
  }));
  document.querySelectorAll('[data-tower]').forEach(element => element.addEventListener('input', () => {
    const key = element.dataset.tower;
    towerState[key] = key === 'curvature' ? element.checked : Number(element.value);
    const output = document.querySelector('#value-' + key);
    if (output) {
      const unit = key === 'distance' ? 'km' : 'm';
      output.textContent = element.value + ' ' + unit;
      element.setAttribute('aria-valuetext', element.value + ' ' + unit);
    }
    updateTower();
  }));
  document.querySelector('#tower-reset')?.addEventListener('click', () => {
    towerPreset = 1;
    towerState = { ...TOWER_PRESETS[towerPreset] };
    towerLastStatus = null;
    towerSuccessNotice = '';
    main.innerHTML = towerLab();
    bindTower();
    document.querySelector('#tower-reset')?.focus({ preventScroll: true });
  });
  updateTower();
}

function towerIntro() {
  return `<section class="text-page tower-intro"><a class="back-link" href="#labs">← All labs</a><div class="eyebrow">LAB 02 · CAN YOU SEE THE TOWER?</div><div class="tower-intro-art">${labIcon('tower', 'Wireless path feasibility')}</div><h1>Can You See the Tower?</h1><h2>The wireless link is blocked. Can you fix it?</h2><p>Adjust the environment and link parameters, watch the radio path respond, and discover the difference between clear line of sight and Fresnel-zone clearance.</p><a class="button" href="#tower-play">Fix the link ↗</a><p class="meta">◷ 3–5 minutes · Beginner / Intermediate</p></section>`;
}
