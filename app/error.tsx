"use client";
import { useEffect } from "react";
export default function ErrorPage({error,reset}:{error:Error;reset:()=>void}){
  useEffect(()=>{console.error("DNFM page error",error)},[error]);
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f5f7fb",fontFamily:"Inter,system-ui,sans-serif",padding:24}}><section style={{maxWidth:460,background:"white",padding:36,borderRadius:18,boxShadow:"0 16px 45px rgba(15,23,42,.1)",textAlign:"center"}}><h1 style={{margin:"0 0 12px",color:"#172033"}}>Privremena greška u prikazu</h1><p style={{color:"#667085",lineHeight:1.6}}>Vaši podaci su sačuvani. Pokušajte ponovo bez napuštanja aplikacije.</p><button onClick={reset} style={{border:0,borderRadius:10,padding:"12px 20px",background:"#2864dc",color:"white",fontWeight:700,cursor:"pointer"}}>Pokušaj ponovo</button></section></main>
}
