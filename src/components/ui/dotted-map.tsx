'use client'

import React, { useMemo, useEffect, useState } from 'react'
import DottedMap from 'dotted-map'
import { motion, AnimatePresence } from 'framer-motion'


interface DottedMapProps {
  className?: string
}

export default function DottedMapComponent({ className }: DottedMapProps) {
  const [lines, setLines] = useState<{start: {x:number, y:number}, end: {x:number, y:number}, id: string}[]>([])

  const { points, pins } = useMemo(() => {
    // 1. Create map instance
    const map = new DottedMap({ height: 100, grid: 'diagonal' })

    // 2. Define Pins
    const pinLocations = [
      { lat: 40.7128, lng: -74.0060 }, // New York
      { lat: 51.5074, lng: -0.1278 }, // London
      { lat: 35.6762, lng: 139.6503 }, // Tokyo
      { lat: 1.3521, lng: 103.8198 }, // Singapore
      { lat: 25.2048, lng: 55.2708 }, // Dubai
      { lat: -33.8688, lng: 151.2093 }, // Sydney
      { lat: -23.5505, lng: -46.6333 }, // Sao Paulo
      { lat: 28.6139, lng: 77.2090 }, // New Delhi
      { lat: 52.5200, lng: 13.4050 }, // Berlin
    ]

    const points = map.getPoints()
    
    // pixel positions for pins
    const pinPositions = pinLocations.map(p => {
       const pos = map.getPin({ lat: p.lat, lng: p.lng })
       return { ...pos, ...p }
    })

    return { points, pins: pinPositions }
  }, [])

  // Generate random connecting lines
  useEffect(() => {
    const generateLines = () => {
      // Pick random connection
      const numNewLines = 1
      const newLines: typeof lines = []
      
      for (let i = 0; i < numNewLines; i++) {
        const start = pins[Math.floor(Math.random() * pins.length)]
        let end = pins[Math.floor(Math.random() * pins.length)]
        while (start === end) {
           end = pins[Math.floor(Math.random() * pins.length)]
        }
        newLines.push({ start, end, id: `line-${Date.now()}-${i}` })
      }
      
      setLines(newLines)
    }

    generateLines()
    const interval = setInterval(generateLines, 3500)
    return () => clearInterval(interval)
  }, [pins])

  // Calculate ViewBox
  const viewBox = useMemo(() => {
    if (points.length === 0) return '0 0 120 100'
    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    return `${minX - 4} ${minY - 4} ${maxX - minX + 8} ${maxY - minY + 8}`
  }, [points])

  return (
    <div className={`relative w-full h-full select-none pointer-events-none ${className}`}>
      <svg 
         viewBox={viewBox} 
         className="w-full h-full text-foreground/80 fill-current"
       >
         {/* Map Dots */}
         {points.map((point, i) => (
           <circle 
             key={`dot-${i}`} 
             cx={point.x} 
             cy={point.y} 
             r={0.15} 
             fill="currentColor"
           />
         ))}

         {/* Pins */}
         {pins.map((pin, i) => (
           <circle
             key={`pin-${i}`}
             cx={pin.x}
             cy={pin.y}
             r={0.6}
             fill="currentColor"
             className="text-foreground animate-pulse"
           />
         ))}

         {/* Connecting Lines */}
         <AnimatePresence>
           {lines.map((line) => (
             <motion.path
               key={line.id}
               d={`M ${line.start.x} ${line.start.y} Q ${(line.start.x + line.end.x)/2} ${(line.start.y + line.end.y)/2 - 20} ${line.end.x} ${line.end.y}`}
               initial={{ pathLength: 0, opacity: 0 }}
               animate={{ pathLength: 1, opacity: 1 }}
               exit={{ opacity: 0, transition: { duration: 0.5 } }}
               transition={{ duration: 1.2, ease: "easeOut" }}
               stroke="currentColor"
               className="text-foreground"
               strokeWidth="0.3"
               fill="none"
             />
           ))}
         </AnimatePresence>
       </svg>
    </div>
  )
}
