import './engine.js';
const { compute } = globalThis.Meros;
let id=0; const P=(o={})=>({id:'p'+(++id),status:'alive',kids:[],...o});
const show=(t,r)=>{console.log('\n#',t,'| queue',r.queue,'| total',r.total.toString());r.heirs.forEach(h=>console.log(' ',h.name,'|',h.rel,'|',h.total.toString(),'|',h.arts.join(','),'|',h.parts.map(p=>p.basis+' '+p.share).join(' ; ')));r.excluded.forEach(e=>console.log('  x',e.name,'-',e.why));[...r.notes,...r.warnings].forEach(n=>console.log('  !',n));};
const assert=(c,m)=>{if(!c){console.error('FAIL',m);process.exitCode=1}else console.log('  ok',m)};
// 1
let r=compute({spouse:P({present:true,name:'Хотин'}),parents:[P({role:'mother',name:'Она'}),P({role:'father',name:'Ота',status:'dead'})],
 children:[P({name:'Алишер'}),P({name:'Бобур',status:'dead',kids:[P({name:'Невара1'}),P({name:'Невара2'})]})],siblings:[P({name:'Ука'})],estate:{personal:100000000,joint:200000000}});
show('1',r); assert(r.heirs.find(h=>h.name==='Невара1').total.toString()==='1/8','nevara 1/8'); assert(r.total.toString()==='1','sum 1'); assert(r.estateValue===200000000,'estate value');
// 2
r=compute({siblings:[P({name:'Опа'}),P({name:'Ака',status:'dead',kids:[P({name:'Ж1'}),P({name:'Ж2'}),P({name:'Ж3'})]})],grandparents:[P({name:'Буви'})],
 dependents:[P({name:'Қарамоқдаги',disabled:true,dependent:true,cohabited:true})]});
show('2',r); assert(r.heirs.find(h=>h.name==='Қарамоқдаги').total.toString()==='1/4','dep 1/4'); assert(r.heirs.find(h=>h.name==='Ж1').total.toString()==='1/12','nephew 1/12');
// 3 will
const ch=P({name:'Кичик',minor:true}), sp=P({present:true,name:'Эр',disabled:true});
r=compute({spouse:sp,children:[ch],will:{exists:true,entries:[{id:'w1',name:'Дўст',percent:100}]}});
show('3',r); assert(r.heirs.find(h=>h.name==='Дўст').total.toString()==='1/2','friend 1/2'); assert(r.heirs.find(h=>h.name==='Кичик').total.toString()==='1/4','child obl 1/4');
// 4 deps cap: 1 unit, 3 deps
r=compute({children:[P({name:'Ф'})],dependents:[1,2,3].map(i=>P({name:'Д'+i,disabled:true,dependent:true,cohabited:true}))});
show('4',r); assert(r.heirs.find(h=>h.name==='Ф').total.toString()==='3/4','cap');
// 5 refused child, unworthy parent; 4th queue
r=compute({children:[P({name:'Воз',refused:true}),P({name:'Қолган'})],parents:[P({role:'father',name:'Ота',unworthy:true,unworthyReason:'ота-оналик ҳуқуқидан маҳрум'})]});
show('5',r); assert(r.heirs.length===1&&r.heirs[0].total.toString()==='1','accrual');
r=compute({others:[P({name:'Чевара-жиян',degree:4}),P({name:'Узоқ',degree:5})]}); show('6',r); assert(r.heirs.length===1,'closer degree');
r=compute({}); show('7 empty',r);
// 8 partial will + linked person
const s1=P({name:'Ўғил'}), s2=P({name:'Қиз'});
r=compute({children:[s1,s2],will:{exists:true,entries:[{id:'w2',personId:s1.id,percent:50}]}}); show('8',r); assert(r.heirs.find(h=>h.name==='Ўғил').total.toString()==='3/4','partial will');
