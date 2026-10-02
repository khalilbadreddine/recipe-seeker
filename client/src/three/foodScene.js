/**
 * "Living Plate": a field of floating low-poly foods (three.js), re-composed
 * per nutrient with GSAP. Every food is built from primitives in code (no
 * model files), flat-shaded in a matte "clay" style.
 *
 * Loaded lazily by components/FoodScene.jsx only when the device can afford
 * it, so it never affects first paint, SEO, or reduced-motion visitors.
 *
 *   const scene = createFoodScene(container, { nutrient: 'iron', variant: 'hero' })
 *   scene.setNutrient('fiber')
 *   scene.destroy()
 */
import {
  AmbientLight,
  Box3,
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/* ------------------------------------------------------------------ */
/* Shared geometry + materials                                         */
/* ------------------------------------------------------------------ */

const geoCache = new Map()
const matCache = new Map()

function geo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make())
  return geoCache.get(key)
}

function mat(color) {
  if (!matCache.has(color)) {
    matCache.set(color, new MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, flatShading: true }))
  }
  return matCache.get(color)
}

function mesh(g, color, scale = [1, 1, 1], pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new Mesh(g, mat(color))
  m.scale.set(...scale)
  m.position.set(...pos)
  m.rotation.set(...rot)
  return m
}

const sphere = () => geo('sphere', () => new SphereGeometry(1, 14, 10))
const ico1 = () => geo('ico1', () => new IcosahedronGeometry(1, 1))
const ico0 = () => geo('ico0', () => new IcosahedronGeometry(1, 0))
const box = () => geo('box', () => new BoxGeometry(1, 1, 1))
const disc = () => geo('disc', () => new CylinderGeometry(1, 1, 1, 22))
const ring = () => geo('ring', () => new TorusGeometry(1, 0.12, 6, 28))
const capsule = () => geo('capsule', () => new CapsuleGeometry(0.5, 1, 4, 10))
const drop = () =>
  geo('drop', () => {
    const pts = []
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      const y = -1 + 2 * t
      const r = Math.sin(Math.PI * t) * (1 - t * 0.75) * 0.85
      pts.push(new Vector2(Math.max(r, 0.001), y))
    }
    return new LatheGeometry(pts, 14)
  })
const leafGeo = () =>
  geo('leaf', () => {
    const s = new Shape()
    s.moveTo(0, -1)
    s.quadraticCurveTo(0.75, -0.2, 0, 1)
    s.quadraticCurveTo(-0.75, -0.2, 0, -1)
    return new ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1, curveSegments: 8 })
  })

/* ------------------------------------------------------------------ */
/* Foods                                                               */
/* ------------------------------------------------------------------ */

const FOODS = {
  lentil: () => mesh(sphere(), '#D9673A', [0.15, 0.055, 0.15]),
  bean: () => mesh(sphere(), '#7E2F2C', [0.17, 0.1, 0.105]),
  chickpea: () => mesh(ico1(), '#E2B46C', [0.13, 0.13, 0.13]),
  pumpkinSeed: () => mesh(sphere(), '#6F9B4F', [0.12, 0.035, 0.07]),
  spinach: () => mesh(leafGeo(), '#3F7F3A', [0.24, 0.3, 0.24]),
  egg: () => mesh(sphere(), '#F4ECDD', [0.2, 0.26, 0.2]),
  salmon: () => {
    const g = new Group()
    g.add(mesh(box(), '#F08A5D', [0.46, 0.15, 0.26]))
    g.add(mesh(box(), '#FBD3BE', [0.47, 0.03, 0.04], [0, 0.03, 0.06]))
    g.add(mesh(box(), '#FBD3BE', [0.47, 0.03, 0.04], [0, 0.03, -0.06]))
    return g
  },
  tofu: () => mesh(box(), '#F1EAD6', [0.24, 0.24, 0.24]),
  edamame: () => mesh(capsule(), '#7DB35A', [0.12, 0.2, 0.12], [0, 0, 0], [0, 0, Math.PI / 2]),
  almond: () => mesh(sphere(), '#B9773F', [0.16, 0.07, 0.1]),
  walnut: () => mesh(ico0(), '#A9784A', [0.16, 0.13, 0.15]),
  oat: () => mesh(sphere(), '#E6D3A3', [0.13, 0.03, 0.11]),
  blueberry: () => {
    const g = new Group()
    g.add(mesh(sphere(), '#3E3B88', [0.14, 0.13, 0.14]))
    g.add(mesh(ring(), '#2A2766', [0.035, 0.035, 0.035], [0, 0.125, 0], [Math.PI / 2, 0, 0]))
    return g
  },
  raspberry: () => mesh(ico1(), '#C7364E', [0.14, 0.16, 0.14]),
  chia: () => mesh(sphere(), '#2F2B27', [0.05, 0.035, 0.035]),
  orangeSlice: () => {
    const g = new Group()
    g.add(mesh(disc(), '#F8A93A', [0.3, 0.07, 0.3]))
    g.add(mesh(ring(), '#E9861C', [0.3, 0.3, 0.55], [0, 0, 0], [Math.PI / 2, 0, 0]))
    g.add(mesh(disc(), '#FCE1A8', [0.06, 0.075, 0.06]))
    return g
  },
  kiwiSlice: () => {
    const g = new Group()
    g.add(mesh(disc(), '#8CC63F', [0.27, 0.06, 0.27]))
    g.add(mesh(ring(), '#7A5A3A', [0.27, 0.27, 0.45], [0, 0, 0], [Math.PI / 2, 0, 0]))
    g.add(mesh(disc(), '#F3EFC6', [0.08, 0.065, 0.08]))
    return g
  },
  strawberry: () => {
    const g = new Group()
    g.add(mesh(drop(), '#E23B3B', [0.17, 0.2, 0.17], [0, 0, 0], [Math.PI, 0, 0]))
    g.add(mesh(leafGeo(), '#4C8F3A', [0.08, 0.1, 0.08], [0, 0.2, 0], [Math.PI / 2, 0, 0]))
    return g
  },
  pepper: () => mesh(box(), '#D9342B', [0.28, 0.08, 0.16], [0, 0, 0], [0, 0, 0.2]),
  broccoli: () => {
    const g = new Group()
    g.add(mesh(disc(), '#A9C978', [0.05, 0.22, 0.05], [0, -0.1, 0]))
    g.add(mesh(ico1(), '#3E7D3A', [0.11, 0.1, 0.11], [0, 0.06, 0]))
    g.add(mesh(ico1(), '#468A3F', [0.09, 0.08, 0.09], [0.1, 0.0, 0.03]))
    g.add(mesh(ico1(), '#3A7535', [0.09, 0.08, 0.09], [-0.09, 0.01, -0.03]))
    return g
  },
  cheese: () => mesh(box(), '#F5C842', [0.26, 0.19, 0.24]),
  yogurt: () => mesh(drop(), '#FBFAF5', [0.15, 0.2, 0.15]),
  oilDrop: () => mesh(drop(), '#E8C547', [0.14, 0.19, 0.14]),
  banana: () => {
    const g = new Group()
    g.add(mesh(disc(), '#F6E7A1', [0.2, 0.06, 0.2]))
    g.add(mesh(disc(), '#E7D27A', [0.05, 0.065, 0.05]))
    return g
  },
  sweetPotato: () => mesh(box(), '#E67E3A', [0.24, 0.2, 0.2], [0, 0, 0], [0.2, 0.3, 0]),
  avocado: () => {
    const g = new Group()
    g.add(mesh(sphere(), '#B9D36F', [0.18, 0.24, 0.07]))
    g.add(mesh(sphere(), '#3E5E2B', [0.19, 0.25, 0.05], [0, 0, -0.025]))
    g.add(mesh(sphere(), '#8A5A3B', [0.075, 0.075, 0.06], [0, -0.04, 0.05]))
    return g
  },
  mushroom: () => {
    const g = new Group()
    g.add(mesh(sphere(), '#C9A27E', [0.2, 0.11, 0.2], [0, 0.06, 0]))
    g.add(mesh(disc(), '#EFE6D6', [0.07, 0.18, 0.07], [0, -0.06, 0]))
    return g
  },
  chocolate: () => mesh(box(), '#4A2C20', [0.28, 0.05, 0.2]),
}

/** Foods that are good sources of each nutrient (keys match the site data). */
export const NUTRIENT_FOODS = {
  all: ['lentil', 'egg', 'orangeSlice', 'spinach', 'blueberry', 'salmon', 'cheese', 'almond', 'chickpea', 'avocado', 'strawberry', 'broccoli'],
  iron: ['lentil', 'spinach', 'bean', 'pumpkinSeed', 'chickpea', 'broccoli'],
  protein: ['egg', 'salmon', 'chickpea', 'tofu', 'edamame', 'almond'],
  fiber: ['oat', 'raspberry', 'blueberry', 'chia', 'bean', 'avocado'],
  vitaminC: ['orangeSlice', 'strawberry', 'pepper', 'kiwiSlice', 'broccoli'],
  calcium: ['cheese', 'yogurt', 'almond', 'broccoli', 'tofu'],
  magnesium: ['pumpkinSeed', 'almond', 'chocolate', 'spinach', 'avocado'],
  vitaminD: ['mushroom', 'salmon', 'egg', 'yogurt'],
  b12: ['salmon', 'egg', 'yogurt', 'cheese'],
  zinc: ['pumpkinSeed', 'chickpea', 'oat', 'bean', 'almond'],
  folate: ['spinach', 'lentil', 'avocado', 'broccoli', 'edamame'],
  potassium: ['banana', 'sweetPotato', 'avocado', 'bean', 'spinach'],
  omega3: ['salmon', 'walnut', 'chia', 'oilDrop'],
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/** Deterministic pseudo-random so layouts are stable per slot. */
function rand(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/** Small string hash, so each nutrient gets its own composition. */
function hashSeed(str) {
  let h = 7
  for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) % 9973
  return h
}

/**
 * Banner variant: slot positions in normalized canvas space (-1..1), spread
 * over the banner's free corner (text sits elsewhere) on a jittered grid.
 */
function panelSlots(count) {
  const out = []
  const cols = 4
  const rows = Math.ceil(count / cols)
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    out.push({
      x: -0.9 + ((col + 0.2 + rand(i + 1) * 0.6) / cols) * 1.8,
      y: 0.9 - ((row + 0.2 + rand(i + 101) * 0.6) / rows) * 1.8,
      z: -0.6 + rand(i + 201) * 1.2,
    })
  }
  return out
}

/**
 * Hero variant: pixel spots in the canvas where a food is actually visible,
 * i.e. not hidden behind the page content in `boxes` (the picker card, the
 * hero copy) and not cut off by the screen edge. A food may tuck up to ~45%
 * behind an edge for depth. Seeded dart throwing keeps it organic; the gap
 * grows with the free area so foods spread out instead of clumping.
 */
function freeSpots({ width, height, boxes, minX, maxX, radius, count, seed }) {
  const edge = radius * 1.2 // room to spin and bob without touching the canvas edge
  const reach = radius * 0.55
  const step = Math.max(6, radius / 2.5)
  const cand = []
  for (let y = edge; y <= height - edge; y += step) {
    for (let x = Math.max(edge, minX + edge); x <= Math.min(width - edge, maxX - edge); x += step) {
      const hidden = boxes.some((b) => {
        const dx = Math.max(b.l - x, 0, x - b.r)
        const dy = Math.max(b.t - y, 0, y - b.b)
        return dx * dx + dy * dy < reach * reach
      })
      if (!hidden) cand.push([x, y])
    }
  }
  // Seeded shuffle, then accept each candidate that keeps its distance.
  const order = cand.map((p, i) => [rand(seed + i * 1.37), p]).sort((a, b) => a[0] - b[0])
  const gap = Math.max(radius * 2.1, Math.sqrt((cand.length * step * step) / Math.max(count, 1)) * 0.85)
  const spots = []
  for (const [, p] of order) {
    if (spots.length >= count) break
    if (spots.every((s) => Math.hypot(s[0] - p[0], s[1] - p[1]) >= gap)) spots.push(p)
  }
  return spots
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

/**
 * Divisor that turns a target size into a scale. Softened so tiny foods
 * (chia) stay small but visible, capped so big ones (orange slice) never
 * outgrow their spot by more than ~5%.
 */
function visualSize(food) {
  const s = new Box3().setFromObject(food).getSize(new Vector3())
  const max = Math.max(s.x, s.y, s.z, 0.05)
  return Math.max(Math.sqrt(max * 0.45), max / 1.05)
}

/**
 * @param {HTMLElement} container  positioned box the canvas fills
 * @param {object} opts
 * @param {string} opts.nutrient   key of NUTRIENT_FOODS
 * @param {'hero'|'panel'} opts.variant
 * @param {() => Element[]} [opts.avoid]  hero only: page content the foods must not hide behind
 */
export function createFoodScene(container, { nutrient = 'all', variant = 'hero', avoid = () => [] } = {}) {
  const small = window.matchMedia('(max-width: 640px)').matches
  const count = variant === 'panel' ? 9 : small ? 10 : 16

  const renderer = new WebGLRenderer({ antialias: !small, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.setClearColor(0x000000, 0)
  const canvas = renderer.domElement
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity 900ms ease'
  container.appendChild(canvas)

  const scene = new Scene()
  const camera = new PerspectiveCamera(35, 1, 0.1, 50)
  // The banner variant sits in a smaller box: a closer camera keeps foods a readable size.
  camera.position.set(0, 0, variant === 'panel' ? 4.2 : 7)

  scene.add(new HemisphereLight('#FFFFFF', '#E7E1D1', 1.6))
  scene.add(new AmbientLight('#FFFFFF', 0.35))
  const sun = new DirectionalLight('#FFF4E0', 2.1)
  sun.position.set(3, 4, 5)
  scene.add(sun)

  const world = new Group()
  scene.add(world)

  let items = [] // { obj, dim, target, phase, speed, bob, spin }
  let current = null
  let width = 1
  let height = 1
  let visible = true
  let running = true
  let raf = 0
  let last = performance.now()

  /** World units per CSS pixel at depth z. */
  const unitsPerPx = (z) => (2 * (camera.position.z - z) * Math.tan((camera.fov * Math.PI) / 360)) / height

  /** Up to n target poses { x, y, z, size } in world units; fewer when space is short. */
  function targets(n, seed) {
    if (variant === 'panel') {
      const hy = (height * unitsPerPx(0)) / 2
      const hx = hy * camera.aspect
      // Keep a margin so no food is ever sliced by the canvas edge.
      return panelSlots(n).map((s, i) => ({
        x: s.x * hx * 0.84,
        y: s.y * hy * 0.76,
        z: s.z,
        size: 0.52 * (0.85 + rand(i + 301) * 0.45),
      }))
    }
    const box = container.getBoundingClientRect()
    const boxes = avoid()
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width && r.height)
      .map((r) => ({ l: r.left - box.left, t: r.top - box.top, r: r.right - box.left, b: r.bottom - box.top }))
    const radius = width < 560 ? 23 : 31
    const spots = freeSpots({
      width,
      height,
      boxes,
      minX: -box.left,
      maxX: document.documentElement.clientWidth - box.left,
      radius,
      count: n,
      seed,
    })
    return spots.map(([px, py], i) => {
      const z = -0.5 + rand(seed + i * 7 + 3)
      const u = unitsPerPx(z)
      return { x: (px - width / 2) * u, y: (height / 2 - py) * u, z, size: radius * 2 * (0.85 + rand(seed + i * 7 + 5) * 0.3) * u }
    })
  }

  const scaleOf = (it) => it.target.size / it.dim

  function build(key) {
    const list = NUTRIENT_FOODS[key] || NUTRIENT_FOODS.all
    return targets(count, hashSeed(key)).map((target, i) => {
      // Wrap so the enter/exit scale tweens never overwrite a food's own proportions.
      const obj = new Group()
      const food = FOODS[list[i % list.length]]()
      obj.add(food)
      obj.rotation.set(rand(i + 401) * Math.PI, rand(i + 501) * Math.PI, rand(i + 601) * Math.PI)
      obj.scale.setScalar(0.0001)
      // Start near the middle (behind the card) and burst outwards.
      obj.position.set(target.x * 0.35, target.y * 0.35, target.z - 1.5)
      world.add(obj)
      return {
        obj,
        dim: visualSize(food),
        target,
        phase: rand(i + 701) * Math.PI * 2,
        speed: 0.5 + rand(i + 801) * 0.6,
        // bob height, relative to the food's own size so it never drifts out of its spot
        bob: target.size * (0.1 + rand(i + 901) * 0.08),
        spin: { x: (rand(i + 1001) - 0.5) * 0.5, y: (rand(i + 1101) - 0.5) * 0.6 },
      }
    })
  }

  function setNutrient(key) {
    const next = NUTRIENT_FOODS[key] ? key : 'all'
    if (next === current) return
    current = next
    const outgoing = items
    outgoing.forEach((it, i) => {
      gsap.killTweensOf([it.obj.position, it.obj.scale])
      gsap.to(it.obj.scale, { x: 0.0001, y: 0.0001, z: 0.0001, duration: 0.4, delay: i * 0.012, ease: 'back.in(2)' })
      gsap.to(it.obj.position, {
        x: it.obj.position.x * 1.25,
        y: it.obj.position.y * 1.25 + 0.3,
        duration: 0.45,
        delay: i * 0.012,
        ease: 'power2.in',
        onComplete: () => world.remove(it.obj),
      })
    })
    items = build(next)
    items.forEach((it, i) => {
      const { x, y, z } = it.target
      const s = scaleOf(it)
      gsap.to(it.obj.position, { x, y, z, duration: 1.1, delay: 0.18 + i * 0.03, ease: 'expo.out' })
      gsap.to(it.obj.scale, { x: s, y: s, z: s, duration: 0.9, delay: 0.18 + i * 0.03, ease: 'back.out(2.2)' })
      gsap.from(it.obj.rotation, { y: it.obj.rotation.y - Math.PI, duration: 1.2, delay: 0.18 + i * 0.03, ease: 'expo.out' })
    })
  }

  function resize() {
    const w = Math.max(1, container.clientWidth)
    const h = Math.max(1, container.clientHeight)
    if (w === width && h === height) return
    width = w
    height = h
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    if (!items.length) return
    // Re-fit the current foods to the new free space; any without room shrink away.
    const next = targets(items.length, hashSeed(current))
    items.forEach((it, i) => {
      gsap.killTweensOf([it.obj.position, it.obj.scale])
      const t = next[i]
      if (!t) return gsap.to(it.obj.scale, { x: 0.0001, y: 0.0001, z: 0.0001, duration: 0.4 })
      it.target = t
      const s = scaleOf(it)
      gsap.to(it.obj.position, { x: t.x, y: t.y, z: t.z, duration: 0.6, ease: 'power2.out' })
      gsap.to(it.obj.scale, { x: s, y: s, z: s, duration: 0.6, ease: 'power2.out' })
    })
  }

  // Gentle parallax that follows the pointer (small, so foods stay in their free spots).
  const tiltY = gsap.quickTo(world.rotation, 'y', { duration: 1.4, ease: 'power3' })
  const tiltX = gsap.quickTo(world.rotation, 'x', { duration: 1.4, ease: 'power3' })
  function onPointer(e) {
    const nx = (e.clientX / window.innerWidth) * 2 - 1
    const ny = (e.clientY / window.innerHeight) * 2 - 1
    tiltY(nx * 0.16)
    tiltX(ny * 0.09)
  }
  window.addEventListener('pointermove', onPointer, { passive: true })

  // Drift up and back as the section scrolls away.
  const scrollTween = gsap.to(world.position, {
    y: 0.8,
    z: -0.8,
    ease: 'none',
    scrollTrigger: { trigger: container, start: 'top top', end: 'bottom top', scrub: 0.8 },
  })

  function tick(now) {
    raf = requestAnimationFrame(tick)
    if (!visible || !running) {
      last = now
      return
    }
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const t = now / 1000
    for (const it of items) {
      it.obj.rotation.x += it.spin.x * dt
      it.obj.rotation.y += it.spin.y * dt
      it.obj.position.y += Math.cos(t * it.speed + it.phase) * it.bob * it.speed * dt
    }
    renderer.render(scene, camera)
  }

  const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { rootMargin: '100px' })
  io.observe(container)
  const ro = new ResizeObserver(resize)
  ro.observe(container)
  const onVisibility = () => (running = !document.hidden)
  document.addEventListener('visibilitychange', onVisibility)

  resize()
  setNutrient(nutrient)
  raf = requestAnimationFrame((now) => {
    last = now
    tick(now)
    canvas.style.opacity = '1'
  })

  return {
    setNutrient,
    destroy() {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pointermove', onPointer)
      scrollTween.scrollTrigger?.kill()
      scrollTween.kill()
      items.forEach((it) => gsap.killTweensOf([it.obj.position, it.obj.scale, it.obj.rotation]))
      gsap.killTweensOf([world.rotation, world.position])
      renderer.dispose()
      canvas.remove()
    },
  }
}
