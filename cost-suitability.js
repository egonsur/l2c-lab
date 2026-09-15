/* Demand and ratings are illustrative scenario rules, not radio engineering. */
CC.demand=(id,events)=>CC.site(id).demand*(events.growth&&id===CC.scenario.events.growthSite?CC.scenario.events.growthMultiplier:1);
CC.load=function(plan,id,events){return [id,...CC.descendants(plan,id)].reduce((n,p)=>n+CC.demand(p,events),0);};
CC.assess=function(plan,id,events={}){
 if(!plan[id]||!CC.primaryPath(plan,id).valid)return {rating:1,capacity:1,reliability:1,maintenance:1,reasons:['No valid Internet path has been deployed.']};
 const d=plan[id],site=CC.site(id),path=CC.primaryPath(plan,id),tech=CC.technologies[d.tech],reasons=[];
 const ratios=path.ids.map(p=>CC.technologies[plan[p].tech].capacity/CC.load(plan,p,events));
 const ratio=Math.min(...ratios),capacity=CC.rules.capacity.find(r=>ratio>=r.ratio).rating;
 reasons.push('Capacity uses the tightest shared-link headroom: '+Math.round(ratio*100)+'% of modeled demand. '+CC.demand(id,events)+' Mbps is this site’s fictional demand.');
 let reliability=Math.min(...path.ids.map(p=>CC.technologies[plan[p].tech].reliability));
 const risky=path.ids.filter(p=>!CC.powerSafe(plan,p));
 if(risky.length){reliability=Math.max(1,reliability-CC.rules.powerPenalty);if(risky.some(p=>CC.site(p).power==='No reliable grid'))reliability=1;reasons.push('Power risk at '+risky.map(CC.name).join(', ')+'. Upstream outages affect dependent sites.');}
 else reasons.push('Local and modeled upstream power needs are addressed.');
 const backup=CC.backupValid(plan,id);
 if(backup&&CC.powerSafe(plan,id)){const backupEnough=CC.technologies[d.backup].capacity>=CC.load(plan,id,events);reliability=backupEnough?4:Math.min(reliability,3);reasons.push('An independent '+CC.technologies[d.backup].name+' service provides backup; both services still depend on local power. '+(backupEnough?'Backup capacity covers the modeled shared load.':'Backup capacity is below the shared load, so resilience is capped at Good.'));}
 if(site.kind==='health'&&!backup){reliability=Math.min(reliability,CC.rules.healthWithoutBackupMax);reasons.push('The health facility has no independent backup, so continuity is limited.');}
 if(path.ids.length>1)reasons.push('Shared backhaul via '+path.ids.slice(0,-1).map(CC.name).join(' → ')+': its capacity and failures are shared.');
 const maintenance=Math.max(1,tech.maintenance-(CC.descendants(plan,id).length>=2?1:0));
 if(CC.descendants(plan,id).length>=2)reasons.push('Supporting two or more dependent institutions adds maintenance coordination, reducing local maintainability by one level.');
 const rating=Math.min(capacity,reliability,site.kind==='community'?maintenance:4);
 reasons.push('Rating takes the weaker of capacity and reliability'+(site.kind==='community'?' and local maintainability':'')+'.');
 return {rating,capacity,reliability,maintenance,ratio,backup,reasons};
};
CC.advanceEvents=function(plan,events){
 const count=CC.connected(plan).length;
 return {growth:events.growth||count>=CC.scenario.events.growthAfter,storm:events.storm||(count>=CC.scenario.events.stormAfter&&!!plan[CC.scenario.events.criticalSite])};
};
CC.storm=function(plan,events={}){
 const id=CC.scenario.events.criticalSite,d=plan[id];
 const survives=CC.outageSurvives(plan,id,id);
 const enough=survives&&CC.technologies[d.backup].capacity>=CC.load(plan,id,events);
 return {survives,enough,why:survives?'The independent backup keeps the health facility connected'+(enough?' and covers the modeled dependent-site demand.':', but cannot carry all modeled dependent-site demand.'):'The primary link has failed in this drill; no independent backup is available. Add one and rerun the same scenario.'};
};

