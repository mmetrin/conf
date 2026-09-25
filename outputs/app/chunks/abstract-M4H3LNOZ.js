import{c as q,e as H}from"./chunk-BIZXHZND.js";q();H();function Z(i){let z=t=>i.request(t),f=t=>i.cancel(t),o=document.querySelector("#abstract-lights"),e=o.getContext("webgl",{alpha:!0,antialias:!1,depth:!1,preserveDrawingBuffer:!1});if(!e)return;let O="attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}",j=`precision mediump float;
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
 }`,L=[];function _(t,a){let h=e.createShader(t);if(L.push(h),e.shaderSource(h,a),e.compileShader(h),!e.getShaderParameter(h,e.COMPILE_STATUS))throw Error(e.getShaderInfoLog(h));return h}let c;try{if(c=e.createProgram(),e.attachShader(c,_(e.VERTEX_SHADER,O)),e.attachShader(c,_(e.FRAGMENT_SHADER,j)),e.linkProgram(c),!e.getProgramParameter(c,e.LINK_STATUS))throw Error(e.getProgramInfoLog(c))}catch(t){console.warn("Abstract Lights unavailable",t);return}e.useProgram(c);let I=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,I),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW);let C=e.getAttribLocation(c,"a");e.enableVertexAttribArray(C),e.vertexAttribPointer(C,2,e.FLOAT,!1,0,0);let m=document.querySelector("#abstract-data"),r=m.getContext("2d"),B=["0","1","\xB7","+","\u25AF"],N=Array.from({length:140},(t,a)=>({phase:a*29%157/156,lane:a*37%101/100,side:a%2?-1:1,edge:a>=36,speed:.008+a%4*.002,size:10+a%7*1.5,token:B[a%B.length]})),A=0,S=0,g=1;function V(t){let a=A,h=S,W=g;if(!(a<1||h<1)){r.setTransform(W,0,0,W,0,0),r.clearRect(0,0,a,h),r.textAlign="center",r.textBaseline="middle";for(let s of N){let u=(s.phase+t*s.speed)%1,E=a*(s.edge?s.side<0?-.3+.36*u:1.3-.36*u:s.side<0?-.16+.42*u:1.16-.42*u),K=.5+.36*Math.sin(u*4.1+s.lane*7)+(s.lane-.5)*.3,k=h*K,X=Math.pow(Math.sin(u*Math.PI),2),$=s.token==="+"||s.token==="\u25AF";r.globalAlpha=X*($?.16:.055+.075*s.lane),r.fillStyle=s.token==="+"?"#f0b7cf":s.token==="\u25AF"?"#dbc5ff":"#f1e9ff",r.font=`${s.size}px monospace`,r.fillText(s.token,E,k),s.lane>.65&&(r.globalAlpha*=.24,r.strokeStyle="#ccb5eb",r.lineWidth=.65,r.beginPath(),r.moveTo(E-18,k+3),r.lineTo(E-5,k),r.stroke())}r.globalAlpha=1}}let G=e.getUniformLocation(c,"resolution"),Y=e.getUniformLocation(c,"time"),p=matchMedia("(prefers-reduced-motion: reduce)"),v=matchMedia("(max-width: 599px)"),D=-1,b=!1,M=!0,n=0,l=0,T=0,R=!1,w=!1,x=!1,y=0;function P(){A=v.matches?0:o.clientWidth,S=v.matches?0:o.clientHeight,g=Math.min(devicePixelRatio||1,1.5),m.width=Math.max(1,Math.round(A*g)),m.height=Math.max(1,Math.round(S*g));let t=Math.max(1,Math.round(Math.min(480,o.clientWidth*.65))),a=Math.max(1,Math.round(t*o.clientHeight/Math.max(1,o.clientWidth)));(o.width!==t||o.height!==a)&&(o.width=t,o.height=a,e.viewport(0,0,t,a),e.uniform2f(G,t,a))}i.observe(new ResizeObserver(()=>{P(),d()}),o),P();function U(t){n=0,!(!b||!M||document.hidden||R||w||x)&&((t-l>=1e3/24||!l)&&(T+=l?Math.min((t-l)/1e3,.1):0,l=t,e.uniform1f(Y,p.matches?0:T),e.drawArrays(e.TRIANGLES,0,6),v.matches||V(p.matches?0:T)),p.matches||(n=z(U)))}function d(){!n&&b&&M&&!document.hidden&&!R&&!w&&!x&&(n=z(U))}i.listen(window,"scroll",()=>{x=!0,f(n),n=0,i.clearTimeout(y),y=i.timeout(()=>{y=0,x=!1,l=0,d()},240)});let F={setSuspended(t){t!==w&&(w=t,l=0,t?(f(n),n=0):d())},show(t){t!==D&&(D=t,o.style.opacity=String(t*.55),m.style.opacity=String(t),b=t>.001,b?d():(f(n),n=0,l=0))}};return i.listen(document,"visibilitychange",()=>{l=0,document.hidden?(f(n),n=0):d()}),i.listen(p,"change",()=>{l=0,d()}),i.listen(v,"change",P),i.observe(new IntersectionObserver(t=>{M=t[0].isIntersecting,l=0,d()}),o),i.listen(o,"webglcontextlost",t=>{t.preventDefault(),R=!0,f(n),n=0}),i.listen(window,"pagehide",()=>F.setSuspended(!0)),i.listen(window,"pageshow",()=>F.setSuspended(!1)),i.defer(()=>{i.clearTimeout(y),f(n),e.deleteBuffer(I),e.deleteProgram(c),L.forEach(t=>e.deleteShader(t)),o.width=o.height=1,m.width=m.height=1}),F}export{Z as startAbstractLights};
