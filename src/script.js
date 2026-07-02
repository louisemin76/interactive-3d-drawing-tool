import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color('#d8d8d8')
let currentBrush = null

//Loader
const loader = new GLTFLoader()
let brushModel = null

loader.load('/models/fence.glb', (gltf) => {
  brushModel = gltf.scene
  brushModel.scale.set(0.5, 0.5, 0.5)
})

function placeModelsAlongLine(points) {
  if (!brushModel) return

  const spacing = 1.2
  let distanceSinceLastModel = 0

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]

    const segmentLength = prev.distanceTo(curr)
    distanceSinceLastModel += segmentLength

    if (distanceSinceLastModel >= spacing) {
      const model = brushModel.clone(true)

      model.position.copy(curr)

      const direction = new THREE.Vector3()
        .subVectors(curr, prev)
        .normalize()

      const defaultDirection = new THREE.Vector3(1, 0, 0)

      model.quaternion.setFromUnitVectors(defaultDirection, direction)

      model.scale.set(0.5, 0.5, 0.5)

      scene.add(model)

      distanceSinceLastModel = 0
    }
  }
}

window.addEventListener('pointerup', (event) => {
  if (currentBrush !== 'fence') return
  
  if (event.button !== 0) return

  placeModelsAlongLine(currentPoints)

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
camera.position.set(0, 15, 20)
camera.lookAt(0, 0, 0)

// Renderer
const canvas = document.querySelector('.webgl')

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))


// Controller
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true


controls.mouseButtons.LEFT = null
controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE
controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN

// Lights
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(10, 20, 10)
scene.add(light)

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
scene.add(ambientLight)

// Ground
const gridHelper = new THREE.GridHelper(40, 40)
scene.add(gridHelper)

// 可绘画的平面
const planeMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshBasicMaterial({
    color: '#e9e9e9',
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide
  })
)
planeMesh.rotation.x = -Math.PI / 2
scene.add(planeMesh)

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
  
  if (currentBrush !== 'fence') return

  // 只允许左键画线
  if (event.button !== 0) return

  const point = getMouseWorldPosition(event)
  if (!point) return

  isDrawing = true
  currentPoints = [point]

  const geometry = new THREE.BufferGeometry().setFromPoints(currentPoints)
  const material = new THREE.LineBasicMaterial({ color: '#00000000' })

  currentLine = new THREE.Line(geometry, material)
  scene.add(currentLine)
})

window.addEventListener('pointermove', (event) => {
  if (currentBrush !== 'fence') return

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

const brushButtons = document.querySelectorAll('.brush-button')

brushButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentBrush = button.dataset.brush

    brushButtons.forEach((btn) => {
      btn.classList.remove('active')
    })

    button.classList.add('active')
  })
})

//ClearButton
const clearButton = document.querySelector('.clear-button')

clearButton.addEventListener('click', () => {
    location.reload()
})

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

animate()