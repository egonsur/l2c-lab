/* Graph validity, reuse, path traces and scripted outage reachability. */
CC.primaryPath=function(plan,id,seen=new Set()){
 if(seen.has(id))return {valid:false,why:'This connection would create a loop.'};
 const d=plan[id];if(!d)return {valid:false,why:'No upstream connection is deployed.'};
 const site=CC.site(id),tech=CC.technologies[d.tech];
 if(!site||!tech)return {valid:false,why:'Choose an available site and technology.'};
 if(d.tech==='fwa')return site.coverage==='Good'?{valid:true,ids:[id],root:'mobile'}:{valid:false,why:'FWA requires good mobile coverage in this scenario.'};
 if(d.tech==='leo')return site.sky?{valid:true,ids:[id],root:'satellite'}:{valid:false,why:'A clear sky view is required.'};
 const source=d.source,route=CC.route(source,id);
 if(!route)return {valid:false,why:'Choose a defined route from an upstream site.'};
 if(d.tech==='microwave'&&!route.clear)return {valid:false,why:'Radio path blocked. '+route.why};
 if(source==='town')return {valid:true,ids:[id],root:'town'};
 if(!plan[source]||!CC.technologies[plan[source].tech]?.relay)return {valid:false,why:'The upstream site needs a deployed fiber or point-to-point connection that permits relaying.'};
 const next=new Set(seen);next.add(id);
 const parent=CC.primaryPath(plan,source,next);
 return parent.valid?{valid:true,ids:[...parent.ids,id],root:parent.root}:parent;
};
CC.backupValid=function(plan,id){
 const d=plan[id],site=CC.site(id);
 if(!d?.backup)return false;
 return ['leo','fwa'].includes(d.backup)&&d.backup!==d.tech&&(d.backup!=='fwa'||site.coverage==='Good')&&(d.backup!=='leo'||site.sky);
};
CC.validate=function(plan){
 const errors=[];
 for(const id of Object.keys(plan)){
  const path=CC.primaryPath(plan,id);
  if(!path.valid)errors.push(CC.name(id)+': '+path.why);
  if(plan[id].backup&&!CC.backupValid(plan,id))errors.push(CC.name(id)+': choose an available backup using a different upstream service.');
 }
 return {valid:errors.length===0,errors};
};
CC.descendants=function(plan,id){
 return Object.keys(plan).filter(other=>other!==id&&CC.primaryPath(plan,other).valid&&CC.primaryPath(plan,other).ids.includes(id));
};
CC.relayOptions=function(plan,id){
 return ['town',...Object.keys(plan).filter(p=>p!==id&&CC.technologies[plan[p].tech]?.relay&&CC.primaryPath(plan,p).valid&&!CC.descendants(plan,id).includes(p))];
};
CC.connected=function(plan){return Object.keys(plan).filter(id=>CC.primaryPath(plan,id).valid);};
CC.powerSafe=(plan,id)=>CC.site(id).power==='Reliable'||!!plan[id]?.power;
CC.outageSurvives=function(plan,id,failedPrimary,failedPower=null,seen=new Set()){
 if(!plan[id]||seen.has(id)||id===failedPower)return false;
 const d=plan[id];seen.add(id);
 // Both links share site power. Solar mitigates this teaching scenario's grid outage.
 if(CC.backupValid(plan,id))return true;
 if(id===failedPrimary)return false;
 if(!CC.primaryPath(plan,id).valid)return false;
 const source=CC.sourceFor(d);
 return ['town','mobile','satellite'].includes(source)||CC.outageSurvives(plan,source,failedPrimary,failedPower,seen);
};
CC.architecture=function(plan,id){
 const path=CC.primaryPath(plan,id);
 if(!path.valid)return ['No valid upstream path'];
 return ['Internet',CC.name(path.root),...path.ids.map(p=>CC.technologies[plan[p].tech].name+' → '+CC.name(p)),CC.scenario.local.name,CC.site(id).users.toLocaleString()+' users'];
};

