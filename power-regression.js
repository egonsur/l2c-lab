(function(){
 try{
 const out=[];
 function ok(name,value){if(!value)throw Error(name);out.push('✓ '+name)}
 const school=POWER.scenarios.school,deviceOnly=POWER.scenarios.custom;
 ok('Rural School solar starts at 200 W',school.solar===200);
 ok('100 W × 10 h = 1 kWh',powerEnergy(100,10)===1);
 ok('100 W continuous = 2.4 kWh/day',continuousDailyEnergy(100)===2.4);
 ok('500 W × 5 h = 2.5 kWh',powerEnergy(500,5)===2.5);
 ok('Smartphone assumption is 15 W',POWER.deviceLoads.smartphone.w===15&&POWER.devices.phone.w===15);
 ok('Laptop assumption is 45 W',POWER.deviceLoads.laptop.w===45);
 ok('PoE switch and AP load are not double counted',networkLoad(school)===165);
 const apOriginal=powerApCount(school);
 setPowerApCount(school,0);ok('Zero APs contribute 0 W',networkLoad(school)===120);
 setPowerApCount(school,apOriginal+1);ok('Each AP adds its configured wattage',networkLoad(school)===165+POWER.siteEquipment.apIndoor.w);
 setPowerApCount(school,99);ok('AP count is capped at 10',powerApCount(school)===10);
 setPowerApCount(school,apOriginal);
 const original=JSON.parse(JSON.stringify(school));
 setPowerTechnology(school,'fwa');ok('FWA reduces local load by 50 W',networkLoad(school)===115);
 setPowerTechnology(school,'p2p');ok('P2P counts one local radio',networkLoad(school)===110);
 setPowerTechnology(school,'fiber');ok('Fiber counts ONT/CPE only',networkLoad(school)===100);
 setPowerTechnology(school,'leo');setPowerEquipmentEnabled(school,'leo',false);ok('Deselecting connectivity equipment removes its load',networkLoad(school)===90);
 setPowerEquipmentEnabled(school,'leo',true);ok('Connectivity equipment can be reselected',networkLoad(school)===165);
 Object.assign(school,original);ensurePowerScenario(school);
 ok('Zero connectivity is valid',networkLoad(deviceOnly)===0);
 ok('Ten smartphones add 150 W',deviceLoad({...deviceOnly,smartphones:10,laptops:0})===150);
 ok('Four laptops add 180 W',deviceLoad({...deviceOnly,smartphones:0,laptops:4})===180);
 ok('Device quantities increase demand',dailyDemand({...deviceOnly,smartphones:10,userHours:5})>dailyDemand(deviceOnly));
 ok('Solar is zero at night',solarAt(school,2)===0);
 ok('Cloudy solar is lower than sunny',solarAt(school,12,'Cloudy')<solarAt(school,12,'Sunny'));
 const sunny=simulatePower(school,{weather:'Sunny'});ok('Battery state remains bounded',sunny.steps.every(x=>x.batteryPct>=0&&x.batteryPct<=1));
 ok('24:00 has a matching simulation snapshot',sunny.steps[sunny.steps.length-1].h===24);
 ok('Zero-capacity battery reports 0%',simulatePower({...deviceOnly,battery:0,solar:200},{weather:'Sunny'}).steps.every(x=>x.batteryPct===0));
 ok('Scheduled load uses less energy than 24×7',dailyDemand(school)<dailyDemand({...school,mode:'24x7'}));
 const outage=simulatePower(POWER.scenarios.health,{weather:'Sunny'});ok('Health grid outage still uses stored battery',outage.steps.find(x=>x.h===18).grid===0);
 ok('Small off-grid system can go offline',simulatePower({...school,solar:250,battery:1},{weather:'Cloudy'}).availability<1);
 ok('Autonomy target increases recommended storage',powerAssessment({...school,autonomyDays:3},{weather:'Sunny'}).recommendedBatteryKwh>powerAssessment({...school,autonomyDays:0},{weather:'Sunny'}).recommendedBatteryKwh);
 ok('Aged battery has less usable capacity',powerEffectiveBatteryCapacityWh({...school,batteryHealth:.8})<powerEffectiveBatteryCapacityWh({...school,batteryHealth:1}));
 ok('Effective capacity follows nominal × health',powerEffectiveBatteryCapacityWh({...school,battery:5,batteryHealth:.8})===4000);
 ok('Aged battery simulation remains bounded',simulatePower({...school,batteryHealth:.8}).steps.every(x=>x.batteryPct>=0&&x.batteryPct<=1));
 document.getElementById('out').textContent=out.join('\n')+'\nAll Lab 5 checks passed.';
 }catch(e){document.getElementById('out').textContent='FAIL: '+e.message;document.body.dataset.failed='true'}
})();
