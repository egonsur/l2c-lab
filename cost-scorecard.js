/* Multi-dimensional outcomes: no composite arbitrary score. */
CC.scorecard=function(plan,events={}){
 const total=CC.totals(plan),ratings=CC.scenario.sites.map(s=>CC.assess(plan,s.id,events));
 const average=key=>Math.max(1,Math.floor(ratings.reduce((n,r)=>n+r[key],0)/ratings.length));
 const ratio=Math.max(total.capex/CC.scenario.budget,total.opex/CC.scenario.annualTarget);
 const affordability=ratio<=CC.rules.affordability.excellent?4:ratio<=CC.rules.affordability.good?3:ratio<=CC.rules.affordability.moderate?2:1;
 const critical=CC.assess(plan,'health',events).reliability;
 const resilience=Math.min(average('reliability'),critical);
 const maintenance=average('maintenance');
 const sustainability=Math.min(affordability,resilience,maintenance);
 return {total,dimensions:[
  {name:'Coverage',value:total.connected+' / '+CC.scenario.sites.length,why:'Institutions with a valid planned upstream route. Outage continuity is evaluated separately.'},
  {name:'Affordability',value:CC.rules.grades[affordability],why:'Uses the larger of initial-budget utilization and annual operating allowance utilization: ≤75% Excellent, ≤100% Good, ≤125% Moderate; otherwise Poor.'},
  {name:'Performance',value:CC.rules.grades[average('capacity')],why:'Rounded-down average capacity rating under current demand, including shared backhaul.'},
  {name:'Resilience',value:CC.rules.grades[resilience],why:'Rounded-down average reliability, capped by health-facility reliability. Power and independent backup matter.'},
  {name:'Maintainability',value:CC.rules.grades[maintenance],why:'Rounded-down average support rating. All technologies need local skills and provider support in this simplified scenario.'},
  {name:'Long-term sustainability',value:CC.rules.grades[sustainability],why:'The weakest of affordability, resilience and maintainability under the stated annual operating allowance.'}
 ]};
};
CC.alternative=function(plan){
 const same=p=>CC.scenario.sites.every(s=>{const a=plan[s.id],b=p[s.id];return a&&a.tech===b.tech&&CC.sourceFor(a)===CC.sourceFor(b)&&!!a.power===!!b.power&&(a.backup||'')===(b.backup||'');});
 const strategy=CC.strategies.find(s=>!same(s.plan))||CC.strategies[1];
 return {...strategy,plan:CC.clone(strategy.plan)};
};
CC.personalLessons=function(plan,events){
 const deployed=Object.values(plan),lessons=[];
 const sats=deployed.filter(d=>d.tech==='leo').length;
 if(sats)lessons.push(['You used satellite at '+sats+' site'+(sats===1?'':'s')+'.','Remote reach and quick installation come with recurring service costs. Your satellite access fees total '+(sats*CC.technologies.leo.opex).toLocaleString()+' per year before local support and power.']);
 if(deployed.some(d=>d.tech==='fiber'))lessons.push(['You invested in fiber.','Construction raised initial spending, but high capacity and lower recurring access costs create room for long-term use.']);
 if(Object.keys(plan).some(id=>CC.descendants(plan,id).length))lessons.push(CC.lessons.reuse);
 if(deployed.some(d=>d.power))lessons.push(CC.lessons.power);
 if(plan.health?.backup)lessons.push(CC.lessons.critical);
 else lessons.push(['Critical services need continuity.','The health facility has no independent backup. Consider whether avoiding outages justifies more initial and recurring spending.']);
 if(events.growth)lessons.push(CC.lessons.growth);
 return lessons.slice(0,5);
};
CC.assessmentText=function(plan,events){
 const t=CC.totals(plan),risks=CC.scenario.sites.filter(s=>CC.assess(plan,s.id,events).rating<=2);
 if(t.remaining<0)return {title:'Connected ambitions — but over budget',text:'The initial investment exceeds the challenge budget. Revisit expensive routes, explore reuse, or trade some capacity for lower setup cost. Compare operating costs before changing technologies.'};
 if(risks.length)return {title:'Within budget — now strengthen the weak spots',text:'Review '+risks.map(s=>s.name).join(', ')+'. Capacity, power or resilience gaps remain even though the initial investment fits.'};
 if(t.opex>CC.scenario.annualTarget)return {title:'A connected district — with recurring costs to fund',text:'Your initial investment fits. Annual operating costs exceed the fictional operating allowance; sustainable funding or another mix deserves attention.'};
 return {title:'A balanced plan under these assumptions',text:'Your plan fits the initial budget and addresses the modeled site needs. Keep reviewing recurring funding, shared dependencies and growth; another mix may suit different priorities.'};
};

