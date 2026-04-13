import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'

const transformer = new Transformer()

export interface MarkmapHandle {
  getSVGElement: () => SVGSVGElement | null
  fit: () => void
}

interface Props {
  content: string
  height?: number
}

const MarkmapView = forwardRef<MarkmapHandle, Props>(({ content, height = 420 }, ref) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const mmRef = useRef<Markmap | null>(null)

  useImperativeHandle(ref, () => ({
    getSVGElement: () => svgRef.current,
    fit: () => mmRef.current?.fit(),
  }))

  useEffect(() => {
    if (!svgRef.current) return
    const { root } = transformer.transform(content)
    if (!mmRef.current) {
      mmRef.current = Markmap.create(svgRef.current, {
        autoFit: true,
        duration: 300,
        maxWidth: 300,
      })
    }
    mmRef.current.setData(root)
    mmRef.current.fit()
  }, [content])

  useEffect(() => {
    return () => {
      mmRef.current?.destroy()
      mmRef.current = null
    }
  }, [])

  return (
    <svg
      ref={svgRef}
      className="w-full rounded-lg bg-gray-50"
      style={{ height: `${height}px` }}
    />
  )
})

MarkmapView.displayName = 'MarkmapView'

export default MarkmapView
