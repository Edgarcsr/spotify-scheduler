import { useEffect, useRef } from "react"

const DURATION = 260
const EASING = "cubic-bezier(0.2, 0, 0, 1)"

/**
 * Anima a reorganização de um grid quando o número de colunas muda (janela redimensionada,
 * fila recolhida). Técnica FLIP: guarda onde cada filho estava, e quando as colunas mudam
 * desenha o filho no lugar antigo e o desliza até o novo. Respeita "reduzir movimento".
 */
export function useGridFlip<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const grid = ref.current
    if (!grid) return
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

    // Posições relativas ao próprio grid: se o grid inteiro anda (a lateral recolhendo), isso não conta.
    const positions = new WeakMap<Element, { x: number; y: number }>()
    let columns = countColumns(grid)

    // offsetLeft/Top são posição de layout: ignoram o transform de uma animação em andamento.
    // O grid precisa ser `relative` para ser o offsetParent dos filhos.
    function measure() {
      const next = new Map<Element, { x: number; y: number }>()
      for (const child of grid!.children) {
        const el = child as HTMLElement
        next.set(child, { x: el.offsetLeft, y: el.offsetTop })
      }
      return next
    }

    function remember(current: Map<Element, { x: number; y: number }>) {
      for (const [child, pos] of current) positions.set(child, pos)
    }

    remember(measure())

    const observer = new ResizeObserver(() => {
      const current = measure()
      const nextColumns = countColumns(grid)
      if (nextColumns !== columns && !reduceMotion.matches) {
        for (const [child, pos] of current) {
          const before = positions.get(child)
          if (!before) continue
          const dx = before.x - pos.x
          const dy = before.y - pos.y
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
          ;(child as HTMLElement).animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
            { duration: DURATION, easing: EASING },
          )
        }
      }
      columns = nextColumns
      remember(current)
    })
    observer.observe(grid)

    // Filhos novos (outra busca) entram sem animação, mas precisam de posição registrada.
    const mutations = new MutationObserver(() => remember(measure()))
    mutations.observe(grid, { childList: true })

    return () => {
      observer.disconnect()
      mutations.disconnect()
    }
  }, [])

  return ref
}

function countColumns(grid: HTMLElement) {
  return getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length
}
