import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color('#d1e4f2')
const generatedObjects = new THREE.Group()
scene.add(generatedObjects)
let currentBrush = null
const infoButton = document.querySelector('.info-button')
const infoPanel = document.querySelector('.info-panel')

infoButton.addEventListener('click', () => {
  const isOpen = infoPanel.classList.toggle('open')

  infoButton.setAttribute('aria-expanded', String(isOpen))
  infoPanel.setAttribute('aria-hidden', String(!isOpen))
})

//Material
const fenceMaterial = new THREE.MeshStandardMaterial({
  color: '#b8875b',
  roughness: 0.8,
  metalness: 0
})

const grassMaterial = new THREE.MeshStandardMaterial({
  color: '#6f8f55',
  roughness: 0.9,
  metalness: 0,
  side: THREE.DoubleSide
})

const stoneMaterial = new THREE.MeshStandardMaterial({
  color: '#77756f',
  roughness: 1,
  metalness: 0
})

// =========================
// Fence Brush Asset
// =========================
const gltfLoader = new GLTFLoader()
let fenceModel = null
gltfLoader.load(
  '/models/fence.glb',
  (gltf) => {
    fenceModel = gltf.scene

    fenceModel.traverse((child) => {
      if (child.isMesh) {
        child.material = fenceMaterial
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    fenceModel.scale.set(0.5, 0.5, 0.5)
  },
  undefined,
  (error) => {
    console.error('Failed to load fence model:', error)
  }
)

function placeFenceAlongLine(points) {
  if (!fenceModel) return

  const spacing = 1.2
  let distanceSinceLastModel = 0

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]

    const segmentLength = prev.distanceTo(curr)
    distanceSinceLastModel += segmentLength

    if (distanceSinceLastModel >= spacing) {
      const fence = fenceModel.clone(true)

      fence.position.copy(curr)

      const direction = new THREE.Vector3()
        .subVectors(curr, prev)
        .normalize()

      const defaultDirection = new THREE.Vector3(1, 0, 0)

      fence.quaternion.setFromUnitVectors(defaultDirection, direction)

      fence.scale.set(0.5, 0.5, 0.5)

      generatedObjects.add(fence)

      distanceSinceLastModel = 0
    }
  }
}

// =========================
// Grass Brush Asset
// =========================
const grassModels = []

const grassModelPaths = [
  '/models/GrassCluster_A.glb',
  '/models/GrassCluster_B.glb',
  '/models/GrassCluster_C.glb',
  '/models/GrassCluster_D.glb'
]

grassModelPaths.forEach((path) => {
  gltfLoader.load(
    path,
    (gltf) => {
      const grassModel = gltf.scene

      grassModel.traverse((child) => {
        if (child.isMesh) {
          child.material = grassMaterial
          child.castShadow = true
          child.receiveShadow = true
        }
      })

      grassModels.push(grassModel)
    },
    undefined,
    (error) => {
      console.error(`Failed to load grass model: ${path}`, error)
    }
  )
})

function placeGrassAlongLine(points) {
  if (grassModels.length === 0) return
  if (points.length < 2) return

  const spacing = 0.8
  const spreadRadius = 0.15

  let distanceSinceLastGrass = 0

  for (let i = 1; i < points.length; i++) {
    const previousPoint = points[i - 1]
    const currentPoint = points[i]

    const segmentLength = previousPoint.distanceTo(currentPoint)
    distanceSinceLastGrass += segmentLength

    if (distanceSinceLastGrass >= spacing) {
      const grassCount = THREE.MathUtils.randInt(1, 3)

      for (let j = 0; j < grassCount; j++) {
        const randomModelIndex = Math.floor(
          Math.random() * grassModels.length
        )

        const grass = grassModels[randomModelIndex].clone(true)

        const offsetX = THREE.MathUtils.randFloat(
          -spreadRadius,
          spreadRadius
        )

        const offsetZ = THREE.MathUtils.randFloat(
          -spreadRadius,
          spreadRadius
        )

        grass.position.set(
          currentPoint.x + offsetX,
          currentPoint.y,
          currentPoint.z + offsetZ
        )

        grass.rotation.y = Math.random() * Math.PI * 2

        const randomScale = THREE.MathUtils.randFloat(0.7, 1.25)
        grass.scale.setScalar(randomScale)

        generatedObjects.add(grass)
      }

      distanceSinceLastGrass = 0
    }
  }
}

// =========================
// Stone Brush Asset
// =========================

let stoneModel = null
const stonePositions = []

gltfLoader.load(
  '/models/stone.glb',
  (gltf) => {
    stoneModel = gltf.scene

    stoneModel.traverse((child) => {
      if (child.isMesh) {
        child.material = stoneMaterial
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  },
  undefined,
  (error) => {
    console.error('Failed to load stone model:', error)
  }
)

function placeStoneAtPoint(point) {
  if (!stoneModel) return

  const minimumDistance = 1.2

  const isTooClose = stonePositions.some((position) => {
    return position.distanceTo(point) < minimumDistance
  })

  if (isTooClose) return

  const stone = stoneModel.clone(true)

  stone.position.copy(point)

  stone.rotation.y = Math.random() * Math.PI * 2

  const randomScale = THREE.MathUtils.randFloat(0.4, 0.8)
  stone.scale.setScalar(randomScale)

  generatedObjects.add(stone)

  stonePositions.push(point.clone())
}


window.addEventListener('pointerup', (event) => {
  if (event.button !== 0) return
  if (!isDrawing) return
  
  if (currentBrush === 'fence') {
    placeFenceAlongLine(currentPoints)
    generatedObjects.remove(currentLine)
  }
  
  if (currentBrush === 'grass') {
    placeGrassAlongLine(currentPoints)
    generatedObjects.remove(currentLine)
  }

  isDrawing = false
  currentPoints = []
  currentLine = null
})

// Camera
const camera = new THREE.PerspectiveCamera(
  30,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(0, 15, 35)
camera.lookAt(0, 0, 0)

// Renderer
const canvas = document.querySelector('.webgl')

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
renderer.shadowMap.enabled = true


// Controller
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true


controls.mouseButtons.LEFT = null
controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE
controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN

// Lights
const light = new THREE.DirectionalLight(0xffffff, 2)
light.position.set(15, 25, 10)
light.castShadow = true
scene.add(light)

const ambientLight = new THREE.AmbientLight(0xfff4df, 0.8)
scene.add(ambientLight)

// Ground
const gridHelper = new THREE.GridHelper(80, 80, 0x8d765e, 0xa88b6f)
scene.add(gridHelper)

// 可绘画的平面
const planeMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshBasicMaterial({
    color: '#b89c83',
    transparent: true,
    roughness: 1,
    metalness: 0,
    opacity: 0.7,
    side: THREE.DoubleSide
  })
)
planeMesh.rotation.x = -Math.PI / 2
scene.add(planeMesh)
planeMesh.receiveShadow = true

// 
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

// y = 0 的平面，地面
const drawPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

let isDrawing = false
let currentPoints = []
let currentLine = null

function getMouseWorldPosition(event) {
  const rect = renderer.domElement.getBoundingClientRect()

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)

  const intersectPoint = new THREE.Vector3()
  const hit = raycaster.ray.intersectPlane(drawPlane, intersectPoint)

  return hit ? intersectPoint.clone() : null
}

window.addEventListener('pointerdown', (event) => {
  //只在按下按钮后画线
  if (event.target.closest('.bottom-toolbar, .info-button, .info-panel')) return
  
  // 只允许左键画线
  if (event.button !== 0) return

  const point = getMouseWorldPosition(event)
  if (!point) return

  isDrawing = true
  currentPoints = [point]

  if (currentBrush === 'stone') {
    placeStoneAtPoint(point)
    return
  }  

  if (currentBrush !== 'fence' && 
      currentBrush !== 'grass' ) return
   
  const geometry = new THREE.BufferGeometry().setFromPoints(currentPoints)
  const material = new THREE.LineBasicMaterial({ color: '#00000000', transparent: true, opacity: 1 })

  currentLine = new THREE.Line(geometry, material)
  generatedObjects.add(currentLine)
})

window.addEventListener('pointermove', (event) => {
  if (currentBrush !== 'fence' &&
      currentBrush !== 'grass' ) return

  if (!isDrawing || !currentLine) return

  const point = getMouseWorldPosition(event)
  if (!point) return

  const lastPoint = currentPoints[currentPoints.length - 1]

  if (lastPoint.distanceTo(point) > 0.2) {
    currentPoints.push(point)

    currentLine.geometry.dispose()
    currentLine.geometry = new THREE.BufferGeometry().setFromPoints(currentPoints)
  }
})

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

})

//BrushButtons
const brushButtons = document.querySelectorAll('.brush-button')

brushButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.classList.contains('active')) {

        button.classList.remove('active')
        currentBrush = null

        return
    }

    brushButtons.forEach((btn) => {
      btn.classList.remove('active')
    })

    button.classList.add('active')
    currentBrush = button.dataset.brush
  })
})

//ClearButton
const clearButton = document.querySelector('.clear-button')

clearButton.addEventListener('click', () => {
    generatedObjects.clear()
    stonePositions.length = 0
})

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

animate()