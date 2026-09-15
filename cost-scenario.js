/* Fictional learning scenario; all monetary and capacity assumptions live here. */
const CC={};
CC.scenario={
 name:'Willow District',budget:100000,annualTarget:12000,currency:'USD',
 local:{name:'Local router / Ethernet / Wi-Fi',capex:2000,opex:100},
 power:{name:'Solar + battery',capex:6000,opex:200},
 events:{growthAfter:3,stormAfter:4,growthSite:'b',growthMultiplier:2,criticalSite:'health'},
 sites:[
  {id:'a',name:'School A',kind:'school',distance:2,users:300,demand:60,power:'Reliable',coverage:'Good',sky:true,x:260,y:355,priority:'Capacity + affordability',defaultTech:'fiber'},
  {id:'b',name:'School B',kind:'school',distance:8,users:500,demand:100,power:'Unreliable',coverage:'Good',sky:true,x:400,y:210,priority:'Capacity + affordability',defaultTech:'fwa'},
  {id:'health',name:'Health Facility',kind:'health',distance:12,users:100,demand:25,power:'Reliable',coverage:'Good',sky:true,x:570,y:290,priority:'Reliability + continuity',defaultTech:'microwave'},
  {id:'center',name:'Community Center',kind:'community',distance:18,users:150,demand:30,power:'Unreliable',coverage:'Weak',sky:true,x:745,y:355,priority:'Affordability + local maintenance',defaultTech:'microwave'},
  {id:'c',name:'Remote School C',kind:'school',distance:30,users:250,demand:50,power:'No reliable grid',coverage:'None',sky:true,x:730,y:135,priority:'Capacity + affordability',defaultTech:'leo',terrain:'Difficult terrain'}
 ],
 infrastructure:{town:{name:'Town fiber PoP',x:120,y:245},mobile:{name:'Mobile network',x:330,y:65},satellite:{name:'LEO network',x:765,y:40}},
 // Fictional route lengths, not GIS distances; geometry is predetermined.
 routes:[
  ['town','a',2,true,'Open corridor from the town.'],['town','b',8,false,'A ridge obstructs the direct path; School A can offer a relay.'],
  ['town','health',12,true,'An available elevated endpoint clears this surveyed teaching path.'],
  ['town','center',18,false,'Vegetation obstructs the direct path; try a relay at the health facility.'],
  ['town','c',30,false,'Mountainous terrain blocks the direct path.'],
  ['a','b',6,true,'Both endpoints clear the ridge on this predefined path.'],
  ['a','health',10,true,'Open path between suitable endpoints.'],['a','center',16,false,'A wooded ridge blocks this path.'],
  ['a','c',28,false,'Mountainous terrain blocks this path.'],['b','health',7,true,'Suitable endpoint heights and clearance are assumed.'],
  ['b','center',12,true,'Suitable endpoint heights and clearance are assumed.'],['b','c',23,false,'Mountainous terrain blocks this path.'],
  ['health','center',7,true,'A clear relay route connects the community center.'],['health','c',20,false,'Mountainous terrain blocks this path.'],
  ['center','c',14,false,'The last ridge still blocks this path.']
 ].map(([from,to,km,clear,why])=>({from,to,km,clear,why}))
};
CC.technologies={
 fiber:{name:'Fiber',action:'Extend fiber',capex:4000,unit:'km',opex:1000,capacity:1000,reliability:4,maintenance:3,speed:'Slow',scalability:'Very high',relay:true,color:'#be8539',summary:'High setup cost; low recurring cost and room to grow.'},
 fwa:{name:'4G/5G FWA',action:'Use FWA',capex:5000,unit:'site',opex:1500,capacity:150,reliability:3,maintenance:3,speed:'Fast',scalability:'Provider-dependent',relay:false,color:'#4a83b6',summary:'Reuses mobile coverage; shared network capacity can constrain growth.'},
 microwave:{name:'Point-to-point wireless',action:'Build point-to-point wireless',capex:8000,unit:'link',opex:800,capacity:300,reliability:4,maintenance:3,speed:'Medium / fast',scalability:'High, with upgrades',relay:true,color:'#287d68',summary:'Good capacity with modest recurring costs, on a suitable radio path.'},
 leo:{name:'LEO satellite',action:'Use LEO satellite',capex:1500,unit:'site',opex:3000,capacity:100,reliability:3,maintenance:4,speed:'Very fast',scalability:'Service-dependent',relay:false,color:'#8964aa',summary:'Fast remote reach; low equipment cost can conceal higher recurring costs.'}
};
CC.rules={
 capacity:[{ratio:1.25,rating:4},{ratio:1,rating:3},{ratio:.75,rating:2},{ratio:0,rating:1}],
 grades:{4:'Excellent',3:'Good',2:'Moderate',1:'Poor'},
 suitability:{4:'Excellent',3:'Good',2:'Acceptable',1:'Poor'},
 affordability:{excellent:.75,good:1,moderate:1.25},
 powerPenalty:2,unpoweredRating:1,healthWithoutBackupMax:3,
 sustainabilityTarget:'Annual operating allowance is a planning assumption, not an extra deployment budget.',
 disclaimer:'Costs in this exercise are simplified and illustrative. Real deployment costs vary significantly by country, geography, regulation, labor, equipment and existing infrastructure.',
 limits:'These values are designed for learning and do not represent market prices or engineering quotations.'
};
CC.lessons={
 reuse:['Reuse can reduce cost','A connected fiber or wireless site can relay backhaul to another institution. Shared links also share capacity and failure risks.'],
 power:['Power is infrastructure too','Connectivity equipment needs energy. Solar and batteries add initial and recurring costs, but improve continuity.'],
 satellite:['Cheapest today ≠ cheapest tomorrow','Low terminal cost can be outweighed by recurring service fees over five or ten years.'],
 critical:['Critical services need resilience','Independent backup connectivity costs more, but can keep a health service connected when its primary link fails.'],
 growth:['Demand changes','School B’s demand has doubled. Shared backhaul and per-site capacity must support the larger load.'],
 mix:['One technology rarely solves everything','Upstream fiber, mobile, wireless or satellite still needs local distribution to reach users.']
};
CC.strategies=[
 {name:'Shared terrestrial backhaul',why:'Prioritizes reusable backhaul, capacity at School B, and health-service continuity.',
  plan:{a:{tech:'fiber',source:'town'},b:{tech:'microwave',source:'a',power:true},health:{tech:'microwave',source:'town',backup:'leo'},center:{tech:'microwave',source:'health',power:true},c:{tech:'leo',source:'satellite',power:true}}},
 {name:'Rapid deployment',why:'Prioritizes fast installation using mobile coverage and satellite, with backup at the health facility.',
  plan:{a:{tech:'fwa',source:'mobile'},b:{tech:'fwa',source:'mobile',power:true},health:{tech:'fwa',source:'mobile',backup:'leo'},center:{tech:'leo',source:'satellite',power:true},c:{tech:'leo',source:'satellite',power:true}}}
];
CC.site=id=>CC.scenario.sites.find(s=>s.id===id);
CC.name=id=>CC.site(id)?.name||CC.scenario.infrastructure[id]?.name||id;
CC.route=(from,to)=>CC.scenario.routes.find(r=>(r.from===from&&r.to===to)||(r.to===from&&r.from===to));
CC.sourceFor=d=>d.tech==='fwa'?'mobile':d.tech==='leo'?'satellite':d.source;
CC.clone=value=>JSON.parse(JSON.stringify(value));

