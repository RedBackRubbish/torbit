'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { DEVICE_PRESETS } from '@/lib/mobile/types'

interface DeviceFrameProps {
  children: ReactNode
  deviceType: 'iphone' | 'ipad' | 'android'
  preset?: string
}

/**
 * iPhone Device Frame
 * Premium, realistic device chrome for mobile preview
 */
export function IPhoneFrame({ 
  children, 
  preset = 'iphone-15-pro-max' 
}: { 
  children: ReactNode
  preset?: string 
}) {
  const device = DEVICE_PRESETS[preset] || DEVICE_PRESETS['iphone-15-pro-max']
  const hasDynamicIsland = device.hasDynamicIsland
  const hasNotch = device.hasNotch

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Device outer shell */}
      <div 
        className="relative rounded-[55px] p-[12px]"
        style={{
          background: 'linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 50%, #1a1a1a 100%)',
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.08),
            0 25px 50px -12px rgba(0,0,0,0.8),
            0 0 100px rgba(0,0,0,0.5),
            inset 0 1px 1px rgba(255,255,255,0.06)
          `,
        }}
      >
        {/* Titanium frame edge */}
        <div 
          className="absolute inset-0 rounded-[55px] pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(192,192,192,0.15) 0%, rgba(192,192,192,0.05) 50%, rgba(192,192,192,0.15) 100%)',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'xor',
            WebkitMaskComposite: 'xor',
            padding: '1px',
          }}
        />

        {/* Side buttons - Volume */}
        <div className="absolute -left-[3px] top-[120px] w-[3px] h-[32px] bg-[#1a1a1a] rounded-l-sm" 
          style={{ boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.1)' }} 
        />
        <div className="absolute -left-[3px] top-[165px] w-[3px] h-[32px] bg-[#1a1a1a] rounded-l-sm"
          style={{ boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.1)' }}
        />
        
        {/* Side button - Action button */}
        <div className="absolute -left-[3px] top-[80px] w-[3px] h-[20px] bg-[#1a1a1a] rounded-l-sm"
          style={{ boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.1)' }}
        />

        {/* Side button - Power */}
        <div className="absolute -right-[3px] top-[140px] w-[3px] h-[48px] bg-[#1a1a1a] rounded-r-sm"
          style={{ boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.1)' }}
        />

        {/* Inner bezel */}
        <div 
          className="relative rounded-[44px] overflow-hidden bg-black"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.8)',
          }}
        >
          {/* Screen content area */}
          <div 
            className="relative"
            style={{ 
              width: device.width, 
              height: device.height 
            }}
          >
            {/* Dynamic Island - for newer iPhones */}
            {hasDynamicIsland && (
              <div className="absolute top-[12px] left-1/2 -translate-x-1/2 z-50">
                <motion.div 
                  className="relative flex items-center justify-center"
                  initial={{ width: 126 }}
                  animate={{ width: 126 }}
                  style={{
                    height: 37,
                    background: '#000',
                    borderRadius: 20,
                    boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
                  }}
                >
                  {/* Camera lens */}
                  <div 
                    className="absolute left-[18px] w-[12px] h-[12px] rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 30% 30%, #1a1a2e 0%, #0a0a0a 100%)',
                      boxShadow: 'inset 0 0 3px rgba(100,100,255,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
                    }}
                  >
                    <div className="absolute top-[2px] left-[2px] w-[3px] h-[3px] rounded-full bg-white/20" />
                  </div>
                </motion.div>
              </div>
            )}

            {/* Notch - for iPhone X through 14 */}
            {hasNotch && !hasDynamicIsland && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50">
                <div 
                  className="relative"
                  style={{
                    width: 210,
                    height: 30,
                    background: '#000',
                    borderBottomLeftRadius: 20,
                    borderBottomRightRadius: 20,
                  }}
                >
                  {/* Speaker */}
                  <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[56px] h-[6px] bg-[#1a1a1a] rounded-full" />
                  {/* Camera */}
                  <div 
                    className="absolute top-[8px] right-[40px] w-[10px] h-[10px] rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 30% 30%, #1a1a2e 0%, #0a0a0a 100%)',
                      boxShadow: 'inset 0 0 2px rgba(100,100,255,0.3)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Screen content */}
            <div className="absolute inset-0 rounded-[44px] overflow-hidden bg-white">
              {children}
            </div>

            {/* Home indicator - for Face ID iPhones */}
            {(hasDynamicIsland || hasNotch) && (
              <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 z-50">
                <div className="w-[134px] h-[5px] rounded-full bg-black/50 backdrop-blur-sm" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reflection/shine overlay */}
      <div 
        className="absolute inset-0 rounded-[55px] pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%)',
        }}
      />
    </motion.div>
  )
}

/**
 * iPad Pro Device Frame
 * For tablet preview
 */
export function IPadFrame({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Device outer shell */}
      <div 
        className="relative rounded-[28px] p-[10px]"
        style={{
          background: 'linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 50%, #1a1a1a 100%)',
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.08),
            0 25px 50px -12px rgba(0,0,0,0.8),
            inset 0 1px 1px rgba(255,255,255,0.06)
          `,
        }}
      >
        {/* Inner bezel */}
        <div 
          className="relative rounded-[20px] overflow-hidden bg-black"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.8)',
          }}
        >
          {/* Screen content area - iPad Pro 11" aspect */}
          <div className="relative w-[768px] h-[1024px]">
            {/* Camera (top center for landscape mode) */}
            <div className="absolute top-[8px] left-1/2 -translate-x-1/2 z-50">
              <div 
                className="w-[8px] h-[8px] rounded-full"
                style={{
                  background: 'radial-gradient(circle at 30% 30%, #1a1a2e 0%, #0a0a0a 100%)',
                  boxShadow: 'inset 0 0 2px rgba(100,100,255,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
                }}
              />
            </div>

            {/* Screen content */}
            <div className="absolute inset-0 rounded-[20px] overflow-hidden bg-white">
              {children}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Browser Chrome Frame
 * For desktop preview
 */
export function BrowserFrame({ children, url = 'localhost:3000' }: { children: ReactNode, url?: string }) {
  return (
    <motion.div
      className="bg-white rounded-xl overflow-hidden shadow-2xl ring-1 ring-[#262626] w-full h-full"
      layout
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Browser chrome */}
      <div className="h-9 bg-[#f5f5f5] border-b border-[#e5e5e5] flex items-center px-3 gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-md text-[11px] text-[#737373] border border-[#e5e5e5]">
            <svg className="w-3 h-3 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            {url}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="h-[calc(100%-2.25rem)]">
        {children}
      </div>
    </motion.div>
  )
}

export default function DeviceFrame({ children, deviceType }: DeviceFrameProps) {
  switch (deviceType) {
    case 'iphone':
      return <IPhoneFrame>{children}</IPhoneFrame>
    case 'ipad':
      return <IPadFrame>{children}</IPadFrame>
    default:
      return <IPhoneFrame>{children}</IPhoneFrame>
  }
}
