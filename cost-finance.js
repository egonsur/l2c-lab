/* Initial budget and recurring expenditure deliberately remain separate. */
CC.quote=function(id,d){
 const tech=CC.technologies[d.tech],route=CC.route(d.source,id);
 const access=tech.capex*(tech.unit==='km'?(route?.km||0):1);
 const items=[{name:tech.name+(tech.unit==='km'?' · '+(route?.km||0)+' km':''),capex:access,opex:tech.opex},{name:CC.scenario.local.name,capex:CC.scenario.local.capex,opex:CC.scenario.local.opex}];
 if(d.power)items.push({name:CC.scenario.power.name,...CC.scenario.power});
 if(d.backup){const b=CC.technologies[d.backup];items.push({name:'Backup · '+b.name,capex:b.capex,opex:b.opex});}
 return {items,capex:items.reduce((n,i)=>n+i.capex,0),opex:items.reduce((n,i)=>n+i.opex,0)};
};
CC.tco=(capex,opex,years)=>capex+opex*years;
CC.totals=function(plan){
 const cost=Object.entries(plan).reduce((sum,[id,d])=>{const q=CC.quote(id,d);return {capex:sum.capex+q.capex,opex:sum.opex+q.opex};},{capex:0,opex:0});
 return {...cost,remaining:CC.scenario.budget-cost.capex,tco5:CC.tco(cost.capex,cost.opex,5),tco10:CC.tco(cost.capex,cost.opex,10),connected:CC.connected(plan).length};
};

