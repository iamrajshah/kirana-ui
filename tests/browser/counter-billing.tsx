import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CounterBillTable} from '../../src/features/billing/CounterBillTable';
import {useCounterScanner} from '../../src/features/billing/useCounterScanner';
import i18n from '../../src/core/i18n';
import '../../src/theme/variables.css';
import '../../src/index.css';
const params=new URLSearchParams(location.search);
document.body.classList.toggle('dark',params.get('theme')==='dark');
await i18n.changeLanguage(params.get('lang')||'en');
const initial=Array.from({length:120},(_,i)=>({variant_id:String(i),product_name:'Counter product '+i,sku:'SKU'+i,quantity:1,unit_price:20,discount_amount:0,discount_type:'amount' as const,available_quantity:200}));
function App(){ const[items,setItems]=useState(initial);
useCounterScanner(true,()=>setItems(old=>old.map((x,i)=>i===0?{...x,quantity:Math.min(200,x.quantity+1)}:x)));
return <main style={{padding:12,maxWidth:1100,margin:'auto'}}><CounterBillTable items={items} stock={new Map()} disabled={false} onQuantity={(id,q)=>setItems(old=>old.map(x=>x.variant_id===id?{...x,quantity:q}:x))} onPrice={()=>{}} /></main>}
createRoot(document.getElementById('root')!).render(<App/>);
