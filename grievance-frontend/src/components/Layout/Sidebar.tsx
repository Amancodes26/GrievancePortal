'use client'
import React, { useState } from 'react'
import { NavItems } from '@/styles/constants'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

interface SidebarProps {
  className?: string;
}

const Sidebar = ({ className = '' }: SidebarProps) => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  const topNavItems = NavItems.filter(item => item.position === 'top')
  const bottomNavItems = NavItems.filter(item => item.position === 'bottom')

  const handleNavigation = (href: string) => {
    router.push(href)
  }

  return (
    <div className={`bg-white border-r border-blue-100 transition-all duration-300 ease-in-out flex-shrink-0 ${isSidebarExpanded ? 'w-64' : 'w-16'} ${className}`}>
      <div className="flex justify-end p-2 border-b border-blue-100">
        <button
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          className="p-1 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors duration-200"
        >
          {isSidebarExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>
      <nav className="flex flex-col h-[calc(100%-3rem)]">
        <div className="flex-1">
          {topNavItems.map((item, index) => (
            <div
              key={index}
              onClick={() => handleNavigation(item.href)}
              className={`flex items-center p-3 cursor-pointer transition-all duration-200 ease-in-out ${
                isSidebarExpanded ? 'justify-start' : 'justify-center'
              } ${
                pathname === item.href 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <div className="transition-transform duration-200 ease-in-out">
                {item.icon}
              </div>
              <span className={`ml-3 transition-all duration-200 ease-in-out ${
                isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}>
                {item.title}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-auto border-t border-blue-100">
          {bottomNavItems.map((item, index) => (
            <div
              key={index}
              onClick={() => handleNavigation(item.href)}
              className={`flex items-center p-3 cursor-pointer transition-all duration-200 ease-in-out ${
                isSidebarExpanded ? 'justify-start' : 'justify-center'
              } ${
                pathname === item.href 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <div className="transition-transform duration-200 ease-in-out">
                {item.icon}
              </div>
              <span className={`ml-3 transition-all duration-200 ease-in-out ${
                isSidebarExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}>
                {item.title}
              </span>
            </div>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default Sidebar
