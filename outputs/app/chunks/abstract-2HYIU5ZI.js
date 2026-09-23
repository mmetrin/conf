import{c as D}from"./chunk-ZM3EZUG6.js";D();function K(c){let T=t=>c.request(t),u=t=>c.cancel(t),o=document.querySelector("#abstract-lights"),e=o.getContext("webgl",{alpha:!0,antialias:!1,depth:!1,preserveDrawingBuffer:!1});if(!e)return;let U="attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}",W=`precision mediump float;
 uniform vec2 resolution;uniform float time;
 void main(){
 vec2 uv=(2.*gl_FragCoord.xy-resolution)/resolution.y;
 float t=time*.10;uv+=vec2(cos(t*2.)*.15,cos(t)*.13);
 vec3 ray=normalize(vec3(uv,.7));float dist=0.;vec3 sum=vec3(0.);
 for(int i=0;i<24;i++){
 vec3 p=ray*dist;p.z=cos(p.z*(sin(p.x+t*.7)+1.5));
 for(int j=3;j<10;j++){float s=float(j);p=p*1.05+sin(2.6*t+p.yzx*s)*.114;}
 float stepSize=.01+.1*abs(length(p)-.8);dist+=stepSize;
 sum+=sin(p*vec3(1.35,.688,1.72)-vec3(5.28,7.49,3.56))/stepSize;
 }
 vec3 energy=min(sum*sum/1000000.,vec3(5.));vec3 e=exp(2.*energy);vec3 mapped=(e-1.)/(e+1.);
 float light=dot(mapped,vec3(.3,.45,.25));
 vec3 color=mix(vec3(.48,.32,.70),vec3(.94,.89,1.),smoothstep(.12,.65,light));
 // A localized red shimmer passes through the folds, with a quiet interval.
 float cycle=mod(time,26.);
 float pulse=smoothstep(5.,9.,cycle)*(1.-smoothstep(13.,17.,cycle));
 float sweep=mix(-.65,.65,smoothstep(5.,17.,cycle));
 float ribbon=uv.x*.82+uv.y*.38+.12*sin(uv.y*3.+t)-sweep;
 float patch=exp(-ribbon*ribbon*18.)*(1.-smoothstep(.45,1.2,abs(uv.y)));
 vec3 red=mix(vec3(.72,.025,.10),vec3(1.,.24,.31),smoothstep(.12,.75,light));
 color=mix(color,red,pulse*patch*.78);
 float edge=1.-smoothstep(.35,1.45,length(uv));
 float centreFade=1.-.58*exp(-dot(uv,uv)*2.7);
 gl_FragColor=vec4(color*light*.85*centreFade,edge*centreFade);
 }`,F=[];function E(t,a){let d=e.createShader(t);if(F.push(d),e.shaderSource(d,a),e.compileShader(d),!e.getShaderParameter(d,e.COMPILE_STATUS))throw Error(e.getShaderInfoLog(d));return d}let s;try{if(s=e.createProgram(),e.attachShader(s,E(e.VERTEX_SHADER,U)),e.attachShader(s,E(e.FRAGMENT_SHADER,W)),e.linkProgram(s),!e.getProgramParameter(s,e.LINK_STATUS))throw Error(e.getProgramInfoLog(s))}catch(t){console.warn("Abstract Lights unavailable",t);return}e.useProgram(s);let k=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,k),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW);let z=e.getAttribLocation(s,"a");e.enableVertexAttribArray(z),e.vertexAttribPointer(z,2,e.FLOAT,!1,0,0);let h=document.querySelector("#abstract-data"),r=h.getContext("2d"),L=["0","1","\xB7","+","\u25AF"],q=Array.from({length:210},(t,a)=>({phase:a*29%157/156,lane:a*37%101/100,side:a%2?-1:1,edge:a>=72,speed:.008+a%4*.002,size:14+a%7*2,token:L[a%L.length]})),w=0,y=0,g=1;function H(t){let a=w,d=y,B=g;if(!(a<1||d<1)){r.setTransform(B,0,0,B,0,0),r.clearRect(0,0,a,d),r.textAlign="center",r.textBaseline="middle";for(let i of q){let m=(i.phase+t*i.speed)%1,R=a*(i.edge?i.side<0?-.3+.36*m:1.3-.36*m:i.side<0?-.16+.42*m:1.16-.42*m),N=.5+.36*Math.sin(m*4.1+i.lane*7)+(i.lane-.5)*.3,P=d*N,V=Math.pow(Math.sin(m*Math.PI),2),G=i.token==="+"||i.token==="\u25AF";r.globalAlpha=V*(G?.44:.2+.18*i.lane),r.fillStyle=i.token==="+"?"#f0b7cf":i.token==="\u25AF"?"#dbc5ff":"#f1e9ff",r.font=`${i.size}px monospace`,r.fillText(i.token,R,P),i.lane>.65&&(r.globalAlpha*=.24,r.strokeStyle="#ccb5eb",r.lineWidth=.65,r.beginPath(),r.moveTo(R-18,P+3),r.lineTo(R-5,P),r.stroke())}r.globalAlpha=1}}let O=e.getUniformLocation(s,"resolution"),j=e.getUniformLocation(s,"time"),p=matchMedia("(prefers-reduced-motion: reduce)"),_=-1,v=!1,A=!0,n=0,l=0,x=0,S=!1,b=!1;function I(){w=o.clientWidth,y=o.clientHeight,g=Math.min(devicePixelRatio||1,1.5),h.width=Math.round(w*g),h.height=Math.round(y*g);let t=Math.max(1,Math.round(Math.min(480,o.clientWidth*.65))),a=Math.max(1,Math.round(t*o.clientHeight/Math.max(1,o.clientWidth)));(o.width!==t||o.height!==a)&&(o.width=t,o.height=a,e.viewport(0,0,t,a),e.uniform2f(O,t,a))}c.observe(new ResizeObserver(()=>{I(),f()}),o),I();function C(t){n=0,!(!v||!A||document.hidden||S||b)&&((t-l>=1e3/24||!l)&&(x+=l?Math.min((t-l)/1e3,.1):0,l=t,e.uniform1f(j,p.matches?0:x),e.drawArrays(e.TRIANGLES,0,6),H(p.matches?0:x)),p.matches||(n=T(C)))}function f(){!n&&v&&A&&!document.hidden&&!S&&!b&&(n=T(C))}let M={setSuspended(t){t!==b&&(b=t,l=0,t?(u(n),n=0):f())},show(t){t!==_&&(_=t,o.style.opacity=String(t*.55),h.style.opacity=String(t),v=t>.001,v?f():(u(n),n=0,l=0))}};return c.listen(document,"visibilitychange",()=>{l=0,document.hidden?(u(n),n=0):f()}),c.listen(p,"change",()=>{l=0,f()}),c.observe(new IntersectionObserver(t=>{A=t[0].isIntersecting,l=0,f()}),o),c.listen(o,"webglcontextlost",t=>{t.preventDefault(),S=!0,u(n),n=0}),c.listen(window,"pagehide",()=>M.setSuspended(!0)),c.listen(window,"pageshow",()=>M.setSuspended(!1)),c.defer(()=>{u(n),e.deleteBuffer(k),e.deleteProgram(s),F.forEach(t=>e.deleteShader(t)),o.width=o.height=1,h.width=h.height=1}),M}export{K as startAbstractLights};
