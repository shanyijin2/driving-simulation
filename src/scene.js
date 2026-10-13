import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MAX_SPEED } from './physics.js';

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
    vertexShader: 'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `
      varying vec3 vPosition;
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
        c+=vec3(.18,.12,.05)*glow;gl_FragColor=vec4(c,1.0);
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
  const barrier=new THREE.Group();scene.add(barrier);
  const barrierCanvas=document.createElement('canvas');barrierCanvas.width=256;barrierCanvas.height=64;
  const bc=barrierCanvas.getContext('2d');bc.fillStyle='#efe4c8';bc.fillRect(0,0,256,64);bc.fillStyle='#c54632';
  for(let i=-64;i<300;i+=64){bc.beginPath();bc.moveTo(i,0);bc.lineTo(i+32,0);bc.lineTo(i+96,64);bc.lineTo(i+64,64);bc.fill();}
  const bt=new THREE.CanvasTexture(barrierCanvas);bt.colorSpace=THREE.SRGBColorSpace;
  box(barrier,[11,1,.4],[0,.65,0],new THREE.MeshStandardMaterial({map:bt}));
  for(const x of [-4,4])box(barrier,[.3,1.4,.6],[x,.7,0],railMaterial);

  let crashTime=0;
  let orbitTime=0;
  const target=new THREE.Vector3();
  function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
  resize();window.addEventListener('resize',resize);
  function render(run,mode,dt,time){
    const menu=mode==='menu';
    const movement=run.distance;
    roadTexture.offset.y=-movement/5;
    for(let i=0;i<dashes.length;i++)dashes[i].position.z=((movement-Math.floor(i/2)*10+650*100)%650)-620;
    for(let i=0;i<scenery.length;i++)scenery[i].position.z=((movement-(i%35)*30+1050*100)%1050)-1020;
    barrier.position.z=-Math.max(0,2600-movement);barrier.visible=2600-movement<230;
    if(run.outcome==='broken'||run.outcome==='crash') {
      crashTime+=dt;
      car.rotation.z=Math.min(crashTime,1.9)*5;
      car.rotation.x=-Math.min(crashTime,1.9)*2;
      car.position.y=Math.max(0,Math.sin(Math.min(crashTime,1.9)/1.9*Math.PI)*2.2);
      car.position.x=Math.min(crashTime,1.9)*1.2;
    }else{
      crashTime=0;car.rotation.z=0;car.rotation.x=run.force/1612*.035;car.position.set(0,run.speed>0?Math.sin(time*30)*.009:0,0);
      for(const wheel of wheels)wheel.rotation.x-=run.speed*dt/.48;
    }
    materials.red.emissiveIntensity=run.force>0?4:.7;
    const mobile=camera.aspect<1;
    if(menu){orbitTime+=dt;const angle=3.8+orbitTime*.1;const radius=mobile?9.5:8.5;camera.position.set(Math.sin(angle)*radius,mobile?2.8:2.4,Math.cos(angle)*radius);target.set(0,mobile?-1.2:.1,0);camera.fov=mobile?58:45;}
    else{const speedRatio=run.speed/MAX_SPEED;camera.position.set(1.8-speedRatio,2.5-speedRatio*.5,8.7-speedRatio);target.set(0,.85,-5);camera.fov=(mobile?58:45)+speedRatio*16;}
    camera.updateProjectionMatrix();
    camera.lookAt(target);renderer.render(scene,camera);
  }
  return {render};
}
