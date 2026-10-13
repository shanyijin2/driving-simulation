import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { VEHICLES } from './physics.js';

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(environment, .04).texture;
  environment.dispose(); pmrem.dispose();
  scene.background = new THREE.Color('#b89b8d');
  scene.fog = new THREE.Fog('#b89b8d', 70, 260);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(440,24,16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { weather: { value: 0 } },
    vertexShader: 'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `
      varying vec3 vPosition;
      uniform float weather;
      float random(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(random(i),random(i+vec2(1,0)),f.x),mix(random(i+vec2(0,1)),random(i+vec2(1)),f.x),f.y);}
      void main(){
        vec3 d=normalize(vPosition);float h=d.y;
        vec3 c=mix(vec3(.95,.62,.37),vec3(.16,.13,.25),smoothstep(0.0,.65,h));
        vec2 uv=d.xz/(max(h,.02)+.25)*vec2(1.7,10.0);
        float cloud=noise(uv)*.6+noise(uv*2.0)*.3+noise(uv*4.0)*.1;
        float mask=smoothstep(.45,.76,cloud)*smoothstep(.02,.2,h)*(1.0-smoothstep(.4,.8,h));
        c=mix(c,vec3(.54,.32,.35),mask*.5);
        float glow=pow(max(dot(d,normalize(vec3(-.7,.13,-1.0))),0.0),12.0);
        c+=vec3(.18,.12,.05)*glow;c=mix(c,vec3(.23,.29,.35)+max(h,0.0)*.13,weather);gl_FragColor=vec4(c,1.0);
      }`,
  }));
  scene.add(sky);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 500);
  scene.add(new THREE.HemisphereLight('#ffead1', '#343635', 2.2));
  const sun = new THREE.DirectionalLight('#ffcf9a', 3.5);
  sun.position.set(-35, 40, -70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 24, bottom: -24 });
  sun.shadow.bias = -0.001;
  scene.add(sun);

  const materials = {
    paint: new THREE.MeshPhysicalMaterial({ color: '#121416', metalness: .65, roughness: .22, clearcoat: 1 }),
    gold: new THREE.MeshPhysicalMaterial({ color: '#c7ab79', metalness: .5, roughness: .28, clearcoat: 1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#1b2931', metalness: .3, roughness: .08, clearcoat: 1 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#b9b8ae', metalness: .9, roughness: .2 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#101113', roughness: .92 }),
    red: new THREE.MeshStandardMaterial({ color: '#a9271d', emissive: '#ff2515', emissiveIntensity: .7 }),
    headlight: new THREE.MeshStandardMaterial({ color: '#fff9e8', emissive: '#fff4d5', emissiveIntensity: 2 }),
  };
  const car = new THREE.Group();
  scene.add(car);
  function box(parent, size, position, material, rounded = 0) {
    const geometry = rounded ? new RoundedBoxGeometry(...size, 3, rounded) : new THREE.BoxGeometry(...size);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  // An original, procedural black-and-gold SUV, with no external model assets.
  box(car, [2.02,.68,4.9], [0,.86,0], materials.paint, .13);
  box(car, [1.96,.3,4.55], [0,.48,0], materials.paint, .08);
  box(car, [1.87,.86,3.22], [0,1.55,.48], materials.gold, .15);
  box(car, [1.73,.06,3.02], [0,2,.48], materials.gold, .04);
  const windshield = box(car, [1.65,.64,.045], [0,1.56,-1.13], materials.glass, .015);
  windshield.rotation.x = -.25;
  box(car, [1.64,.58,.04], [0,1.59,2.09], materials.glass, .02);
  for (const side of [-1,1]) {
    for (const [z,length] of [[-.51,.94],[.57,.99],[1.52,.66]]) {
      box(car, [.035,.59,length], [side*.941,1.57,z], materials.glass, .012);
    }
    box(car, [.045,.05,3.45], [side*1.015,1.1,.18], materials.gold, .01);
    box(car, [.2,.18,.3], [side*1.08,1.46,-.92], materials.paint, .04);
    for (const z of [-.15,.96]) box(car, [.055,.05,.22], [side*1.035,1.03,z], materials.chrome, .01);
    box(car, [.065,.06,2.8], [side*.72,2.065,.48], materials.chrome, .02);
  }
  box(car, [1.96,.18,.18], [0,.54,2.48], materials.chrome, .025);
  box(car, [1.8,.14,.08], [0,1.17,2.46], materials.red, .025);
  for (const side of [-1,1]) box(car,[.1,.6,.08],[side*.88,.87,2.46],materials.red,.025);
  box(car, [1.2,.36,.06], [0,.95,-2.47], materials.chrome, .02);
  for (let i=-5;i<=5;i++) box(car,[.042,.32,.075],[i*.1,.95,-2.51],materials.paint);
  for (const side of [-1,1]) box(car,[.42,.14,.08],[side*.75,1.06,-2.48],materials.headlight,.025);
  const plateCanvas = document.createElement('canvas'); plateCanvas.width=256; plateCanvas.height=96;
  const pc = plateCanvas.getContext('2d');
  pc.fillStyle='#badbab'; pc.fillRect(0,0,256,96); pc.fillStyle='#172218'; pc.font='bold 35px sans-serif';
  pc.textAlign='center'; pc.fillText('沪A·D1612F',128,61);
  const plateTexture = new THREE.CanvasTexture(plateCanvas); plateTexture.colorSpace=THREE.SRGBColorSpace;
  box(car,[.62,.23,.025],[0,.73,2.585],new THREE.MeshBasicMaterial({map:plateTexture}));
  const wheels = [];
  for (const x of [-1.02,1.02]) for (const z of [-1.53,1.53]) {
    const wheel = new THREE.Group(); wheel.position.set(x,.48,z); car.add(wheel); wheels.push(wheel);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.28,28),materials.rubber);
    tire.rotation.z=Math.PI/2; tire.castShadow=true; wheel.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.3,20),materials.chrome);
    rim.rotation.z=Math.PI/2; wheel.add(rim);
    for (let i=0;i<8;i++) {
      const spoke = box(wheel,[.32,.07,.62],[0,0,0],materials.paint,.01);
      spoke.rotation.x=i*Math.PI/4;
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.32,16),materials.gold);
    hub.rotation.z=Math.PI/2; wheel.add(hub);
  }

  const suv = new THREE.Group(); suv.add(...car.children); car.add(suv);
  const models = { suv };
  const sportPaint = new THREE.MeshPhysicalMaterial({ color: '#bd372e', metalness: .55, roughness: .2, clearcoat: 1 });
  const vanPaint = new THREE.MeshStandardMaterial({ color: '#c4bd9c', metalness: .15, roughness: .65 });
  function addWheels(parent, radius, width, wheelbase) {
    for (const side of [-1,1]) for (const z of [-wheelbase,wheelbase]) {
      const wheel = new THREE.Group(); wheel.position.set(side*width,radius,z); parent.add(wheel); wheels.push(wheel);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,.26,24),materials.rubber);
      tire.rotation.z=Math.PI/2; tire.castShadow=true; wheel.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius*.7,radius*.7,.28,16),materials.chrome);
      rim.rotation.z=Math.PI/2; wheel.add(rim);
      for(let i=0;i<5;i++) { const spoke=box(wheel,[.3,.05,radius*1.35],[0,0,0],materials.paint);spoke.rotation.x=i*Math.PI/5; }
    }
  }
  const sport = new THREE.Group(); car.add(sport); models.sport=sport;
  box(sport,[1.95,.47,4.55],[0,.65,0],sportPaint,.16);
  box(sport,[1.9,.2,4.45],[0,.39,0],materials.paint,.05);
  box(sport,[1.58,.52,1.8],[0,1.13,.25],sportPaint,.18);
  const sportWindshield=box(sport,[1.4,.41,.045],[0,1.12,-.68],materials.glass,.02);sportWindshield.rotation.x=-.55;
  box(sport,[1.4,.38,.045],[0,1.12,1.17],materials.glass,.02);
  for(const side of [-1,1]){
    box(sport,[.04,.35,1.4],[side*.79,1.15,.24],materials.glass,.03);
    box(sport,[.38,.09,.06],[side*.69,.79,-2.28],materials.headlight,.02);
    box(sport,[.6,.07,.06],[side*.52,.79,2.28],materials.red,.02);
    box(sport,[.15,.11,.25],[side*.92,1.04,-.49],sportPaint,.03);
    box(sport,[.1,.025,1.6],[side*.22,.89,-1.4],materials.chrome);
    box(sport,[.07,.28,.07],[side*.65,.98,1.88],materials.paint);
  }
  box(sport,[1.95,.08,.3],[0,1.13,1.91],materials.paint,.03);
  addWheels(sport,.38,1,1.43);
  const van = new THREE.Group();car.add(van);models.van=van;
  box(van,[1.82,1.3,3.9],[0,1.08,.1],vanPaint,.1);
  box(van,[1.84,.35,4.05],[0,.53,0],materials.paint,.07);
  box(van,[1.65,.05,3.65],[0,1.78,.1],vanPaint,.02);
  box(van,[1.57,.66,.04],[0,1.32,-1.87],materials.glass,.02);
  box(van,[1.4,.59,.04],[0,1.35,2.06],materials.glass,.02);
  for(const side of [-1,1]) {
    for(const z of [-1.17,-.2,.86])box(van,[.04,.56,.8],[side*.918,1.35,z],materials.glass,.025);
    box(van,[.29,.2,.04],[side*.58,.73,-1.98],materials.headlight,.03);
    box(van,[.13,.37,.04],[side*.72,.79,2.08],materials.red,.02);
    box(van,[.19,.18,.18],[side*1.02,1.22,-1.48],materials.paint,.025);
    box(van,[.035,.04,.27],[side*.94,.98,-.1],materials.chrome);
    box(van,[.02,.06,.4],[side*.925,.62,1.1],new THREE.MeshStandardMaterial({color:'#88513b',roughness:1}));
  }
  box(van,[.6,.18,.04],[0,.57,2.12],new THREE.MeshBasicMaterial({map:plateTexture}));
  box(van,[1.88,.14,.13],[0,.42,-2.05],materials.chrome,.03);
  addWheels(van,.37,.93,1.28);

  const debris = [];
  const shardGeometry = new THREE.BufferGeometry();
  shardGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-.11,0,0,.14,.02,0,0,.24,.02],3));
  shardGeometry.computeVertexNormals();
  const shardMaterial = new THREE.MeshStandardMaterial({color:'#b0e5ed',metalness:.4,roughness:.08,transparent:true,opacity:.7,side:THREE.DoubleSide});
  for(let i=0;i<64;i++) {
    const mesh = new THREE.Mesh(i<44?shardGeometry:i<62?new THREE.BoxGeometry(.12,.09,.3):new THREE.CylinderGeometry(.4,.4,.25,16),i<44?shardMaterial:i<62?materials.chrome:materials.rubber);
    mesh.visible=false;mesh.castShadow=i>=44;scene.add(mesh);
    debris.push({mesh,velocity:new THREE.Vector3(),spin:new THREE.Vector3()});
  }
  function explode() {
    for(const [i,part] of debris.entries()) {
      const angle=i*2.39996, strength=2+(i%7)*.65;
      part.mesh.visible=true;part.mesh.position.set(Math.sin(angle)*.8,1+(i%4)*.2,Math.cos(angle)*1.4);
      part.mesh.rotation.set(i*.3,i*.7,i);part.velocity.set(Math.sin(angle)*strength,2.5+(i%8)*.45,Math.cos(angle)*strength);
      part.spin.set((i%5)-2,(i%7)-3,(i%3)-1);
    }
    models[activeVehicle].traverse(mesh=>{if(mesh.isMesh && mesh.material===materials.glass)mesh.visible=false;});
  }

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900,900),new THREE.MeshStandardMaterial({color:'#696451',roughness:1}));
  ground.rotation.x=-Math.PI/2; ground.position.y=-.035; ground.receiveShadow=true; scene.add(ground);
  const roadCanvas=document.createElement('canvas'); roadCanvas.width=128; roadCanvas.height=128;
  const rc=roadCanvas.getContext('2d'); rc.fillStyle='#393938'; rc.fillRect(0,0,128,128);
  // Seeded grain keeps the road reproducible without downloading textures.
  let seed=7;
  for(let i=0;i<4500;i++){seed=(seed*16807)%2147483647;const x=seed%128;seed=(seed*16807)%2147483647;rc.fillStyle=i%2?'#454541':'#303130';rc.fillRect(x,seed%128,1,1);}
  const roadTexture=new THREE.CanvasTexture(roadCanvas);roadTexture.wrapS=roadTexture.wrapT=THREE.RepeatWrapping;roadTexture.repeat.set(4,140);roadTexture.colorSpace=THREE.SRGBColorSpace;
  const road=new THREE.Mesh(new THREE.PlaneGeometry(12,1400),new THREE.MeshStandardMaterial({map:roadTexture,roughness:.9}));
  road.rotation.x=-Math.PI/2;road.position.set(0,0,-260);road.receiveShadow=true;scene.add(road);
  const stripe=new THREE.MeshStandardMaterial({color:'#e5dcc3',roughness:.9});
  for(const x of [-5.6,5.6]) box(scene,[.13,.012,1400],[x,.015,-260],stripe);
  const dashes=[];
  for(let i=0;i<65;i++)for(const x of [-2,2]){const dash=box(scene,[.12,.014,4],[x,.017,-i*10],stripe);dashes.push(dash);}
  const scenery=[];
  const railMaterial=new THREE.MeshStandardMaterial({color:'#a19a88',metalness:.65,roughness:.5});
  for(const side of [-1,1]) {
    box(scene,[.12,.22,500],[side*6.6,.8,-210],railMaterial);
    for(let i=0;i<35;i++) {
      const group=new THREE.Group(); group.position.set(side*8,0,-i*30);scene.add(group);scenery.push(group);
      box(group,[.12,8,.12],[0,4,0],railMaterial);
      box(group,[2.1,.1,.12],[-side,8,0],railMaterial);
      box(group,[.9,.1,.4],[-side*1.6,7.9,0],materials.headlight);
      box(scene,[.08,.8,.08],[side*6.6,.4,-i*14],railMaterial);
    }
  }
  const mountains=new THREE.MeshStandardMaterial({color:'#817f71',roughness:1,flatShading:true});
  for(let i=0;i<15;i++) {
    const mountain=new THREE.Mesh(new THREE.ConeGeometry(65+(i%4)*14,25+(i%3)*12,6),mountains);
    mountain.position.set((i-7)*47,-3,-240-(i%3)*25); mountain.rotation.y=i;scene.add(mountain);
  }
  const sunDisk=new THREE.Mesh(new THREE.SphereGeometry(10,24,16),new THREE.MeshBasicMaterial({color:'#ffe5b1',fog:false}));
  sunDisk.position.set(-85,58,-270);scene.add(sunDisk);
  const rainPositions = new Float32Array(220*6), snowPositions=new Float32Array(260*3);
  for(let i=0;i<220;i++){const x=(Math.sin(i*127.1)*.5+.5)*40-20,y=(i%19)/19*18,z=-((i*17)%90)+12;rainPositions.set([x,y,z,x-.12,y+.65,z],i*6);}
  for(let i=0;i<260;i++)snowPositions.set([Math.sin(i*43.1)*20,(i%23)/23*18,-((i*13)%90)+12],i*3);
  const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));
  const rain=new THREE.LineSegments(rainGeometry,new THREE.LineBasicMaterial({color:'#c8dde9',transparent:true,opacity:.4,depthWrite:false}));scene.add(rain);
  const snowGeometry=new THREE.BufferGeometry();snowGeometry.setAttribute('position',new THREE.BufferAttribute(snowPositions,3));
  const snow=new THREE.Points(snowGeometry,new THREE.PointsMaterial({color:'#ffffff',size:.13,transparent:true,opacity:.85,depthWrite:false}));scene.add(snow);
  const barrier=new THREE.Group();scene.add(barrier);
  const barrierCanvas=document.createElement('canvas');barrierCanvas.width=256;barrierCanvas.height=64;
  const bc=barrierCanvas.getContext('2d');bc.fillStyle='#efe4c8';bc.fillRect(0,0,256,64);bc.fillStyle='#c54632';
  for(let i=-64;i<300;i+=64){bc.beginPath();bc.moveTo(i,0);bc.lineTo(i+32,0);bc.lineTo(i+96,64);bc.lineTo(i+64,64);bc.fill();}
  const bt=new THREE.CanvasTexture(barrierCanvas);bt.colorSpace=THREE.SRGBColorSpace;
  box(barrier,[11,1,.4],[0,.65,0],new THREE.MeshStandardMaterial({map:bt}));
  for(const x of [-4,4])box(barrier,[.3,1.4,.6],[x,.7,0],railMaterial);

  let crashTime=0;
  let crashProgress=0;
  let orbitTime=0;
  let activeVehicle='suv', activeWeather='dry';
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const target=new THREE.Vector3();
  function configure(vehicle,weather) {
    activeVehicle=vehicle;activeWeather=weather;crashTime=0;crashProgress=0;
    for(const [id,model] of Object.entries(models)){
      model.traverse(child=>{child.visible=true;});model.visible=id===vehicle;
    }
    for(const part of debris)part.mesh.visible=false;
    car.position.set(0,0,0);car.rotation.set(0,0,0);
    rain.visible=weather==='rain';snow.visible=weather==='snow';sunDisk.visible=weather==='dry';
    sky.material.uniforms.weather.value=weather==='dry'?0:weather==='rain'?.9:.75;
    scene.fog.color.set(weather==='dry'?'#b89b8d':weather==='rain'?'#6b7a88':'#b5c9d6');
    scene.fog.near=weather==='dry'?70:35;
    ground.material.color.set(weather==='snow'?'#d4dde1':weather==='rain'?'#4e5d56':'#696451');
    road.material.color.set(weather==='snow'?'#b4cddd':'#ffffff');road.material.roughness=weather==='rain'?.2:.9;
    stripe.color.set(weather==='snow'?'#9d967c':'#e5dcc3');
    sun.color.set(weather==='dry'?'#ffcf9a':'#d2e6ff');sun.intensity=weather==='dry'?3.5:1.4;
    renderer.toneMappingExposure=weather==='dry'?1.1:1;
  }
  function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  resize();window.addEventListener('resize',resize);
  function render(run,mode,dt,time){
    const menu=mode==='menu';
    const movement=run.distance;
    roadTexture.offset.y=-movement/5;
    for(let i=0;i<dashes.length;i++)dashes[i].position.z=((movement-Math.floor(i/2)*10+650*100)%650)-620;
    for(let i=0;i<scenery.length;i++)scenery[i].position.z=((movement-(i%35)*30+1050*100)%1050)-1020;
    barrier.position.z=-Math.max(0,2600-movement);barrier.visible=2600-movement<230;
    if(activeWeather==='rain'){
      for(let i=0;i<220;i++){const offset=i*6;rainPositions[offset+1]-=dt*17;if(rainPositions[offset+1]<0)rainPositions[offset+1]=18;rainPositions[offset+4]=rainPositions[offset+1]+.65;}
      rainGeometry.attributes.position.needsUpdate=true;
    }else if(activeWeather==='snow'){
      for(let i=0;i<260;i++){const offset=i*3;snowPositions[offset]+=Math.sin(time+i)*dt*.6;snowPositions[offset+1]-=dt*2.5;if(snowPositions[offset+1]<0)snowPositions[offset+1]=18;}
      snowGeometry.attributes.position.needsUpdate=true;
    }
    if(run.outcome==='broken'||run.outcome==='crash') {
      if(crashTime===0)explode();
      crashTime+=dt;
      const cinematicDt=mode==='result'?0:dt*(crashTime<2?.25:1);
      crashProgress+=cinematicDt;
      const progress=Math.min(crashProgress,2.3);
      car.rotation.z=progress/2.3*Math.PI*3;
      car.rotation.x=-Math.sin(progress/2.3*Math.PI)*.4;
      const roofHeight=activeVehicle==='sport'?1.43:activeVehicle==='van'?1.81:2.1;
      car.position.y=Math.min(1,progress/.3)*roofHeight+Math.sin(progress/2.3*Math.PI)*2.5;
      car.position.x=Math.min(progress*1.1,2.5);
      if(progress>.3){const modelWheels=wheels.filter(wheel=>wheel.parent===models[activeVehicle]);if(modelWheels.length){modelWheels[0].visible=false;modelWheels[3].visible=false;}}
      for(const part of debris){
        if(!part.mesh.visible)continue;
        part.velocity.y-=9.8*cinematicDt;part.mesh.position.addScaledVector(part.velocity,cinematicDt);
        part.mesh.rotation.x+=part.spin.x*cinematicDt;part.mesh.rotation.y+=part.spin.y*cinematicDt;part.mesh.rotation.z+=part.spin.z*cinematicDt;
        if(part.mesh.position.y<.12){part.mesh.position.y=.12;part.velocity.y=Math.abs(part.velocity.y)*.25;part.velocity.x*=.94;part.velocity.z*=.94;}
      }
    }else{
      crashTime=0;crashProgress=0;car.rotation.z=0;car.rotation.x=run.force/1612*.035;car.position.set(0,run.speed>0?Math.sin(time*30)*.009:0,0);
      for(const wheel of wheels)wheel.rotation.x-=run.speed*dt/.48;
    }
    materials.red.emissiveIntensity=run.force>0?4:.7;
    const mobile=camera.aspect<1;
    if(menu){orbitTime+=dt;const angle=3.8+orbitTime*.1;const radius=mobile?9.5:8.5;camera.position.set(Math.sin(angle)*radius,mobile?2.8:2.4,Math.cos(angle)*radius);target.set(0,mobile?-1.2:.1,0);camera.fov=mobile?58:45;}
    else if(run.outcome==='broken'||run.outcome==='crash'){
      const pullback=Math.min(1,crashTime/3);camera.position.set(4+pullback*3,2.5+pullback*2,7+pullback*4);
      target.copy(car.position);target.y+=.6;camera.fov=mobile?65:50;
      if(!reducedMotion&&crashTime<.5){const shake=(.5-crashTime)*.18;camera.position.x+=Math.sin(time*51)*shake;camera.position.y+=Math.cos(time*47)*shake;}
    }
    else{const speedRatio=run.speed/VEHICLES[run.vehicle].maxSpeed;camera.position.set(1.8-speedRatio,2.5-speedRatio*.5,8.7-speedRatio);target.set(0,.85,-5);camera.fov=(mobile?58:45)+speedRatio*16;}
    camera.updateProjectionMatrix();
    camera.lookAt(target);renderer.render(scene,camera);
  }
  configure('suv','dry');
  return {render,configure};
}
